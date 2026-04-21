"""Catalog read-only for merchant portal."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from foodics_subscription_shared.db import get_session
from foodics_subscription_shared import models as m

router = APIRouter(prefix="/catalog", tags=["catalog"])


@router.get("")
def get_catalog(db: Session = Depends(get_session)):
    currencies = [{"code": c.code, "symbol": c.symbol, "name": c.name, "region": c.region}
                  for c in db.query(m.Currency).all()]
    plans = []
    for p in db.query(m.Plan).order_by(m.Plan.tier_order).all():
        plans.append({
            "id": p.id, "code": p.code, "name": p.name,
            "tier_order": p.tier_order, "tagline": p.tagline, "description": p.description,
            "prices": {pr.currency: pr.monthly_price for pr in p.prices},
        })
    addons = []
    for a in db.query(m.Addon).order_by(m.Addon.name).all():
        addons.append({
            "id": a.id, "code": a.code, "name": a.name,
            "description": a.description, "min_tier": a.min_tier,
            "prices": {pr.currency: pr.monthly_price for pr in a.prices},
        })
    devices = []
    for d in db.query(m.DeviceSku).order_by(m.DeviceSku.name).all():
        devices.append({
            "id": d.id, "code": d.code, "name": d.name, "description": d.description,
            "prices": {pr.currency: pr.monthly_price for pr in d.prices},
        })
    separate = []
    for s in db.query(m.SeparateProduct).order_by(m.SeparateProduct.name).all():
        separate.append({
            "id": s.id, "code": s.code, "name": s.name,
            "billing_model": s.billing_model, "description": s.description,
            "tiers": [{
                "id": t.id, "code": t.code, "name": t.name, "tier_order": t.tier_order,
                "prices": {p.currency: p.price for p in t.prices}
            } for t in sorted(s.tiers, key=lambda x: x.tier_order)],
        })
    return {"currencies": currencies, "plans": plans, "addons": addons, "devices": devices, "separate": separate}
