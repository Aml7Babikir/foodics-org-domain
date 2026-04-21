"""Merchant-facing subscription endpoints: checkout, manage, renew."""
from typing import List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from foodics_subscription_shared.db import get_session
from foodics_subscription_shared import models as m
from foodics_subscription_shared.pricing import quote_subscription

from ..services import (
    active_subscription, generate_checkout_invoice, generate_change_invoice,
    activate_subscription, mark_invoice_paid, bump_renewal, cycle_proration_factor,
)

router = APIRouter(tags=["subscription"])


# --- Shared IO types ------------------------------------------------------

class AddonSel(BaseModel):
    addon_id: int

class DeviceSel(BaseModel):
    device_sku_id: int
    quantity: int = 1

class SeparateSel(BaseModel):
    tier_id: int
    quantity: int = 1


def _subscription_out(s: m.Subscription):
    if s is None:
        return None
    return {
        "id": s.id,
        "merchant_id": s.merchant_id,
        "plan_id": s.plan_id,
        "plan_name": s.plan.name if s.plan else None,
        "plan_tier": s.plan.tier_order if s.plan else None,
        "currency": s.currency,
        "branches": s.branches,
        "status": s.status,
        "deal_stage": s.deal_stage,
        "billing_frequency": s.billing_frequency,
        "created_at": s.created_at.isoformat() if s.created_at else None,
        "activated_at": s.activated_at.isoformat() if s.activated_at else None,
        "next_renewal_at": s.next_renewal_at.isoformat() if s.next_renewal_at else None,
        "addons": [{"id": a.addon.id, "code": a.addon.code, "name": a.addon.name} for a in s.addons],
        "devices": [{"id": d.sku.id, "code": d.sku.code, "name": d.sku.name, "quantity": d.quantity} for d in s.devices],
        "separate": [{
            "tier_id": sp.tier.id, "product_code": sp.tier.product.code,
            "product_name": sp.tier.product.name, "tier_name": sp.tier.name,
            "billing_model": sp.tier.product.billing_model, "quantity": sp.quantity,
        } for sp in s.separate_products],
    }


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


# --- Read: current subscription -------------------------------------------

@router.get("/me/{merchant_id}/subscription")
def get_subscription(merchant_id: int, db: Session = Depends(get_session)):
    mm = db.get(m.Merchant, merchant_id)
    if not mm: raise HTTPException(404, "Merchant not found")
    sub = active_subscription(db, merchant_id)
    out = {
        "merchant_id": merchant_id,
        "has_subscription": sub is not None,
        "subscription": _subscription_out(sub),
    }
    if sub:
        out["quote"] = quote_subscription(db, sub)
        out["invoices"] = [_invoice_out(i) for i in sorted(sub.invoices, key=lambda x: x.issued_at or datetime.utcnow(), reverse=True)]
        out["pending_invoice"] = next(
            (_invoice_out(i) for i in sub.invoices if i.status == "pending"), None
        )
    return out


# --- Quote preview (no persistence) ---------------------------------------

class QuoteBody(BaseModel):
    plan_id: int
    currency: str
    branches: int = 1
    addons: List[AddonSel] = Field(default_factory=list)
    devices: List[DeviceSel] = Field(default_factory=list)
    separate: List[SeparateSel] = Field(default_factory=list)


def _build_draft_subscription(db: Session, body: QuoteBody) -> m.Subscription:
    plan = db.get(m.Plan, body.plan_id)
    if not plan: raise HTTPException(404, "Plan not found")
    sub = m.Subscription(
        merchant_id=0, plan_id=body.plan_id, currency=body.currency,
        branches=body.branches, status="draft", deal_stage="discovery",
    )
    sub.plan = plan; sub.addons = []; sub.devices = []; sub.separate_products = []
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
    return sub


@router.post("/quote")
def quote_preview(body: QuoteBody, db: Session = Depends(get_session)):
    sub = _build_draft_subscription(db, body)
    return quote_subscription(db, sub)


# --- First-time checkout --------------------------------------------------

class CheckoutBody(QuoteBody):
    merchant_id: int
    billing_frequency: str = "monthly"


@router.post("/checkout")
def checkout(body: CheckoutBody, db: Session = Depends(get_session)):
    merchant = db.get(m.Merchant, body.merchant_id)
    if not merchant: raise HTTPException(404, "Merchant not found")
    if active_subscription(db, body.merchant_id):
        raise HTTPException(409, "Merchant already has an active subscription. Use /change to modify.")
    plan = db.get(m.Plan, body.plan_id)
    if not plan: raise HTTPException(404, "Plan not found")

    sub = m.Subscription(
        merchant_id=body.merchant_id, plan_id=body.plan_id,
        currency=body.currency, branches=body.branches,
        billing_frequency=body.billing_frequency,
        status="pending_payment", deal_stage="collection",
    )
    db.add(sub); db.flush()
    for a in body.addons:
        db.add(m.SubscriptionAddon(subscription_id=sub.id, addon_id=a.addon_id))
    for d in body.devices:
        db.add(m.SubscriptionDevice(subscription_id=sub.id, device_sku_id=d.device_sku_id, quantity=d.quantity))
    for sp in body.separate:
        db.add(m.SubscriptionSeparateProduct(subscription_id=sub.id, tier_id=sp.tier_id, quantity=sp.quantity))
    db.flush()
    inv = generate_checkout_invoice(db, sub)
    db.commit(); db.refresh(sub); db.refresh(inv)
    return {
        "subscription": _subscription_out(sub),
        "invoice": _invoice_out(inv),
    }


# --- Change existing subscription (upgrade/downgrade/add-ons/devices) -----

