"""Pydantic schemas for the Manage section."""
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
from decimal import Decimal


# ───── Driver ─────
class DriverCreate(BaseModel):
    name: str
    organisation_id: str
    location_id: Optional[str] = None
    mobile_number: Optional[str] = None
    vehicle_type: Optional[str] = None
    license_plate: Optional[str] = None
    is_active: bool = True

class DriverUpdate(BaseModel):
    name: Optional[str] = None
    location_id: Optional[str] = None
    mobile_number: Optional[str] = None
    vehicle_type: Optional[str] = None
    license_plate: Optional[str] = None
    is_active: Optional[bool] = None
    status: Optional[str] = None

class DriverOut(BaseModel):
    id: str
    name: str
    organisation_id: str
    location_id: Optional[str]
    mobile_number: Optional[str]
    vehicle_type: Optional[str]
    license_plate: Optional[str]
    is_active: bool
    status: str
    created_at: datetime
    class Config:
        from_attributes = True


# ───── Device ─────
class DeviceCreate(BaseModel):
    name: str
    organisation_id: str
    location_id: Optional[str] = None
    device_type: str = "pos"
    serial_number: Optional[str] = None
    model: Optional[str] = None

class DeviceUpdate(BaseModel):
    name: Optional[str] = None
    location_id: Optional[str] = None
    device_type: Optional[str] = None
    serial_number: Optional[str] = None
    model: Optional[str] = None
    status: Optional[str] = None

class DeviceOut(BaseModel):
    id: str
    name: str
    organisation_id: str
    location_id: Optional[str]
    device_type: str
    serial_number: Optional[str]
    model: Optional[str]
    status: str
    created_at: datetime
    class Config:
        from_attributes = True


# ───── Tax ─────
class TaxCreate(BaseModel):
    name: str
    organisation_id: str
    rate: Decimal = Decimal("0")
    tax_type: str = "vat"
    is_active: bool = True

class TaxUpdate(BaseModel):
    name: Optional[str] = None
    rate: Optional[Decimal] = None
    tax_type: Optional[str] = None
    is_active: Optional[bool] = None
    status: Optional[str] = None

class TaxOut(BaseModel):
    id: str
    name: str
    organisation_id: str
    rate: Decimal
    tax_type: str
    is_active: bool
    status: str
    created_at: datetime
    class Config:
        from_attributes = True


# ───── PaymentMethod ─────
class PaymentMethodCreate(BaseModel):
    name: str
    organisation_id: str
    method_type: str = "cash"
    is_default: bool = False
    is_active: bool = True

class PaymentMethodUpdate(BaseModel):
    name: Optional[str] = None
    method_type: Optional[str] = None
    is_default: Optional[bool] = None
    is_active: Optional[bool] = None
    status: Optional[str] = None

class PaymentMethodOut(BaseModel):
    id: str
    name: str
    organisation_id: str
    method_type: str
    is_default: bool
    is_active: bool
    status: str
    created_at: datetime
    class Config:
        from_attributes = True


# ───── Charge ─────
class ChargeCreate(BaseModel):
    name: str
    organisation_id: str
    charge_type: str = "service"
    amount_type: str = "percent"
    amount: Decimal = Decimal("0")
    applies_to: str = "order"

class ChargeUpdate(BaseModel):
    name: Optional[str] = None
    charge_type: Optional[str] = None
    amount_type: Optional[str] = None
    amount: Optional[Decimal] = None
    applies_to: Optional[str] = None
    status: Optional[str] = None

class ChargeOut(BaseModel):
    id: str
    name: str
    organisation_id: str
    charge_type: str
    amount_type: str
    amount: Decimal
    applies_to: str
    status: str
    created_at: datetime
    class Config:
        from_attributes = True


# ───── DeliveryZone ─────
class DeliveryZoneCreate(BaseModel):
    name: str
    organisation_id: str
    location_id: Optional[str] = None
    delivery_fee: Decimal = Decimal("0")
    minimum_order: Decimal = Decimal("0")
    polygon: Optional[str] = None

class DeliveryZoneUpdate(BaseModel):
    name: Optional[str] = None
    location_id: Optional[str] = None
    delivery_fee: Optional[Decimal] = None
    minimum_order: Optional[Decimal] = None
    polygon: Optional[str] = None
    status: Optional[str] = None

