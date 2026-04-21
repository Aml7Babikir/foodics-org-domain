"""Merchant sign-in — lookup by email OR Salesforce account number.
Session is client-side (we return the merchant id; frontend stores it in localStorage).
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from foodics_subscription_shared.db import get_session
from foodics_subscription_shared import models as m

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginBody(BaseModel):
    identifier: str


def _merchant_out(mm: m.Merchant):
    return {
        "id": mm.id, "name": mm.name, "email": mm.email,
        "country": mm.country, "currency": mm.currency,
        "branches_count": mm.branches_count,
        "sf_account_number": mm.sf_account_number,
        "cr_number": mm.cr_number, "vat_number": mm.vat_number,
        "legal_identifier": mm.legal_identifier,
        "missing_fields": mm.missing_required_fields(),
    }


@router.post("/login")
def login(body: LoginBody, db: Session = Depends(get_session)):
    """Identifier can be email, SF account number, or company name (demo: permissive)."""
    key = body.identifier.strip()
    if not key:
        raise HTTPException(400, "Identifier required")

    mm = (
        db.query(m.Merchant).filter(m.Merchant.email.ilike(key)).first()
        or db.query(m.Merchant).filter(m.Merchant.sf_account_number.ilike(key)).first()
        or db.query(m.Merchant).filter(m.Merchant.name.ilike(key)).first()
    )
    if not mm:
        raise HTTPException(404, "Merchant not found. Try an email or SF account number.")
    return _merchant_out(mm)


@router.get("/merchants")
def list_merchants(db: Session = Depends(get_session)):
    """Demo helper — dropdown of existing merchants."""
    return [_merchant_out(x) for x in db.query(m.Merchant).order_by(m.Merchant.name).all()]


@router.get("/me/{merchant_id}")
def me(merchant_id: int, db: Session = Depends(get_session)):
    mm = db.get(m.Merchant, merchant_id)
    if not mm: raise HTTPException(404, "Merchant not found")
    return _merchant_out(mm)
