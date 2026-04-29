"""
Generic CRUD service for the Manage section entities.

All entities follow the same shape (BaseModel + organisation_id + status). A
small registry-driven helper keeps the route handlers and schemas tidy without
spawning seventeen near-identical service files.
"""
import json
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session

from app.models.manage import (
    Driver, Device, Tax, PaymentMethod, Charge, DeliveryZone,
    Tag, Reason, KitchenFlow, ReservationSetting, OnlineOrderingChannel,
    PayAtTable, NotificationSetting, OnlinePaymentGateway, DeliveryCharge,
    Section, DiningTable, RevenueCenter, TimedEvent, Course,
    BranchPaymentMethodOverride,
    OrganisationSettings, SETTINGS_CATEGORIES,
)


MODEL_REGISTRY = {
    "drivers": Driver,
    "devices": Device,
    "taxes": Tax,
    "payment-methods": PaymentMethod,
    "charges": Charge,
    "delivery-zones": DeliveryZone,
    "tags": Tag,
    "reasons": Reason,
    "kitchen-flows": KitchenFlow,
    "reservation-settings": ReservationSetting,
    "online-ordering": OnlineOrderingChannel,
    "pay-at-table": PayAtTable,
    "notifications": NotificationSetting,
    "online-payments": OnlinePaymentGateway,
    "delivery-charges": DeliveryCharge,
    # New entities (Spec §3, §5, §8, §11):
    "sections": Section,
    "tables": DiningTable,
    "revenue-centers": RevenueCenter,
    "timed-events": TimedEvent,
    "courses": Course,
    "branch-payment-overrides": BranchPaymentMethodOverride,
}


def _model(entity_key: str):
    return MODEL_REGISTRY[entity_key]


# ----- generic CRUD ------------------------------------------------- #

def list_for_org(db: Session, entity_key: str, organisation_id: str) -> List[Any]:
    M = _model(entity_key)
    return (
        db.query(M)
        .filter(M.organisation_id == organisation_id)
        .order_by(M.created_at.desc())
        .all()
    )


def get(db: Session, entity_key: str, item_id: str):
    M = _model(entity_key)
    return db.query(M).filter(M.id == item_id).first()


def create(db: Session, entity_key: str, data: dict):
    M = _model(entity_key)
    item = M(**data)
    db.add(item)
    db.flush()
    return item


def update(db: Session, entity_key: str, item_id: str, data: dict):
    M = _model(entity_key)
    item = db.query(M).filter(M.id == item_id).first()
    if not item:
        return None
    for k, v in data.items():
        if v is not None:
            setattr(item, k, v)
    db.flush()
    return item


def delete(db: Session, entity_key: str, item_id: str) -> bool:
    M = _model(entity_key)
    item = db.query(M).filter(M.id == item_id).first()
    if not item:
        return False
    db.delete(item)
    db.flush()
    return True


# ----- OrganisationSettings (8-tab upsert) -------------------------- #

def list_settings(db: Session, organisation_id: str) -> List[OrganisationSettings]:
    return (
        db.query(OrganisationSettings)
        .filter(OrganisationSettings.organisation_id == organisation_id)
        .all()
    )


def get_settings(
    db: Session, organisation_id: str, category: str
) -> Optional[OrganisationSettings]:
    return (
        db.query(OrganisationSettings)
        .filter(
            OrganisationSettings.organisation_id == organisation_id,
            OrganisationSettings.category == category,
        )
        .first()
    )


def upsert_settings(
    db: Session, organisation_id: str, category: str, settings: Dict[str, Any]
) -> OrganisationSettings:
    if category not in SETTINGS_CATEGORIES:
        raise ValueError(f"Unknown settings category: {category}")
    row = get_settings(db, organisation_id, category)
    serialised = json.dumps(settings or {})
    if row:
        row.settings = serialised
    else:
        row = OrganisationSettings(
            organisation_id=organisation_id,
            category=category,
            settings=serialised,
        )
        db.add(row)
    db.flush()
    return row


def settings_to_out(row: OrganisationSettings) -> Dict[str, Any]:
    """Normalise the JSON blob back into a dict for the API response."""
    return {
        "id": row.id,
        "organisation_id": row.organisation_id,
        "category": row.category,
        "settings": json.loads(row.settings) if row.settings else {},
        "updated_at": row.updated_at,
    }


# ----- Predefined / system seed records ---------------------------- #

# (tax_name, tax_type, rate). Rate left at 0 — operators set the actual
# jurisdictional rate (KSA/UAE excise on tobacco is typically 100%).
PREDEFINED_TAXES = [
    ("Tobacco Tax", "excise", 0),
]