class DeliveryZoneOut(BaseModel):
    id: str
    name: str
    organisation_id: str
    location_id: Optional[str]
    delivery_fee: Decimal
    minimum_order: Decimal
    polygon: Optional[str]
    status: str
    created_at: datetime
    class Config:
        from_attributes = True


# ───── Tag ─────
class TagCreate(BaseModel):
    name: str
    organisation_id: str
    color: str = "#6366F1"
    applies_to: str = "product"

class TagUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    applies_to: Optional[str] = None
    status: Optional[str] = None

class TagOut(BaseModel):
    id: str
    name: str
    organisation_id: str
    color: str
    applies_to: str
    status: str
    created_at: datetime
    class Config:
        from_attributes = True


# ───── Reason ─────
class ReasonCreate(BaseModel):
    name: str
    organisation_id: str
    reason_type: str = "void"
    is_active: bool = True

class ReasonUpdate(BaseModel):
    name: Optional[str] = None
    reason_type: Optional[str] = None
    is_active: Optional[bool] = None
    status: Optional[str] = None

class ReasonOut(BaseModel):
    id: str
    name: str
    organisation_id: str
    reason_type: str
    is_active: bool
    is_system: bool = False
    status: str
    created_at: datetime
    class Config:
        from_attributes = True


# ───── KitchenFlow ─────
class KitchenFlowCreate(BaseModel):
    name: str
    organisation_id: str
    location_id: Optional[str] = None
    routing_rules: Optional[str] = None

class KitchenFlowUpdate(BaseModel):
    name: Optional[str] = None
    location_id: Optional[str] = None
    routing_rules: Optional[str] = None
    status: Optional[str] = None

class KitchenFlowOut(BaseModel):
    id: str
    name: str
    organisation_id: str
    location_id: Optional[str]
    routing_rules: Optional[str]
    status: str
    created_at: datetime
    class Config:
        from_attributes = True


# ───── ReservationSetting ─────
from pydantic import validator

class ReservationSettingCreate(BaseModel):
    name: str
    organisation_id: str
    location_id: Optional[str] = None
    is_enabled: bool = False
    slot_duration_minutes: int = 60
    max_party_size: int = 10
    opening_time: Optional[str] = None
    closing_time: Optional[str] = None
    days_of_week: Optional[str] = "mon,tue,wed,thu,fri,sat,sun"
    auto_accept_online: bool = False
    table_ids: Optional[str] = None

    @validator("slot_duration_minutes")
    def _min_slot(cls, v):
        # Spec §12: minimum reservation duration is 30 minutes.
        if v is not None and v < 30:
            raise ValueError("slot_duration_minutes must be at least 30")
        return v

class ReservationSettingUpdate(BaseModel):
    name: Optional[str] = None
    location_id: Optional[str] = None
    is_enabled: Optional[bool] = None
    slot_duration_minutes: Optional[int] = None
    max_party_size: Optional[int] = None
    opening_time: Optional[str] = None
    closing_time: Optional[str] = None
    days_of_week: Optional[str] = None
    auto_accept_online: Optional[bool] = None
    table_ids: Optional[str] = None
    status: Optional[str] = None

    @validator("slot_duration_minutes")
    def _min_slot(cls, v):
        if v is not None and v < 30:
            raise ValueError("slot_duration_minutes must be at least 30")
        return v

class ReservationSettingOut(BaseModel):
    id: str
    name: str
    organisation_id: str
    location_id: Optional[str]
    is_enabled: bool
    slot_duration_minutes: int
    max_party_size: int
    opening_time: Optional[str]
    closing_time: Optional[str]
    days_of_week: Optional[str]
    auto_accept_online: bool
    table_ids: Optional[str]
    status: str
    created_at: datetime
    class Config:
        from_attributes = True


# ───── OnlineOrderingChannel ─────
class OnlineOrderingCreate(BaseModel):
    name: str
    organisation_id: str
    brand_id: Optional[str] = None
    is_enabled: bool = False
    storefront_url: Optional[str] = None
    auto_accept_orders: bool = False

class OnlineOrderingUpdate(BaseModel):
    name: Optional[str] = None
    brand_id: Optional[str] = None
    is_enabled: Optional[bool] = None
    storefront_url: Optional[str] = None
    auto_accept_orders: Optional[bool] = None
    status: Optional[str] = None

