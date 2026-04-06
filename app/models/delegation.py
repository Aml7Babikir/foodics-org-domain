"""
Franchise Delegation Model.

Allows one Organisation (delegating party) to grant another Organisation
(receiving party) controlled operational access to a defined subset of the hierarchy.

Types: brand_franchise, management_contract, regional_partner
"""
from sqlalchemy import Column, String, DateTime, Boolean, Text, JSON
from app.models.base import BaseModel


class Delegation(BaseModel):
    """A delegation of access from one organisation to another."""
    __tablename__ = "delegations"

    delegation_type = Column(String(30), nullable=False)  # brand_franchise, management_contract, regional_partner
    delegating_org_id = Column(String(36), nullable=False, index=True)  # franchisor / owner
    receiving_org_id = Column(String(36), nullable=False, index=True)  # franchisee / operator

    # What is being delegated - a specific node in the hierarchy
    delegated_node_type = Column(String(30), nullable=False)  # brand, country, legal_entity, location_group, location
    delegated_node_id = Column(String(36), nullable=False)

    # Permissions granted to the receiving party
    granted_permissions = Column(JSON)  # list of permission scopes

    # Locked settings that the receiving party CANNOT override
    locked_setting_keys = Column(JSON)  # list of setting keys locked by delegator

    status = Column(String(20), default="active")  # active, suspended, revoked, expired
    expires_at = Column(DateTime, nullable=True)
    revoked_at = Column(DateTime, nullable=True)
    revoked_by_user_id = Column(String(36), nullable=True)
    notes = Column(Text, nullable=True)