def ensure_predefined_taxes(db: Session, organisation_id: str) -> None:
    """Idempotently create the predefined Tax rows for an organisation."""
    existing = {
        t.name
        for t in db.query(Tax)
        .filter(Tax.organisation_id == organisation_id)
        .all()
    }
    for name, tax_type, rate in PREDEFINED_TAXES:
        if name in existing:
            continue
        db.add(Tax(
            organisation_id=organisation_id,
            name=name,
            tax_type=tax_type,
            rate=rate,
            is_active=True,
        ))
    db.flush()


# Spec §10: minimal "starter pack" of reasons by category.
PREDEFINED_REASONS = [
    ("Customer Cancelled",      "void"),
    ("Wrong Order",             "void"),
    ("Quality Issue",           "return"),
    ("Damaged Item",            "return"),
    ("Spillage",                "quantity_adjustment"),
    ("Stocktake Correction",    "quantity_adjustment"),
    ("Cash Pickup",             "drawer_operation"),
    ("Cash Top-Up",             "drawer_operation"),
    ("Non-Paying Customer",     "customer_blacklist"),
    ("Bad Attitude",            "customer_blacklist"),
]


def ensure_predefined_reasons(db: Session, organisation_id: str) -> None:
    """Seed the predefined system Reasons (Spec §10) idempotently."""
    existing = {
        (r.name, r.reason_type)
        for r in db.query(Reason)
        .filter(Reason.organisation_id == organisation_id)
        .all()
    }
    for name, reason_type in PREDEFINED_REASONS:
        if (name, reason_type) in existing:
            continue
        db.add(Reason(
            organisation_id=organisation_id,
            name=name,
            reason_type=reason_type,
            is_active=True,
            is_system=True,
        ))
    db.flush()


# Spec §8: classic dine-in courses (Drinks, Appetizers, Mains, Dessert).
PREDEFINED_COURSES = [
    ("Drinks", 10),
    ("Appetizers", 20),
    ("Main Course", 30),
    ("Dessert", 40),
]


def ensure_predefined_courses(db: Session, organisation_id: str) -> None:
    """Seed the predefined dining Courses (Spec §8) idempotently."""
    existing = {
        c.name
        for c in db.query(Course)
        .filter(Course.organisation_id == organisation_id)
        .all()
    }
    for name, sort_order in PREDEFINED_COURSES:
        if name in existing:
            continue
        db.add(Course(
            organisation_id=organisation_id,
            name=name,
            sort_order=sort_order,
            is_system=True,
        ))
    db.flush()


def ensure_org_predefined(db: Session, organisation_id: str) -> None:
    """Seed every system-default record for an organisation."""
    ensure_predefined_taxes(db, organisation_id)
    ensure_predefined_reasons(db, organisation_id)
    ensure_predefined_courses(db, organisation_id)


# ----- Demo / dummy data -------------------------------------------- #
#
# Idempotent dummy data so the Manage section is not empty for demos. Each
# entity type is only seeded when ZERO records of that type exist for the
# org — so any user-created records prevent seeding for that type and nothing
# is ever overwritten.

def _empty_for(db: Session, model, organisation_id: str) -> bool:
    return (
        db.query(model)
        .filter(model.organisation_id == organisation_id)
        .first()
        is None
    )


