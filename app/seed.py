"""
Seed script — updated for Legal Entity as First-Class Node.

Demonstrates:
1. System roles (8 fixed roles)
2. Micro merchant (Shawarm & Co.)
3. Mid-market merchant (Tasty Ventures Group)
4. Enterprise merchant (Gulf Restaurant Holdings) with:
   - Multiple Legal Entities per Brand (GRH KSA LLC + GRH UAE FZ both serve BurgerX)
   - Franchise model: Al-Nakheel F&B LLC is a franchisee LE operating BurgerX locations
   - Reporting split by LE vs consolidated by Brand
5. Configuration inheritance with LOCK at LE level for tax settings
6. Franchise delegation example
"""
from app.models.base import Base
from app.core.database import engine, SessionLocal
from app.services import hierarchy_service as h_svc
from app.services import config_service as c_svc
from app.services import user_service as u_svc
from app.services import delegation_service as d_svc


def seed_roles(db):
    roles = [
        {"name": "Cashier", "slug": "cashier", "role_type": "fixed", "is_system": True,
         "description": "Open and close orders, process payments, apply standard discounts. No admin or settings access.",
         "min_assignment_level": "location", "max_assignment_level": "location",
         "permissions": ["pos:orders:create", "pos:orders:close", "pos:payments:process", "pos:discounts:apply"],
         "toggleable_permissions": ["pos:discounts:manual"]},
        {"name": "Waiter", "slug": "waiter", "role_type": "fixed", "is_system": True,
         "description": "Take table orders, manage table assignments. Cannot process payments.",
         "min_assignment_level": "location", "max_assignment_level": "location",
         "permissions": ["pos:orders:create", "pos:tables:manage"],
         "toggleable_permissions": ["pos:orders:void"]},
        {"name": "Store Manager", "slug": "store_manager", "role_type": "fixed", "is_system": True,
         "description": "Full operations management for their Location: staff, settings, reports, shifts, inventory.",
         "min_assignment_level": "location", "max_assignment_level": "location",
         "permissions": ["location:manage", "staff:manage", "reports:view", "inventory:manage", "settings:manage"],
         "toggleable_permissions": ["reports:financial:view", "inventory:write"]},
        {"name": "Area Manager", "slug": "area_manager", "role_type": "fixed", "is_system": True,
         "description": "Operational oversight and performance reporting across a defined Location Group.",
         "min_assignment_level": "location_group", "max_assignment_level": "location_group",
         "permissions": ["locations:view", "reports:operational:view", "staff:view"],
         "toggleable_permissions": ["reports:financial:view"]},
        {"name": "Brand Operations Manager", "slug": "brand_ops_manager", "role_type": "fixed", "is_system": True,
         "description": "Full operational oversight across all Locations under a Brand. Menu management, pricing.",
         "min_assignment_level": "brand", "max_assignment_level": "brand",
         "permissions": ["brand:manage", "menu:manage", "pricing:manage", "locations:view", "reports:view"],
         "toggleable_permissions": ["pricing:override", "menu:publish"]},
        {"name": "Country Manager", "slug": "country_manager", "role_type": "fixed", "is_system": True,
         "description": "Tax settings, legal entity configuration, compliance reporting for all Locations in a Country.",
         "min_assignment_level": "country", "max_assignment_level": "legal_entity",
         "permissions": ["compliance:manage", "tax:manage", "legal_entity:configure", "reports:compliance:view"],
         "toggleable_permissions": ["zatca:configure"]},
        {"name": "Finance Viewer", "slug": "finance_viewer", "role_type": "fixed", "is_system": True,
         "description": "Read-only access to financial reports and transaction data across assigned scope.",
         "min_assignment_level": "organisation", "max_assignment_level": "location",
         "permissions": ["reports:financial:view", "transactions:view"],
         "toggleable_permissions": []},
        {"name": "Admin", "slug": "admin", "role_type": "fixed", "is_system": True,
         "description": "Full platform access across the entire Organisation. Manages users, roles, and system settings.",
         "min_assignment_level": "organisation", "max_assignment_level": "group",
         "permissions": ["*"],
         "toggleable_permissions": []},
    ]
    for r in roles:
        role = u_svc.create_role(db, r)
        print(f"  Role: {role.name} ({role.slug})")