class ChangeBody(BaseModel):
    merchant_id: int
    plan_id: Optional[int] = None
    branches: Optional[int] = None
    addons: Optional[List[AddonSel]] = None
    devices: Optional[List[DeviceSel]] = None
    separate: Optional[List[SeparateSel]] = None


def _apply_change(sub: m.Subscription, body: ChangeBody, db: Session):
    if body.plan_id is not None: sub.plan_id = body.plan_id
    if body.branches is not None: sub.branches = body.branches
    if body.addons is not None:
        for a in list(sub.addons): db.delete(a)
        db.flush()
        for a in body.addons: db.add(m.SubscriptionAddon(subscription_id=sub.id, addon_id=a.addon_id))
    if body.devices is not None:
        for d in list(sub.devices): db.delete(d)
        db.flush()
        for d in body.devices: db.add(m.SubscriptionDevice(subscription_id=sub.id, device_sku_id=d.device_sku_id, quantity=d.quantity))
    if body.separate is not None:
        for sp in list(sub.separate_products): db.delete(sp)
        db.flush()
        for sp in body.separate: db.add(m.SubscriptionSeparateProduct(subscription_id=sub.id, tier_id=sp.tier_id, quantity=sp.quantity))


@router.post("/preview-change")
def preview_change(body: ChangeBody, db: Session = Depends(get_session)):
    """Show old/new monthly + prorated delta — does not persist anything."""
    sub = active_subscription(db, body.merchant_id)
    if not sub: raise HTTPException(404, "No active subscription")
    old_quote = quote_subscription(db, sub)
    # Clone the subscription state in Python (we won't commit)
    snapshot = {
        "plan_id": sub.plan_id, "branches": sub.branches,
        "addons": [{"id": a.id, "addon_id": a.addon_id} for a in sub.addons],
        "devices": [{"id": d.id, "device_sku_id": d.device_sku_id, "quantity": d.quantity} for d in sub.devices],
        "separate": [{"id": s.id, "tier_id": s.tier_id, "quantity": s.quantity} for s in sub.separate_products],
    }
    try:
        _apply_change(sub, body, db)
        new_quote = quote_subscription(db, sub)
    finally:
        db.rollback()  # revert everything

    factor = cycle_proration_factor(sub)
    delta_full = new_quote["totals"]["grand_total"] - old_quote["totals"]["grand_total"]
    delta_prorated = round(delta_full * factor, 2)
    return {
        "old_total": old_quote["totals"]["grand_total"],
        "new_total": new_quote["totals"]["grand_total"],
        "delta_full_cycle": round(delta_full, 2),
        "proration_factor": round(factor, 4),
        "delta_prorated": delta_prorated,
        "charge_now": max(delta_prorated, 0),
        "credit": abs(min(delta_prorated, 0)),
        "currency": sub.currency,
        "billing_frequency": sub.billing_frequency,
        "new_quote": new_quote,
        "old_quote": old_quote,
    }


@router.post("/apply-change")
def apply_change(body: ChangeBody, db: Session = Depends(get_session)):
    sub = active_subscription(db, body.merchant_id)
    if not sub: raise HTTPException(404, "No active subscription")

    old_quote = quote_subscription(db, sub)
    _apply_change(sub, body, db)
    db.flush()
    new_quote = quote_subscription(db, sub)

    invoice = None
    delta = new_quote["totals"]["grand_total"] - old_quote["totals"]["grand_total"]
    if abs(delta) > 0.009:
        label = "Upgrade" if delta > 0 else "Downgrade credit"
        invoice = generate_change_invoice(db, sub, old_quote["totals"]["grand_total"], new_quote["totals"]["grand_total"], label)
        db.flush()

    db.commit(); db.refresh(sub)
    return {
        "subscription": _subscription_out(sub),
        "change_invoice": _invoice_out(invoice) if invoice else None,
        "new_monthly": new_quote["totals"]["grand_total"],
    }


# --- Cancel ---------------------------------------------------------------

class CancelBody(BaseModel):
    merchant_id: int


@router.post("/cancel")
def cancel(body: CancelBody, db: Session = Depends(get_session)):
    sub = active_subscription(db, body.merchant_id)
    if not sub: raise HTTPException(404, "No active subscription")
    sub.status = "cancelled"
    sub.deal_stage = "closed_lost"
    sub.cancelled_at = datetime.utcnow()
    db.commit(); db.refresh(sub)
    return _subscription_out(sub)


# --- Renewal --------------------------------------------------------------

@router.post("/renew/{merchant_id}")
def renew(merchant_id: int, db: Session = Depends(get_session)):
    """Simulate the renewal cycle: generate a fresh invoice for the next period."""
    sub = active_subscription(db, merchant_id)
    if not sub: raise HTTPException(404, "No active subscription")
    quote = quote_subscription(db, sub)
    from ..services import _next_invoice_number
    inv = m.Invoice(
        subscription_id=sub.id, number=_next_invoice_number(db),
        currency=sub.currency, total=quote["totals"]["grand_total"],
        status="pending", notes=f"Renewal — {sub.billing_frequency}",
    )
    db.add(inv); db.flush()
    for ln in quote["lines"]:
        db.add(m.InvoiceLine(
            invoice_id=inv.id, category=ln["category"], description=ln["description"],
            quantity=ln["quantity"], unit_price=ln["unit_price"], subtotal=ln["subtotal"],
        ))
    bump_renewal(sub)
    db.commit(); db.refresh(inv); db.refresh(sub)
    return {"invoice": _invoice_out(inv), "subscription": _subscription_out(sub)}