def ensure_org_dummy_data(db: Session, organisation_id: str) -> None:
    """Seed showcase records for the new Manage entities (idempotent)."""
    from app.models.hierarchy import Location, Brand
    from decimal import Decimal as D
    from datetime import datetime, timedelta

    # Pick the first active Location/Brand for this org as the default scope.
    location = (
        db.query(Location)
        .filter(Location.is_active == True)
        .join(Brand, Location.brand_id == Brand.id)
        .filter(Brand.organisation_id == organisation_id)
        .first()
    )
    location_id = location.id if location else None
    brand = (
        db.query(Brand)
        .filter(Brand.organisation_id == organisation_id)
        .first()
    )
    brand_id = brand.id if brand else None

    # ── Drivers ────────────────────────────────────────────────────── #
    if _empty_for(db, Driver, organisation_id):
        for n, mob, vt, plate in [
            ("Ahmed Al-Saleh",  "+966500000001", "motorcycle", "RUH-1234"),
            ("Mohammed Khan",   "+966500000002", "car",        "RUH-5678"),
            ("Yusuf Ibrahim",   "+966500000003", "motorcycle", "RUH-9012"),
        ]:
            db.add(Driver(
                organisation_id=organisation_id, location_id=location_id,
                name=n, mobile_number=mob, vehicle_type=vt, license_plate=plate,
                is_active=True, status="available",
            ))

    # ── Devices (POS + printer + KDS for the first location) ───────── #
    if _empty_for(db, Device, organisation_id) and location_id:
        for n, dt, sn, model in [
            ("Front-of-House POS", "pos",               "POS-A1-0001", "iPad Pro 12.9"),
            ("Receipt Printer #1", "printer",           "PRN-EP-0042", "Epson TM-m30"),
            ("Kitchen Display",    "kds",               "KDS-SS-0007", "Samsung 21\""),
            ("Customer Display",   "customer_display",  "CDS-LG-0019", "LG 10.1\""),
        ]:
            db.add(Device(
                organisation_id=organisation_id, location_id=location_id,
                name=n, device_type=dt, serial_number=sn, model=model,
                status="online",
            ))

    # ── Tags (one of each entity type) ─────────────────────────────── #
    if _empty_for(db, Tag, organisation_id):
        for nm, applies, color in [
            ("Western Region",  "branch",         "#3B82F6"),
            ("VIP",             "customer",       "#F59E0B"),
            ("Raw Materials",   "inventory_item", "#10B981"),
            ("Local Supplier",  "supplier",       "#8B5CF6"),
            ("Cashier Staff",   "user",           "#EC4899"),
            ("Rush Order",      "order",          "#EF4444"),
            ("Best Seller",     "product",        "#14B8A6"),
        ]:
            db.add(Tag(
                organisation_id=organisation_id,
                name=nm, applies_to=applies, color=color,
            ))

    # ── Payment methods (cash + cards + wallets) ───────────────────── #
    if _empty_for(db, PaymentMethod, organisation_id):
        for nm, mt, default in [
            ("Cash",        "cash",   True),
            ("Mada",        "card",   False),
            ("Visa",        "card",   False),
            ("Mastercard",  "card",   False),
            ("STC Pay",     "wallet", False),
            ("Apple Pay",   "wallet", False),
        ]:
            db.add(PaymentMethod(
                organisation_id=organisation_id, name=nm,
                method_type=mt, is_default=default, is_active=True,
            ))

    # ── Charges ────────────────────────────────────────────────────── #
    if _empty_for(db, Charge, organisation_id):
        db.add(Charge(
            organisation_id=organisation_id, name="Service Charge",
            charge_type="service", amount_type="percent", amount=D("10"),
            applies_to="order",
        ))
        db.add(Charge(
            organisation_id=organisation_id, name="Packaging Fee",
            charge_type="extra", amount_type="fixed", amount=D("2.00"),
            applies_to="order",
        ))

    # ── Delivery zones + delivery charges ─────────────────────────── #
    if _empty_for(db, DeliveryZone, organisation_id) and location_id:
        for nm, fee, minimum in [
            ("Inner City",   D("10.00"), D("30.00")),
            ("Suburbs",      D("18.00"), D("50.00")),
        ]:
            db.add(DeliveryZone(
                organisation_id=organisation_id, location_id=location_id,
                name=nm, delivery_fee=fee, minimum_order=minimum,
            ))

    if _empty_for(db, DeliveryCharge, organisation_id):
        db.add(DeliveryCharge(
            organisation_id=organisation_id, name="Standard Delivery",
            amount=D("15.00"), min_order_threshold=D("100.00"),
            free_above_threshold=True,
        ))

    # ── Online ordering + Pay at table + Online payments ──────────── #
    if _empty_for(db, OnlineOrderingChannel, organisation_id):
        db.add(OnlineOrderingChannel(
            organisation_id=organisation_id, brand_id=brand_id,
            name="Storefront — Default", is_enabled=True,
            storefront_url="https://order.example.com",
            auto_accept_orders=False,
        ))

    if _empty_for(db, PayAtTable, organisation_id) and location_id:
        db.add(PayAtTable(
            organisation_id=organisation_id, location_id=location_id,
            name="QR Pay-at-Table", is_enabled=True,
            qr_code_url="https://pay.example.com/qr/abc123",
            accepted_methods="card,wallet",
        ))

    if _empty_for(db, OnlinePaymentGateway, organisation_id):
        db.add(OnlinePaymentGateway(
            organisation_id=organisation_id, name="Tap Payments",
            provider="tap", api_key="sk_test_redacted",
            public_key="pk_test_redacted", is_test_mode=True, is_active=True,
        ))

    # ── Notification rules ─────────────────────────────────────────── #
    if _empty_for(db, NotificationSetting, organisation_id):
        for nm, ev, freq in [
            ("New Orders",       "order_received", "immediate"),
            ("Low Stock Alerts", "low_stock",      "hourly"),
            ("Daily Summary",    "daily_summary",  "daily"),
        ]:
            db.add(NotificationSetting(
                organisation_id=organisation_id, name=nm,
                event_type=ev, channel="email", frequency=freq,
                is_enabled=True, recipients="ops@example.com",
            ))

    # ── Kitchen flow ───────────────────────────────────────────────── #
    if _empty_for(db, KitchenFlow, organisation_id) and location_id:
        db.add(KitchenFlow(
            organisation_id=organisation_id, location_id=location_id,
            name="Default Kitchen Routing",
            routing_rules='{"hot_line":"printer-1","cold_line":"printer-2"}',
        ))

    # ── Reservation settings ───────────────────────────────────────── #
    if _empty_for(db, ReservationSetting, organisation_id) and location_id:
        db.add(ReservationSetting(
            organisation_id=organisation_id, location_id=location_id,
            name="Dine-in Reservations", is_enabled=True,
            slot_duration_minutes=60, max_party_size=8,
            opening_time="12:00", closing_time="23:00",
            days_of_week="mon,tue,wed,thu,fri,sat,sun",
            auto_accept_online=False,
        ))

    # ── Sections + Tables ──────────────────────────────────────────── #
    if _empty_for(db, Section, organisation_id) and location_id:
        sections = [
            ("Indoor",   10),
            ("Outdoor",  20),
            ("Sea View", 30),
        ]
        for nm, sort in sections:
            sec = Section(
                organisation_id=organisation_id, location_id=location_id,
                name=nm, sort_order=sort,
            )
            db.add(sec)
            db.flush()
            # 4 tables per section
            for i in range(1, 5):
                db.add(DiningTable(
                    organisation_id=organisation_id, section_id=sec.id,
                    name=f"{nm[0]}{i}", capacity=4 if i % 2 else 6,
                ))

    # ── Revenue centers ────────────────────────────────────────────── #
    if _empty_for(db, RevenueCenter, organisation_id) and location_id:
        db.add(RevenueCenter(
            organisation_id=organisation_id, location_id=location_id,
            name="Main Floor",
        ))

    # ── Timed events ───────────────────────────────────────────────── #
    if _empty_for(db, TimedEvent, organisation_id) and location_id:
        now = datetime.utcnow()
        db.add(TimedEvent(
            organisation_id=organisation_id, location_id=location_id,
            name="Happy Hour", event_type="reduce_price_percent", value=D("20"),
            starts_at=now.replace(hour=16, minute=0, second=0, microsecond=0),
            ends_at=now.replace(hour=19, minute=0, second=0, microsecond=0),
            is_active=True,
        ))
        db.add(TimedEvent(
            organisation_id=organisation_id, location_id=location_id,
            name="Hotel Event Surcharge", event_type="increase_price_percent",
            value=D("50"),
            starts_at=now + timedelta(days=7),
            ends_at=now + timedelta(days=10),
            is_active=False,
        ))

    db.flush()


