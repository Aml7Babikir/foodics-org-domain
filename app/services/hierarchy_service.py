"""
Hierarchy Service — manages the operating hierarchy + legal entity as a first-class node.

Two parallel dimensions:
  Operating:  Organisation → Group → Brand → Country → BU → Location Group → Location
  Legal:      Legal Entity (first-class, M:N with Brand, owns locations)

Key rules:
  - Location belongs to exactly ONE Legal Entity and exactly ONE Brand
  - Legal Entity ↔ Brand is many-to-many
  - Legal Entity MUST belong to a Country
  - Config inheritance flows: Org → Group → Brand → Country → LE → BU → LG → Location
"""
from typing import Optional
from sqlalchemy.orm import Session
from app.models.hierarchy import (
    Organisation, Group, Brand, Country, LegalEntity,
    BusinessUnit, LocationGroup, Location, brand_legal_entity,
)


MODEL_MAP = {
    "organisation": Organisation,
    "group": Group,
    "brand": Brand,
    "country": Country,
    "legal_entity": LegalEntity,
    "business_unit": BusinessUnit,
    "location_group": LocationGroup,
    "location": Location,
}


def get_node(db: Session, node_type: str, node_id: str):
    model = MODEL_MAP.get(node_type)
    if not model:
        return None
    return db.query(model).filter(model.id == node_id).first()


# --- Organisation ---

def create_organisation(db: Session, data: dict) -> Organisation:
    org = Organisation(**data)
    db.add(org)
    db.flush()
    # Auto-create invisible default Group
    default_group = Group(name=f"{org.name} (Default Group)", organisation_id=org.id, is_default=True)
    db.add(default_group)
    db.flush()
    return org


def get_organisation(db: Session, org_id: str) -> Organisation:
    return db.query(Organisation).filter(Organisation.id == org_id).first()


def update_organisation(db: Session, org_id: str, data: dict) -> Optional[Organisation]:
    org = db.query(Organisation).filter(Organisation.id == org_id).first()
    if not org:
        return None
    for key, value in data.items():
        if value is not None:
            setattr(org, key, value)
    db.flush()
    return org


def list_organisations(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Organisation).offset(skip).limit(limit).all()


# --- Group ---

def create_group(db: Session, data: dict) -> Group:
    group = Group(**data)
    db.add(group)
    db.flush()
    return group


def get_group(db: Session, group_id: str) -> Group:
    return db.query(Group).filter(Group.id == group_id).first()


def update_group(db: Session, group_id: str, data: dict) -> Optional[Group]:
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        return None
    for key, value in data.items():
        if value is not None:
            setattr(group, key, value)
    db.flush()
    return group


def list_groups(db: Session, organisation_id: str):
    return db.query(Group).filter(Group.organisation_id == organisation_id).all()


# --- Brand ---

def create_brand(db: Session, data: dict) -> Brand:
    org_id = data["organisation_id"]
    if not data.get("group_id"):
        default_group = db.query(Group).filter(
            Group.organisation_id == org_id, Group.is_default == True
        ).first()
        if default_group:
            data["group_id"] = default_group.id
    brand = Brand(**data)
    db.add(brand)
    db.flush()
    return brand


def get_brand(db: Session, brand_id: str) -> Brand:
    return db.query(Brand).filter(Brand.id == brand_id).first()


def update_brand(db: Session, brand_id: str, data: dict) -> Optional[Brand]:
    brand = db.query(Brand).filter(Brand.id == brand_id).first()
    if not brand:
        return None
    for key, value in data.items():
        if value is not None:
            setattr(brand, key, value)
    db.flush()
    return brand


def delete_brand(db: Session, brand_id: str) -> Optional[Brand]:
    brand = db.query(Brand).filter(Brand.id == brand_id).first()
    if not brand:
        return None
    brand.status = "deleted"
    db.flush()
    return brand


def list_brands(db: Session, organisation_id: str):
    return db.query(Brand).filter(Brand.organisation_id == organisation_id).all()