def seed_micro_merchant(db):
    print("\n--- Micro Merchant: Shawarm & Co. ---")
    org = h_svc.create_organisation(db, {"name": "Shawarm & Co.", "billing_email": "billing@shawarm.sa"})
    brand = h_svc.create_brand(db, {"name": "Shawarm & Co.", "organisation_id": org.id})
    country = h_svc.create_country(db, {"name": "KSA", "iso_code": "SAU", "brand_id": brand.id, "currency_code": "SAR"})
    le = h_svc.create_legal_entity(db, {
        "name": "Shawarm & Co. Ltd.", "organisation_id": org.id,
        "country_id": country.id, "brand_ids": [brand.id],
        "currency_code": "SAR", "vat_registration_number": "310200000000003", "tax_mode": "inclusive",
    })
    h_svc.create_location(db, {
        "name": "Shawarm & Co. — King Fahd Rd", "legal_entity_id": le.id,
        "brand_id": brand.id, "city": "Riyadh",
    })
    print(f"  Org: {org.name} | Brand: {brand.name} | LE: {le.name}")
    return org


def seed_midmarket_merchant(db):
    print("\n--- Mid-Market Merchant: Tasty Ventures Group ---")
    org = h_svc.create_organisation(db, {"name": "Tasty Ventures Group", "billing_email": "finance@tastyventures.sa"})
    group = h_svc.create_group(db, {"name": "Tasty Ventures F&B Group", "organisation_id": org.id})

    brands = {}
    countries = {}
    for brand_name in ["The Burger Lab", "Sushi Nori", "Karak House"]:
        brands[brand_name] = h_svc.create_brand(db, {"name": brand_name, "organisation_id": org.id, "group_id": group.id})
        countries[brand_name] = h_svc.create_country(db, {
            "name": "KSA", "iso_code": "SAU", "brand_id": brands[brand_name].id,
            "locale": "ar-SA", "currency_code": "SAR",
        })

    # Two Legal Entities — one for quick service, one for hospitality
    # The QS entity serves Burger Lab + Karak House (multi-brand single LE)
    le_qs = h_svc.create_legal_entity(db, {
        "name": "Tasty Ventures KSA LLC", "organisation_id": org.id,
        "country_id": countries["The Burger Lab"].id,
        "brand_ids": [brands["The Burger Lab"].id, brands["Karak House"].id],
        "currency_code": "SAR", "tax_mode": "inclusive", "zatca_enabled": True,
    })
    le_hosp = h_svc.create_legal_entity(db, {
        "name": "Tasty Ventures Hospitality LLC", "organisation_id": org.id,
        "country_id": countries["Sushi Nori"].id,
        "brand_ids": [brands["Sushi Nori"].id],
        "currency_code": "SAR", "tax_mode": "inclusive",
    })

    clusters = {}
    for name in ["Riyadh Cluster", "Jeddah Cluster"]:
        clusters[name] = h_svc.create_location_group(db, {"name": name, "legal_entity_id": le_qs.id})

    for loc_name, brand_name, cluster, le in [
        ("The Burger Lab — Mall of Arabia", "The Burger Lab", "Riyadh Cluster", le_qs),
        ("The Burger Lab — Granada Mall", "The Burger Lab", "Riyadh Cluster", le_qs),
        ("Karak House — Diriyah", "Karak House", "Jeddah Cluster", le_qs),
        ("Sushi Nori — Al Nakheel", "Sushi Nori", "Jeddah Cluster", le_hosp),
    ]:
        h_svc.create_location(db, {
            "name": loc_name, "legal_entity_id": le.id, "brand_id": brands[brand_name].id,
            "location_group_id": clusters[cluster].id, "city": cluster.split(" ")[0],
        })

    print(f"  Org: {org.name} | Brands: {len(brands)} | LEs: 2 (QS serves 2 brands) | Locations: 4")
    return org


