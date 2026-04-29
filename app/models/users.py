"""
Users, Roles, and Scoped Permissions.

A Role is assigned to a person at a specific point in the hierarchy.
That assignment determines exactly which Locations the person can access.

Fixed roles: Cashier, Waiter, Store Manager, Area Manager, Brand Operations Manager,
             Country Manager, Finance Viewer, Admin
Custom roles: Fully configurable by Admins within their own scope.
"""
from sqlalchemy import Column, String, Boolean, DateTime, Text, JSON
from app.models.base import BaseModel


class User(BaseModel):
    """
    A team member in the system. Mobile number is the primary identifier.

    Spec §13.2 — supports two user types (Cashier, Console) plus combined.
    Cashier users authenticate with PIN; Console users with email + password.
    A user must be assigned to at least one Branch (Location, directly or via
    an ancestor scope) AND have at least one Role to become active (Spec §17
    Rules 16, 17, 18 — multiple roles are additive).
    """
    __tablename__ = "users"

    name = Column(String(255), nullable=False)
    mobile_number = Column(String(20), nullable=False, unique=True, index=True)
    email = Column(String(255), nullable=True)
    employee_id = Column(String(50), nullable=True)
    organisation_id = Column(String(36), nullable=False, index=True)

    # Authentication (Spec §13.2):
    pin_hash = Column(String(255), nullable=True)               # Cashier login PIN — never displayed
    password_hash = Column(String(255), nullable=True)          # Console login (email + password)
    email_password_enabled = Column(Boolean, default=False)

    # Verification status (Spec §13.2):
    email_verified = Column(Boolean, default=False)
    email_verified_at = Column(DateTime, nullable=True)

    # Lifecycle:
    status = Column(String(20), default="invited")              # invited, active, offboarded
    activation_otp_hash = Column(String(255), nullable=True)
    activation_otp_expires = Column(DateTime, nullable=True)
    access_expiry = Column(DateTime, nullable=True)
    offboarded_at = Column(DateTime, nullable=True)

    # User type (Spec §13.2):
    #   cashier  → PIN only, accesses cashier app
    #   console  → email/password only, accesses Console
    #   both     → access to both surfaces
    user_type = Column(String(20), default="console")

    # Tags (Spec §9.5 + §13.2) — comma-separated Tag IDs where applies_to='user'.
    tag_ids = Column(Text, nullable=True)

    # Account-page Profile tab (Spec — Account → My Profile):
    language = Column(String(10), default="en")                 # en, ar, es, fr
    display_localized_names = Column(Boolean, default=False)

    # Notification preferences (Spec — My Profile + §14). Stored as JSON.
    # Keys match the 15 inventory-event flags in the My Profile spec:
    #   toggle_all, cost_adjustment_submitted, inventory_count_submitted,
    #   purchasing_submitted, quantity_adjustment_submitted, supplier_return,
    #   transfer_received, production_submitted, sent_inventory,
    #   item_unavailable, purchase_order_needs_approval, item_max_quantity,
    #   item_min_quantity, transfer_order_review, transfer_waiting_receipt
    # Plus channel preferences (email/in_app/sms/push) from §14.
    notification_preferences = Column(JSON, nullable=True)


# Canonical list of inventory notification event keys (Spec — Account → My
# Profile). Used by the Account page UI and to seed sensible defaults.
INVENTORY_NOTIFICATION_EVENTS = (
    "cost_adjustment_submitted",
    "inventory_count_submitted",
    "purchasing_submitted",
    "quantity_adjustment_submitted",
    "supplier_return",
    "transfer_received",
    "production_submitted",
    "sent_inventory",
    "item_unavailable",
    "purchase_order_needs_approval",
    "item_max_quantity",
    "item_min_quantity",
    "transfer_order_review",
    "transfer_waiting_receipt",
)


class Role(BaseModel):
    """A role definition - either fixed or custom."""
    __tablename__ = "roles"

    name = Column(String(100), nullable=False)
    slug = Column(String(100), nullable=False, unique=True)
    description = Column(Text)
    role_type = Column(String(20), nullable=False)  # fixed, custom
    is_system = Column(Boolean, default=False)  # True for the 8 fixed roles
    min_assignment_level = Column(String(30))  # lowest hierarchy level this role can be assigned at
    max_assignment_level = Column(String(30))  # highest hierarchy level for assignment
    permissions = Column(JSON)  # list of permission strings
    toggleable_permissions = Column(JSON)  # permissions that can be toggled per assignment
    organisation_id = Column(String(36), nullable=True)  # null for system roles, set for custom
    created_by_user_id = Column(String(36), nullable=True)


class RoleAssignment(BaseModel):
    """Assigns a role to a user at a specific hierarchy node."""
    __tablename__ = "role_assignments"

    user_id = Column(String(36), nullable=False, index=True)
    role_id = Column(String(36), nullable=False, index=True)
    node_type = Column(String(30), nullable=False)  # which hierarchy level
    node_id = Column(String(36), nullable=False, index=True)  # which specific node
    permission_toggles = Column(JSON)  # overrides for toggleable permissions
    assigned_by_user_id = Column(String(36), nullable=True)
    is_active = Column(Boolean, default=True)
