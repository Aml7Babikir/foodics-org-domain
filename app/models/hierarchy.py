"""
Merchant Hierarchy with Legal Entity as a First-Class Node.

Two parallel dimensions:
  Operating Hierarchy:  Organisation → Group → Brand → Country → Business Unit → Location Group → Location
  Legal/Financial:      Legal Entity (first-class, attached at Org/Group/Brand level, inherited downward)

Key rules:
  - Legal Entity is NOT strictly above or below Brand in a pure tree
  - Brand ↔ Legal Entity is MANY-TO-MANY (one Brand → multiple LEs, one LE → multiple Brands)
  - Each Location belongs to exactly ONE Legal Entity (hard constraint)
  - Legal Entity owns VAT, CR, tax config, and financial identity
  - Franchise = different owners (Legal Entities) under the same Brand
  - Legal Entity must belong to exactly one Country
"""
from sqlalchemy import Column, String, ForeignKey, Boolean, Integer, Text, Table, DateTime
from sqlalchemy.orm import relationship
from app.models.base import BaseModel, Base


# --- Many-to-Many: Brand ↔ Legal Entity ---
brand_legal_entity = Table(
    "brand_legal_entity",
    Base.metadata,
    Column("brand_id", String(36), ForeignKey("brands.id"), primary_key=True),
    Column("legal_entity_id", String(36), ForeignKey("legal_entities.id"), primary_key=True),
)


class Organisation(BaseModel):
    """Top-level merchant account. Owns contracts and billing. Every merchant has exactly one."""
    __tablename__ = "organisations"

    name = Column(String(255), nullable=False)
    billing_email = Column(String(255))
    sso_enabled = Column(Boolean, default=False)
    data_residency_region = Column(String(50))
    status = Column(String(20), default="active")  # active, suspended

    # ── Account → Business Details (General) ──────────────────────── #
    account_number = Column(String(50))
    business_category = Column(String(80))                         # e.g. Restaurant, Cafe, QSR
    business_subcategory = Column(String(80))                      # e.g. Fine Dining, Coffee Shop
    tax_registration_name = Column(String(255))
    commercial_registration = Column(String(100))
    tax_number = Column(String(100))
    country = Column(String(100))                                  # display country at account level
    currency = Column(String(3))                                   # display currency at account level

    # ── Account → Business Details (Contacts) ─────────────────────── #
    primary_email = Column(String(255))                            # mirror of billing_email when set explicitly
    owner_email = Column(String(255))
    owner_phone = Column(String(50))

    # ── Account → Business Details (Settings) ─────────────────────── #
    time_zone = Column(String(60), default="Asia/Riyadh")
    tax_inclusive_pricing = Column(Boolean, default=True)          # mirrors Org-level tax_mode default
    enable_localization = Column(Boolean, default=False)
    restrict_purchased_items_to_supplier = Column(Boolean, default=False)
    enable_insurance_products = Column(Boolean, default=False)     # non-revenue insurance items
    two_factor_enabled = Column(Boolean, default=False)            # Google Authenticator

    # ── Account → Support tab ─────────────────────────────────────── #
    account_manager_name = Column(String(255))
    account_manager_email = Column(String(255))
    support_access_granted_until = Column(DateTime, nullable=True) # null = not granted

    # ── Account → Licenses & Invoices tab ─────────────────────────── #
    account_package_type = Column(String(80))                      # e.g. "Foodics RMS Standard"
    account_creation_email = Column(String(255))                   # who created the account
    # account_creation_date = self.created_at  (already inherited from BaseModel)

    # Relationships
    groups = relationship("Group", back_populates="organisation", cascade="all, delete-orphan")
    brands = relationship("Brand", back_populates="organisation", cascade="all, delete-orphan")
    legal_entities = relationship("LegalEntity", back_populates="organisation", cascade="all, delete-orphan")


class Group(BaseModel):
    """Holding group for multiple brands. Optional for smaller merchants."""
    __tablename__ = "groups"

    name = Column(String(255), nullable=False)
    organisation_id = Column(String(36), ForeignKey("organisations.id"), nullable=False)
    is_default = Column(Boolean, default=False)
    status = Column(String(20), default="active")
    tax_number = Column(String(100))
    address = Column(Text)
    owner_names = Column(Text)

    organisation = relationship("Organisation", back_populates="groups")
    brands = relationship("Brand", back_populates="group")


