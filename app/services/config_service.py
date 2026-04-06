"""
Configuration Inheritance Engine.

Settings flow down the hierarchy like a waterfall.
At each level: INHERIT (use parent), OVERRIDE (local value), LOCK (set + prevent changes below).
"""
from sqlalchemy.orm import Session
from app.models.settings import ConfigSetting
from app.services.hierarchy_service import get_ancestor_chain


def set_config(db: Session, node_type: str, node_id: str, setting_key: str,
               setting_value: str, mode: str = "override") -> ConfigSetting:
    """Set a configuration value at a specific hierarchy node."""
    # Check if an ancestor has locked this key
    chain = get_ancestor_chain(db, node_type, node_id)
    for anc_type, anc_id in chain[:-1]:  # exclude self
        locked = db.query(ConfigSetting).filter(
            ConfigSetting.node_type == anc_type,
            ConfigSetting.node_id == anc_id,
            ConfigSetting.setting_key == setting_key,
            ConfigSetting.mode == "lock",
        ).first()
        if locked:
            raise ValueError(
                f"Setting '{setting_key}' is locked by {anc_type} ({anc_id}). Cannot override."
            )

    # Upsert the setting
    existing = db.query(ConfigSetting).filter(
        ConfigSetting.node_type == node_type,
        ConfigSetting.node_id == node_id,
        ConfigSetting.setting_key == setting_key,
    ).first()

    if existing:
        existing.setting_value = setting_value
        existing.mode = mode
        db.flush()
        return existing

    setting = ConfigSetting(
        node_type=node_type,
        node_id=node_id,
        setting_key=setting_key,
        setting_value=setting_value,
        mode=mode,
    )
    db.add(setting)
    db.flush()

    # If mode is "lock", mark descendants as locked
    if mode == "lock":
        _propagate_lock(db, node_type, node_id, setting_key)

    return setting


def _propagate_lock(db: Session, locker_type: str, locker_id: str, setting_key: str):
    """Mark any existing descendant overrides of this key as locked by ancestor."""
    # Find all settings with this key that are below this node
    all_settings = db.query(ConfigSetting).filter(
        ConfigSetting.setting_key == setting_key,
        ConfigSetting.node_type != locker_type,
    ).all()
    for s in all_settings:
        # Check if this setting's node is actually a descendant
        chain = get_ancestor_chain(db, s.node_type, s.node_id)
        for anc_type, anc_id in chain:
            if anc_type == locker_type and anc_id == locker_id:
                s.is_locked_by_ancestor = True
                s.locked_by_node_type = locker_type
                s.locked_by_node_id = locker_id
                break


def resolve_config(db: Session, node_type: str, node_id: str, setting_key: str) -> dict:
    """
    Resolve the effective value of a setting for a given node.
    Walks up the ancestor chain and returns the first OVERRIDE or LOCK found.
    """
    chain = get_ancestor_chain(db, node_type, node_id)

    # Walk from bottom (self) to top
    for ntype, nid in reversed(chain):
        setting = db.query(ConfigSetting).filter(
            ConfigSetting.node_type == ntype,
            ConfigSetting.node_id == nid,
            ConfigSetting.setting_key == setting_key,
            ConfigSetting.mode.in_(["override", "lock"]),
        ).first()
        if setting:
            # If this is a lock, it's authoritative
            if setting.mode == "lock":
                return {
                    "setting_key": setting_key,
                    "effective_value": setting.setting_value,
                    "source_node_type": ntype,
                    "source_node_id": nid,
                    "mode": "lock",
                    "is_locked": True,
                }
            # If this is our target node's own override, use it
            if ntype == node_type and nid == node_id:
                return {
                    "setting_key": setting_key,
                    "effective_value": setting.setting_value,
                    "source_node_type": ntype,
                    "source_node_id": nid,
                    "mode": "override",
                    "is_locked": False,
                }

    # Walk from top to bottom, find the deepest override/lock
    for ntype, nid in chain:
        setting = db.query(ConfigSetting).filter(
            ConfigSetting.node_type == ntype,
            ConfigSetting.node_id == nid,
            ConfigSetting.setting_key == setting_key,
            ConfigSetting.mode.in_(["override", "lock"]),
        ).first()
        if setting:
            return {
                "setting_key": setting_key,
                "effective_value": setting.setting_value,
                "source_node_type": ntype,
                "source_node_id": nid,
                "mode": setting.mode,
                "is_locked": setting.mode == "lock",
            }

    return {
        "setting_key": setting_key,
        "effective_value": None,
        "source_node_type": "",
        "source_node_id": "",
        "mode": "inherit",
        "is_locked": False,
    }


def resolve_all_config(db: Session, node_type: str, node_id: str) -> list[dict]:
    """Resolve all effective settings for a given node."""
    chain = get_ancestor_chain(db, node_type, node_id)

    # Collect all unique setting keys across the chain
    all_keys = set()
    for ntype, nid in chain:
        settings = db.query(ConfigSetting).filter(
            ConfigSetting.node_type == ntype,
            ConfigSetting.node_id == nid,
        ).all()
        for s in settings:
            all_keys.add(s.setting_key)

    return [resolve_config(db, node_type, node_id, key) for key in sorted(all_keys)]


def list_settings_at_node(db: Session, node_type: str, node_id: str) -> list[ConfigSetting]:
    """List all settings explicitly set at a specific node."""
    return db.query(ConfigSetting).filter(
        ConfigSetting.node_type == node_type,
        ConfigSetting.node_id == node_id,
    ).all()
