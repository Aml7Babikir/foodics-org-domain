from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.hierarchy import (
    OrganisationCreate, OrganisationUpdate, OrganisationOut,
    GroupCreate, GroupUpdate, GroupOut,
    BrandCreate, BrandUpdate, BrandOut,
    CountryCreate, CountryUpdate, CountryOut,
    LegalEntityCreate, LegalEntityUpdate, LegalEntityOut, BrandLegalEntityLink,
    BusinessUnitCreate, BusinessUnitUpdate, BusinessUnitOut,
    LocationGroupCreate, LocationGroupUpdate, LocationGroupOut,
    LocationCreate, LocationUpdate, LocationOut,
)
from app.services import hierarchy_service as svc

router = APIRouter(prefix="/hierarchy", tags=["Hierarchy"])


# --- Organisation ---
@router.post("/organisations", response_model=OrganisationOut, status_code=201)
def create_organisation(data: OrganisationCreate, db: Session = Depends(get_db)):
    org = svc.create_organisation(db, data.dict())
    db.commit()
    db.refresh(org)
    return org

@router.get("/organisations", response_model=list[OrganisationOut])
def list_organisations(db: Session = Depends(get_db)):
    return svc.list_organisations(db)

@router.get("/organisations/{org_id}", response_model=OrganisationOut)
def get_organisation(org_id: str, db: Session = Depends(get_db)):
    org = svc.get_organisation(db, org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organisation not found")
    return org

@router.put("/organisations/{org_id}", response_model=OrganisationOut)
def update_organisation(org_id: str, data: OrganisationUpdate, db: Session = Depends(get_db)):
    org = svc.update_organisation(db, org_id, data.dict(exclude_unset=True))
    if not org:
        raise HTTPException(status_code=404, detail="Organisation not found")
    db.commit()
    db.refresh(org)
    return org

@router.get("/organisations/{org_id}/tree")
def get_hierarchy_tree(org_id: str, db: Session = Depends(get_db)):
    tree = svc.get_hierarchy_tree(db, org_id)
    if not tree:
        raise HTTPException(status_code=404, detail="Organisation not found")
    return tree


# --- Group ---
@router.post("/groups", response_model=GroupOut, status_code=201)
def create_group(data: GroupCreate, db: Session = Depends(get_db)):
    group = svc.create_group(db, data.dict())
    db.commit()
    db.refresh(group)
    return group

@router.get("/organisations/{org_id}/groups", response_model=list[GroupOut])
def list_groups(org_id: str, db: Session = Depends(get_db)):
    return svc.list_groups(db, org_id)

@router.put("/groups/{group_id}", response_model=GroupOut)
def update_group(group_id: str, data: GroupUpdate, db: Session = Depends(get_db)):
    group = svc.update_group(db, group_id, data.dict(exclude_unset=True))
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    db.commit()
    db.refresh(group)
    return group


# --- Brand ---
@router.post("/brands", response_model=BrandOut, status_code=201)
def create_brand(data: BrandCreate, db: Session = Depends(get_db)):
    brand = svc.create_brand(db, data.dict())
    db.commit()
    db.refresh(brand)
    return brand

@router.get("/organisations/{org_id}/brands", response_model=list[BrandOut])
def list_brands(org_id: str, db: Session = Depends(get_db)):
    return svc.list_brands(db, org_id)

@router.get("/brands/{brand_id}", response_model=BrandOut)
def get_brand(brand_id: str, db: Session = Depends(get_db)):
    brand = svc.get_brand(db, brand_id)
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")
    return brand

@router.put("/brands/{brand_id}", response_model=BrandOut)
def update_brand(brand_id: str, data: BrandUpdate, db: Session = Depends(get_db)):
    brand = svc.update_brand(db, brand_id, data.dict(exclude_unset=True))
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")
    db.commit()
    db.refresh(brand)
    return brand

@router.delete("/brands/{brand_id}", response_model=BrandOut)
def delete_brand(brand_id: str, db: Session = Depends(get_db)):
    brand = svc.delete_brand(db, brand_id)
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")
    db.commit()
    db.refresh(brand)
    return brand


# --- Country ---
@router.post("/countries", response_model=CountryOut, status_code=201)
def create_country(data: CountryCreate, db: Session = Depends(get_db)):
    country = svc.create_country(db, data.dict())
    db.commit()
    db.refresh(country)
    return country

@router.get("/brands/{brand_id}/countries", response_model=list[CountryOut])
def list_countries(brand_id: str, db: Session = Depends(get_db)):
    return svc.list_countries(db, brand_id)

@router.put("/countries/{country_id}", response_model=CountryOut)
def update_country(country_id: str, data: CountryUpdate, db: Session = Depends(get_db)):
    country = svc.update_country(db, country_id, data.dict(exclude_unset=True))
    if not country:
        raise HTTPException(status_code=404, detail="Country not found")
    db.commit()
    db.refresh(country)
    return country


# --- Legal Entity (First-Class Node) ---
@router.post("/legal-entities", response_model=LegalEntityOut, status_code=201)
def create_legal_entity(data: LegalEntityCreate, db: Session = Depends(get_db)):
    le = svc.create_legal_entity(db, data.dict())
    db.commit()
    db.refresh(le)
    return le

@router.get("/organisations/{org_id}/legal-entities", response_model=list[LegalEntityOut])
def list_legal_entities_by_org(org_id: str, db: Session = Depends(get_db)):
    return svc.list_legal_entities(db, organisation_id=org_id)

@router.get("/brands/{brand_id}/legal-entities", response_model=list[LegalEntityOut])
def list_legal_entities_by_brand(brand_id: str, db: Session = Depends(get_db)):
    return svc.list_legal_entities(db, brand_id=brand_id)

@router.get("/legal-entities/{le_id}", response_model=LegalEntityOut)
def get_legal_entity(le_id: str, db: Session = Depends(get_db)):
    le = svc.get_legal_entity(db, le_id)
    if not le:
        raise HTTPException(status_code=404, detail="Legal entity not found")
    return le

@router.put("/legal-entities/{le_id}", response_model=LegalEntityOut)
def update_legal_entity(le_id: str, data: LegalEntityUpdate, db: Session = Depends(get_db)):
    le = svc.update_legal_entity(db, le_id, data.dict(exclude_unset=True))
    if not le:
        raise HTTPException(status_code=404, detail="Legal entity not found")
    db.commit()
    db.refresh(le)
    return le

@router.delete("/legal-entities/{le_id}", response_model=LegalEntityOut)
def delete_legal_entity(le_id: str, db: Session = Depends(get_db)):
    le = svc.delete_legal_entity(db, le_id)
    if not le:
        raise HTTPException(status_code=404, detail="Legal entity not found")
    db.commit()
    db.refresh(le)
    return le

@router.get("/legal-entities/{le_id}/brands")
def get_le_brands(le_id: str, db: Session = Depends(get_db)):
    brands = svc.get_legal_entity_brands(db, le_id)
    return [{"id": b.id, "name": b.name} for b in brands]

@router.post("/legal-entities/link-brand")
def link_brand_le(data: BrandLegalEntityLink, db: Session = Depends(get_db)):
    le = svc.link_brand_legal_entity(db, data.brand_id, data.legal_entity_id)
    db.commit()
    return {"status": "linked", "legal_entity_id": le.id, "brand_id": data.brand_id}

@router.post("/legal-entities/unlink-brand")
def unlink_brand_le(data: BrandLegalEntityLink, db: Session = Depends(get_db)):
    le = svc.unlink_brand_legal_entity(db, data.brand_id, data.legal_entity_id)
    db.commit()
    return {"status": "unlinked", "legal_entity_id": le.id, "brand_id": data.brand_id}


# --- Business Unit ---
@router.post("/business-units", response_model=BusinessUnitOut, status_code=201)
def create_business_unit(data: BusinessUnitCreate, db: Session = Depends(get_db)):
    bu = svc.create_business_unit(db, data.dict())
    db.commit()
    db.refresh(bu)
    return bu

@router.get("/legal-entities/{le_id}/business-units", response_model=list[BusinessUnitOut])
def list_business_units(le_id: str, db: Session = Depends(get_db)):
    return svc.list_business_units(db, le_id)

@router.get("/business-units/{bu_id}", response_model=BusinessUnitOut)
def get_business_unit(bu_id: str, db: Session = Depends(get_db)):
    bu = svc.get_business_unit(db, bu_id)
    if not bu:
        raise HTTPException(status_code=404, detail="Business unit not found")
    return bu

@router.put("/business-units/{bu_id}", response_model=BusinessUnitOut)
def update_business_unit(bu_id: str, data: BusinessUnitUpdate, db: Session = Depends(get_db)):
    bu = svc.update_business_unit(db, bu_id, data.dict(exclude_unset=True))
    if not bu:
        raise HTTPException(status_code=404, detail="Business unit not found")
    db.commit()
    db.refresh(bu)
    return bu


# --- Location Group ---
@router.post("/location-groups", response_model=LocationGroupOut, status_code=201)
def create_location_group(data: LocationGroupCreate, db: Session = Depends(get_db)):
    lg = svc.create_location_group(db, data.dict())
    db.commit()
    db.refresh(lg)
    return lg

@router.get("/legal-entities/{le_id}/location-groups", response_model=list[LocationGroupOut])
def list_location_groups(le_id: str, db: Session = Depends(get_db)):
    return svc.list_location_groups(db, le_id)

@router.get("/location-groups/{lg_id}", response_model=LocationGroupOut)
def get_location_group(lg_id: str, db: Session = Depends(get_db)):
    lg = svc.get_location_group(db, lg_id)
    if not lg:
        raise HTTPException(status_code=404, detail="Location group not found")
    return lg

@router.put("/location-groups/{lg_id}", response_model=LocationGroupOut)
def update_location_group(lg_id: str, data: LocationGroupUpdate, db: Session = Depends(get_db)):
    lg = svc.update_location_group(db, lg_id, data.dict(exclude_unset=True))
    if not lg:
        raise HTTPException(status_code=404, detail="Location group not found")
    db.commit()
    db.refresh(lg)
    return lg


# --- Location ---
@router.post("/locations", response_model=LocationOut, status_code=201)
def create_location(data: LocationCreate, db: Session = Depends(get_db)):
    loc = svc.create_location(db, data.dict())
    db.commit()
    db.refresh(loc)
    return loc

@router.get("/locations", response_model=list[LocationOut])
def list_locations(location_group_id: str = None, legal_entity_id: str = None,
                   brand_id: str = None, db: Session = Depends(get_db)):
    return svc.list_locations(db, location_group_id=location_group_id,
                              legal_entity_id=legal_entity_id, brand_id=brand_id)


# Static routes MUST be declared before /locations/{loc_id} so FastAPI matches
# them first — otherwise "copy-groups" gets routed as a Location id.
@router.get("/locations/copy-groups")
def list_location_copy_groups():
    """Spec §2.2: list of selectable setting groups for branch-to-branch copy."""
    return {
        "groups": [
            {"key": k, "columns": cols}
            for k, cols in svc.LOCATION_COPY_GROUPS.items()
        ]
    }


@router.post("/locations/{src_id}/copy-to/{dst_id}", response_model=LocationOut)
def copy_location_settings(
    src_id: str,
    dst_id: str,
    body: dict,
    db: Session = Depends(get_db),
):
    """
    Spec §2.2: copy selected branch settings from src → dst.
    Body: {"groups": ["basic_info", "opening_hours", ...]}
    """
    groups = body.get("groups") or []
    if not groups:
        raise HTTPException(status_code=400, detail="`groups` cannot be empty")
    try:
        dst = svc.copy_location_settings(db, src_id, dst_id, groups)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not dst:
        raise HTTPException(status_code=404, detail="Source or destination not found")
    db.commit()
    db.refresh(dst)
    return dst


@router.get("/locations/{loc_id}", response_model=LocationOut)
def get_location(loc_id: str, db: Session = Depends(get_db)):
    loc = svc.get_location(db, loc_id)
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")
    return loc

@router.put("/locations/{loc_id}", response_model=LocationOut)
def update_location(loc_id: str, data: LocationUpdate, db: Session = Depends(get_db)):
    loc = svc.update_location(db, loc_id, data.dict(exclude_unset=True))
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")
    db.commit()
    db.refresh(loc)
    return loc

@router.delete("/locations/{loc_id}", response_model=LocationOut)
def delete_location(loc_id: str, db: Session = Depends(get_db)):
    loc = svc.delete_location(db, loc_id)
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")
    db.commit()
    db.refresh(loc)
    return loc


# --- Ancestor chain ---
@router.get("/nodes/{node_type}/{node_id}/ancestors")
def get_ancestors(node_type: str, node_id: str, db: Session = Depends(get_db)):
    chain = svc.get_ancestor_chain(db, node_type, node_id)
    return [{"node_type": t, "node_id": i} for t, i in chain]

@router.get("/nodes/{node_type}/{node_id}/locations")
def get_descendant_locations(node_type: str, node_id: str, db: Session = Depends(get_db)):
    ids = svc.get_descendant_location_ids(db, node_type, node_id)
    return {"location_ids": ids, "count": len(ids)}
