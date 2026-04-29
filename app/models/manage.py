"""
Manage section — operational configuration entities under the dashboard "Manage" menu.

Sidebar tiles:
  - Drivers, Devices (Branches = Locations, Users/Roles already modelled)

"More" page tiles:
  - Taxes, Payment Methods, Charges, Delivery Zones, Tags, Reasons,
    Kitchen Flows, Reservations, Online Ordering, Pay at Table, Notifications,
    Online Payments, Delivery Charges

Predefined taxes:
  - Every Organisation gets a "Tobacco Tax" Tax row auto-created on signup
    (excise category, rate configurable). Replaces the prior dedicated
    Tobacco Charges entity — tobacco regulation is now expressed as a tax.

Settings (8 tabs, JSON-blob per category):
  - Receipt, Call Center, Cashier App, Display App, Kitchen,
    Payment Integrations, SMS Providers, Inventory Transactions

All entities scope to an Organisation. Some additionally scope to a Brand or
Location so that operators can configure per-branch behaviour while keeping
account-wide defaults.
"""
from sqlalchemy import Column, String, ForeignKey, Boolean, Integer, Text, Numeric, DateTime
from app.models.base import BaseModel


# ------------------------------------------------------------------ #
# Domain enums (kept as tuples — SQLite has no native enum)          #
# ------------------------------------------------------------------ #

# Tags are scoped per entity type (Spec §9). Separation prevents irrelevant
# tags showing up in cross-entity filters.
TAG_ENTITY_TYPES = (
    "branch",         # §2.3
    "customer",       # §9.2
    "inventory_item", # §9.3
    "supplier",       # §9.4
    "user",           # §9.5
    "order",
    "product",        # used by Brand→Product tagging (§2.1)
)

# Reason categories (Spec §10) — defined at account level, branch-agnostic.
REASON_TYPES = (
    "void",                  # §10.2 (pre-payment cancellation)
    "return",                # §10.2 (post-payment)
    "quantity_adjustment",   # §10.3 (inventory)
    "drawer_operation",      # §10.4 (manual cash drawer)
    "customer_blacklist",    # §10.5
)

# Timed-event types (Spec §5).
TIMED_EVENT_TYPES = (
    "reduce_price_percent",
    "reduce_price_fixed",
    "increase_price_percent",
    "increase_price_fixed",
    "activate_products",
    "promotion",
)


# ------------------------------------------------------------------ #
# Sidebar entities                                                   #
# ------------------------------------------------------------------ #

class Driver(BaseModel):
    """Delivery driver profile."""
    __tablename__ = "drivers"

    name = Column(String(255), nullable=False)
    organisation_id = Column(String(36), ForeignKey("organisations.id"), nullable=False)
    location_id = Column(String(36), ForeignKey("locations.id"), nullable=True)
    mobile_number = Column(String(20))
    vehicle_type = Column(String(50))            # car, motorcycle, bicycle
    license_plate = Column(String(50))
    is_active = Column(Boolean, default=True)
    status = Column(String(20), default="offline")   # offline, available, on_delivery


class Device(BaseModel):
    """POS terminal, printer, KDS, customer display."""
    __tablename__ = "devices"

    name = Column(String(255), nullable=False)
    organisation_id = Column(String(36), ForeignKey("organisations.id"), nullable=False)
    location_id = Column(String(36), ForeignKey("locations.id"), nullable=True)
    device_type = Column(String(40), default="pos")        # pos, printer, kds, customer_display
    serial_number = Column(String(100))
    model = Column(String(100))
    status = Column(String(20), default="offline")          # online, offline


# ------------------------------------------------------------------ #
# "More" page entities                                               #
# ------------------------------------------------------------------ #

class Tax(BaseModel):
    __tablename__ = "taxes"

    name = Column(String(255), nullable=False)
    organisation_id = Column(String(36), ForeignKey("organisations.id"), nullable=False)
    rate = Column(Numeric(8, 4), nullable=False, default=0)   # percentage
    tax_type = Column(String(40), default="vat")              # vat, excise, other
    is_active = Column(Boolean, default=True)
    status = Column(String(20), default="active")


