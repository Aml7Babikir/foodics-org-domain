"""
Hierarchy level ordering and traversal utilities.
"""

HIERARCHY_LEVELS = [
    "organisation",   # L0
    "group",          # L1
    "brand",          # L2
    "country",        # L3
    "legal_entity",   # L4
    "business_unit",  # L5
    "location_group", # L6
    "location",       # L7
]

LEVEL_INDEX = {level: i for i, level in enumerate(HIERARCHY_LEVELS)}

# Maps node_type to the SQLAlchemy model class name
LEVEL_MODEL_MAP = {
    "organisation": "Organisation",
    "group": "Group",
    "brand": "Brand",
    "country": "Country",
    "legal_entity": "LegalEntity",
    "business_unit": "BusinessUnit",
    "location_group": "LocationGroup",
    "location": "Location",
}

# Maps node_type to its parent foreign key field
LEVEL_PARENT_FIELD = {
    "group": "organisation_id",
    "brand": "group_id",       # also has organisation_id
    "country": "brand_id",
    "legal_entity": "brand_id",  # also has country_id
    "business_unit": "legal_entity_id",
    "location_group": "legal_entity_id",  # also has business_unit_id
    "location": "location_group_id",      # also has legal_entity_id
}


def is_ancestor_of(ancestor_type: str, descendant_type: str) -> bool:
    return LEVEL_INDEX.get(ancestor_type, 99) < LEVEL_INDEX.get(descendant_type, -1)


def get_ancestor_levels(node_type: str) -> list[str]:
    idx = LEVEL_INDEX.get(node_type, 0)
    return HIERARCHY_LEVELS[:idx]


def get_descendant_levels(node_type: str) -> list[str]:
    idx = LEVEL_INDEX.get(node_type, len(HIERARCHY_LEVELS) - 1)
    return HIERARCHY_LEVELS[idx + 1:]
