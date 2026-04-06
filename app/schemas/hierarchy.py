from pydantic import BaseModel, validator
from typing import Optional
from datetime import datetime
import re


# --- Organisation ---
class OrganisationCreate(BaseModel):
    name: str
    billing_email: Optional[str] = None
    sso_enabled: bool = False
    data_residency_region: Optional[str] = None

class OrganisationUpdate(BaseModel):
    name: Optional[str] = None
    billing_email: Optional[str] = None
    sso_enabled: Optional[bool] = None
    data_residency_region: Optional[str] = None
    status: Optional[str] = None

class OrganisationOut(BaseModel):
    id: str
    name: str
    billing_email: Optional[str]
    sso_enabled: bool
    data_residency_region: Optional[str]
    status: str
    created_at: datetime
    class Config:
        from_attributes = True


# --- Group ---
class GroupCreate(BaseModel):
    name: str
    organisation_id: str

class GroupUpdate(BaseModel):
    name: Optional[str] = None

class GroupOut(BaseModel):
    id: str
    name: str
    organisation_id: str
    is_default: bool
    status: str
    created_at: datetime
    class Config:
        from_attributes = True


# --- Brand ---
class BrandCreate(BaseModel):
    name: str
    organisation_id: str
    group_id: Optional[str] = None
    logo_url: Optional[str] = None
    loyalty_programme_enabled: bool = False

class BrandUpdate(BaseModel):
    name: Optional[str] = None
    group_id: Optional[str] = None
    logo_url: Optional[str] = None
    loyalty_programme_enabled: Optional[bool] = None

class BrandOut(BaseModel):
    id: str
    name: str
    organisation_id: str
    group_id: Optional[str]
    logo_url: Optional[str]
    loyalty_programme_enabled: bool
    status: str
    created_at: datetime
    class Config:
        from_attributes = True


# --- Country ---
class CountryCreate(BaseModel):
    name: str
    iso_code: str
    brand_id: str
    locale: Optional[str] = None
    currency_code: Optional[str] = None

class CountryUpdate(BaseModel):
    name: Optional[str] = None
    iso_code: Optional[str] = None
    locale: Optional[str] = None
    currency_code: Optional[str] = None

class CountryOut(BaseModel):
    id: str
    name: str
    iso_code: str
    brand_id: str
    locale: Optional[str]
    currency_code: Optional[str]
    status: str
    created_at: datetime
    class Config:
        from_attributes = True


# --- Legal Entity (First-Class Node) ---
class LegalEntityCreate(BaseModel):
    name: str
    organisation_id: str
    country_id: str  # REQUIRED: every LE must belong to a country
    group_id: Optional[str] = None
    brand_ids: list[str] = []  # many-to-many: which brands this LE serves
    vat_registration_number: Optional[str] = None
    commercial_registration: Optional[str] = None
    currency_code: str
    fiscal_year_start_month: int = 1
    registered_address: Optional[str] = None
    tax_mode: str = "inclusive"
    zatca_enabled: bool = False
    owner_name: Optional[str] = None
    is_franchise: bool = False

    @validator("vat_registration_number")
    def validate_vat(cls, v, values):
        """Validate VAT format. Saudi VAT: 15 digits starting with 3."""
        if v and v.strip():
            # Saudi VAT format: 3XXXXXXXXXXXXX (15 digits starting with 3)
            cleaned = re.sub(r"[^0-9]", "", v)
            if len(cleaned) == 15 and not cleaned.startswith("3"):
                raise ValueError("Saudi VAT number must start with 3 (format: 3XXXXXXXXXXXXX)")
            if len(cleaned) > 0 and len(cleaned) != 15:
                # Allow partial/other formats but warn
                pass
        return v

class LegalEntityUpdate(BaseModel):
    name: Optional[str] = None
    country_id: Optional[str] = None
    group_id: Optional[str] = None
    brand_ids: Optional[list[str]] = None
    vat_registration_number: Optional[str] = None
    commercial_registration: Optional[str] = None
    currency_code: Optional[str] = None
    fiscal_year_start_month: Optional[int] = None
    registered_address: Optional[str] = None
    tax_mode: Optional[str] = None
    zatca_enabled: Optional[bool] = None
    owner_name: Optional[str] = None
    is_franchise: Optional[bool] = None

    @validator("vat_registration_number")
    def validate_vat(cls, v, values):
        if v and v.strip():
            cleaned = re.sub(r"[^0-9]", "", v)
            if len(cleaned) == 15 and not cleaned.startswith("3"):
                raise ValueError("Saudi VAT number must start with 3 (format: 3XXXXXXXXXXXXX)")
        return v

class LegalEntityOut(BaseModel):
    id: str
    name: str
    organisation_id: str
    country_id: str
    group_id: Optional[str]
    vat_registration_number: Optional[str]
    commercial_registration: Optional[str]
    currency_code: str
    tax_mode: str
    zatca_enabled: bool
    owner_name: Optional[str]
    is_franchise: bool
    status: str
    created_at: datetime
    class Config:
        from_attributes = True


# --- Brand-LegalEntity Link ---
class BrandLegalEntityLink(BaseModel):
    brand_id: str
    legal_entity_id: str


# --- Business Unit ---
class BusinessUnitCreate(BaseModel):
    name: str
    legal_entity_id: str
    cost_centre_code: Optional[str] = None

class BusinessUnitUpdate(BaseModel):
    name: Optional[str] = None
    cost_centre_code: Optional[str] = None

class BusinessUnitOut(BaseModel):
    id: str
    name: str
    legal_entity_id: str
    cost_centre_code: Optional[str]
    status: str
    created_at: datetime
    class Config:
        from_attributes = True


# --- Location Group ---
class LocationGroupCreate(BaseModel):
    name: str
    legal_entity_id: str
    business_unit_id: Optional[str] = None

class LocationGroupUpdate(BaseModel):
    name: Optional[str] = None
    business_unit_id: Optional[str] = None

class LocationGroupOut(BaseModel):
    id: str
    name: str
    legal_entity_id: str
    business_unit_id: Optional[str]
    status: str
    created_at: datetime
    class Config:
        from_attributes = True


# --- Location ---
class LocationCreate(BaseModel):
    name: str
    legal_entity_id: str  # REQUIRED: exactly one LE
    brand_id: str  # REQUIRED: which brand this location operates under
    location_group_id: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    latitude: Optional[str] = None
    longitude: Optional[str] = None
    location_type: str = "physical"
    template_id: Optional[str] = None

class LocationUpdate(BaseModel):
    name: Optional[str] = None
    location_group_id: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    latitude: Optional[str] = None
    longitude: Optional[str] = None
    location_type: Optional[str] = None
    is_active: Optional[bool] = None

class LocationOut(BaseModel):
    id: str
    name: str
    legal_entity_id: str
    brand_id: str
    location_group_id: Optional[str]
    address: Optional[str]
    city: Optional[str]
    location_type: str
    is_active: bool
    status: str
    created_at: datetime
    class Config:
        from_attributes = True


# --- Full hierarchy tree ---
class HierarchyTreeOut(BaseModel):
    organisation: OrganisationOut
    groups: list
    brands: list
    countries: list
    legal_entities: list
    business_units: list
    location_groups: list
    locations: list
