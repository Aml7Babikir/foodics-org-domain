from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class LocationTemplateCreate(BaseModel):
    name: str
    organisation_id: str
    source_node_type: Optional[str] = None
    source_node_id: Optional[str] = None
    description: Optional[str] = None
    config_snapshot: dict


class LocationTemplateOut(BaseModel):
    id: str
    name: str
    organisation_id: str
    source_node_type: Optional[str]
    source_node_id: Optional[str]
    description: Optional[str]
    config_snapshot: dict
    created_at: datetime
    class Config:
        from_attributes = True
