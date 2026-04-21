"""Mock Salesforce integration.

Accepts any SF account number. Some are pre-filled (demo "completed" accounts).
Unknown numbers return a deterministically-generated record with some fields blank,
so the sales rep has to top them up before the first invoice can be issued.
"""
import hashlib
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from foodics_subscription_shared.db import get_session
from foodics_subscription_shared import models as m

router = APIRouter(prefix="/sf", tags=["salesforce"])


# A few "known good" SF accounts the rep might look up — fully populated.
KNOWN = {
    "ACC-20001": {
        "name": "Jumeirah Burger Co.",
        "email": "billing@jumeirah-burger.ae",
        "country": "United Arab Emirates",
        "currency": "AED",
        "cr_number": "CN-4501982",
        "vat_number": "100817462300003",
        "legal_identifier": "Jumeirah Burger Trading LLC",
    },
    "ACC-20002": {
        "name": "Harat Mecca Bakery",
        "email": "ops@haratmecca.sa",
        "country": "Saudi Arabia",
        "currency": "SAR",
        "cr_number": "1010987654",
        "vat_number": "300918273600003",
        "legal_identifier": "Harat Mecca Bakeries LLC",
    },
    "ACC-20003": {
        "name": "Cairo Coffee Collective",
        "email": "hq@cairocoffee.eg",
        "country": "Egypt",
        "currency": "EGP",
        "cr_number": "EG-339281",
        "vat_number": "781-342-998",
        "legal_identifier": "Cairo Coffee Collective S.A.E",
    },
    "ACC-20010": {
        "name": "Gulf Shawarma House",
        "email": "accounts@gulfshawarma.kw",
        "country": "Kuwait",
        "currency": "KWD",
        # Intentionally missing VAT + legal_identifier — demo that rep has to complete it.
        "cr_number": "KW-447281",
        "vat_number": None,
        "legal_identifier": None,
    },
    "ACC-20011": {
        "name": "Amman Noodle Bar",
        "email": None,  # Intentionally missing — rep must add.
        "country": "Jordan",
        "currency": "JOD",
        "cr_number": "JO-201873",
        "vat_number": None,
        "legal_identifier": None,
    },
}

_NAMES = [
    "Al Sharq Café", "Marina Grill", "Oasis Kitchen", "Nomad Deli", "Star Eatery",
    "Corniche Brasserie", "Spice Route", "Palm Bistro", "Shamseen Bakery", "Gulf Diner",
]
_COUNTRIES = [
    ("Saudi Arabia", "SAR"), ("United Arab Emirates", "AED"), ("Egypt", "EGP"),
    ("Kuwait", "KWD"), ("Jordan", "JOD"), ("Oman", "USD"), ("Bahrain", "USD"),
]


def _synth_record(account_number: str) -> dict:
    """For unknown SF numbers, generate a plausible record — but leave some fields blank
    so the sales rep demo shows the 'please complete before invoicing' flow."""
    h = hashlib.sha1(account_number.encode()).digest()
    name = _NAMES[h[0] % len(_NAMES)]
    country, currency = _COUNTRIES[h[1] % len(_COUNTRIES)]
    suffix = h[2] % 99
    return {
        "name": f"{name} ({suffix})",
        "email": None if h[3] % 2 else f"billing@{name.split()[0].lower()}-{suffix}.example",
        "country": country,
        "currency": currency,
        "cr_number": f"CR-{int.from_bytes(h[4:7], 'big') % 1_000_000_000:09d}" if h[7] % 3 else None,
        "vat_number": None if h[8] % 2 else f"VAT-{int.from_bytes(h[9:12], 'big') % 1_000_000_000:09d}",
        "legal_identifier": None if h[12] % 2 else f"{name} Trading LLC",
    }


@router.get("/account/{account_number}")
def lookup_account(account_number: str, db: Session = Depends(get_session)):
    """Look up an SF account. Returns existing merchant if we've already imported it,
    or the SF record (with missing fields marked) for a new import."""
    account_number = account_number.strip().upper()
    if not account_number:
        raise HTTPException(400, "Account number required")

    # If we already imported this account, return the merchant as-is.
    existing = db.query(m.Merchant).filter_by(sf_account_number=account_number).first()
    if existing:
        return {
            "already_imported": True,
            "merchant_id": existing.id,
            "record": {
                "name": existing.name, "email": existing.email, "country": existing.country,
                "currency": existing.currency, "cr_number": existing.cr_number,
                "vat_number": existing.vat_number, "legal_identifier": existing.legal_identifier,
            },
            "missing": existing.missing_required_fields(),
        }

    record = KNOWN.get(account_number) or _synth_record(account_number)
    missing = [k for k in ("email", "country", "cr_number", "vat_number", "legal_identifier")
               if not record.get(k)]
    return {
        "already_imported": False,
        "account_number": account_number,
        "record": record,
        "missing": missing,
    }


class ImportBody(BaseModel):
    sf_account_number: str
    name: str
    email: Optional[str] = None
    country: Optional[str] = None
    currency: str = "SAR"
    cr_number: Optional[str] = None
    vat_number: Optional[str] = None
    legal_identifier: Optional[str] = None
    branches_count: int = 1


@router.post("/import")
def import_merchant(body: ImportBody, db: Session = Depends(get_session)):
    """Create a merchant from the SF record (rep may have topped up missing fields)."""
    existing = db.query(m.Merchant).filter_by(sf_account_number=body.sf_account_number).first()
    if existing:
        raise HTTPException(409, f"Already imported as merchant #{existing.id}")

    mm = m.Merchant(
        name=body.name, email=body.email or "", country=body.country,
        currency=body.currency, branches_count=body.branches_count,
        sf_account_number=body.sf_account_number,
        cr_number=body.cr_number, vat_number=body.vat_number,
        legal_identifier=body.legal_identifier,
        sf_synced_at=datetime.utcnow(),
    )
    db.add(mm); db.commit(); db.refresh(mm)
    return {
        "id": mm.id, "name": mm.name, "email": mm.email, "country": mm.country,
        "currency": mm.currency, "sf_account_number": mm.sf_account_number,
        "cr_number": mm.cr_number, "vat_number": mm.vat_number,
        "legal_identifier": mm.legal_identifier,
        "missing": mm.missing_required_fields(),
    }


class MerchantPatch(BaseModel):
    email: Optional[str] = None
    country: Optional[str] = None
    cr_number: Optional[str] = None
    vat_number: Optional[str] = None
    legal_identifier: Optional[str] = None


@router.patch("/merchants/{merchant_id}")
def patch_merchant(merchant_id: int, body: MerchantPatch, db: Session = Depends(get_session)):
    """Sales rep tops up missing compliance fields before invoicing."""
    mm = db.get(m.Merchant, merchant_id)
    if not mm: raise HTTPException(404, "Merchant not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        if v is not None and v != "":
            setattr(mm, k, v)
    db.commit(); db.refresh(mm)
    return {
        "id": mm.id, "name": mm.name, "email": mm.email, "country": mm.country,
        "currency": mm.currency, "sf_account_number": mm.sf_account_number,
        "cr_number": mm.cr_number, "vat_number": mm.vat_number,
        "legal_identifier": mm.legal_identifier,
        "missing": mm.missing_required_fields(),
    }