# --- Country ---

def create_country(db: Session, data: dict) -> Country:
    country = Country(**data)
    db.add(country)
    db.flush()
    return country


def get_country(db: Session, country_id: str) -> Country:
    return db.query(Country).filter(Country.id == country_id).first()


def update_country(db: Session, country_id: str, data: dict) -> Optional[Country]:
    country = db.query(Country).filter(Country.id == country_id).first()
    if not country:
        return None
    for key, value in data.items():
        if value is not None:
            setattr(country, key, value)
    db.flush()
    return country


def list_countries(db: Session, brand_id: str):
    return db.query(Country).filter(Country.brand_id == brand_id).all()


# --- Legal Entity (First-Class Node) ---

def create_legal_entity(db: Session, data: dict) -> LegalEntity:
    """
    Create a Legal Entity. Handles:
      - brand_ids: list of brand IDs to link (many-to-many)
      - country_id is REQUIRED
      - organisation_id is REQUIRED
    """
    brand_ids = data.pop("brand_ids", [])

    # Legacy support: if 'brand_id' is provided (single), convert to brand_ids
    single_brand_id = data.pop("brand_id", None)
    if single_brand_id and not brand_ids:
        brand_ids = [single_brand_id]

    le = LegalEntity(**data)
    db.add(le)
    db.flush()

    # Link to brands (many-to-many)
    for bid in brand_ids:
        brand = db.query(Brand).filter(Brand.id == bid).first()
        if brand:
            le.brands.append(brand)

    db.flush()
    return le


def link_brand_legal_entity(db: Session, brand_id: str, legal_entity_id: str):
    """Link a Brand and Legal Entity (many-to-many)."""
    le = db.query(LegalEntity).filter(LegalEntity.id == legal_entity_id).first()
    brand = db.query(Brand).filter(Brand.id == brand_id).first()
    if le and brand and brand not in le.brands:
        le.brands.append(brand)
        db.flush()
    return le


def unlink_brand_legal_entity(db: Session, brand_id: str, legal_entity_id: str):
    """Unlink a Brand and Legal Entity."""
    le = db.query(LegalEntity).filter(LegalEntity.id == legal_entity_id).first()
    brand = db.query(Brand).filter(Brand.id == brand_id).first()
    if le and brand and brand in le.brands:
        le.brands.remove(brand)
        db.flush()
    return le


def get_legal_entity(db: Session, le_id: str) -> LegalEntity:
    return db.query(LegalEntity).filter(LegalEntity.id == le_id).first()


def update_legal_entity(db: Session, le_id: str, data: dict) -> Optional[LegalEntity]:
    le = db.query(LegalEntity).filter(LegalEntity.id == le_id).first()
    if not le:
        return None

    # Handle brand_ids M:N update separately
    brand_ids = data.pop("brand_ids", None)

    for key, value in data.items():
        if value is not None:
            setattr(le, key, value)

    if brand_ids is not None:
        # Replace the entire brand association list
        le.brands.clear()
        for bid in brand_ids:
            brand = db.query(Brand).filter(Brand.id == bid).first()
            if brand:
                le.brands.append(brand)

    db.flush()
    return le


def delete_legal_entity(db: Session, le_id: str) -> Optional[LegalEntity]:
    le = db.query(LegalEntity).filter(LegalEntity.id == le_id).first()
    if not le:
        return None
    le.status = "deleted"
    db.flush()
    return le


def list_legal_entities(db: Session, organisation_id: str = None, brand_id: str = None):
    q = db.query(LegalEntity)
    if organisation_id:
        q = q.filter(LegalEntity.organisation_id == organisation_id)
    if brand_id:
        q = q.filter(LegalEntity.brands.any(Brand.id == brand_id))
    return q.all()


def get_legal_entity_brands(db: Session, le_id: str):
    """Get all brands linked to a Legal Entity."""
    le = db.query(LegalEntity).filter(LegalEntity.id == le_id).first()
    return le.brands if le else []


