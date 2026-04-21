"""Seed the shared catalog. Idempotent — safe to run repeatedly."""
from datetime import datetime, timedelta
from sqlalchemy import inspect as sa_inspect, text
from .db import Base, engine, SessionLocal
from . import models as m
from . import catalog_data as cat


def _migrate_schema():
    """Lightweight column-add migration for SQLite so old DBs pick up new merchant fields."""
    inspector = sa_inspect(engine)
    if "merchants" in inspector.get_table_names():
        cols = [c["name"] for c in inspector.get_columns("merchants")]
        additions = [
            ("sf_account_number", "VARCHAR(60)"),
            ("cr_number",         "VARCHAR(60)"),
            ("vat_number",        "VARCHAR(60)"),
            ("legal_identifier",  "VARCHAR(160)"),
            ("sf_synced_at",      "DATETIME"),
        ]
        with engine.connect() as conn:
            for col, ctype in additions:
                if col not in cols:
                    conn.execute(text(f"ALTER TABLE merchants ADD COLUMN {col} {ctype}"))
            conn.commit()


def seed():
    Base.metadata.create_all(bind=engine)
    _migrate_schema()
    db = SessionLocal()
    try:
        # Currencies
        for c in cat.CURRENCIES:
            if not db.get(m.Currency, c["code"]):
                db.add(m.Currency(**c))

        # Plans
        for p in cat.PLANS:
            plan = db.query(m.Plan).filter_by(code=p["code"]).first()
            if not plan:
                plan = m.Plan(code=p["code"], name=p["name"], tier_order=p["tier_order"],
                              tagline=p["tagline"], description=p["description"])
                db.add(plan)
                db.flush()
            else:
                plan.name = p["name"]; plan.tier_order = p["tier_order"]
                plan.tagline = p["tagline"]; plan.description = p["description"]
            for cur, price in p["prices"].items():
                row = db.query(m.PlanPrice).filter_by(plan_id=plan.id, currency=cur).first()
                if row:
                    row.monthly_price = price
                else:
                    db.add(m.PlanPrice(plan_id=plan.id, currency=cur, monthly_price=price))

        # Addons
        for a in cat.ADDONS:
            ad = db.query(m.Addon).filter_by(code=a["code"]).first()
            if not ad:
                ad = m.Addon(code=a["code"], name=a["name"], description=a["description"], min_tier=a["min_tier"])
                db.add(ad); db.flush()
            else:
                ad.name = a["name"]; ad.description = a["description"]; ad.min_tier = a["min_tier"]
            for cur, price in a["prices"].items():
                row = db.query(m.AddonPrice).filter_by(addon_id=ad.id, currency=cur).first()
                if row: row.monthly_price = price
                else: db.add(m.AddonPrice(addon_id=ad.id, currency=cur, monthly_price=price))

        # Device SKUs
        for d in cat.DEVICE_SKUS:
            sku = db.query(m.DeviceSku).filter_by(code=d["code"]).first()
            if not sku:
                sku = m.DeviceSku(code=d["code"], name=d["name"], description=d["description"])
                db.add(sku); db.flush()
            else:
                sku.name = d["name"]; sku.description = d["description"]
            for cur, price in d["prices"].items():
                row = db.query(m.DevicePrice).filter_by(device_sku_id=sku.id, currency=cur).first()
                if row: row.monthly_price = price
                else: db.add(m.DevicePrice(device_sku_id=sku.id, currency=cur, monthly_price=price))

        # Separate products
        for sp in cat.SEPARATE_PRODUCTS:
            prod = db.query(m.SeparateProduct).filter_by(code=sp["code"]).first()
            if not prod:
                prod = m.SeparateProduct(code=sp["code"], name=sp["name"],
                                         billing_model=sp["billing_model"], description=sp["description"])
                db.add(prod); db.flush()
            else:
                prod.name = sp["name"]; prod.billing_model = sp["billing_model"]; prod.description = sp["description"]
            for t in sp["tiers"]:
                tier = db.query(m.SeparateProductTier).filter_by(product_id=prod.id, code=t["code"]).first()
                if not tier:
                    tier = m.SeparateProductTier(product_id=prod.id, code=t["code"],
                                                 name=t["name"], tier_order=t["tier_order"])
                    db.add(tier); db.flush()
                else:
                    tier.name = t["name"]; tier.tier_order = t["tier_order"]
                for cur, price in t["prices"].items():
                    row = db.query(m.SeparateProductPrice).filter_by(tier_id=tier.id, currency=cur).first()
                    if row: row.price = price
                    else: db.add(m.SeparateProductPrice(tier_id=tier.id, currency=cur, price=price))

        # Sample merchants (so CS console has something to show).
        # Upserts by name so old DBs without SF fields get backfilled.
        samples = None
        if True:
            samples = [
                {"name": "Qahwa & Co.",          "email": "ops@qahwaco.sa",      "country": "Saudi Arabia",        "currency": "SAR",
                 "branches_count": 3, "sf_account_number": "ACC-10042",
                 "cr_number": "1010384927", "vat_number": "300451928700003", "legal_identifier": "Qahwa & Co. Trading LLC",
                 "sf_synced_at": datetime.utcnow()},
                {"name": "Sultan Falafel",       "email": "finance@sultan.ae",   "country": "United Arab Emirates","currency": "AED",
                 "branches_count": 2, "sf_account_number": "ACC-10077",
                 "cr_number": "CN-2998472",  "vat_number": "100528374900003", "legal_identifier": "Sultan Falafel Rest. LLC",
                 "sf_synced_at": datetime.utcnow()},
                {"name": "El Nile Bistro",       "email": "ceo@elnile.eg",       "country": "Egypt",               "currency": "EGP",
                 "branches_count": 5, "sf_account_number": "ACC-10108",
                 "cr_number": "EG-782361",    "vat_number": "457-289-672",      "legal_identifier": "El Nile for Food Services S.A.E",
                 "sf_synced_at": datetime.utcnow()},
                {"name": "Desert Rose Fine Dining","email": "gm@desertrose.sa",  "country": "Saudi Arabia",        "currency": "SAR",
                 "branches_count": 1, "sf_account_number": "ACC-10165",
                 "cr_number": "1010592103",  "vat_number": "310984561200003", "legal_identifier": "Desert Rose Hospitality LLC",
                 "sf_synced_at": datetime.utcnow()},
                {"name": "Amman Grill House",    "email": "ops@ammangrill.jo",   "country": "Jordan",              "currency": "JOD",
                 "branches_count": 2, "sf_account_number": "ACC-10211",
                 "cr_number": "JO-200193724", "vat_number": "9938475610",     "legal_identifier": "Amman Grill Co.",
                 "sf_synced_at": datetime.utcnow()},
            ]
            for s in samples:
                existing = db.query(m.Merchant).filter_by(name=s["name"]).first()
                if existing is None:
                    db.add(m.Merchant(**s))
                else:
                    # Backfill any blank SF fields so the CS console renders consistently.
                    for k, v in s.items():
                        if getattr(existing, k, None) in (None, "") and v:
                            setattr(existing, k, v)

        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    seed()
    print("Catalog seeded.")
