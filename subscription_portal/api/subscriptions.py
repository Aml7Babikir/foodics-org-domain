"""Sales & CS endpoints: merchants, quotes, subscriptions, invoices, status flow."""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from foodics_subscription_shared.db import get_session
from foodics_subscription_shared import models as m
from foodics_subscription_shared.pricing import quote_subscription
from ..services import (
    generate_invoice, move_to_stage, mark_invoice_paid, status_for_stage,
)

router = APIRouter(tags=["subscriptions"])


# --- Merchants -------------------------------------------------------------

class MerchantCreate(BaseModel):
    name: str
    email: str
    country: Optional[str] = None
    currency: str = "SAR"
    branches_count: int = 1


def _merchant_out(mm: m.Merchant, include_subs: bool = False):
    out = {
        "id": mm.id, "name": mm.name, "email": mm.email,
        "country": mm.country, "currency": mm.currency,
        "branches_count": mm.branches_count,
        "sf_account_number": mm.sf_account_number,
        "cr_number": mm.cr_number, "vat_number": mm.vat_number,
        "legal_identifier": mm.legal_identifier,
        "sf_synced_at": mm.sf_synced_at.isoformat() if mm.sf_synced_at else None,
        "missing_fields": mm.missing_required_fields(),
        "created_at": mm.created_at.isoformat() if mm.created_at else None,
    }
    if include_subs:
        out["subscriptions"] = [_subscription_out(s) for s in mm.subscriptions]
    return out


@router.get("/merchants")
def list_merchants(db: Session = Depends(get_session)):
    return [_merchant_out(x) for x in db.query(m.Merchant).order_by(m.Merchant.name).all()]


@router.post("/merchants")
def create_merchant(body: MerchantCreate, db: Session = Depends(get_session)):
    mm = m.Merchant(**body.model_dump())
    db.add(mm); db.commit(); db.refresh(mm)
    return _merchant_out(mm)


@router.get("/merchants/{merchant_id}")
def get_merchant(merchant_id: int, db: Session = Depends(get_session)):
    mm = db.get(m.Merchant, merchant_id)
    if not mm: raise HTTPException(404, "Merchant not found")
    out = _merchant_out(mm, include_subs=True)
    # Enrich each subscription with its live quote + invoice list for the CS console.
    for sub_summary, sub_model in zip(out.get("subscriptions", []), mm.subscriptions):
        sub_summary["quote"] = quote_subscription(db, sub_model)
        sub_summary["invoices"] = [_invoice_out(i) for i in sub_model.invoices]
    return out


# --- Subscriptions ---------------------------------------------------------

class AddonSel(BaseModel):
    addon_id: int

class DeviceSel(BaseModel):
    device_sku_id: int
    quantity: int = 1

class SeparateSel(BaseModel):
    tier_id: int
    quantity: int = 1

class QuoteBody(BaseModel):
    plan_id: int
    currency: str
    branches: int = 1
    addons: List[AddonSel] = Field(default_factory=list)
    devices: List[DeviceSel] = Field(default_factory=list)
    separate: List[SeparateSel] = Field(default_factory=list)


class SubscriptionCreate(QuoteBody):
    merchant_id: int
    billing_frequency: str = "monthly"


def _subscription_out(s: m.Subscription):
    return {
        "id": s.id,
        "merchant_id": s.merchant_id,
        "merchant_name": s.merchant.name if s.merchant else None,
        "plan_id": s.plan_id,
        "plan_name": s.plan.name if s.plan else None,
        "currency": s.currency,
        "branches": s.branches,
        "status": s.status,
        "deal_stage": s.deal_stage,
        "billing_frequency": s.billing_frequency,
        "created_at": s.created_at.isoformat() if s.created_at else None,
        "activated_at": s.activated_at.isoformat() if s.activated_at else None,
        "cancelled_at": s.cancelled_at.isoformat() if s.cancelled_at else None,
        "next_renewal_at": s.next_renewal_at.isoformat() if s.next_renewal_at else None,
        "addons": [{"id": a.addon.id, "code": a.addon.code, "name": a.addon.name} for a in s.addons],
        "devices": [{"id": d.sku.id, "code": d.sku.code, "name": d.sku.name, "quantity": d.quantity} for d in s.devices],
        "separate": [{
            "tier_id": sp.tier.id, "product_code": sp.tier.product.code,
            "product_name": sp.tier.product.name, "tier_name": sp.tier.name,
            "billing_model": sp.tier.product.billing_model, "quantity": sp.quantity,
        } for sp in s.separate_products],
    }


