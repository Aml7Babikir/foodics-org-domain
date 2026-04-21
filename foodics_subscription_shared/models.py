"""Data model for Foodics Subscription Management demo (shared across both apps)."""
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, UniqueConstraint
)
from sqlalchemy.orm import relationship
from .db import Base


# --- Catalog ---------------------------------------------------------------

class Plan(Base):
    """An RMS tier: Starter / Basic / Advanced / Black."""
    __tablename__ = "plans"
    id = Column(Integer, primary_key=True)
    code = Column(String(40), unique=True, nullable=False)
    name = Column(String(80), nullable=False)
    tier_order = Column(Integer, nullable=False)
    tagline = Column(String(200))
    description = Column(Text)
    prices = relationship("PlanPrice", back_populates="plan", cascade="all, delete-orphan")


class PlanPrice(Base):
    __tablename__ = "plan_prices"
    id = Column(Integer, primary_key=True)
    plan_id = Column(Integer, ForeignKey("plans.id"), nullable=False)
    currency = Column(String(3), nullable=False)
    monthly_price = Column(Float, nullable=False)
    plan = relationship("Plan", back_populates="prices")
    __table_args__ = (UniqueConstraint("plan_id", "currency"),)


class Addon(Base):
    """Feature toggle: Loyalty, BI, Gift Cards, Warehouse, Call Center, etc."""
    __tablename__ = "addons"
    id = Column(Integer, primary_key=True)
    code = Column(String(40), unique=True, nullable=False)
    name = Column(String(80), nullable=False)
    description = Column(Text)
    min_tier = Column(Integer, default=1)  # minimum plan.tier_order that allows this addon
    prices = relationship("AddonPrice", back_populates="addon", cascade="all, delete-orphan")


class AddonPrice(Base):
    __tablename__ = "addon_prices"
    id = Column(Integer, primary_key=True)
    addon_id = Column(Integer, ForeignKey("addons.id"), nullable=False)
    currency = Column(String(3), nullable=False)
    monthly_price = Column(Float, nullable=False)
    addon = relationship("Addon", back_populates="prices")
    __table_args__ = (UniqueConstraint("addon_id", "currency"),)


class DeviceSku(Base):
    """Per-unit licensed devices: Sub-Cashier, KDS, Kiosk, Waiter app."""
    __tablename__ = "device_skus"
    id = Column(Integer, primary_key=True)
    code = Column(String(40), unique=True, nullable=False)
    name = Column(String(80), nullable=False)
    description = Column(Text)
    prices = relationship("DevicePrice", back_populates="sku", cascade="all, delete-orphan")


class DevicePrice(Base):
    __tablename__ = "device_prices"
    id = Column(Integer, primary_key=True)
    device_sku_id = Column(Integer, ForeignKey("device_skus.id"), nullable=False)
    currency = Column(String(3), nullable=False)
    monthly_price = Column(Float, nullable=False)
    sku = relationship("DeviceSku", back_populates="prices")
    __table_args__ = (UniqueConstraint("device_sku_id", "currency"),)


class SeparateProduct(Base):
    """Foodics Online / Foodics Pay / Foodics Accounting — standalone product lines."""
    __tablename__ = "separate_products"
    id = Column(Integer, primary_key=True)
    code = Column(String(40), unique=True, nullable=False)
    name = Column(String(80), nullable=False)
    billing_model = Column(String(40), nullable=False)  # monthly, annual, transactional
    description = Column(Text)
    tiers = relationship("SeparateProductTier", back_populates="product", cascade="all, delete-orphan")


class SeparateProductTier(Base):
    """e.g. Foodics Online has Free / Standard / Premium tiers."""
    __tablename__ = "separate_product_tiers"
    id = Column(Integer, primary_key=True)
    product_id = Column(Integer, ForeignKey("separate_products.id"), nullable=False)
    code = Column(String(40), nullable=False)
    name = Column(String(80), nullable=False)
    tier_order = Column(Integer, default=1)
    product = relationship("SeparateProduct", back_populates="tiers")
    prices = relationship("SeparateProductPrice", back_populates="tier", cascade="all, delete-orphan")


class SeparateProductPrice(Base):
    __tablename__ = "separate_product_prices"
    id = Column(Integer, primary_key=True)
    tier_id = Column(Integer, ForeignKey("separate_product_tiers.id"), nullable=False)
    currency = Column(String(3), nullable=False)
    price = Column(Float, nullable=False)
    tier = relationship("SeparateProductTier", back_populates="prices")
    __table_args__ = (UniqueConstraint("tier_id", "currency"),)


class Currency(Base):
    __tablename__ = "currencies"
    code = Column(String(3), primary_key=True)
    symbol = Column(String(8), nullable=False)
    name = Column(String(80), nullable=False)
    region = Column(String(80), nullable=False)


