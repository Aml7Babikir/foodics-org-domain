from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.settings import ConfigSettingCreate, ConfigSettingOut, ResolvedSettingOut
from app.services import config_service as svc

router = APIRouter(prefix="/config", tags=["Configuration"])


@router.post("/settings", response_model=ConfigSettingOut, status_code=201)
def set_config(data: ConfigSettingCreate, db: Session = Depends(get_db)):
    try:
        setting = svc.set_config(
            db, data.node_type, data.node_id,
            data.setting_key, data.setting_value, data.mode,
        )
        db.commit()
        db.refresh(setting)
        return setting
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))


@router.get("/settings/{node_type}/{node_id}", response_model=list[ConfigSettingOut])
def list_settings(node_type: str, node_id: str, db: Session = Depends(get_db)):
    return svc.list_settings_at_node(db, node_type, node_id)


@router.get("/resolve/{node_type}/{node_id}/{setting_key}", response_model=ResolvedSettingOut)
def resolve_setting(node_type: str, node_id: str, setting_key: str,
                    db: Session = Depends(get_db)):
    return svc.resolve_config(db, node_type, node_id, setting_key)


@router.get("/resolve/{node_type}/{node_id}", response_model=list[ResolvedSettingOut])
def resolve_all_settings(node_type: str, node_id: str, db: Session = Depends(get_db)):
    return svc.resolve_all_config(db, node_type, node_id)
