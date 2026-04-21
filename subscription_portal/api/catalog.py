"""Catalog read + edit + create endpoints (Admin persona)."""
from typing import Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from foodics_subscription_shared.db import get_session
from foodics_subscription_shared import models as m

router = APIRouter(prefix="/catalog", tags=["catalog"])


# --- Output shapers --------------------------------------------------------

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


# --- Read ------------------------------------------------------------------

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


# --- Price updates (existing) ---------------------------------------------

class PriceUpdate(BaseModel):
    currency: str
    price: float


@router.put("/plans/{plan_id}/price")
def update_plan_price(plan_id: int, body: PriceUpdate, db: Session = Depends(get_session)):
    plan = db.get(m.Plan, plan_id)
    if not plan: raise HTTPException(404, "Plan not found")
    row = db.query(m.PlanPrice).filter_by(plan_id=plan_id, currency=body.currency).first()
    if row: row.monthly_price = body.price
    else: db.add(m.PlanPrice(plan_id=plan_id, currency=body.currency, monthly_price=body.price))
    db.commit(); db.refresh(plan)
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


# --- Create ----------------------------------------------------------------

def _known_currency_codes(db: Session) -> set:
    return {c.code for c in db.query(m.Currency).all()}


def _code_taken(db: Session, model, code: str) -> bool:
    return db.query(model).filter_by(code=code).first() is not None


class PlanCreate(BaseModel):
    code: str
    name: str
    tier_order: int
    tagline: Optional[str] = None
    description: Optional[str] = None
    prices: Dict[str, float] = Field(default_factory=dict)


@router.post("/plans", status_code=201)
def create_plan(body: PlanCreate, db: Session = Depends(get_session)):
    if _code_taken(db, m.Plan, body.code):
        raise HTTPException(409, f"Plan with code '{body.code}' already exists")
    known = _known_currency_codes(db)
    unknown = [c for c in body.prices.keys() if c not in known]
    if unknown:
        raise HTTPException(400, f"Unknown currency code(s): {unknown}")

    plan = m.Plan(code=body.code, name=body.name, tier_order=body.tier_order,
                  tagline=body.tagline, description=body.description)
    db.add(plan); db.flush()
    for cur, price in body.prices.items():
        db.add(m.PlanPrice(plan_id=plan.id, currency=cur, monthly_price=float(price)))
    db.commit(); db.refresh(plan)
    return _plan_out(plan)


class AddonCreate(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    min_tier: int = 1
    prices: Dict[str, float] = Field(default_factory=dict)


@router.post("/addons", status_code=201)
def create_addon(body: AddonCreate, db: Session = Depends(get_session)):
    if _code_taken(db, m.Addon, body.code):
        raise HTTPException(409, f"Add-on with code '{body.code}' already exists")
    known = _known_currency_codes(db)
    unknown = [c for c in body.prices.keys() if c not in known]
    if unknown: raise HTTPException(400, f"Unknown currency code(s): {unknown}")

    a = m.Addon(code=body.code, name=body.name, description=body.description, min_tier=body.min_tier)
    db.add(a); db.flush()
    for cur, price in body.prices.items():
        db.add(m.AddonPrice(addon_id=a.id, currency=cur, monthly_price=float(price)))
    db.commit(); db.refresh(a)
    return _addon_out(a)


class DeviceCreate(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    prices: Dict[str, float] = Field(default_factory=dict)


@router.post("/devices", status_code=201)
def create_device(body: DeviceCreate, db: Session = Depends(get_session)):
    if _code_taken(db, m.DeviceSku, body.code):
        raise HTTPException(409, f"Device with code '{body.code}' already exists")
    known = _known_currency_codes(db)
    unknown = [c for c in body.prices.keys() if c not in known]
    if unknown: raise HTTPException(400, f"Unknown currency code(s): {unknown}")

    d = m.DeviceSku(code=body.code, name=body.name, description=body.description)
    db.add(d); db.flush()
    for cur, price in body.prices.items():
        db.add(m.DevicePrice(device_sku_id=d.id, currency=cur, monthly_price=float(price)))
    db.commit(); db.refresh(d)
    return _device_out(d)


class SeparateTierInput(BaseModel):
    code: str
    name: str
    tier_order: int = 1
    prices: Dict[str, float] = Field(default_factory=dict)


class SeparateProductCreate(BaseModel):
    code: str
    name: str
    billing_model: str = "monthly"   # monthly | annual | transactional
    description: Optional[str] = None
    tiers: List[SeparateTierInput] = Field(default_factory=list)


@router.post("/separate", status_code=201)
def create_separate_product(body: SeparateProductCreate, db: Session = Depends(get_session)):
    if body.billing_model not in {"monthly", "annual", "transactional"}:
        raise HTTPException(400, "billing_model must be one of: monthly, annual, transactional")
    if _code_taken(db, m.SeparateProduct, body.code):
        raise HTTPException(409, f"Separate product with code '{body.code}' already exists")
    known = _known_currency_codes(db)
    for t in body.tiers:
        unknown = [c for c in t.prices.keys() if c not in known]
        if unknown: raise HTTPException(400, f"Unknown currency code(s) on tier '{t.code}': {unknown}")

    prod = m.SeparateProduct(code=body.code, name=body.name,
                             billing_model=body.billing_model, description=body.description)
    db.add(prod); db.flush()
    for t in body.tiers:
        tier = m.SeparateProductTier(product_id=prod.id, code=t.code, name=t.name, tier_order=t.tier_order)
        db.add(tier); db.flush()
        for cur, price in t.prices.items():
            db.add(m.SeparateProductPrice(tier_id=tier.id, currency=cur, price=float(price)))
    db.commit(); db.refresh(prod)
    return _separate_out(prod)


class CurrencyCreate(BaseModel):
    code: str
    symbol: str
    name: str
    region: str


@router.post("/currencies", status_code=201)
def create_currency(body: CurrencyCreate, db: Session = Depends(get_session)):
    code = body.code.strip().upper()
    if db.get(m.Currency, code):
        raise HTTPException(409, f"Currency '{code}' already exists")
    try:
        cur = m.Currency(code=code, symbol=body.symbol, name=body.name, region=body.region)
        db.add(cur); db.commit(); db.refresh(cur)
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, f"Currency '{code}' already exists")
    return {"code": cur.code, "symbol": cur.symbol, "name": cur.name, "region": cur.region}