def seed_enterprise_merchant(db):
    """
    Enterprise: Gulf Restaurant Holdings — full hierarchy.
    Demonstrates:
      - Multiple LEs per Brand (GRH KSA LLC + GRH UAE FZ both serve BurgerX)
      - Franchise LE: Al-Nakheel F&B LLC is a franchisee operating BurgerX in Jeddah
      - One LE serving multiple Brands (GRH Hospitality KSA → Breakfast Club + Karak Lab)
    """
    print("\n--- Enterprise Merchant: Gulf Restaurant Holdings ---")
    org = h_svc.create_organisation(db, {
        "name": "Gulf Restaurant Holdings", "billing_email": "accounts@grh.com", "sso_enabled": True,
    })
    group = h_svc.create_group(db, {"name": "GRH Food & Beverage Group", "organisation_id": org.id})

    brands = {}
    countries = {}
    for name in ["BurgerX", "Noodle House", "Breakfast Club", "Karak Lab", "FreshGo"]:
        brands[name] = h_svc.create_brand(db, {
            "name": name, "organisation_id": org.id, "group_id": group.id, "loyalty_programme_enabled": True,
        })

    # Countries (attached to BurgerX for simplicity, but shared across)
    for c_name, iso, locale, currency in [("KSA", "SAU", "ar-SA", "SAR"), ("UAE", "ARE", "en-AE", "AED"), ("Egypt", "EGY", "ar-EG", "EGP")]:
        countries[c_name] = h_svc.create_country(db, {
            "name": c_name, "iso_code": iso, "brand_id": brands["BurgerX"].id, "locale": locale, "currency_code": currency,
        })

    # --- Legal Entities ---
    les = {}

    # GRH KSA LLC: serves BurgerX + FreshGo in KSA (one LE, multiple brands)
    les["GRH KSA LLC"] = h_svc.create_legal_entity(db, {
        "name": "GRH KSA LLC", "organisation_id": org.id, "country_id": countries["KSA"].id,
        "brand_ids": [brands["BurgerX"].id, brands["FreshGo"].id],
        "currency_code": "SAR", "tax_mode": "inclusive", "zatca_enabled": True,
        "vat_registration_number": "310200000000003",
    })

    # GRH UAE FZ: serves BurgerX + Noodle House in UAE (same brand different LE/country)
    les["GRH UAE FZ"] = h_svc.create_legal_entity(db, {
        "name": "GRH UAE FZ", "organisation_id": org.id, "country_id": countries["UAE"].id,
        "brand_ids": [brands["BurgerX"].id, brands["Noodle House"].id],
        "currency_code": "AED", "tax_mode": "inclusive",
    })

    # GRH Egypt SAE: serves Noodle House in Egypt
    les["GRH Egypt SAE"] = h_svc.create_legal_entity(db, {
        "name": "GRH Egypt SAE", "organisation_id": org.id, "country_id": countries["Egypt"].id,
        "brand_ids": [brands["Noodle House"].id],
        "currency_code": "EGP", "tax_mode": "inclusive",
    })

    # GRH Hospitality KSA: serves Breakfast Club + Karak Lab (one LE, two brands)
    les["GRH Hospitality KSA"] = h_svc.create_legal_entity(db, {
        "name": "GRH Hospitality KSA", "organisation_id": org.id, "country_id": countries["KSA"].id,
        "brand_ids": [brands["Breakfast Club"].id, brands["Karak Lab"].id],
        "currency_code": "SAR", "tax_mode": "inclusive", "zatca_enabled": True,
    })

    # FRANCHISE LE: Al-Nakheel F&B LLC — franchisee operating BurgerX in Jeddah
    les["Al-Nakheel F&B LLC"] = h_svc.create_legal_entity(db, {
        "name": "Al-Nakheel F&B LLC", "organisation_id": org.id, "country_id": countries["KSA"].id,
        "brand_ids": [brands["BurgerX"].id],
        "currency_code": "SAR", "tax_mode": "inclusive", "zatca_enabled": True,
        "is_franchise": True, "owner_name": "Al-Nakheel Group",
        "vat_registration_number": "310200000000078",
    })

    # --- Business Units ---
    for bu_name in ["Quick Service BU", "Premium Dining BU", "Delivery-Only BU", "Franchise Ops BU", "Corporate BU"]:
        h_svc.create_business_unit(db, {"name": bu_name, "legal_entity_id": les["GRH KSA LLC"].id})

    # --- Location Groups ---
    clusters = {}
    for c_name, le_name in [
        ("KSA Central", "GRH KSA LLC"), ("KSA West", "GRH KSA LLC"),
        ("UAE Dubai", "GRH UAE FZ"), ("UAE Abu Dhabi", "GRH UAE FZ"),
        ("Egypt Cairo", "GRH Egypt SAE"),
        ("Jeddah Franchise Cluster", "Al-Nakheel F&B LLC"),  # franchise cluster
    ]:
        clusters[c_name] = h_svc.create_location_group(db, {"name": c_name, "legal_entity_id": les[le_name].id})

    # --- Locations ---
    location_objs = {}
    locs = [
        # GRH-owned BurgerX locations in KSA
        ("BurgerX — Riyadh Park", "BurgerX", "KSA Central", "GRH KSA LLC"),
        ("BurgerX — Diriyah Gate", "BurgerX", "KSA Central", "GRH KSA LLC"),
        # Franchise BurgerX locations in Jeddah (different LE = different owner!)
        ("BurgerX — Jeddah Corniche", "BurgerX", "Jeddah Franchise Cluster", "Al-Nakheel F&B LLC"),
        ("BurgerX — Red Sea Mall", "BurgerX", "Jeddah Franchise Cluster", "Al-Nakheel F&B LLC"),
        # BurgerX in UAE (different LE, different country)
        ("BurgerX — Dubai Mall", "BurgerX", "UAE Dubai", "GRH UAE FZ"),
        # Noodle House
        ("Noodle House — Dubai Marina", "Noodle House", "UAE Dubai", "GRH UAE FZ"),
        ("Noodle House — Cairo Festival", "Noodle House", "Egypt Cairo", "GRH Egypt SAE"),
        # FreshGo
        ("FreshGo — Riyadh Olaya", "FreshGo", "KSA Central", "GRH KSA LLC"),
        # Breakfast Club + Karak Lab (under GRH Hospitality KSA)
        ("Breakfast Club — Riyadh Tahlia", "Breakfast Club", "KSA Central", "GRH Hospitality KSA"),
        ("Karak Lab — Riyadh Exit 5", "Karak Lab", "KSA Central", "GRH Hospitality KSA"),
    ]
    for loc_name, brand_name, cluster, le_name in locs:
        location_objs[loc_name] = h_svc.create_location(db, {
            "name": loc_name, "legal_entity_id": les[le_name].id,
            "brand_id": brands[brand_name].id,
            "location_group_id": clusters[cluster].id, "city": cluster,
        })

    print(f"  Org: {org.name} | Brands: {len(brands)} | LEs: {len(les)} (1 franchise) | Locations: {len(locs)}")
    print(f"  Multi-LE per Brand: BurgerX served by GRH KSA LLC, GRH UAE FZ, and Al-Nakheel F&B LLC (franchisee)")
    print(f"  Multi-Brand per LE: GRH Hospitality KSA serves Breakfast Club + Karak Lab")
    return org, brands, countries, les, clusters, location_objs


