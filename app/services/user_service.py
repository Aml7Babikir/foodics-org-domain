"""
User management service - handles onboarding, offboarding, roles, and scoped permissions.
"""
import hashlib
import secrets
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.users import User, Role, RoleAssignment
from app.services.hierarchy_service import get_descendant_location_ids


def _hash_otp(otp: str) -> str:
    return hashlib.sha256(otp.encode()).hexdigest()


def _generate_otp(length: int = 6) -> str:
    return "".join([str(secrets.randbelow(10)) for _ in range(length)])


# --- User CRUD ---

def create_user(db: Session, data: dict) -> User:
    user = User(**data)
    db.add(user)
    db.flush()
    return user


def get_user(db: Session, user_id: str) -> User:
    return db.query(User).filter(User.id == user_id).first()


def get_user_by_mobile(db: Session, mobile_number: str) -> User:
    return db.query(User).filter(User.mobile_number == mobile_number).first()


def list_users(db: Session, organisation_id: str):
    return db.query(User).filter(User.organisation_id == organisation_id).all()


# --- Invitation / Onboarding (PRD 8.4.1) ---

def invite_user(db: Session, name: str, mobile_number: str, organisation_id: str,
                role_slug: str, scope_node_type: str, scope_node_id: str,
                employee_id: str = None, access_expiry: datetime = None) -> dict:
    """
    Invite a new team member:
    1. Create user record with status=invited
    2. Generate activation OTP (valid 72 hours)
    3. Assign role at the specified scope
    """
    # Check if mobile number already exists
    existing = get_user_by_mobile(db, mobile_number)
    if existing:
        raise ValueError(f"Mobile number {mobile_number} is already registered")

    # Create user
    otp = _generate_otp()
    user = User(
        name=name,
        mobile_number=mobile_number,
        employee_id=employee_id,
        organisation_id=organisation_id,
        status="invited",
        activation_otp_hash=_hash_otp(otp),
        activation_otp_expires=datetime.utcnow() + timedelta(hours=72),
        access_expiry=access_expiry,
    )
    db.add(user)
    db.flush()

    # Find the role
    role = db.query(Role).filter(Role.slug == role_slug).first()
    if not role:
        raise ValueError(f"Role '{role_slug}' not found")

    # Assign role at scope
    assignment = RoleAssignment(
        user_id=user.id,
        role_id=role.id,
        node_type=scope_node_type,
        node_id=scope_node_id,
    )
    db.add(assignment)
    db.flush()

    return {
        "user": user,
        "activation_otp": otp,  # In production, this is sent via SMS, not returned
        "role_assignment": assignment,
    }


def activate_user(db: Session, mobile_number: str, otp: str) -> User:
    """Activate a user account with the activation OTP."""
    user = get_user_by_mobile(db, mobile_number)
    if not user:
        raise ValueError("User not found")
    if user.status != "invited":
        raise ValueError("User is not in invited status")
    if user.activation_otp_expires and user.activation_otp_expires < datetime.utcnow():
        raise ValueError("Activation OTP has expired")
    if user.activation_otp_hash != _hash_otp(otp):
        raise ValueError("Invalid OTP")

    user.status = "active"
    user.activation_otp_hash = None
    user.activation_otp_expires = None
    db.flush()
    return user


def offboard_user(db: Session, user_id: str) -> User:
    """
    Offboard a user (PRD 8.4.2):
    - Mark as offboarded
    - Deactivate all role assignments
    - Invalidate OTPs
    """
    user = get_user(db, user_id)
    if not user:
        raise ValueError("User not found")

    user.status = "offboarded"
    user.offboarded_at = datetime.utcnow()
    user.activation_otp_hash = None
    user.activation_otp_expires = None

    # Deactivate all role assignments
    assignments = db.query(RoleAssignment).filter(
        RoleAssignment.user_id == user_id
    ).all()
    for a in assignments:
        a.is_active = False

    db.flush()
    return user


# --- Bulk Invitations (PRD 8.4.3) ---

def bulk_invite_users(db: Session, organisation_id: str, invitations: list[dict]) -> list[dict]:
    results = []
    for inv in invitations:
        try:
            result = invite_user(
                db=db,
                name=inv["name"],
                mobile_number=inv["mobile_number"],
                organisation_id=organisation_id,
                role_slug=inv["role_slug"],
                scope_node_type=inv["scope_node_type"],
                scope_node_id=inv["scope_node_id"],
                employee_id=inv.get("employee_id"),
                access_expiry=inv.get("access_expiry"),
            )
            results.append({"status": "success", "user_id": result["user"].id, "mobile": inv["mobile_number"]})
        except Exception as e:
            results.append({"status": "error", "mobile": inv["mobile_number"], "error": str(e)})
    return results


# --- Roles ---

def create_role(db: Session, data: dict) -> Role:
    role = Role(**data)
    db.add(role)
    db.flush()
    return role


def get_role(db: Session, role_id: str) -> Role:
    return db.query(Role).filter(Role.id == role_id).first()


def list_roles(db: Session, include_system: bool = True, organisation_id: str = None):
    q = db.query(Role)
    if not include_system:
        q = q.filter(Role.is_system == False)
    if organisation_id:
        q = q.filter((Role.organisation_id == organisation_id) | (Role.is_system == True))
    return q.all()


# --- Role Assignments ---

def assign_role(db: Session, user_id: str, role_id: str, node_type: str, node_id: str,
                permission_toggles: dict = None, assigned_by: str = None) -> RoleAssignment:
    assignment = RoleAssignment(
        user_id=user_id,
        role_id=role_id,
        node_type=node_type,
        node_id=node_id,
        permission_toggles=permission_toggles,
        assigned_by_user_id=assigned_by,
    )
    db.add(assignment)
    db.flush()
    return assignment


def get_user_assignments(db: Session, user_id: str) -> list[RoleAssignment]:
    return db.query(RoleAssignment).filter(
        RoleAssignment.user_id == user_id,
        RoleAssignment.is_active == True,
    ).all()


def get_user_accessible_locations(db: Session, user_id: str) -> list[str]:
    """
    Get all Location IDs a user can access based on their role assignments.
    A role at any hierarchy level grants access to all locations below that node.
    """
    assignments = get_user_assignments(db, user_id)
    location_ids = set()
    for a in assignments:
        ids = get_descendant_location_ids(db, a.node_type, a.node_id)
        location_ids.update(ids)
    return list(location_ids)
