"""Real-looking pricing for the Foodics subscription demo.

Prices reflect publicly-advertised Foodics tiers (approximate, for demo only).
All seven regional price points from the PDF are represented.
"""

# 7 regional price points (6 currencies + Sahel segment variant)
CURRENCIES = [
    {"code": "SAR", "symbol": "SAR", "name": "Saudi Riyal",      "region": "Saudi Arabia"},
    {"code": "AED", "symbol": "AED", "name": "UAE Dirham",       "region": "United Arab Emirates"},
    {"code": "EGP", "symbol": "EGP", "name": "Egyptian Pound",   "region": "Egypt"},
    {"code": "KWD", "symbol": "KWD", "name": "Kuwaiti Dinar",    "region": "Kuwait"},
    {"code": "JOD", "symbol": "JOD", "name": "Jordanian Dinar",  "region": "Jordan"},
    {"code": "USD", "symbol": "USD", "name": "US Dollar",        "region": "Oman / Bahrain / International"},
    {"code": "SHL", "symbol": "SAR", "name": "Sahel (KSA segment)", "region": "Sahel pricing variant"},
]

# RMS tiers — flat monthly per branch
PLANS = [
    {
        "code": "starter",  "name": "Starter",  "tier_order": 1,
        "tagline": "For small cafés and single-branch operators just starting out.",
        "description": "Core POS, menu, basic inventory, end-of-day reporting.",
        "prices": {"SAR": 249, "AED": 249, "EGP": 1499, "KWD": 19, "JOD": 49, "USD": 65,  "SHL": 179},
    },
    {
        "code": "basic",    "name": "Basic",    "tier_order": 2,
        "tagline": "Growing restaurants with stock and staff management needs.",
        "description": "Everything in Starter + stock, suppliers, purchase orders, staff roles.",
        "prices": {"SAR": 349, "AED": 349, "EGP": 2199, "KWD": 29, "JOD": 69, "USD": 95,  "SHL": 249},
    },
    {
        "code": "advanced", "name": "Advanced", "tier_order": 3,
        "tagline": "Multi-branch operators that need analytics and advanced controls.",
        "description": "Everything in Basic + multi-branch consolidation, advanced reporting, cost controls.",
        "prices": {"SAR": 549, "AED": 549, "EGP": 3499, "KWD": 45, "JOD": 109, "USD": 149, "SHL": 399},
    },
    {
        "code": "black",    "name": "Black",    "tier_order": 4,
        "tagline": "Fine-dining and premium restaurants needing the full suite.",
        "description": "Everything in Advanced + reservations, sommelier modules, white-glove onboarding.",
        "prices": {"SAR": 799, "AED": 799, "EGP": 4999, "KWD": 65, "JOD": 159, "USD": 215, "SHL": 599},
    },
]

# 15 feature add-ons
ADDONS = [
    {"code": "loyalty",         "name": "Loyalty Program",      "min_tier": 2,
     "description": "Punch-card, points, and tier-based loyalty for your diners.",
     "prices": {"SAR": 99,  "AED": 99,  "EGP": 599,  "KWD": 8,  "JOD": 19, "USD": 29, "SHL": 69}},
    {"code": "gift_cards",      "name": "Gift Cards",           "min_tier": 2,
     "description": "Sell and redeem branded gift cards in-store and online.",
     "prices": {"SAR": 69,  "AED": 69,  "EGP": 449,  "KWD": 6,  "JOD": 14, "USD": 19, "SHL": 49}},
    {"code": "bi",              "name": "Business Intelligence","min_tier": 3,
     "description": "Pre-built dashboards, custom queries, and scheduled report exports.",
     "prices": {"SAR": 199, "AED": 199, "EGP": 1299, "KWD": 16, "JOD": 39, "USD": 55, "SHL": 139}},
    {"code": "warehouse",       "name": "Warehouse Management", "min_tier": 3,
     "description": "Central warehouse, transfers, batch and expiry tracking.",
     "prices": {"SAR": 249, "AED": 249, "EGP": 1599, "KWD": 20, "JOD": 49, "USD": 69, "SHL": 179}},
    {"code": "call_center",     "name": "Call Center",          "min_tier": 3,
     "description": "Centralised order-taking for multi-branch delivery operations.",
     "prices": {"SAR": 149, "AED": 149, "EGP": 899,  "KWD": 12, "JOD": 29, "USD": 40, "SHL": 99}},
    {"code": "multibranch_inv", "name": "Multi-Branch Inventory","min_tier": 2,
     "description": "Consolidated stock across branches with transfer workflows.",
     "prices": {"SAR": 129, "AED": 129, "EGP": 799,  "KWD": 10, "JOD": 25, "USD": 35, "SHL": 89}},
    {"code": "advanced_reports","name": "Advanced Reporting",   "min_tier": 2,
     "description": "Custom reports, cohort analysis, export-to-Excel scheduling.",
     "prices": {"SAR": 89,  "AED": 89,  "EGP": 549,  "KWD": 7,  "JOD": 17, "USD": 24, "SHL": 59}},
    {"code": "time_tracking",   "name": "Employee Time Tracking","min_tier": 1,
     "description": "Clock-in/out, shift planning, overtime alerts.",
     "prices": {"SAR": 59,  "AED": 59,  "EGP": 369,  "KWD": 5,  "JOD": 12, "USD": 16, "SHL": 39}},
    {"code": "food_cost",       "name": "Food Cost Management", "min_tier": 2,
     "description": "Recipe costing, variance reports, theoretical-vs-actual analysis.",
     "prices": {"SAR": 79,  "AED": 79,  "EGP": 499,  "KWD": 6,  "JOD": 16, "USD": 22, "SHL": 55}},
    {"code": "recipes_plus",    "name": "Recipes & Modifiers+", "min_tier": 1,
     "description": "Advanced modifier groups, prep-steps, combo builder.",
     "prices": {"SAR": 49,  "AED": 49,  "EGP": 299,  "KWD": 4,  "JOD": 10, "USD": 13, "SHL": 35}},
    {"code": "reservations",    "name": "Reservations",         "min_tier": 3,
     "description": "Table booking with deposit capture and no-show tracking.",
     "prices": {"SAR": 69,  "AED": 69,  "EGP": 449,  "KWD": 6,  "JOD": 14, "USD": 19, "SHL": 49}},
    {"code": "customer_display","name": "Customer-Facing Display","min_tier": 1,
     "description": "Software for the customer-facing secondary screen at checkout.",
     "prices": {"SAR": 39,  "AED": 39,  "EGP": 249,  "KWD": 3,  "JOD": 8,  "USD": 11, "SHL": 29}},
    {"code": "accounting_int",  "name": "Accounting Integration","min_tier": 2,
     "description": "Auto-post sales, tax, and payout entries to your accounting tool.",
     "prices": {"SAR": 99,  "AED": 99,  "EGP": 599,  "KWD": 8,  "JOD": 19, "USD": 29, "SHL": 69}},
    {"code": "api_access",      "name": "API Access",           "min_tier": 3,
     "description": "Production API keys, webhooks, and developer support.",
     "prices": {"SAR": 149, "AED": 149, "EGP": 899,  "KWD": 12, "JOD": 29, "USD": 40, "SHL": 99}},
    {"code": "whitelabel",      "name": "White-Label Receipts", "min_tier": 4,
     "description": "Remove Foodics branding and add your logo to receipts/emails.",
     "prices": {"SAR": 29,  "AED": 29,  "EGP": 179,  "KWD": 2,  "JOD": 6,  "USD": 8,  "SHL": 19}},
]

