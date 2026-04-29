import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request


class NoCacheStaticMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        if request.url.path.startswith("/static/"):
            response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        return response
from app.models.base import Base
from app.core.database import engine
# Import models so SQLAlchemy registers the tables before create_all().
from app.models import manage as _manage_models  # noqa: F401
from app.api.routes import hierarchy, config, users, delegation, templates, manage

# Create all org-domain tables
Base.metadata.create_all(bind=engine)

# Subscription Portal + Merchant Portal live under /subs and /merchant respectively.
# Both share the same SQLite DB (via foodics_subscription_shared). Seed it once here.
from foodics_subscription_shared.seed import seed as _seed_subscription_catalog
_seed_subscription_catalog()

from subscription_portal.api import catalog as _sp_catalog
from subscription_portal.api import subscriptions as _sp_subscriptions
from subscription_portal.api import salesforce as _sp_salesforce
from merchant_portal.api import auth as _mp_auth
from merchant_portal.api import catalog as _mp_catalog
from merchant_portal.api import subscription as _mp_subscription
from merchant_portal.api import payment as _mp_payment

# Lightweight migrations for new columns on existing tables
from sqlalchemy import inspect as sa_inspect, text
with engine.connect() as conn:
    inspector = sa_inspect(engine)

    le_cols = [c["name"] for c in inspector.get_columns("legal_entities")]
    if "email" not in le_cols:
        conn.execute(text("ALTER TABLE legal_entities ADD COLUMN email VARCHAR(255)"))
        conn.commit()

    grp_cols = [c["name"] for c in inspector.get_columns("groups")]
    for col, ctype in [("tax_number", "VARCHAR(100)"), ("address", "TEXT"), ("owner_names", "TEXT")]:
        if col not in grp_cols:
            conn.execute(text(f"ALTER TABLE groups ADD COLUMN {col} {ctype}"))
    conn.commit()

    loc_cols = [c["name"] for c in inspector.get_columns("locations")]
    loc_migrations = [
        ("reference", "VARCHAR(100)"), ("phone", "VARCHAR(50)"), ("country", "VARCHAR(100)"),
        ("street_number", "VARCHAR(100)"),
        ("opening_from", "VARCHAR(10)"), ("opening_to", "VARCHAR(10)"), ("inventory_eod_time", "VARCHAR(10)"),
        ("receives_online_orders", "BOOLEAN DEFAULT 0"), ("accepts_reservations", "BOOLEAN DEFAULT 0"),
        ("reservation_duration", "INTEGER"), ("reservation_times", "TEXT"),
    ]
    for col, ctype in loc_migrations:
        if col not in loc_cols:
            conn.execute(text(f"ALTER TABLE locations ADD COLUMN {col} {ctype}"))
    conn.commit()

    # ── Spec §2.1 / §2.2: brand receipt fields + branch ZATCA/DMS/course config
    brand_cols = [c["name"] for c in inspector.get_columns("brands")]
    for col, ctype in [("receipt_header", "TEXT"), ("receipt_footer", "TEXT")]:
        if col not in brand_cols:
            conn.execute(text(f"ALTER TABLE brands ADD COLUMN {col} {ctype}"))
    conn.commit()

    loc_cols2 = [c["name"] for c in inspector.get_columns("locations")]
    branch_spec_migrations = [
        ("localized_name", "VARCHAR(255)"),
        ("branch_type", "VARCHAR(50)"),
        ("tax_registration_name", "VARCHAR(255)"),
        ("tax_number", "VARCHAR(100)"),
        ("commercial_registration", "VARCHAR(100)"),
        ("receives_call_center_orders", "BOOLEAN DEFAULT 0"),
        ("enable_dms_delivery", "BOOLEAN DEFAULT 0"),
        ("course_management_enabled", "BOOLEAN DEFAULT 0"),
        ("print_on_hold", "BOOLEAN DEFAULT 0"),
        ("unhold_in_kitchen", "BOOLEAN DEFAULT 0"),
        ("auto_hold_all_courses", "BOOLEAN DEFAULT 0"),
    ]
    for col, ctype in branch_spec_migrations:
        if col not in loc_cols2:
            conn.execute(text(f"ALTER TABLE locations ADD COLUMN {col} {ctype}"))
    conn.commit()

    # ── Spec §10 / §12 / §14: reasons / reservations / notifications fields
    rsn_cols = [c["name"] for c in inspector.get_columns("reasons")]
    if "is_system" not in rsn_cols:
        conn.execute(text("ALTER TABLE reasons ADD COLUMN is_system BOOLEAN DEFAULT 0"))
    conn.commit()

    res_cols = [c["name"] for c in inspector.get_columns("reservation_settings")]
    for col, ctype in [
        ("days_of_week", "VARCHAR(40)"),
        ("auto_accept_online", "BOOLEAN DEFAULT 0"),
        ("table_ids", "TEXT"),
    ]:
        if col not in res_cols:
            conn.execute(text(f"ALTER TABLE reservation_settings ADD COLUMN {col} {ctype}"))
    conn.commit()

    ntf_cols = [c["name"] for c in inspector.get_columns("notification_settings")]
    for col, ctype in [
        ("frequency", "VARCHAR(20) DEFAULT 'immediate'"),
        ("apply_on", "TEXT"),
    ]:
        if col not in ntf_cols:
            conn.execute(text(f"ALTER TABLE notification_settings ADD COLUMN {col} {ctype}"))
    conn.commit()

    # ── Spec §13.2: Console-vs-Cashier user fields, tags, notification prefs.
    user_cols = [c["name"] for c in inspector.get_columns("users")]
    user_spec_migrations = [
        ("password_hash", "VARCHAR(255)"),
        ("email_verified", "BOOLEAN DEFAULT 0"),
        ("email_verified_at", "DATETIME"),
        ("user_type", "VARCHAR(20) DEFAULT 'console'"),
        ("tag_ids", "TEXT"),
        ("notification_preferences", "JSON"),
    ]
    for col, ctype in user_spec_migrations:
        if col not in user_cols:
            conn.execute(text(f"ALTER TABLE users ADD COLUMN {col} {ctype}"))
    conn.commit()

