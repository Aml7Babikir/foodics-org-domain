"""
Location Templates - for opening new outlets fast.

A template captures a complete, validated set of configuration values from
any existing Location or Location Group. New locations can be created
pre-configured from a template.
"""
from sqlalchemy import Column, String, Text, JSON
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class LocationTemplate(BaseModel):
    __tablename__ = "location_templates"

    name = Column(String(255), nullable=False)
    organisation_id = Column(String(36), nullable=False, index=True)
    source_node_type = Column(String(30))  # location or location_group
    source_node_id = Column(String(36))
    description = Column(Text, nullable=True)
    config_snapshot = Column(JSON, nullable=False)  # full set of resolved config values

    locations = relationship("Location", back_populates="template")
