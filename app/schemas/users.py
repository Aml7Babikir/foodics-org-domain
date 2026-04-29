from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class UserCreate(BaseModel):
    name: str
    mobile_number: str
    email: Optional[str] = None
    employee_id: Optional[str] = None
    organisation_id: str


class UserOut(BaseModel):
    id: str
    name: str
    mobile_number: str
    email: Optional[str]
    employee_id: Optional[str]
    organisation_id: str
    status: str
    access_expiry: Optional[datetime]
    # Spec §13.2 fields:
    user_type: Optional[str] = "console"
    email_verified: Optional[bool] = False
    email_verified_at: Optional[datetime] = None
    tag_ids: Optional[str] = None
    notification_preferences: Optional[dict] = None
    # Account → My Profile fields:
    language: Optional[str] = "en"
    display_localized_names: Optional[bool] = False
    created_at: datetime
    class Config:
        from_attributes = True


class UserProfileUpdate(BaseModel):
    """Account page → My Profile tab self-edit payload."""
    name: Optional[str] = None
    email: Optional[str] = None
    mobile_number: Optional[str] = None
    language: Optional[str] = None
    display_localized_names: Optional[bool] = None
    notification_preferences: Optional[dict] = None
    # Login PIN regeneration uses a separate endpoint (so it can hash safely).


class UserInvite(BaseModel):
    name: str
    mobile_number: str
    employee_id: Optional[str] = None
    role_slug: str
    scope_node_type: str
    scope_node_id: str
    access_expiry: Optional[datetime] = None


class BulkUserInvite(BaseModel):
    users: list[UserInvite]


class RoleCreate(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None
    role_type: str = "custom"
    min_assignment_level: Optional[str] = None
    max_assignment_level: Optional[str] = None
    permissions: list[str] = []
    toggleable_permissions: list[str] = []
    organisation_id: Optional[str] = None


class RoleOut(BaseModel):
    id: str
    name: str
    slug: str
    description: Optional[str]
    role_type: str
    is_system: bool
    permissions: Optional[list]
    created_at: datetime
    class Config:
        from_attributes = True


class RoleAssignmentCreate(BaseModel):
    user_id: str
    role_id: str
    node_type: str
    node_id: str
    permission_toggles: Optional[dict] = None


class RoleAssignmentOut(BaseModel):
    id: str
    user_id: str
    role_id: str
    node_type: str
    node_id: str
    permission_toggles: Optional[dict]
    is_active: bool
    created_at: datetime
    class Config:
        from_attributes = True