def seed_config_examples(db, org, brands, les, clusters, locations):
    print("\n--- Configuration Inheritance Examples ---")

    # Organisation locks billing
    c_svc.set_config(db, "organisation", org.id, "billing.company_name", '"Gulf Restaurant Holdings"', "lock")
    print("  LOCK: Organisation locked billing.company_name")

    # Brand sets receipt footer
    c_svc.set_config(db, "brand", brands["BurgerX"].id, "receipt.footer", '"Thank you for choosing BurgerX!"', "override")
    print("  OVERRIDE: BurgerX set receipt.footer")

    # Legal Entity LOCKS tax config (cannot be overridden by locations below)
    c_svc.set_config(db, "legal_entity", les["GRH KSA LLC"].id, "tax.mode", '"inclusive"', "lock")
    c_svc.set_config(db, "legal_entity", les["GRH KSA LLC"].id, "tax.vat_rate", '"15"', "lock")
    c_svc.set_config(db, "legal_entity", les["GRH KSA LLC"].id, "compliance.zatca_enabled", '"true"', "lock")
    print("  LOCK: GRH KSA LLC locked tax.mode, tax.vat_rate, compliance.zatca_enabled")

    # Franchise LE has its own locked tax config
    c_svc.set_config(db, "legal_entity", les["Al-Nakheel F&B LLC"].id, "tax.mode", '"inclusive"', "lock")
    c_svc.set_config(db, "legal_entity", les["Al-Nakheel F&B LLC"].id, "tax.vat_rate", '"15"', "lock")
    print("  LOCK: Al-Nakheel F&B LLC (franchise) locked own tax config")

    # Location Group overrides delivery charge
    c_svc.set_config(db, "location_group", clusters["KSA Central"].id, "delivery.charge", '"15.00"', "override")
    print("  OVERRIDE: KSA Central delivery.charge=15.00")

    # Location overrides operating hours
    first_loc = list(locations.values())[0]
    c_svc.set_config(db, "location", first_loc.id, "operating_hours", '{"open":"10:00","close":"01:00"}', "override")
    print(f"  OVERRIDE: {first_loc.name} set operating_hours")