def ensure_brand_and_branch_dummy_fields(
    db: Session, organisation_id: str
) -> None:
    """Fill in spec §2.1 / §2.2 fields on existing Brand and Location rows
    only when they are still NULL (so user edits are never clobbered)."""
    from app.models.hierarchy import Brand, Location

    brands = (
        db.query(Brand).filter(Brand.organisation_id == organisation_id).all()
    )
    for b in brands:
        if not b.receipt_header:
            b.receipt_header = f"Welcome to {b.name}"
        if not b.receipt_footer:
            b.receipt_footer = "Thank you — we hope to see you again!"

    locs = (
        db.query(Location)
        .join(Brand, Location.brand_id == Brand.id)
        .filter(Brand.organisation_id == organisation_id)
        .all()
    )
    for i, loc in enumerate(locs):
        if not loc.localized_name:
            loc.localized_name = loc.name  # placeholder
        if not loc.branch_type:
            loc.branch_type = "dine_in"
        if not loc.tax_registration_name:
            loc.tax_registration_name = f"{loc.name} Trading Co."
        if not loc.tax_number:
            # Saudi VAT format: 15 digits starting with 3 and ending with 3.
            loc.tax_number = f"3{str(100200300000000 + i)[:13]}3"
        if not loc.commercial_registration:
            loc.commercial_registration = f"CR-{1010000000 + i}"
    db.flush()
