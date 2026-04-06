"""
Franchise Delegation Service.

Allows one Organisation to grant another controlled access to a subset of the hierarchy.
The delegating party always retains full visibility and policy control.
"""
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.delegation import Delegation
from app.services.hierarchy_service import get_descendant_location_ids


def create_delegation(db: Session, data: dict) -> Delegation:
    """Create a new delegation."""
    # Validate that delegating org owns the node
    # (In production, verify ownership through hierarchy traversal)
    delegation = Delegation(**data)
    db.add(delegation)
    db.flush()
    return delegation


def get_delegation(db: Session, delegation_id: str) -> Delegation:
    return db.query(Delegation).filter(Delegation.id == delegation_id).first()


def list_delegations_by_delegator(db: Session, org_id: str):
    return db.query(Delegation).filter(
        Delegation.delegating_org_id == org_id,
        Delegation.status == "active",
    ).all()


def list_delegations_by_receiver(db: Session, org_id: str):
    return db.query(Delegation).filter(
        Delegation.receiving_org_id == org_id,
        Delegation.status == "active",
    ).all()


def revoke_delegation(db: Session, delegation_id: str, revoked_by: str) -> Delegation:
    """
    Revoke a delegation immediately.
    All sessions belonging to the receiving party should be terminated within 60 seconds.
    """
    delegation = get_delegation(db, delegation_id)
    if not delegation:
        raise ValueError("Delegation not found")
    if delegation.status != "active":
        raise ValueError("Delegation is not active")

    delegation.status = "revoked"
    delegation.revoked_at = datetime.utcnow()
    delegation.revoked_by_user_id = revoked_by
    db.flush()

    # In production: trigger session termination for all receiving org users
    # with access through this delegation

    return delegation


def get_delegated_location_ids(db: Session, receiving_org_id: str) -> list[str]:
    """Get all Location IDs that a receiving org has access to via delegations."""
    delegations = list_delegations_by_receiver(db, receiving_org_id)
    location_ids = set()
    for d in delegations:
        if d.status == "active":
            ids = get_descendant_location_ids(db, d.delegated_node_type, d.delegated_node_id)
            location_ids.update(ids)
    return list(location_ids)


def check_delegation_expiry(db: Session):
    """Check and expire any delegations past their expiry date."""
    now = datetime.utcnow()
    expired = db.query(Delegation).filter(
        Delegation.status == "active",
        Delegation.expires_at != None,
        Delegation.expires_at < now,
    ).all()
    for d in expired:
        d.status = "expired"
    db.flush()
    return len(expired)
