"""Business logic for the internal portal — mirrors the Salesforce → NetSuite flow."""
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from foodics_subscription_shared import models as m
from foodics_subscription_shared.pricing import quote_subscription


# Salesforce-stage → merchant-facing status (per the PDF table)
STAGE_TO_STATUS = {
    "discovery": "processing",
    "evaluation": "processing",
    "proposal": "processing",
    "contracting": "processing",
    "collection": "pending_payment",
    "closed_won": "completed",
    "closed_lost": "cancelled",
}


def status_for_stage(stage: str) -> str:
    return STAGE_TO_STATUS.get(stage, "processing")


def _next_invoice_number(db: Session) -> str:
    count = db.query(m.Invoice).count()
    return f"INV-{1000 + count + 1}"


def generate_invoice(db: Session, subscription: m.Subscription, notes: str = "") -> m.Invoice:
    """Generate a pending invoice for the current quote. Mimics the SF cron job."""
    quote = quote_subscription(db, subscription)
    inv = m.Invoice(
        subscription_id=subscription.id,
        number=_next_invoice_number(db),
        currency=subscription.currency,
        total=quote["totals"]["grand_total"],
        status="pending",
        notes=notes or None,
    )
    db.add(inv)
    db.flush()
    for ln in quote["lines"]:
        db.add(m.InvoiceLine(
            invoice_id=inv.id,
            category=ln["category"],
            description=ln["description"],
            quantity=ln["quantity"],
            unit_price=ln["unit_price"],
            subtotal=ln["subtotal"],
        ))
    return inv


def activate_subscription(db: Session, subscription: m.Subscription) -> None:
    """Salesforce 'Closed Won' path: flip to completed, set renewal."""
    subscription.deal_stage = "closed_won"
    subscription.status = "completed"
    subscription.activated_at = datetime.utcnow()
    if subscription.billing_frequency == "annual":
        subscription.next_renewal_at = subscription.activated_at + timedelta(days=365)
    else:
        subscription.next_renewal_at = subscription.activated_at + timedelta(days=30)


def move_to_stage(db: Session, subscription: m.Subscription, stage: str) -> None:
    subscription.deal_stage = stage
    subscription.status = status_for_stage(stage)
    if stage == "closed_won":
        activate_subscription(db, subscription)
    if stage == "closed_lost":
        subscription.cancelled_at = datetime.utcnow()


def mark_invoice_paid(db: Session, invoice: m.Invoice) -> None:
    invoice.status = "paid"
    invoice.paid_at = datetime.utcnow()
    # On payment, if the subscription was pending_payment, activate it.
    sub = invoice.subscription
    if sub.status in ("processing", "pending_payment"):
        activate_subscription(db, sub)
