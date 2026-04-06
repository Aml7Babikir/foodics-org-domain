from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.templates import LocationTemplateCreate, LocationTemplateOut
from app.services import template_service as svc

router = APIRouter(prefix="/templates", tags=["Location Templates"])


@router.post("/", response_model=LocationTemplateOut, status_code=201)
def create_template(data: LocationTemplateCreate, db: Session = Depends(get_db)):
    template = svc.create_template(db, data.dict())
    db.commit()
    db.refresh(template)
    return template


@router.post("/from-node")
def create_from_node(name: str, organisation_id: str, source_node_type: str,
                     source_node_id: str, description: str = None,
                     db: Session = Depends(get_db)):
    template = svc.create_template_from_node(
        db, name, organisation_id, source_node_type, source_node_id, description
    )
    db.commit()
    db.refresh(template)
    return template


@router.get("/{template_id}", response_model=LocationTemplateOut)
def get_template(template_id: str, db: Session = Depends(get_db)):
    t = svc.get_template(db, template_id)
    if not t:
        raise HTTPException(status_code=404, detail="Template not found")
    return t


@router.get("/organisation/{org_id}", response_model=list[LocationTemplateOut])
def list_templates(org_id: str, db: Session = Depends(get_db)):
    return svc.list_templates(db, org_id)