class Brand(BaseModel):
    """Customer-facing restaurant concept. Controls menu, pricing, loyalty, brand identity."""
    __tablename__ = "brands"

    name = Column(String(255), nullable=False)
    organisation_id = Column(String(36), ForeignKey("organisations.id"), nullable=False)
    group_id = Column(String(36), ForeignKey("groups.id"), nullable=True)
    logo_url = Column(String(500))
    receipt_header = Column(Text)        # Per-brand receipt header (Spec §2.1)
    receipt_footer = Column(Text)        # Per-brand receipt footer (Spec §2.1)
    loyalty_programme_enabled = Column(Boolean, default=False)
    # Contacts (Account → Business Details Contacts moved here)
    contact_email = Column(String(255))
    contact_phone = Column(String(50))
    status = Column(String(20), default="active")

    organisation = relationship("Organisation", back_populates="brands")
    group = relationship("Group", back_populates="brands")
    countries = relationship("Country", back_populates="brand", cascade="all, delete-orphan")

    # Many-to-many with Legal Entity
    legal_entities = relationship("LegalEntity", secondary=brand_legal_entity, back_populates="brands")


class Country(BaseModel):
    """Market context layer. Adapts brand to local rules and regulations."""
    __tablename__ = "countries"

    name = Column(String(255), nullable=False)
    iso_code = Column(String(3), nullable=False)  # ISO 3166-1 alpha-3
    brand_id = Column(String(36), ForeignKey("brands.id"), nullable=False)
    locale = Column(String(10))  # e.g. ar-SA, en-AE
    currency_code = Column(String(3))  # e.g. SAR, AED, EGP
    is_default = Column(Boolean, default=False)
    status = Column(String(20), default="active")

    brand = relationship("Brand", back_populates="countries")
    legal_entities = relationship("LegalEntity", back_populates="country")


class LegalEntity(BaseModel):
    """
    FIRST-CLASS NODE: Registered company for compliance, tax, payment settlement, and financial reporting.

    Key properties:
      - Standalone entity, visible in hierarchy, assignable in permissions
      - Belongs to exactly ONE Organisation (ownership)
      - Belongs to exactly ONE Country (regulatory context) — REQUIRED
      - Has many-to-many relationship with Brand (one LE can serve multiple Brands)
      - Owns: VAT registration, commercial registration, currency, fiscal year, tax config
      - Every Location must belong to exactly one Legal Entity
      - Franchise model: different Legal Entities (owners) operate under the same Brand
    """
    __tablename__ = "legal_entities"

    name = Column(String(255), nullable=False)

    # Ownership: every LE belongs to one Organisation
    organisation_id = Column(String(36), ForeignKey("organisations.id"), nullable=False)

    # Regulatory context: every LE MUST belong to exactly one Country
    country_id = Column(String(36), ForeignKey("countries.id"), nullable=False)

    # Optional: group-level association for consolidated reporting
    group_id = Column(String(36), ForeignKey("groups.id"), nullable=True)

    # Financial identity
    vat_registration_number = Column(String(100))
    commercial_registration = Column(String(100))
    currency_code = Column(String(3), nullable=False)
    fiscal_year_start_month = Column(Integer, default=1)  # 1=Jan
    registered_address = Column(Text)
    tax_mode = Column(String(20), default="inclusive")  # inclusive, exclusive
    zatca_enabled = Column(Boolean, default=False)

    # Contact (Account → Business Details Contacts moved here)
    email = Column(String(255), nullable=True)
    owner_phone = Column(String(50), nullable=True)

    # General company-profile fields (Account → Business Details General moved here)
    account_number = Column(String(50), nullable=True)
    business_category = Column(String(80), nullable=True)
    business_subcategory = Column(String(80), nullable=True)
    tax_registration_name = Column(String(255), nullable=True)
    tax_number = Column(String(100), nullable=True)

    # Franchise ownership: who owns/operates this legal entity
    owner_name = Column(String(255), nullable=True)  # e.g. "Al-Nakheel F&B LLC" (the franchisee)
    is_franchise = Column(Boolean, default=False)  # True if operated by a franchisee

    status = Column(String(20), default="active")

    # Relationships
    organisation = relationship("Organisation", back_populates="legal_entities")
    country = relationship("Country", back_populates="legal_entities")
    group = relationship("Group")

    # Many-to-many with Brand
    brands = relationship("Brand", secondary=brand_legal_entity, back_populates="legal_entities")

    # Children
    business_units = relationship("BusinessUnit", back_populates="legal_entity", cascade="all, delete-orphan")
    location_groups = relationship("LocationGroup", back_populates="legal_entity", cascade="all, delete-orphan")
    locations = relationship("Location", back_populates="legal_entity")