class PaymentMethod(BaseModel):
    __tablename__ = "payment_methods"

    name = Column(String(255), nullable=False)
    organisation_id = Column(String(36), ForeignKey("organisations.id"), nullable=False)
    method_type = Column(String(40), default="cash")          # cash, card, wallet, online, voucher
    is_default = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    status = Column(String(20), default="active")


class Charge(BaseModel):
    """Service charge or extra fee."""
    __tablename__ = "charges"

    name = Column(String(255), nullable=False)
    organisation_id = Column(String(36), ForeignKey("organisations.id"), nullable=False)
    charge_type = Column(String(40), default="service")       # service, extra
    amount_type = Column(String(20), default="percent")       # percent, fixed
    amount = Column(Numeric(10, 4), default=0)
    applies_to = Column(String(40), default="order")          # order, item
    status = Column(String(20), default="active")


class DeliveryZone(BaseModel):
    __tablename__ = "delivery_zones"

    name = Column(String(255), nullable=False)
    organisation_id = Column(String(36), ForeignKey("organisations.id"), nullable=False)
    location_id = Column(String(36), ForeignKey("locations.id"), nullable=True)
    delivery_fee = Column(Numeric(10, 2), default=0)
    minimum_order = Column(Numeric(10, 2), default=0)
    polygon = Column(Text)                                    # JSON / WKT polygon
    status = Column(String(20), default="active")


class Tag(BaseModel):
    """
    Tag (Spec §9) — scoped per entity type. Used primarily for filtering and
    reporting. Separated by entity type so e.g. branch tags do not pollute
    customer-tag pickers.
    """
    __tablename__ = "tags"

    name = Column(String(255), nullable=False)
    organisation_id = Column(String(36), ForeignKey("organisations.id"), nullable=False)
    color = Column(String(20), default="#6366F1")
    # One of TAG_ENTITY_TYPES — branch / customer / inventory_item / supplier /
    # user / order / product.
    applies_to = Column(String(40), default="product")
    status = Column(String(20), default="active")


class Reason(BaseModel):
    """
    Reason (Spec §10) — predefined justification text for operational actions.
    Account-scoped; not branch/register/user-specific. The consuming workflow
    (cashier, inventory, customer mgmt) decides when to require selection.
    """
    __tablename__ = "reasons"

    name = Column(String(255), nullable=False)
    organisation_id = Column(String(36), ForeignKey("organisations.id"), nullable=False)
    # One of REASON_TYPES — void / return / quantity_adjustment / drawer_operation
    # / customer_blacklist.
    reason_type = Column(String(40), default="void")
    is_active = Column(Boolean, default=True)
    is_system = Column(Boolean, default=False)                # seeded predefined
    status = Column(String(20), default="active")


class KitchenFlow(BaseModel):
    __tablename__ = "kitchen_flows"

    name = Column(String(255), nullable=False)
    organisation_id = Column(String(36), ForeignKey("organisations.id"), nullable=False)
    location_id = Column(String(36), ForeignKey("locations.id"), nullable=True)
    routing_rules = Column(Text)                              # JSON describing station/printer routing
    status = Column(String(20), default="active")


class ReservationSetting(BaseModel):
    """
    Reservation availability (Spec §12) — per branch / day-of-week / time range.
    iOS cashier consumes this directly; Android cashier uses the external
    ServeMe service which is out of scope for this Console.
    """
    __tablename__ = "reservation_settings"

    name = Column(String(255), nullable=False)
    organisation_id = Column(String(36), ForeignKey("organisations.id"), nullable=False)
    location_id = Column(String(36), ForeignKey("locations.id"), nullable=True)
    is_enabled = Column(Boolean, default=False)
    slot_duration_minutes = Column(Integer, default=60)         # min 30 (Spec §12)
    max_party_size = Column(Integer, default=10)
    opening_time = Column(String(10))
    closing_time = Column(String(10))
    days_of_week = Column(String(40), default="mon,tue,wed,thu,fri,sat,sun")
    auto_accept_online = Column(Boolean, default=False)
    table_ids = Column(Text)                                    # comma-sep Table IDs available for reservation
    status = Column(String(20), default="active")


