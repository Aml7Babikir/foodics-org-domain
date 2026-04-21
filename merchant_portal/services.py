"""Merchant-portal business logic — reuses shared models and pricing."""
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from foodics_subscription_shared import models as m
from foodics_subscription_shared.pricing import quote_subscription


def active_subscription(db: Session, merchant_id: int):
    """Return the merchant's most recent non-cancelled subscription, or None."""
    q = (db.query(m.Subscription)
         .filter(m.Subscription.merchant_id == merchant_id)
         .filter(m.Subscription.status != "cancelled")
         .order_by(m.Subscription.created_at.desc()))
    return q.first()


def _next_invoice_number(db: Session) -> str:
    count = db.query(m.Invoice).count()
    return f"INV-{1000 + count + 1}"


def days_in_cycle(frequency: str) -> int:
    return 365 if frequency == "annual" else 30


def cycle_proration_factor(subscription: m.Subscription, now: datetime = None) -> float:
    """Returns (days_remaining / days_in_cycle) — how much of the current cycle is left."""
    if not subscription.activated_at:
        return 1.0
    now = now or datetime.utcnow()
    full = days_in_cycle(subscription.billing_frequency)
    elapsed = (now - subscription.activated_at).days % full
    remaining = max(1, full - elapsed)
    return remaining / full


def generate_checkout_invoice(db: Session, subscription: m.Subscription) -> m.Invoice:
    """First-time checkout: full monthly invoice, pending until paid."""
    quote = quote_subscription(db, subscription)
    inv = m.Invoice(
        subscription_id=subscription.id,
        number=_next_invoice_number(db),
        currency=subscription.currency,
        total=quote["totals"]["grand_total"],
        status="pending",
        notes="Initial checkout invoice",
    )
    db.add(inv); db.flush()
    for ln in quote["lines"]:
        db.add(m.InvoiceLine(
            invoice_id=inv.id,
            category=ln["category"], description=ln["description"],
            quantity=ln["quantity"], unit_price=ln["unit_price"], subtotal=ln["subtotal"],
        ))
    return inv


def generate_change_invoice(
    db: Session,
    subscription: m.Subscription,
    old_total: float,
    new_total: float,
    change_label: str,
) -> m.Invoice:
    """Mid-cycle change: charge the prorated difference. Credit if downgrade."""
    factor = cycle_proration_factor(subscription)
    delta = (new_total - old_total) * factor
    inv = m.Invoice(
        subscription_id=subscription.id,
        number=_next_invoice_number(db),
        currency=subscription.currency,
        total=round(delta, 2),
        status="pending" if delta > 0.01 else "paid",
        issued_at=datetime.utcnow(),
        paid_at=datetime.utcnow() if delta <= 0.01 else None,
        notes=f"{change_label} — prorated ({int(factor * 100)}% of cycle remaining)",
    )
    db.add(inv); db.flush()
    db.add(m.InvoiceLine(
        invoice_id=inv.id, category="proration",
        description=f"{change_label} — prorated (new total {new_total:.2f} − old total {old_total:.2f}) × {factor:.2f}",
        quantity=1, unit_price=round(delta, 2), subtotal=round(delta, 2),
    ))
    return inv


def activate_subscription(subscription: m.Subscription) -> None:
    subscription.deal_stage = "closed_won"
    subscription.status = "completed"
    subscription.activated_at = datetime.utcnow()
    bump_renewal(subscription)


def bump_renewal(subscription: m.Subscription) -> None:
    days = days_in_cycle(subscription.billing_frequency)
    base = subscription.activated_at or datetime.utcnow()
    subscription.next_renewal_at = base + timedelta(days=days)


def mark_invoice_paid(db: Session, invoice: m.Invoice) -> None:
    invoice.status = "paid"
    invoice.paid_at = datetime.utcnow()
    sub = invoice.subscription
    # If this was the initial invoice, activate.
    if sub.status in ("processing", "pending_payment") and not sub.activated_at:
        activate_subscription(sub)
