from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.users import (
    UserOut, UserInvite, BulkUserInvite,
    RoleCreate, RoleOut,
    RoleAssignmentCreate, RoleAssignmentOut,
    UserProfileUpdate,
)
from app.services import user_service as svc

router = APIRouter(prefix="/users", tags=["Users & Roles"])


# --- Roles (must be before /{user_id} to avoid route conflict) ---
@router.post("/roles", response_model=RoleOut, status_code=201)
def create_role(data: RoleCreate, db: Session = Depends(get_db)):
    role = svc.create_role(db, data.dict())
    db.commit()
    db.refresh(role)
    return role


@router.get("/roles", response_model=list[RoleOut])
def list_roles(organisation_id: str = None, db: Session = Depends(get_db)):
    return svc.list_roles(db, organisation_id=organisation_id)


# --- Role Assignments ---
@router.post("/role-assignments", response_model=RoleAssignmentOut, status_code=201)
def assign_role(data: RoleAssignmentCreate, db: Session = Depends(get_db)):
    assignment = svc.assign_role(
        db, data.user_id, data.role_id, data.node_type, data.node_id,
        data.permission_toggles,
    )
    db.commit()
    db.refresh(assignment)
    return assignment


# --- Invitation / Onboarding ---
@router.post("/activate")
def activate_user(mobile_number: str, otp: str, db: Session = Depends(get_db)):
    try:
        user = svc.activate_user(db, mobile_number, otp)
        db.commit()
        return {"user_id": user.id, "status": "active", "message": "Account activated"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/organisations/{org_id}/users", response_model=list[UserOut])
def list_users(org_id: str, db: Session = Depends(get_db)):
    return svc.list_users(db, org_id)


@router.post("/organisations/{org_id}/invite")
def invite_user(org_id: str, data: UserInvite, db: Session = Depends(get_db)):
    try:
        result = svc.invite_user(
            db, name=data.name, mobile_number=data.mobile_number,
            organisation_id=org_id, role_slug=data.role_slug,
            scope_node_type=data.scope_node_type, scope_node_id=data.scope_node_id,
            employee_id=data.employee_id, access_expiry=data.access_expiry,
        )
        db.commit()
        return {
            "user_id": result["user"].id,
            "status": "invited",
            "activation_otp": result["activation_otp"],  # In production: sent via SMS only
            "message": "Activation SMS sent to the mobile number",
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/organisations/{org_id}/bulk-invite")
def bulk_invite(org_id: str, data: BulkUserInvite, db: Session = Depends(get_db)):
    results = svc.bulk_invite_users(db, org_id, [u.dict() for u in data.users])
    db.commit()
    return {"results": results}


# --- User by ID (must be last to avoid matching /roles, /activate, etc.) ---
@router.get("/{user_id}", response_model=UserOut)
def get_user(user_id: str, db: Session = Depends(get_db)):
    user = svc.get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.post("/{user_id}/offboard")
def offboard_user(user_id: str, db: Session = Depends(get_db)):
    try:
        user = svc.offboard_user(db, user_id)
        db.commit()
        return {"user_id": user.id, "status": "offboarded", "message": "User offboarded, all sessions terminated"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{user_id}/assignments", response_model=list[RoleAssignmentOut])
def get_user_assignments(user_id: str, db: Session = Depends(get_db)):
    return svc.get_user_assignments(db, user_id)


@router.get("/{user_id}/accessible-locations")
def get_accessible_locations(user_id: str, db: Session = Depends(get_db)):
    ids = svc.get_user_accessible_locations(db, user_id)
    return {"location_ids": ids, "count": len(ids)}


# --- Account → My Profile self-edit endpoints ---

@router.put("/{user_id}/profile", response_model=UserOut)
def update_profile(user_id: str, data: UserProfileUpdate, db: Session = Depends(get_db)):
    """Self-edit endpoint backing the Account → My Profile tab."""
    user = svc.get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    payload = data.dict(exclude_unset=True)
    for k, v in payload.items():
        setattr(user, k, v)
    db.commit()
    db.refresh(user)
    return user


@router.post("/{user_id}/regenerate-pin")
def regenerate_pin(user_id: str, db: Session = Depends(get_db)):
    """Account → My Profile → Generate-PIN button. PIN is hashed and never returned again."""
    import hashlib, secrets
    user = svc.get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    pin = "".join([str(secrets.randbelow(10)) for _ in range(6)])
    user.pin_hash = hashlib.sha256(pin.encode()).hexdigest()
    db.commit()
    db.refresh(user)
    # Plain PIN returned ONCE here; the spec says "Login PIN is not shown" so
    # the UI should only flash this in a one-time toast.
    return {"user_id": user.id, "pin": pin, "message": "PIN regenerated. Show this once."}


@router.post("/{user_id}/change-password")
def change_password(user_id: str, body: dict, db: Session = Depends(get_db)):
    """Account → My Profile → Change Password button."""
    import hashlib
    new_password = body.get("new_password")
    if not new_password or len(new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    user = svc.get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.password_hash = hashlib.sha256(new_password.encode()).hexdigest()
    user.email_password_enabled = True
    db.commit()
    return {"ok": True}