@router.post("/quote")
def quote_preview(body: QuoteBody, db: Session = Depends(get_session)):
    """Price a hypothetical subscription without persisting it — used by the live price panel."""
    plan = db.get(m.Plan, body.plan_id)
    if not plan: raise HTTPException(404, "Plan not found")

    # Build an in-memory subscription purely for pricing. No session.add().
    sub = m.Subscription(
        merchant_id=0, plan_id=body.plan_id, currency=body.currency,
        branches=body.branches, status="draft", deal_stage="discovery",
    )
    sub.plan = plan
    sub.addons = []
    sub.devices = []
    sub.separate_products = []
    for a in body.addons:
        addon = db.get(m.Addon, a.addon_id)
        if not addon: continue
        sa = m.SubscriptionAddon(addon_id=a.addon_id); sa.addon = addon
        sub.addons.append(sa)
    for d in body.devices:
        sku = db.get(m.DeviceSku, d.device_sku_id)
        if not sku: continue
        sd = m.SubscriptionDevice(device_sku_id=d.device_sku_id, quantity=d.quantity); sd.sku = sku
        sub.devices.append(sd)
    for sp in body.separate:
        tier = db.get(m.SeparateProductTier, sp.tier_id)
        if not tier: continue
        ssp = m.SubscriptionSeparateProduct(tier_id=sp.tier_id, quantity=sp.quantity); ssp.tier = tier
        sub.separate_products.append(ssp)
    return quote_subscription(db, sub)


@router.post("/subscriptions")
def create_subscription(body: SubscriptionCreate, db: Session = Depends(get_session)):
    """Sales creates a new deal. Defaults to 'processing' / 'discovery'."""
    merchant = db.get(m.Merchant, body.merchant_id)
    if not merchant: raise HTTPException(404, "Merchant not found")
    plan = db.get(m.Plan, body.plan_id)
    if not plan: raise HTTPException(404, "Plan not found")

    sub = m.Subscription(
        merchant_id=body.merchant_id, plan_id=body.plan_id,
        currency=body.currency, branches=body.branches,
        billing_frequency=body.billing_frequency,
        status="processing", deal_stage="discovery",
    )
    db.add(sub); db.flush()
    for a in body.addons:
        db.add(m.SubscriptionAddon(subscription_id=sub.id, addon_id=a.addon_id))
    for d in body.devices:
        db.add(m.SubscriptionDevice(subscription_id=sub.id, device_sku_id=d.device_sku_id, quantity=d.quantity))
    for sp in body.separate:
        db.add(m.SubscriptionSeparateProduct(subscription_id=sub.id, tier_id=sp.tier_id, quantity=sp.quantity))
    db.commit(); db.refresh(sub)
    return _subscription_out(sub)


@router.get("/subscriptions")
def list_subscriptions(db: Session = Depends(get_session)):
    return [_subscription_out(s) for s in db.query(m.Subscription).order_by(m.Subscription.created_at.desc()).all()]


@router.get("/subscriptions/{sub_id}")
def get_subscription(sub_id: int, db: Session = Depends(get_session)):
    s = db.get(m.Subscription, sub_id)
    if not s: raise HTTPException(404, "Subscription not found")
    out = _subscription_out(s)
    out["quote"] = quote_subscription(db, s)
    out["invoices"] = [_invoice_out(i) for i in s.invoices]
    return out


class StageUpdate(BaseModel):
    stage: str


@router.post("/subscriptions/{sub_id}/stage")
def set_stage(sub_id: int, body: StageUpdate, db: Session = Depends(get_session)):
    """Move the Salesforce deal stage forward. Generates an invoice on 'collection'."""
    s = db.get(m.Subscription, sub_id)
    if not s: raise HTTPException(404, "Subscription not found")

    # Before entering billing stages, ensure merchant compliance fields are complete.
    if body.stage in ("collection", "closed_won"):
        missing = s.merchant.missing_required_fields()
        if missing:
            raise HTTPException(
                status_code=409,
                detail={
                    "error": "merchant_incomplete",
                    "message": "Merchant is missing fields required for invoicing. "
                               "Complete them before advancing to Collection.",
                    "missing": missing,
                },
            )

    move_to_stage(db, s, body.stage)
    # When entering 'collection', auto-generate an invoice (the 12h-cron behaviour).
    if body.stage == "collection":
        existing_pending = [i for i in s.invoices if i.status == "pending"]
        if not existing_pending:
            generate_invoice(db, s, notes="Auto-generated on move to Collection stage")
    db.commit(); db.refresh(s)
    out = _subscription_out(s)
    out["quote"] = quote_subscription(db, s)
    out["invoices"] = [_invoice_out(i) for i in s.invoices]
    return out


