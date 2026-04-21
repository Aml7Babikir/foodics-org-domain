"""Central pricing logic — used by both apps so quotes and invoices always agree."""
from sqlalchemy.orm import Session
from . import models as m


def _plan_price(db: Session, plan_id: int, currency: str) -> float:
    row = db.query(m.PlanPrice).filter_by(plan_id=plan_id, currency=currency).first()
    return row.monthly_price if row else 0.0


def _addon_price(db: Session, addon_id: int, currency: str) -> float:
    row = db.query(m.AddonPrice).filter_by(addon_id=addon_id, currency=currency).first()
    return row.monthly_price if row else 0.0


def _device_price(db: Session, device_sku_id: int, currency: str) -> float:
    row = db.query(m.DevicePrice).filter_by(device_sku_id=device_sku_id, currency=currency).first()
    return row.monthly_price if row else 0.0


def _separate_tier_price(db: Session, tier_id: int, currency: str) -> float:
    row = db.query(m.SeparateProductPrice).filter_by(tier_id=tier_id, currency=currency).first()
    return row.price if row else 0.0


def quote_subscription(db: Session, subscription: m.Subscription) -> dict:
    """Return the four-layer price breakdown for a subscription."""
    cur = subscription.currency
    lines = []

    plan_unit = _plan_price(db, subscription.plan_id, cur)
    plan_subtotal = plan_unit * subscription.branches
    lines.append({
        "category": "plan",
        "description": f"{subscription.plan.name} plan × {subscription.branches} branch(es)",
        "quantity": subscription.branches,
        "unit_price": plan_unit,
        "subtotal": plan_subtotal,
    })

    addon_total = 0.0
    for sa in subscription.addons:
        p = _addon_price(db, sa.addon_id, cur)
        addon_total += p
        lines.append({
            "category": "addon",
            "description": f"{sa.addon.name} (add-on)",
            "quantity": 1,
            "unit_price": p,
            "subtotal": p,
        })

    device_total = 0.0
    for sd in subscription.devices:
        p = _device_price(db, sd.device_sku_id, cur)
        sub = p * sd.quantity
        device_total += sub
        lines.append({
            "category": "device",
            "description": f"{sd.sku.name} × {sd.quantity}",
            "quantity": sd.quantity,
            "unit_price": p,
            "subtotal": sub,
        })

    separate_total = 0.0
    for ssp in subscription.separate_products:
        p = _separate_tier_price(db, ssp.tier_id, cur)
        sub = p * ssp.quantity
        separate_total += sub
        lines.append({
            "category": "separate",
            "description": f"{ssp.tier.product.name} — {ssp.tier.name} × {ssp.quantity}",
            "quantity": ssp.quantity,
            "unit_price": p,
            "subtotal": sub,
        })

    totals = {
        "plan": plan_subtotal,
        "addons": addon_total,
        "devices": device_total,
        "separate": separate_total,
        "grand_total": plan_subtotal + addon_total + device_total + separate_total,
        "currency": cur,
    }
    return {"lines": lines, "totals": totals}
