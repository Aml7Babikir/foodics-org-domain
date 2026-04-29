"""
API routes for the Manage section.

Each entity gets a list/get/create/update/delete pair. The routes are typed per
schema so OpenAPI stays useful, but the service layer is shared via a registry.

Settings (8-tab JSON blob per category) gets its own upsert endpoint group.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Callable, Type
from pydantic import BaseModel

from app.core.database import get_db
from app.services import manage_service as svc
from app.schemas.manage import (
    DriverCreate, DriverUpdate, DriverOut,
    DeviceCreate, DeviceUpdate, DeviceOut,
    TaxCreate, TaxUpdate, TaxOut,
    PaymentMethodCreate, PaymentMethodUpdate, PaymentMethodOut,
    ChargeCreate, ChargeUpdate, ChargeOut,
    DeliveryZoneCreate, DeliveryZoneUpdate, DeliveryZoneOut,
    TagCreate, TagUpdate, TagOut,
    ReasonCreate, ReasonUpdate, ReasonOut,
    KitchenFlowCreate, KitchenFlowUpdate, KitchenFlowOut,
    ReservationSettingCreate, ReservationSettingUpdate, ReservationSettingOut,
    OnlineOrderingCreate, OnlineOrderingUpdate, OnlineOrderingOut,
    PayAtTableCreate, PayAtTableUpdate, PayAtTableOut,
    NotificationCreate, NotificationUpdate, NotificationOut,
    OnlinePaymentCreate, OnlinePaymentUpdate, OnlinePaymentOut,
    DeliveryChargeCreate, DeliveryChargeUpdate, DeliveryChargeOut,
    SectionCreate, SectionUpdate, SectionOut,
    DiningTableCreate, DiningTableUpdate, DiningTableOut,
    RevenueCenterCreate, RevenueCenterUpdate, RevenueCenterOut,
    TimedEventCreate, TimedEventUpdate, TimedEventOut,
    CourseCreate, CourseUpdate, CourseOut,
    BranchPaymentOverrideCreate, BranchPaymentOverrideUpdate, BranchPaymentOverrideOut,
    OrganisationSettingsUpsert, OrganisationSettingsOut,
)
from app.models.manage import SETTINGS_CATEGORIES


router = APIRouter(prefix="/manage", tags=["Manage"])


def _register_crud(
    entity_key: str,
    create_schema: Type[BaseModel],
    update_schema: Type[BaseModel],
    out_schema: Type[BaseModel],
):
    """Register list / get / create / update / delete endpoints for one entity."""

    @router.get(
        f"/organisations/{{org_id}}/{entity_key}",
        response_model=list[out_schema],
        name=f"list_{entity_key}",
    )
    def _list(org_id: str, db: Session = Depends(get_db)):
        return svc.list_for_org(db, entity_key, org_id)

    @router.get(
        f"/{entity_key}/{{item_id}}",
        response_model=out_schema,
        name=f"get_{entity_key}",
    )
    def _get(item_id: str, db: Session = Depends(get_db)):
        item = svc.get(db, entity_key, item_id)
        if not item:
            raise HTTPException(status_code=404, detail=f"{entity_key} not found")
        return item

    @router.post(
        f"/{entity_key}",
        response_model=out_schema,
        status_code=201,
        name=f"create_{entity_key}",
    )
    def _create(data: create_schema, db: Session = Depends(get_db)):  # type: ignore[valid-type]
        item = svc.create(db, entity_key, data.dict())
        db.commit()
        db.refresh(item)
        return item

    @router.put(
        f"/{entity_key}/{{item_id}}",
        response_model=out_schema,
        name=f"update_{entity_key}",
    )
    def _update(item_id: str, data: update_schema, db: Session = Depends(get_db)):  # type: ignore[valid-type]
        item = svc.update(db, entity_key, item_id, data.dict(exclude_unset=True))
        if not item:
            raise HTTPException(status_code=404, detail=f"{entity_key} not found")
        db.commit()
        db.refresh(item)
        return item

    @router.delete(
        f"/{entity_key}/{{item_id}}",
        name=f"delete_{entity_key}",
    )
    def _delete(item_id: str, db: Session = Depends(get_db)):
        ok = svc.delete(db, entity_key, item_id)
        if not ok:
            raise HTTPException(status_code=404, detail=f"{entity_key} not found")
        db.commit()
        return {"ok": True}


# ── register all CRUD entities ────────────────────────────────────── #
_register_crud("drivers", DriverCreate, DriverUpdate, DriverOut)
_register_crud("devices", DeviceCreate, DeviceUpdate, DeviceOut)
_register_crud("taxes", TaxCreate, TaxUpdate, TaxOut)
_register_crud("payment-methods", PaymentMethodCreate, PaymentMethodUpdate, PaymentMethodOut)
_register_crud("charges", ChargeCreate, ChargeUpdate, ChargeOut)
_register_crud("delivery-zones", DeliveryZoneCreate, DeliveryZoneUpdate, DeliveryZoneOut)
_register_crud("tags", TagCreate, TagUpdate, TagOut)
_register_crud("reasons", ReasonCreate, ReasonUpdate, ReasonOut)
_register_crud("kitchen-flows", KitchenFlowCreate, KitchenFlowUpdate, KitchenFlowOut)
_register_crud("reservation-settings", ReservationSettingCreate, ReservationSettingUpdate, ReservationSettingOut)
_register_crud("online-ordering", OnlineOrderingCreate, OnlineOrderingUpdate, OnlineOrderingOut)
_register_crud("pay-at-table", PayAtTableCreate, PayAtTableUpdate, PayAtTableOut)
_register_crud("notifications", NotificationCreate, NotificationUpdate, NotificationOut)
_register_crud("online-payments", OnlinePaymentCreate, OnlinePaymentUpdate, OnlinePaymentOut)
_register_crud("delivery-charges", DeliveryChargeCreate, DeliveryChargeUpdate, DeliveryChargeOut)
# Spec §3, §11, §5, §8, §6:
_register_crud("sections", SectionCreate, SectionUpdate, SectionOut)
_register_crud("tables", DiningTableCreate, DiningTableUpdate, DiningTableOut)
_register_crud("revenue-centers", RevenueCenterCreate, RevenueCenterUpdate, RevenueCenterOut)
_register_crud("timed-events", TimedEventCreate, TimedEventUpdate, TimedEventOut)
_register_crud("courses", CourseCreate, CourseUpdate, CourseOut)
_register_crud("branch-payment-overrides", BranchPaymentOverrideCreate, BranchPaymentOverrideUpdate, BranchPaymentOverrideOut)


# ── Settings (8-tab JSON-blob per category) ──────────────────────── #

@router.get(
    "/organisations/{org_id}/settings",
    response_model=list[OrganisationSettingsOut],
    name="list_settings",
)
def list_settings(org_id: str, db: Session = Depends(get_db)):
    rows = svc.list_settings(db, org_id)
    return [svc.settings_to_out(r) for r in rows]


@router.get(
    "/organisations/{org_id}/settings/{category}",
    response_model=OrganisationSettingsOut,
    name="get_settings",
)
def get_settings(org_id: str, category: str, db: Session = Depends(get_db)):
    if category not in SETTINGS_CATEGORIES:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown category. Allowed: {', '.join(SETTINGS_CATEGORIES)}",
        )
    row = svc.get_settings(db, org_id, category)
    if not row:
        # Empty defaults — UI can render a blank form.
        return {
            "id": "",
            "organisation_id": org_id,
            "category": category,
            "settings": {},
            "updated_at": __import__("datetime").datetime.utcnow(),
        }
    return svc.settings_to_out(row)


@router.put(
    "/organisations/{org_id}/settings/{category}",
    response_model=OrganisationSettingsOut,
    name="upsert_settings",
)
def upsert_settings(
    org_id: str,
    category: str,
    data: OrganisationSettingsUpsert,
    db: Session = Depends(get_db),
):
    if category not in SETTINGS_CATEGORIES:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown category. Allowed: {', '.join(SETTINGS_CATEGORIES)}",
        )
    try:
        row = svc.upsert_settings(db, org_id, category, data.settings)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    db.commit()
    db.refresh(row)
    return svc.settings_to_out(row)


@router.get("/settings/categories", name="list_settings_categories")
def list_settings_categories():
    """Stable list of settings tabs, used by the Settings UI."""
    return {"categories": list(SETTINGS_CATEGORIES)}
