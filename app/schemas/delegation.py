from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class DelegationCreate(BaseModel):
    delegation_type: str  # brand_franchise, management_contract, regional_partner
    delegating_org_id: str
    receiving_org_id: str
    delegated_node_type: str
    delegated_node_id: str
    granted_permissions: list[str] = []
    locked_setting_keys: list[str] = []
    expires_at: Optional[datetime] = None
    notes: Optional[str] = None


class DelegationOut(BaseModel):
    id: str
    delegation_type: str
    delegating_org_id: str
    receiving_org_id: str
    delegated_node_type: str
    delegated_node_id: str
    granted_permissions: Optional[list]
    locked_setting_keys: Optional[list]
    status: str
    expires_at: Optional[datetime]
    revoked_at: Optional[datetime]
    notes: Optional[str]
    created_at: datetime
    class Config:
        from_attributes = True
