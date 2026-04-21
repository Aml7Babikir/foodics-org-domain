"""Catalog read + edit endpoints (Admin persona)."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from foodics_subscription_shared.db import get_session
from foodics_subscription_shared import models as m

router = APIRouter(prefix="/catalog", tags=["catalog"])


def _plan_out(p: m.Plan):
    return {
        "id": p.id, "code": p.code, "name": p.name,
        "tier_order": p.tier_order, "tagline": p.tagline, "description": p.description,
        "prices": {pr.currency: pr.monthly_price for pr in p.prices},
    }

def _addon_out(a: m.Addon):
    return {
        "id": a.id, "code": a.code, "name": a.name,
        "description": a.description, "min_tier": a.min_tier,
        "prices": {pr.currency: pr.monthly_price for pr in a.prices},
    }

def _device_out(d: m.DeviceSku):
    return {
        "id": d.id, "code": d.code, "name": d.name, "description": d.description,
        "prices": {pr.currency: pr.monthly_price for pr in d.prices},
    }

def _separate_out(s: m.SeparateProduct):
    return {
        "id": s.id, "code": s.code, "name": s.name,
        "billing_model": s.billing_model, "description": s.description,
        "tiers": [{
            "id": t.id, "code": t.code, "name": t.name, "tier_order": t.tier_order,
            "prices": {p.currency: p.price for p in t.prices}
        } for t in sorted(s.tiers, key=lambda x: x.tier_order)],
    }


@router.get("")
def get_catalog(db: Session = Depends(get_session)):
    return {
        "currencies": [{"code": c.code, "symbol": c.symbol, "name": c.name, "region": c.region}
                       for c in db.query(m.Currency).all()],
        "plans":    [_plan_out(p)    for p in db.query(m.Plan).order_by(m.Plan.tier_order).all()],
        "addons":   [_addon_out(a)   for a in db.query(m.Addon).order_by(m.Addon.name).all()],
        "devices":  [_device_out(d)  for d in db.query(m.DeviceSku).order_by(m.DeviceSku.name).all()],
        "separate": [_separate_out(s) for s in db.query(m.SeparateProduct).order_by(m.SeparateProduct.name).all()],
    }


class PriceUpdate(BaseModel):
    currency: str
    price: float


@router.put("/plans/{plan_id}/price")
def update_plan_price(plan_id: int, body: PriceUpdate, db: Session = Depends(get_session)):
    plan = db.get(m.Plan, plan_id)
    if not plan:
        raise HTTPException(404, "Plan not found")
    row = db.query(m.PlanPrice).filter_by(plan_id=plan_id, currency=body.currency).first()
    if row:
        row.monthly_price = body.price
    else:
        db.add(m.PlanPrice(plan_id=plan_id, currency=body.currency, monthly_price=body.price))
    db.commit()
    db.refresh(plan)
    return _plan_out(plan)


@router.put("/addons/{addon_id}/price")
def update_addon_price(addon_id: int, body: PriceUpdate, db: Session = Depends(get_session)):
    a = db.get(m.Addon, addon_id)
    if not a: raise HTTPException(404, "Addon not found")
    row = db.query(m.AddonPrice).filter_by(addon_id=addon_id, currency=body.currency).first()
    if row: row.monthly_price = body.price
    else: db.add(m.AddonPrice(addon_id=addon_id, currency=body.currency, monthly_price=body.price))
    db.commit(); db.refresh(a)
    return _addon_out(a)


@router.put("/devices/{device_id}/price")
def update_device_price(device_id: int, body: PriceUpdate, db: Session = Depends(get_session)):
    d = db.get(m.DeviceSku, device_id)
    if not d: raise HTTPException(404, "Device not found")
    row = db.query(m.DevicePrice).filter_by(device_sku_id=device_id, currency=body.currency).first()
    if row: row.monthly_price = body.price
    else: db.add(m.DevicePrice(device_sku_id=device_id, currency=body.currency, monthly_price=body.price))
    db.commit(); db.refresh(d)
    return _device_out(d)


@router.put("/separate-tiers/{tier_id}/price")
def update_separate_price(tier_id: int, body: PriceUpdate, db: Session = Depends(get_session)):
    t = db.get(m.SeparateProductTier, tier_id)
    if not t: raise HTTPException(404, "Tier not found")
    row = db.query(m.SeparateProductPrice).filter_by(tier_id=tier_id, currency=body.currency).first()
    if row: row.price = body.price
    else: db.add(m.SeparateProductPrice(tier_id=tier_id, currency=body.currency, price=body.price))
    db.commit(); db.refresh(t.product)
    return _separate_out(t.product)