class OnlineOrderingChannel(BaseModel):
    __tablename__ = "online_ordering_channels"

    name = Column(String(255), nullable=False)
    organisation_id = Column(String(36), ForeignKey("organisations.id"), nullable=False)
    brand_id = Column(String(36), ForeignKey("brands.id"), nullable=True)
    is_enabled = Column(Boolean, default=False)
    storefront_url = Column(String(500))
    auto_accept_orders = Column(Boolean, default=False)
    status = Column(String(20), default="active")


class PayAtTable(BaseModel):
    __tablename__ = "pay_at_table_configs"

    name = Column(String(255), nullable=False)
    organisation_id = Column(String(36), ForeignKey("organisations.id"), nullable=False)
    location_id = Column(String(36), ForeignKey("locations.id"), nullable=True)
    is_enabled = Column(Boolean, default=False)
    qr_code_url = Column(String(500))
    accepted_methods = Column(String(255), default="card,wallet")
    status = Column(String(20), default="active")


class NotificationSetting(BaseModel):
    """
    Notification rule (Spec §14) — groups recipients by predefined trigger so
    operators don't configure each user individually. Notifications are
    primarily email; in-app/SMS/push are open questions per the spec.
    """
    __tablename__ = "notification_settings"

    name = Column(String(255), nullable=False)
    organisation_id = Column(String(36), ForeignKey("organisations.id"), nullable=False)
    event_type = Column(String(60), default="order_received")  # predefined trigger / action
    channel = Column(String(20), default="email")              # email (default), in_app, sms, push
    frequency = Column(String(20), default="immediate")        # immediate, hourly, daily, weekly
    apply_on = Column(Text)                                    # JSON list of conditions
    is_enabled = Column(Boolean, default=True)
    recipients = Column(Text)                                  # comma-separated emails / user ids
    status = Column(String(20), default="active")


class OnlinePaymentGateway(BaseModel):
    __tablename__ = "online_payment_gateways"

    name = Column(String(255), nullable=False)
    organisation_id = Column(String(36), ForeignKey("organisations.id"), nullable=False)
    provider = Column(String(60), default="stripe")            # stripe, hyperpay, checkout, ...
    api_key = Column(String(255))
    public_key = Column(String(255))
    is_test_mode = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)
    status = Column(String(20), default="active")


class DeliveryCharge(BaseModel):
    __tablename__ = "delivery_charges"

    name = Column(String(255), nullable=False)
    organisation_id = Column(String(36), ForeignKey("organisations.id"), nullable=False)
    delivery_zone_id = Column(String(36), ForeignKey("delivery_zones.id"), nullable=True)
    amount = Column(Numeric(10, 2), default=0)
    min_order_threshold = Column(Numeric(10, 2), default=0)
    free_above_threshold = Column(Boolean, default=False)
    status = Column(String(20), default="active")


# ------------------------------------------------------------------ #
# Sections / Tables / Revenue Centers (Spec §3, §11)                 #
# ------------------------------------------------------------------ #

class Section(BaseModel):
    """
    Section (Spec §3.1) — groups tables in a branch for dine-in / pay-at-table /
    reservation flows. iOS cashier consumes this directly. Android cashier
    uses a separate Table-Management feature for fine-dining floor layout —
    that is out of scope here.
    """
    __tablename__ = "sections"

    name = Column(String(255), nullable=False)
    organisation_id = Column(String(36), ForeignKey("organisations.id"), nullable=False)
    location_id = Column(String(36), ForeignKey("locations.id"), nullable=True)
    sort_order = Column(Integer, default=0)
    status = Column(String(20), default="active")


