"""Mock payment capture — always succeeds."""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from foodics_subscription_shared.db import get_session
from foodics_subscription_shared import models as m
from ..services import mark_invoice_paid

router = APIRouter(prefix="/payment", tags=["payment"])


class PayBody(BaseModel):
    invoice_id: int
    # Mock card info — we don't use it, but it makes the demo feel real.
    card_number: str = "4242424242424242"
    card_name: str = ""
    exp_mm: str = "12"
    exp_yy: str = "30"
    cvv: str = "123"


@router.post("/pay")
def pay(body: PayBody, db: Session = Depends(get_session)):
    inv = db.get(m.Invoice, body.invoice_id)
    if not inv: raise HTTPException(404, "Invoice not found")
    if inv.status == "paid":
        return {"ok": True, "status": "paid", "invoice_id": inv.id, "message": "Invoice already paid."}
    mark_invoice_paid(db, inv)
    db.commit(); db.refresh(inv)
    return {
        "ok": True,
        "status": "paid",
        "invoice_id": inv.id,
        "invoice_number": inv.number,
        "paid_at": inv.paid_at.isoformat(),
        "amount": inv.total,
        "currency": inv.currency,
        "receipt_reference": f"RCPT-{inv.id:06d}",
    }