# Device licences — per unit per month
DEVICE_SKUS = [
    {"code": "sub_cashier",     "name": "Sub-Cashier",
     "description": "Additional cashier terminal beyond the main POS.",
     "prices": {"SAR": 49, "AED": 49, "EGP": 299, "KWD": 4,  "JOD": 10, "USD": 13, "SHL": 35}},
    {"code": "kds",             "name": "KDS Screen",
     "description": "Kitchen-display screen licence.",
     "prices": {"SAR": 69, "AED": 69, "EGP": 449, "KWD": 6,  "JOD": 14, "USD": 19, "SHL": 49}},
    {"code": "kiosk",           "name": "Self-Order Kiosk",
     "description": "Customer self-service kiosk licence.",
     "prices": {"SAR": 149,"AED": 149,"EGP": 899, "KWD": 12, "JOD": 29, "USD": 40, "SHL": 99}},
    {"code": "waiter",          "name": "Waiter App",
     "description": "Handheld waiter/QSR order-taker app licence.",
     "prices": {"SAR": 39, "AED": 39, "EGP": 249, "KWD": 3,  "JOD": 8,  "USD": 11, "SHL": 29}},
    {"code": "caller_display",  "name": "Customer Display Device",
     "description": "Hardware-bound licence for the customer-facing screen.",
     "prices": {"SAR": 29, "AED": 29, "EGP": 179, "KWD": 2,  "JOD": 6,  "USD": 8,  "SHL": 19}},
]

# Separate products (standalone contracts)
SEPARATE_PRODUCTS = [
    {
        "code": "online", "name": "Foodics Online", "billing_model": "monthly",
        "description": "Customer-facing ordering website, mobile app, and kiosk (per branch).",
        "tiers": [
            {"code": "free",     "name": "Free",     "tier_order": 1,
             "prices": {"SAR": 0,   "AED": 0,   "EGP": 0,    "KWD": 0,  "JOD": 0,   "USD": 0,   "SHL": 0}},
            {"code": "standard", "name": "Standard", "tier_order": 2,
             "prices": {"SAR": 149, "AED": 149, "EGP": 899,  "KWD": 12, "JOD": 29,  "USD": 40,  "SHL": 99}},
            {"code": "premium",  "name": "Premium",  "tier_order": 3,
             "prices": {"SAR": 349, "AED": 349, "EGP": 2199, "KWD": 28, "JOD": 69,  "USD": 95,  "SHL": 249}},
        ],
    },
    {
        "code": "pay", "name": "Foodics Pay", "billing_model": "transactional",
        "description": "Card acceptance: monthly terminal fee + take-rate on every transaction.",
        "tiers": [
            {"code": "terminal", "name": "Terminal (monthly fee)", "tier_order": 1,
             "prices": {"SAR": 49, "AED": 49, "EGP": 299, "KWD": 4, "JOD": 10, "USD": 13, "SHL": 35}},
        ],
    },
    {
        "code": "accounting", "name": "Foodics Accounting", "billing_model": "annual",
        "description": "Bookkeeping software for the restaurant. Annual billing only.",
        "tiers": [
            {"code": "first_branch", "name": "First branch (annual)",     "tier_order": 1,
             "prices": {"SAR": 1499, "AED": 1499, "EGP": 9999, "KWD": 120, "JOD": 299, "USD": 399, "SHL": 1099}},
            {"code": "extra_branch", "name": "Additional branch (annual)", "tier_order": 2,
             "prices": {"SAR": 999,  "AED": 999,  "EGP": 6999, "KWD": 80,  "JOD": 199, "USD": 269, "SHL": 749}},
        ],
    },
]