class DiningTable(BaseModel):
    """Table within a Section (Spec §3.1). Named 'dining_tables' to avoid clashing with the SQL keyword."""
    __tablename__ = "dining_tables"

    name = Column(String(255), nullable=False)
    organisation_id = Column(String(36), ForeignKey("organisations.id"), nullable=False)
    section_id = Column(String(36), ForeignKey("sections.id"), nullable=True)
    capacity = Column(Integer, default=4)
    status = Column(String(20), default="active")


class RevenueCenter(BaseModel):
    """
    Revenue Center (Spec §11) — groups tables / sections / devices for RMS
    revenue reporting (mainly fine-dining). Not consumed by accounting.
    """
    __tablename__ = "revenue_centers"

    name = Column(String(255), nullable=False)
    organisation_id = Column(String(36), ForeignKey("organisations.id"), nullable=False)
    location_id = Column(String(36), ForeignKey("locations.id"), nullable=True)
    section_ids = Column(Text)                                 # comma-sep Section IDs
    table_ids = Column(Text)                                   # comma-sep Table IDs
    device_ids = Column(Text)                                  # comma-sep Device IDs
    status = Column(String(20), default="active")


# ------------------------------------------------------------------ #
# Timed events / Courses / Payment-method overrides (Spec §5,§8,§6)  #
# ------------------------------------------------------------------ #

class TimedEvent(BaseModel):
    """
    Timed Event (Spec §5) — temporary pricing/product behaviour for a period.
    Logic is owned by Menu / Promotions; this Console only stores the config
    surface so a branch can see and toggle them.
    """
    __tablename__ = "timed_events"

    name = Column(String(255), nullable=False)
    organisation_id = Column(String(36), ForeignKey("organisations.id"), nullable=False)
    location_id = Column(String(36), ForeignKey("locations.id"), nullable=True)
    # One of TIMED_EVENT_TYPES.
    event_type = Column(String(40), default="reduce_price_percent")
    value = Column(Numeric(10, 4), default=0)                  # interpreted per event_type
    starts_at = Column(DateTime)
    ends_at = Column(DateTime)
    is_active = Column(Boolean, default=True)
    status = Column(String(20), default="active")


class Course(BaseModel):
    """
    Course (Spec §8) — dine-in menu grouping (Drinks, Appetizers, Mains,
    Dessert, ...). Account-level definition; per-branch toggles (print on
    hold, unhold, auto-hold) live on the Location.
    """
    __tablename__ = "courses"

    name = Column(String(255), nullable=False)
    organisation_id = Column(String(36), ForeignKey("organisations.id"), nullable=False)
    sort_order = Column(Integer, default=0)
    is_system = Column(Boolean, default=False)                 # seeded predefined
    status = Column(String(20), default="active")


class BranchPaymentMethodOverride(BaseModel):
    """
    Branch-level payment method override (Spec §6). A globally-configured
    payment method can be disabled for a specific branch.
    """
    __tablename__ = "branch_payment_method_overrides"

    organisation_id = Column(String(36), ForeignKey("organisations.id"), nullable=False)
    location_id = Column(String(36), ForeignKey("locations.id"), nullable=False)
    payment_method_id = Column(String(36), ForeignKey("payment_methods.id"), nullable=False)
    is_disabled = Column(Boolean, default=True)
    status = Column(String(20), default="active")


# ------------------------------------------------------------------ #
# Settings (8-tab JSON blobs, one row per (organisation, category))  #
# ------------------------------------------------------------------ #

# Stable list of category keys for the Settings tabs.
SETTINGS_CATEGORIES = (
    "receipt",
    "call_center",
    "cashier_app",
    "display_app",
    "kitchen",
    "payment_integrations",
    "sms_providers",
    "inventory_transactions",
)


class OrganisationSettings(BaseModel):
    """One row per (organisation_id, category). Settings stored as JSON text."""
    __tablename__ = "organisation_settings"

    organisation_id = Column(String(36), ForeignKey("organisations.id"), nullable=False)
    category = Column(String(40), nullable=False)              # one of SETTINGS_CATEGORIES
    settings = Column(Text)                                    # JSON blob
