from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.delegation import DelegationCreate, DelegationOut
from app.services import delegation_service as svc

router = APIRouter(prefix="/delegations", tags=["Franchise Delegation"])


@router.post("/", response_model=DelegationOut, status_code=201)
def create_delegation(data: DelegationCreate, db: Session = Depends(get_db)):
    delegation = svc.create_delegation(db, data.dict())
    db.commit()
    db.refresh(delegation)
    return delegation


@router.get("/{delegation_id}", response_model=DelegationOut)
def get_delegation(delegation_id: str, db: Session = Depends(get_db)):
    d = svc.get_delegation(db, delegation_id)
    if not d:
        raise HTTPException(status_code=404, detail="Delegation not found")
    return d


@router.get("/delegator/{org_id}", response_model=list[DelegationOut])
def list_by_delegator(org_id: str, db: Session = Depends(get_db)):
    return svc.list_delegations_by_delegator(db, org_id)


@router.get("/receiver/{org_id}", response_model=list[DelegationOut])
def list_by_receiver(org_id: str, db: Session = Depends(get_db)):
    return svc.list_delegations_by_receiver(db, org_id)


@router.post("/{delegation_id}/revoke", response_model=DelegationOut)
def revoke_delegation(delegation_id: str, revoked_by: str, db: Session = Depends(get_db)):
    try:
        d = svc.revoke_delegation(db, delegation_id, revoked_by)
        db.commit()
        return d
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/receiver/{org_id}/locations")
def get_delegated_locations(org_id: str, db: Session = Depends(get_db)):
    ids = svc.get_delegated_location_ids(db, org_id)
    return {"location_ids": ids, "count": len(ids)}
