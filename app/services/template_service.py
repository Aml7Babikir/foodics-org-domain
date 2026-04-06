"""
Location Templates Service.

Captures a complete, validated set of configuration values from an existing
Location or Location Group, for quickly provisioning new outlets.
"""
from sqlalchemy.orm import Session
from app.models.templates import LocationTemplate
from app.services.config_service import resolve_all_config


def create_template_from_node(db: Session, name: str, organisation_id: str,
                               source_node_type: str, source_node_id: str,
                               description: str = None) -> LocationTemplate:
    """Create a template by snapshotting all resolved config from a source node."""
    resolved = resolve_all_config(db, source_node_type, source_node_id)
    config_snapshot = {r["setting_key"]: r["effective_value"] for r in resolved}

    template = LocationTemplate(
        name=name,
        organisation_id=organisation_id,
        source_node_type=source_node_type,
        source_node_id=source_node_id,
        description=description,
        config_snapshot=config_snapshot,
    )
    db.add(template)
    db.flush()
    return template


def create_template(db: Session, data: dict) -> LocationTemplate:
    template = LocationTemplate(**data)
    db.add(template)
    db.flush()
    return template


def get_template(db: Session, template_id: str) -> LocationTemplate:
    return db.query(LocationTemplate).filter(LocationTemplate.id == template_id).first()


def list_templates(db: Session, organisation_id: str):
    return db.query(LocationTemplate).filter(
        LocationTemplate.organisation_id == organisation_id
    ).all()