class OnlineOrderingOut(BaseModel):
    id: str
    name: str
    organisation_id: str
    brand_id: Optional[str]
    is_enabled: bool
    storefront_url: Optional[str]
    auto_accept_orders: bool
    status: str
    created_at: datetime
    class Config:
        from_attributes = True


# ───── PayAtTable ─────
class PayAtTableCreate(BaseModel):
    name: str
    organisation_id: str
    location_id: Optional[str] = None
    is_enabled: bool = False
    qr_code_url: Optional[str] = None
    accepted_methods: str = "card,wallet"

class PayAtTableUpdate(BaseModel):
    name: Optional[str] = None
    location_id: Optional[str] = None
    is_enabled: Optional[bool] = None
    qr_code_url: Optional[str] = None
    accepted_methods: Optional[str] = None
    status: Optional[str] = None

class PayAtTableOut(BaseModel):
    id: str
    name: str
    organisation_id: str
    location_id: Optional[str]
    is_enabled: bool
    qr_code_url: Optional[str]
    accepted_methods: str
    status: str
    created_at: datetime
    class Config:
        from_attributes = True


# ───── NotificationSetting ─────
class NotificationCreate(BaseModel):
    name: str
    organisation_id: str
    event_type: str = "order_received"
    channel: str = "email"
    frequency: str = "immediate"
    apply_on: Optional[str] = None
    is_enabled: bool = True
    recipients: Optional[str] = None

class NotificationUpdate(BaseModel):
    name: Optional[str] = None
    event_type: Optional[str] = None
    channel: Optional[str] = None
    frequency: Optional[str] = None
    apply_on: Optional[str] = None
    is_enabled: Optional[bool] = None
    recipients: Optional[str] = None
    status: Optional[str] = None

class NotificationOut(BaseModel):
    id: str
    name: str
    organisation_id: str
    event_type: str
    channel: str
    frequency: str
    apply_on: Optional[str]
    is_enabled: bool
    recipients: Optional[str]
    status: str
    created_at: datetime
    class Config:
        from_attributes = True


# ───── OnlinePaymentGateway ─────
class OnlinePaymentCreate(BaseModel):
    name: str
    organisation_id: str
    provider: str = "stripe"
    api_key: Optional[str] = None
    public_key: Optional[str] = None
    is_test_mode: bool = True
    is_active: bool = True

class OnlinePaymentUpdate(BaseModel):
    name: Optional[str] = None
    provider: Optional[str] = None
    api_key: Optional[str] = None
    public_key: Optional[str] = None
    is_test_mode: Optional[bool] = None
    is_active: Optional[bool] = None
    status: Optional[str] = None

class OnlinePaymentOut(BaseModel):
    id: str
    name: str
    organisation_id: str
    provider: str
    api_key: Optional[str]
    public_key: Optional[str]
    is_test_mode: bool
    is_active: bool
    status: str
    created_at: datetime
    class Config:
        from_attributes = True


# ───── DeliveryCharge ─────
class DeliveryChargeCreate(BaseModel):
    name: str
    organisation_id: str
    delivery_zone_id: Optional[str] = None
    amount: Decimal = Decimal("0")
    min_order_threshold: Decimal = Decimal("0")
    free_above_threshold: bool = False

class DeliveryChargeUpdate(BaseModel):
    name: Optional[str] = None
    delivery_zone_id: Optional[str] = None
    amount: Optional[Decimal] = None
    min_order_threshold: Optional[Decimal] = None
    free_above_threshold: Optional[bool] = None
    status: Optional[str] = None

class DeliveryChargeOut(BaseModel):
    id: str
    name: str
    organisation_id: str
    delivery_zone_id: Optional[str]
    amount: Decimal
    min_order_threshold: Decimal
    free_above_threshold: bool
    status: str
    created_at: datetime
    class Config:
        from_attributes = True


# ───── Section ─────
class SectionCreate(BaseModel):
    name: str
    organisation_id: str
    location_id: Optional[str] = None
    sort_order: int = 0

class SectionUpdate(BaseModel):
    name: Optional[str] = None
    location_id: Optional[str] = None
    sort_order: Optional[int] = None
    status: Optional[str] = None

class SectionOut(BaseModel):
    id: str
    name: str
    organisation_id: str
    location_id: Optional[str]
    sort_order: int
    status: str
    created_at: datetime
    class Config:
        from_attributes = True


