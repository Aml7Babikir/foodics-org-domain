import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.models.base import Base
from app.core.database import engine
from app.api.routes import hierarchy, config, users, delegation, templates

# Create all tables
Base.metadata.create_all(bind=engine)

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

app = FastAPI(
    title="Foodics Organisation Domain API",
    description="Unified Merchant Hierarchy, Configuration Inheritance, Scoped Roles & Permissions, and Franchise Delegation",
    version="0.1.0",
)

# Static files
STATIC_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# API routes
app.include_router(hierarchy.router, prefix="/api/v1")
app.include_router(config.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(delegation.router, prefix="/api/v1")
app.include_router(templates.router, prefix="/api/v1")


@app.get("/")
def root():
    return FileResponse(os.path.join(STATIC_DIR, "index.html"))


@app.get("/signup")
def signup():
    return FileResponse(os.path.join(STATIC_DIR, "signup.html"))


@app.get("/health")
def health():
    return {"status": "healthy"}
