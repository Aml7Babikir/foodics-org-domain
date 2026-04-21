"""Central pricing logic — used by both apps so quotes and invoices always agree."""
from sqlalchemy.orm import Session
from . import models as m


# Per-location setup fee — added on top of the per-branch plan price.
# Values are the merchant-facing amount in the target currency. Tweakable here.
LOCATION_FEE_PER_BRANCH = {
    "SAR": 1000,
    "AED": 1000,
    "EGP": 6000,
    "KWD": 80,
    "JOD": 200,
    "USD": 270,
    "SHL": 750,
}


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


def _location_fee(currency: str) -> float:
    # Default to 1000 (SAR-equivalent) if we don't have a regional entry.
    return float(LOCATION_FEE_PER_BRANCH.get(currency, 1000))


def quote_subscription(db: Session, subscription: m.Subscription) -> dict:
    """Return the stacked price breakdown for a subscription:
    Plan × branches + Location fees × branches + Add-ons + Devices + Separate."""
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

    location_unit = _location_fee(cur)
    location_subtotal = location_unit * subscription.branches
    lines.append({
        "category": "location",
        "description": f"Location fee × {subscription.branches} branch(es)",
        "quantity": subscription.branches,
        "unit_price": location_unit,
        "subtotal": location_subtotal,
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
        "location": location_subtotal,
        "addons": addon_total,
        "devices": device_total,
        "separate": separate_total,
        "grand_total": plan_subtotal + location_subtotal + addon_total + device_total + separate_total,
        "currency": cur,
    }
    return {"lines": lines, "totals": totals}
