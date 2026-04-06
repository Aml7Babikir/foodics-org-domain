"""
Configuration Inheritance Engine.

Settings flow down the hierarchy like a waterfall:
  Organisation → Group → Brand → Country → Legal Entity → Business Unit → Location Group → Location

At each level, an authorised person can:
  INHERIT  - use the parent's value (no local value stored)
  OVERRIDE - store a local value that takes precedence
  LOCK     - set a value and prevent any level below from changing it
"""
from sqlalchemy import Column, String, Text, Boolean
from app.models.base import BaseModel


class ConfigSetting(BaseModel):
    """A single configuration value at a specific hierarchy node."""
    __tablename__ = "config_settings"

    node_type = Column(String(30), nullable=False)  # organisation, group, brand, country, legal_entity, business_unit, location_group, location
    node_id = Column(String(36), nullable=False, index=True)
    setting_key = Column(String(200), nullable=False, index=True)
    setting_value = Column(Text)  # JSON-encoded value
    mode = Column(String(10), nullable=False, default="inherit")  # inherit, override, lock
    is_locked_by_ancestor = Column(Boolean, default=False)  # true if an ancestor locked this key
    locked_by_node_type = Column(String(30), nullable=True)
    locked_by_node_id = Column(String(36), nullable=True)

    # Categories from the PRD
    # organisation: security policies, SSO, data residency, audit/compliance
    # group: cross-brand reporting, shared service policies
    # brand: logo, receipt branding, master menu, loyalty, tip/surcharge
    # country: language, localisation, date/number format, RTL/LTR
    # legal_entity: tax mode, VAT, commercial reg, currency, fiscal year, ZATCA
    # business_unit: cost centre codes, P&L reporting alignment
    # location_group: delivery charges, local pricing, promotional activations
    # location: operating hours, reservations, receipt header/footer, payment methods, floor layout