class EditSubscription(BaseModel):
    plan_id: Optional[int] = None
    branches: Optional[int] = None
    addons: Optional[List[AddonSel]] = None
    devices: Optional[List[DeviceSel]] = None
    separate: Optional[List[SeparateSel]] = None


@router.put("/subscriptions/{sub_id}")
def edit_subscription(sub_id: int, body: EditSubscription, db: Session = Depends(get_session)):
    s = db.get(m.Subscription, sub_id)
    if not s: raise HTTPException(404, "Subscription not found")
    if body.plan_id is not None: s.plan_id = body.plan_id
    if body.branches is not None: s.branches = body.branches
    if body.addons is not None:
        for a in list(s.addons): db.delete(a)
        db.flush()
        for a in body.addons: db.add(m.SubscriptionAddon(subscription_id=s.id, addon_id=a.addon_id))
    if body.devices is not None:
        for d in list(s.devices): db.delete(d)
        db.flush()
        for d in body.devices: db.add(m.SubscriptionDevice(subscription_id=s.id, device_sku_id=d.device_sku_id, quantity=d.quantity))
    if body.separate is not None:
        for sp in list(s.separate_products): db.delete(sp)
        db.flush()
        for sp in body.separate: db.add(m.SubscriptionSeparateProduct(subscription_id=s.id, tier_id=sp.tier_id, quantity=sp.quantity))
    db.commit(); db.refresh(s)
    out = _subscription_out(s)
    out["quote"] = quote_subscription(db, s)
    out["invoices"] = [_invoice_out(i) for i in s.invoices]
    return out


# --- Invoices --------------------------------------------------------------

def _invoice_out(i: m.Invoice):
    return {
        "id": i.id, "number": i.number, "currency": i.currency,
        "total": i.total, "status": i.status,
        "issued_at": i.issued_at.isoformat() if i.issued_at else None,
        "paid_at": i.paid_at.isoformat() if i.paid_at else None,
        "notes": i.notes,
        "lines": [{
            "category": ln.category, "description": ln.description,
            "quantity": ln.quantity, "unit_price": ln.unit_price, "subtotal": ln.subtotal,
        } for ln in i.lines],
    }


@router.post("/subscriptions/{sub_id}/invoices")
def create_invoice(sub_id: int, db: Session = Depends(get_session)):
    s = db.get(m.Subscription, sub_id)
    if not s: raise HTTPException(404, "Subscription not found")
    missing = s.merchant.missing_required_fields()
    if missing:
        raise HTTPException(
            status_code=409,
            detail={
                "error": "merchant_incomplete",
                "message": "Merchant record is missing fields required for invoicing.",
                "missing": missing,
            },
        )
    inv = generate_invoice(db, s, notes="Manual invoice")
    db.commit(); db.refresh(inv)
    return _invoice_out(inv)


@router.get("/invoices")
def list_invoices(db: Session = Depends(get_session)):
    return [_invoice_out(i) for i in db.query(m.Invoice).order_by(m.Invoice.issued_at.desc()).all()]


@router.get("/invoices/{inv_id}")
def get_invoice(inv_id: int, db: Session = Depends(get_session)):
    i = db.get(m.Invoice, inv_id)
    if not i: raise HTTPException(404, "Invoice not found")
    return _invoice_out(i)


@router.post("/invoices/{inv_id}/pay")
def pay_invoice(inv_id: int, db: Session = Depends(get_session)):
    """Mock payment — always succeeds. Flips subscription to Completed."""
    i = db.get(m.Invoice, inv_id)
    if not i: raise HTTPException(404, "Invoice not found")
    if i.status == "paid":
        return _invoice_out(i)
    mark_invoice_paid(db, i)
    db.commit(); db.refresh(i)
    return _invoice_out(i)
