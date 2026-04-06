from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ConfigSettingCreate(BaseModel):
    node_type: str
    node_id: str
    setting_key: str
    setting_value: str  # JSON string
    mode: str = "override"  # inherit, override, lock


class ConfigSettingOut(BaseModel):
    id: str
    node_type: str
    node_id: str
    setting_key: str
    setting_value: Optional[str]
    mode: str
    is_locked_by_ancestor: bool
    locked_by_node_type: Optional[str]
    locked_by_node_id: Optional[str]
    created_at: datetime
    class Config:
        from_attributes = True


class ResolvedSettingOut(BaseModel):
    setting_key: str
    effective_value: Optional[str]
    source_node_type: str
    source_node_id: str
    mode: str
    is_locked: bool