# --- Business Unit ---

def create_business_unit(db: Session, data: dict) -> BusinessUnit:
    bu = BusinessUnit(**data)
    db.add(bu)
    db.flush()
    return bu


def get_business_unit(db: Session, bu_id: str) -> BusinessUnit:
    return db.query(BusinessUnit).filter(BusinessUnit.id == bu_id).first()


def update_business_unit(db: Session, bu_id: str, data: dict) -> Optional[BusinessUnit]:
    bu = db.query(BusinessUnit).filter(BusinessUnit.id == bu_id).first()
    if not bu:
        return None
    for key, value in data.items():
        if value is not None:
            setattr(bu, key, value)
    db.flush()
    return bu


def list_business_units(db: Session, legal_entity_id: str):
    return db.query(BusinessUnit).filter(BusinessUnit.legal_entity_id == legal_entity_id).all()


# --- Location Group ---

def create_location_group(db: Session, data: dict) -> LocationGroup:
    lg = LocationGroup(**data)
    db.add(lg)
    db.flush()
    return lg


def get_location_group(db: Session, lg_id: str) -> LocationGroup:
    return db.query(LocationGroup).filter(LocationGroup.id == lg_id).first()


def update_location_group(db: Session, lg_id: str, data: dict) -> Optional[LocationGroup]:
    lg = db.query(LocationGroup).filter(LocationGroup.id == lg_id).first()
    if not lg:
        return None
    for key, value in data.items():
        if value is not None:
            setattr(lg, key, value)
    db.flush()
    return lg


def list_location_groups(db: Session, legal_entity_id: str):
    return db.query(LocationGroup).filter(LocationGroup.legal_entity_id == legal_entity_id).all()


# --- Location ---

def create_location(db: Session, data: dict) -> Location:
    """
    Create a Location. Validates:
      - legal_entity_id is required (hard constraint)
      - brand_id is required
      - The Brand-LE link must exist
    """
    le_id = data.get("legal_entity_id")
    brand_id = data.get("brand_id")

    if le_id and brand_id:
        le = db.query(LegalEntity).filter(LegalEntity.id == le_id).first()
        brand = db.query(Brand).filter(Brand.id == brand_id).first()
        if le and brand and brand not in le.brands:
            # Auto-link if not already linked
            le.brands.append(brand)
            db.flush()

    loc = Location(**data)
    db.add(loc)
    db.flush()
    return loc


def get_location(db: Session, loc_id: str) -> Location:
    return db.query(Location).filter(Location.id == loc_id).first()


def update_location(db: Session, loc_id: str, data: dict) -> Optional[Location]:
    loc = db.query(Location).filter(Location.id == loc_id).first()
    if not loc:
        return None
    for key, value in data.items():
        if value is not None:
            setattr(loc, key, value)
    db.flush()
    return loc


def delete_location(db: Session, loc_id: str) -> Optional[Location]:
    loc = db.query(Location).filter(Location.id == loc_id).first()
    if not loc:
        return None
    loc.status = "deleted"
    db.flush()
    return loc


def list_locations(db: Session, location_group_id: str = None, legal_entity_id: str = None, brand_id: str = None):
    q = db.query(Location)
    if location_group_id:
        q = q.filter(Location.location_group_id == location_group_id)
    if legal_entity_id:
        q = q.filter(Location.legal_entity_id == legal_entity_id)
    if brand_id:
        q = q.filter(Location.brand_id == brand_id)
    return q.all()


# --- Full hierarchy tree ---