# --- Merchants & subscriptions --------------------------------------------

class Merchant(Base):
    __tablename__ = "merchants"
    id = Column(Integer, primary_key=True)
    name = Column(String(200), nullable=False)
    email = Column(String(200), nullable=False)
    country = Column(String(80))
    currency = Column(String(3), nullable=False, default="SAR")
    branches_count = Column(Integer, default=1)
    # Captured from Salesforce on merchant creation
    sf_account_number = Column(String(60), unique=True)
    cr_number = Column(String(60))            # Commercial Registration
    vat_number = Column(String(60))           # Tax ID
    legal_identifier = Column(String(160))    # Legal entity name / unique ID
    sf_synced_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    subscriptions = relationship("Subscription", back_populates="merchant", cascade="all, delete-orphan")

    def missing_required_fields(self):
        """Required for invoicing. Returns a list of field codes that are still blank."""
        required = {
            "email": self.email,
            "country": self.country,
            "cr_number": self.cr_number,
            "vat_number": self.vat_number,
            "legal_identifier": self.legal_identifier,
        }
        return [k for k, v in required.items() if not v]


class Subscription(Base):
    __tablename__ = "subscriptions"
    id = Column(Integer, primary_key=True)
    merchant_id = Column(Integer, ForeignKey("merchants.id"), nullable=False)
    plan_id = Column(Integer, ForeignKey("plans.id"), nullable=False)
    currency = Column(String(3), nullable=False)
    branches = Column(Integer, default=1)
    status = Column(String(40), default="processing")  # processing | pending_payment | completed | cancelled
    deal_stage = Column(String(40), default="discovery")
    billing_frequency = Column(String(20), default="monthly")
    created_at = Column(DateTime, default=datetime.utcnow)
    activated_at = Column(DateTime)
    cancelled_at = Column(DateTime)
    next_renewal_at = Column(DateTime)

    merchant = relationship("Merchant", back_populates="subscriptions")
    plan = relationship("Plan")
    addons = relationship("SubscriptionAddon", back_populates="subscription", cascade="all, delete-orphan")
    devices = relationship("SubscriptionDevice", back_populates="subscription", cascade="all, delete-orphan")
    separate_products = relationship("SubscriptionSeparateProduct", back_populates="subscription", cascade="all, delete-orphan")
    invoices = relationship("Invoice", back_populates="subscription", cascade="all, delete-orphan")


class SubscriptionAddon(Base):
    __tablename__ = "subscription_addons"
    id = Column(Integer, primary_key=True)
    subscription_id = Column(Integer, ForeignKey("subscriptions.id"), nullable=False)
    addon_id = Column(Integer, ForeignKey("addons.id"), nullable=False)
    subscription = relationship("Subscription", back_populates="addons")
    addon = relationship("Addon")


class SubscriptionDevice(Base):
    __tablename__ = "subscription_devices"
    id = Column(Integer, primary_key=True)
    subscription_id = Column(Integer, ForeignKey("subscriptions.id"), nullable=False)
    device_sku_id = Column(Integer, ForeignKey("device_skus.id"), nullable=False)
    quantity = Column(Integer, default=1)
    subscription = relationship("Subscription", back_populates="devices")
    sku = relationship("DeviceSku")


class SubscriptionSeparateProduct(Base):
    __tablename__ = "subscription_separate_products"
    id = Column(Integer, primary_key=True)
    subscription_id = Column(Integer, ForeignKey("subscriptions.id"), nullable=False)
    tier_id = Column(Integer, ForeignKey("separate_product_tiers.id"), nullable=False)
    quantity = Column(Integer, default=1)
    subscription = relationship("Subscription", back_populates="separate_products")
    tier = relationship("SeparateProductTier")


class Invoice(Base):
    __tablename__ = "invoices"
    id = Column(Integer, primary_key=True)
    subscription_id = Column(Integer, ForeignKey("subscriptions.id"), nullable=False)
    number = Column(String(40), unique=True, nullable=False)
    currency = Column(String(3), nullable=False)
    total = Column(Float, nullable=False)
    status = Column(String(20), default="pending")  # pending | paid | void
    issued_at = Column(DateTime, default=datetime.utcnow)
    paid_at = Column(DateTime)
    notes = Column(Text)
    subscription = relationship("Subscription", back_populates="invoices")
    lines = relationship("InvoiceLine", back_populates="invoice", cascade="all, delete-orphan")


class InvoiceLine(Base):
    __tablename__ = "invoice_lines"
    id = Column(Integer, primary_key=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False)
    category = Column(String(40), nullable=False)  # plan | addon | device | separate | proration
    description = Column(String(200), nullable=False)
    quantity = Column(Integer, default=1)
    unit_price = Column(Float, nullable=False)
    subtotal = Column(Float, nullable=False)
    invoice = relationship("Invoice", back_populates="lines")
