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
    """A team member in the system. Mobile number is the primary identifier."""
    __tablename__ = "users"

    name = Column(String(255), nullable=False)
    mobile_number = Column(String(20), nullable=False, unique=True, index=True)
    email = Column(String(255), nullable=True)
    employee_id = Column(String(50), nullable=True)
    organisation_id = Column(String(36), nullable=False, index=True)
    pin_hash = Column(String(255), nullable=True)  # for POS access
    status = Column(String(20), default="invited")  # invited, active, offboarded
    activation_otp_hash = Column(String(255), nullable=True)
    activation_otp_expires = Column(DateTime, nullable=True)
    access_expiry = Column(DateTime, nullable=True)
    offboarded_at = Column(DateTime, nullable=True)
    email_password_enabled = Column(Boolean, default=False)


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