# Backfill predefined Taxes / Reasons / Courses for every existing org, and
# seed idempotent dummy data for the Manage entities so the Console isn't empty
# in demos. Both helpers are zero-effect when records already exist.
from app.core.database import SessionLocal
from app.models.hierarchy import Organisation
from app.services.manage_service import (
    ensure_org_predefined,
    ensure_org_dummy_data,
    ensure_brand_and_branch_dummy_fields,
)
with SessionLocal() as _db:
    for _org in _db.query(Organisation).all():
        ensure_org_predefined(_db, _org.id)
        ensure_brand_and_branch_dummy_fields(_db, _org.id)
        ensure_org_dummy_data(_db, _org.id)
    _db.commit()

app = FastAPI(
    title="Foodics Organisation Domain API",
    description="Unified Merchant Hierarchy, Configuration Inheritance, Scoped Roles & Permissions, and Franchise Delegation",
    version="0.1.0",
)

# Static files
STATIC_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")
app.add_middleware(NoCacheStaticMiddleware)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# API routes
app.include_router(hierarchy.router, prefix="/api/v1")
app.include_router(config.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(delegation.router, prefix="/api/v1")
app.include_router(templates.router, prefix="/api/v1")
app.include_router(manage.router, prefix="/api/v1")

# --- Subscription Portal (internal) mounted at /subs ---------------------
app.include_router(_sp_catalog.router,        prefix="/subs/api")
app.include_router(_sp_subscriptions.router,  prefix="/subs/api")
app.include_router(_sp_salesforce.router,     prefix="/subs/api")

SUBS_STATIC = os.path.join(os.path.dirname(os.path.dirname(__file__)), "subscription_portal", "static")
app.mount("/subs/static", StaticFiles(directory=SUBS_STATIC), name="subs-static")

@app.get("/subs")
@app.get("/subs/")
def subs_root():
    return FileResponse(os.path.join(SUBS_STATIC, "index.html"), headers={"Cache-Control": "no-cache, no-store, must-revalidate"})


# --- Merchant Portal (self-service) mounted at /merchant -----------------
app.include_router(_mp_auth.router,         prefix="/merchant/api")
app.include_router(_mp_catalog.router,      prefix="/merchant/api")
app.include_router(_mp_subscription.router, prefix="/merchant/api")
app.include_router(_mp_payment.router,      prefix="/merchant/api")

MERCHANT_STATIC = os.path.join(os.path.dirname(os.path.dirname(__file__)), "merchant_portal", "static")
app.mount("/merchant/static", StaticFiles(directory=MERCHANT_STATIC), name="merchant-static")

@app.get("/merchant")
@app.get("/merchant/")
def merchant_root():
    return FileResponse(os.path.join(MERCHANT_STATIC, "index.html"), headers={"Cache-Control": "no-cache, no-store, must-revalidate"})


@app.get("/")
def root():
    return FileResponse(os.path.join(STATIC_DIR, "index.html"), headers={"Cache-Control": "no-cache, no-store, must-revalidate"})


@app.get("/signup")
def signup():
    return FileResponse(os.path.join(STATIC_DIR, "signup.html"))


@app.get("/health")
def health():
    return {"status": "healthy"}