# ───── DiningTable ─────
class DiningTableCreate(BaseModel):
    name: str
    organisation_id: str
    section_id: Optional[str] = None
    capacity: int = 4

class DiningTableUpdate(BaseModel):
    name: Optional[str] = None
    section_id: Optional[str] = None
    capacity: Optional[int] = None
    status: Optional[str] = None

class DiningTableOut(BaseModel):
    id: str
    name: str
    organisation_id: str
    section_id: Optional[str]
    capacity: int
    status: str
    created_at: datetime
    class Config:
        from_attributes = True


# ───── RevenueCenter ─────
class RevenueCenterCreate(BaseModel):
    name: str
    organisation_id: str
    location_id: Optional[str] = None
    section_ids: Optional[str] = None
    table_ids: Optional[str] = None
    device_ids: Optional[str] = None

class RevenueCenterUpdate(BaseModel):
    name: Optional[str] = None
    location_id: Optional[str] = None
    section_ids: Optional[str] = None
    table_ids: Optional[str] = None
    device_ids: Optional[str] = None
    status: Optional[str] = None

class RevenueCenterOut(BaseModel):
    id: str
    name: str
    organisation_id: str
    location_id: Optional[str]
    section_ids: Optional[str]
    table_ids: Optional[str]
    device_ids: Optional[str]
    status: str
    created_at: datetime
    class Config:
        from_attributes = True


# ───── TimedEvent ─────
class TimedEventCreate(BaseModel):
    name: str
    organisation_id: str
    location_id: Optional[str] = None
    event_type: str = "reduce_price_percent"
    value: Decimal = Decimal("0")
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    is_active: bool = True

class TimedEventUpdate(BaseModel):
    name: Optional[str] = None
    location_id: Optional[str] = None
    event_type: Optional[str] = None
    value: Optional[Decimal] = None
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    is_active: Optional[bool] = None
    status: Optional[str] = None

class TimedEventOut(BaseModel):
    id: str
    name: str
    organisation_id: str
    location_id: Optional[str]
    event_type: str
    value: Decimal
    starts_at: Optional[datetime]
    ends_at: Optional[datetime]
    is_active: bool
    status: str
    created_at: datetime
    class Config:
        from_attributes = True


# ───── Course ─────
class CourseCreate(BaseModel):
    name: str
    organisation_id: str
    sort_order: int = 0

class CourseUpdate(BaseModel):
    name: Optional[str] = None
    sort_order: Optional[int] = None
    status: Optional[str] = None

class CourseOut(BaseModel):
    id: str
    name: str
    organisation_id: str
    sort_order: int
    is_system: bool = False
    status: str
    created_at: datetime
    class Config:
        from_attributes = True


# ───── BranchPaymentMethodOverride ─────
class BranchPaymentOverrideCreate(BaseModel):
    organisation_id: str
    location_id: str
    payment_method_id: str
    is_disabled: bool = True

class BranchPaymentOverrideUpdate(BaseModel):
    is_disabled: Optional[bool] = None
    status: Optional[str] = None

class BranchPaymentOverrideOut(BaseModel):
    id: str
    organisation_id: str
    location_id: str
    payment_method_id: str
    is_disabled: bool
    status: str
    created_at: datetime
    class Config:
        from_attributes = True


# ───── SupportTicket ─────
class SupportTicketCreate(BaseModel):
    name: str                        # subject
    organisation_id: str
    body: Optional[str] = None
    category: str = "general"
    priority: str = "normal"
    created_by_user_id: Optional[str] = None

class SupportTicketUpdate(BaseModel):
    name: Optional[str] = None
    body: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[str] = None
    state: Optional[str] = None
    resolved_at: Optional[datetime] = None
    status: Optional[str] = None

class SupportTicketOut(BaseModel):
    id: str
    name: str
    organisation_id: str
    body: Optional[str]
    category: str
    priority: str
    state: str
    created_by_user_id: Optional[str]
    resolved_at: Optional[datetime]
    status: str
    created_at: datetime
    class Config:
        from_attributes = True


# ───── OrganisationSettings (8-tab JSON blob) ─────
class OrganisationSettingsUpsert(BaseModel):
    organisation_id: str
    category: str
    settings: Dict[str, Any]

class OrganisationSettingsOut(BaseModel):
    id: str
    organisation_id: str
    category: str
    settings: Optional[Dict[str, Any]]
    updated_at: datetime
    class Config:
        from_attributes = True