def seed_users_and_assignments(db, org, brands, les, clusters, locations):
    print("\n--- Users & Scoped Role Assignments ---")
    users_data = [
        ("Sara Al-Rashid", "+966501111111", "finance_viewer", "organisation", org.id),
        ("Khalid Hassan", "+966502222222", "brand_ops_manager", "brand", brands["BurgerX"].id),
        ("Nora Al-Fahd", "+966503333333", "country_manager", "legal_entity", les["GRH KSA LLC"].id),
        ("Mohammed Ali", "+966504444444", "area_manager", "location_group", clusters["KSA Central"].id),
        ("Ahmed Saleh", "+966505555555", "store_manager", "location", list(locations.values())[0].id),
        # Franchise staff — scoped to franchise LE only
        ("Tariq Franchise", "+966506666666", "area_manager", "location_group", clusters["Jeddah Franchise Cluster"].id),
    ]
    for name, mobile, role_slug, scope_type, scope_id in users_data:
        try:
            result = u_svc.invite_user(db, name=name, mobile_number=mobile, organisation_id=org.id,
                                        role_slug=role_slug, scope_node_type=scope_type, scope_node_id=scope_id)
            u_svc.activate_user(db, mobile, result["activation_otp"])
            print(f"  User: {name} | Role: {role_slug} @ {scope_type}")
        except Exception as e:
            print(f"  SKIP: {name} - {e}")


def seed_delegation_example(db, enterprise_org, brands):
    print("\n--- Franchise Delegation Example ---")
    franchisee_org = h_svc.create_organisation(db, {"name": "Al-Nakheel F&B Group", "billing_email": "ops@alnakheel.sa"})
    delegation = d_svc.create_delegation(db, {
        "delegation_type": "brand_franchise",
        "delegating_org_id": enterprise_org.id,
        "receiving_org_id": franchisee_org.id,
        "delegated_node_type": "brand",
        "delegated_node_id": brands["BurgerX"].id,
        "granted_permissions": ["locations:manage", "staff:manage", "reports:view", "inventory:manage", "pos:manage"],
        "locked_setting_keys": ["brand.logo", "brand.identity", "menu.core_items", "tax.mode", "tax.vat_rate", "compliance.zatca_enabled"],
        "notes": "BurgerX Jeddah franchise - Al-Nakheel operates via their own Legal Entity",
    })
    print(f"  Delegation: {enterprise_org.name} → {franchisee_org.name} (BurgerX franchise)")
    return delegation


def run_seed():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        print("=== Seeding Foodics Organisation Domain (v2 — LE as First-Class Node) ===\n")
        print("--- System Roles ---")
        seed_roles(db)
        seed_micro_merchant(db)
        seed_midmarket_merchant(db)
        enterprise_org, brands, countries, les, clusters, locations = seed_enterprise_merchant(db)
        seed_config_examples(db, enterprise_org, brands, les, clusters, locations)
        seed_users_and_assignments(db, enterprise_org, brands, les, clusters, locations)
        seed_delegation_example(db, enterprise_org, brands)
        db.commit()
        print("\n=== Seed Complete ===")
    except Exception as e:
        db.rollback()
        print(f"\nSeed failed: {e}")
        import traceback; traceback.print_exc()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run_seed()