def get_hierarchy_tree(db: Session, org_id: str) -> dict:
    org = get_organisation(db, org_id)
    if not org:
        return None

    groups = list_groups(db, org_id)
    brands = list_brands(db, org_id)
    all_les = list_legal_entities(db, organisation_id=org_id)
    all_countries = []
    all_bus = []
    all_lgs = []
    all_locations = []

    for brand in brands:
        countries = list_countries(db, brand.id)
        all_countries.extend(countries)

    for le in all_les:
        bus = list_business_units(db, le.id)
        all_bus.extend(bus)
        lgs = list_location_groups(db, le.id)
        all_lgs.extend(lgs)
        locs = list_locations(db, legal_entity_id=le.id)
        all_locations.extend(locs)

    return {
        "organisation": org,
        "groups": groups,
        "brands": brands,
        "countries": all_countries,
        "legal_entities": all_les,
        "business_units": all_bus,
        "location_groups": all_lgs,
        "locations": all_locations,
    }


def get_ancestor_chain(db: Session, node_type: str, node_id: str) -> list[tuple[str, str]]:
    """
    Walk up the hierarchy from a node and return [(node_type, node_id), ...] from top to bottom.

    For the dual-dimension model:
      Location → (LocationGroup?) → (BusinessUnit?) → LegalEntity → Country → Brand → (Group?) → Organisation
      LegalEntity also links up through Country and Organisation directly.
    """
    chain = []
    current_type = node_type
    current_id = node_id

    while current_type and current_id:
        node = get_node(db, current_type, current_id)
        if not node:
            break
        chain.append((current_type, current_id))

        if current_type == "location":
            if node.location_group_id:
                current_type, current_id = "location_group", node.location_group_id
            else:
                current_type, current_id = "legal_entity", node.legal_entity_id
        elif current_type == "location_group":
            if node.business_unit_id:
                current_type, current_id = "business_unit", node.business_unit_id
            else:
                current_type, current_id = "legal_entity", node.legal_entity_id
        elif current_type == "business_unit":
            current_type, current_id = "legal_entity", node.legal_entity_id
        elif current_type == "legal_entity":
            # LE → Country (required)
            current_type, current_id = "country", node.country_id
        elif current_type == "country":
            current_type, current_id = "brand", node.brand_id
        elif current_type == "brand":
            if node.group_id:
                current_type, current_id = "group", node.group_id
            else:
                current_type, current_id = "organisation", node.organisation_id
        elif current_type == "group":
            current_type, current_id = "organisation", node.organisation_id
        elif current_type == "organisation":
            break
        else:
            break

    chain.reverse()
    return chain


def get_descendant_location_ids(db: Session, node_type: str, node_id: str) -> list[str]:
    """Get all Location IDs that sit below a given hierarchy node."""
    if node_type == "location":
        return [node_id]

    if node_type == "location_group":
        locs = db.query(Location).filter(Location.location_group_id == node_id).all()
        return [l.id for l in locs]

    if node_type == "business_unit":
        lgs = db.query(LocationGroup).filter(LocationGroup.business_unit_id == node_id).all()
        loc_ids = []
        for lg in lgs:
            loc_ids.extend(get_descendant_location_ids(db, "location_group", lg.id))
        return loc_ids

    if node_type == "legal_entity":
        locs = db.query(Location).filter(Location.legal_entity_id == node_id).all()
        return [l.id for l in locs]

    if node_type == "country":
        les = db.query(LegalEntity).filter(LegalEntity.country_id == node_id).all()
        loc_ids = []
        for le in les:
            loc_ids.extend(get_descendant_location_ids(db, "legal_entity", le.id))
        return loc_ids

    if node_type == "brand":
        # Locations directly under this brand
        locs = db.query(Location).filter(Location.brand_id == node_id).all()
        return [l.id for l in locs]

    if node_type == "group":
        brands = db.query(Brand).filter(Brand.group_id == node_id).all()
        loc_ids = []
        for b in brands:
            loc_ids.extend(get_descendant_location_ids(db, "brand", b.id))
        return loc_ids

    if node_type == "organisation":
        brands = db.query(Brand).filter(Brand.organisation_id == node_id).all()
        loc_ids = []
        for b in brands:
            loc_ids.extend(get_descendant_location_ids(db, "brand", b.id))
        return loc_ids

    return []