class BusinessUnit(BaseModel):
    """Internal P&L accountability. Optional."""
    __tablename__ = "business_units"

    name = Column(String(255), nullable=False)
    legal_entity_id = Column(String(36), ForeignKey("legal_entities.id"), nullable=False)
    cost_centre_code = Column(String(50))
    is_default = Column(Boolean, default=False)
    status = Column(String(20), default="active")

    legal_entity = relationship("LegalEntity", back_populates="business_units")
    location_groups = relationship("LocationGroup", back_populates="business_unit")


class LocationGroup(BaseModel):
    """Operational grouping of locations. Optional."""
    __tablename__ = "location_groups"

    name = Column(String(255), nullable=False)
    legal_entity_id = Column(String(36), ForeignKey("legal_entities.id"), nullable=False)
    business_unit_id = Column(String(36), ForeignKey("business_units.id"), nullable=True)
    is_default = Column(Boolean, default=False)
    status = Column(String(20), default="active")

    legal_entity = relationship("LegalEntity", back_populates="location_groups")
    business_unit = relationship("BusinessUnit", back_populates="location_groups")
    locations = relationship("Location", back_populates="location_group", cascade="all, delete-orphan")


class Location(BaseModel):
    """
    Physical or virtual outlet. The operational leaf node.
    CONSTRAINT: Every Location belongs to exactly ONE Legal Entity.
    """
    __tablename__ = "locations"

    name = Column(String(255), nullable=False)

    # HARD CONSTRAINT: exactly one Legal Entity
    legal_entity_id = Column(String(36), ForeignKey("legal_entities.id"), nullable=False)

    # Operating hierarchy linkage
    brand_id = Column(String(36), ForeignKey("brands.id"), nullable=False)  # which brand this location operates under
    location_group_id = Column(String(36), ForeignKey("location_groups.id"), nullable=True)

    address = Column(Text)
    city = Column(String(100))
    reference = Column(String(100))
    phone = Column(String(50))
    country = Column(String(100))
    street_number = Column(String(100))
    opening_from = Column(String(10))
    opening_to = Column(String(10))
    inventory_eod_time = Column(String(10))
    receives_online_orders = Column(Boolean, default=False)
    accepts_reservations = Column(Boolean, default=False)
    reservation_duration = Column(Integer)
    reservation_times = Column(Text)
    latitude = Column(String(20))
    longitude = Column(String(20))
    location_type = Column(String(30), default="physical")  # physical, ghost_kitchen, food_truck
    is_active = Column(Boolean, default=True)
    template_id = Column(String(36), ForeignKey("location_templates.id"), nullable=True)
    status = Column(String(20), default="active")

    # Branch-spec fields (Spec §2.2):
    localized_name = Column(String(255))                  # Localized display name
    branch_type = Column(String(50))                      # e.g. dine_in, qsr, ghost, hybrid
    tax_registration_name = Column(String(255))           # ZATCA: legal/tax registration name
    tax_number = Column(String(100))                      # ZATCA: tax registration number
    commercial_registration = Column(String(100))         # ZATCA: required for cashier activation
    receives_call_center_orders = Column(Boolean, default=False)
    enable_dms_delivery = Column(Boolean, default=False)  # Delivery Management System
    course_management_enabled = Column(Boolean, default=False)
    print_on_hold = Column(Boolean, default=False)        # Course-mgmt sub-config
    unhold_in_kitchen = Column(Boolean, default=False)
    auto_hold_all_courses = Column(Boolean, default=False)

    # Contact (Account → Business Details Contacts moved here)
    # Phone already exists above; just adding contact_email at branch level.
    contact_email = Column(String(255), nullable=True)

    legal_entity = relationship("LegalEntity", back_populates="locations")
    brand = relationship("Brand")
    location_group = relationship("LocationGroup", back_populates="locations")
    template = relationship("LocationTemplate", back_populates="locations")
