# Foodics Organisation Domain
### Product Requirements Document

**Owner:** Organisation Platform Team | **Status:** Prototype | **Last Updated:** April 2026

---

## Problem Statement

Restaurant operators — from single-outlet micro businesses to multi-brand, multi-country enterprises — need a unified system to model their business structure, manage legal and financial identity, control access, and enforce configuration policies across all levels of their operation.

Today, there is no single system that handles the full spectrum: a solo shawarma shop in Riyadh, a 50-location chain across KSA and UAE, and a 500-location franchise group with multiple brands and legal entities — all need different structures but the same underlying platform.

---

## Solution Overview

A hierarchical organisation management system with **8 levels**, **scoped role-based access**, **cascading configuration**, and **franchise delegation** — designed to scale from micro to enterprise without requiring structural migration.

---

## Hierarchy Model

The system supports two parallel dimensions:

**Operating Hierarchy** (how the business runs):

| Level | Purpose | Required? |
|-------|---------|-----------|
| **Organisation** | Top-level account. Owns contracts, billing, SSO, data residency | Yes |
| **Group** | Holding structure for multiple brands (auto-created) | Auto |
| **Brand** | Customer-facing concept — menu, loyalty, identity | Yes |
| **Country** | Market context — locale, regulations, currency | Yes |
| **Business Unit** | Internal P&L grouping | Optional |
| **Location Group** | Operational cluster of locations | Optional |
| **Location** | Physical or virtual outlet (leaf node) | Yes |

**Legal / Financial Dimension** (who owns what):

| Level | Purpose | Required? |
|-------|---------|-----------|
| **Legal Entity** | Financial identity — VAT, tax, commercial registration, compliance | Yes |

Legal Entity is a **first-class node** — not a field on another entity. It is visible in the hierarchy, assignable in permissions, owns configuration, and drives financial reporting.

---

## Core Constraints

| # | Rule | Rationale |
|---|------|-----------|
| 1 | Every Location belongs to exactly **one** Legal Entity | Financial accountability — invoices, tax filings, and compliance are per-LE |
| 2 | Every Location belongs to exactly **one** Brand | Operational identity — menu, pricing, and loyalty are per-Brand |
| 3 | Every Legal Entity must belong to a **Country** | Regulatory context — VAT rules, tax modes, and compliance are jurisdiction-specific |
| 4 | Brand ↔ Legal Entity is **many-to-many** | One brand can be operated by multiple LEs (franchise); one LE can serve multiple brands |
| 5 | Config locks are **authoritative** | When an ancestor locks a setting, no descendant can override it |
| 6 | Permissions cascade **downward** | A role at Brand level grants access to all locations under that brand |
| 7 | Soft deletes only | Brands, Legal Entities, and Locations are never hard-deleted — status transitions to `deleted` |
| 8 | Mobile number is the primary user identifier | Unique across the system, used for OTP-based activation |

---

## Legal Entity Requirements

Legal Entity must:
- Be a standalone entity (not a field on Brand or Location)
- Be visible in the hierarchy and selectable during onboarding
- Be assignable in permission scoping
- Own financial configuration (tax mode, VAT, CR, currency, fiscal year)
- Support franchise ownership (`is_franchise`, `owner_name`)

**Validation rules:**
- Saudi VAT: 15 digits starting with `3` (ZATCA format)
- Currency code: ISO 4217 (3 characters)
- Tax mode: `inclusive` or `exclusive`

**Franchise model:** Different Legal Entities (owners) can operate under the same Brand. Each Location's ownership is determined solely by its `legal_entity_id`. Reporting can be split by LE or consolidated at Brand/Org level.

---

## Configuration Inheritance

Settings flow through the hierarchy with three behaviours at each level:

| Mode | Behaviour |
|------|-----------|
| **Inherit** | No local value — uses the nearest ancestor's setting |
| **Override** | Stores a local value that takes precedence over the parent |
| **Lock** | Sets the value AND prevents all descendants from changing it |

**Resolution:** Walk the ancestor chain upward; return the first Lock or Override found.

**Use case:** Organisation locks `tax_mode = inclusive` → every Legal Entity, Location Group, and Location inherits it without ability to change.

**Settings by level:**

| Level | Example Settings |
|-------|-----------------|
| Organisation | SSO policy, data residency, audit/compliance |
| Brand | Logo, receipt branding, master menu, loyalty rules |
| Country | Language, date format, RTL/LTR, localization |
| Legal Entity | Tax mode, VAT number, currency, ZATCA integration |
| Location | Operating hours, payment methods, receipt header, floor plan |

---

## Roles & Permissions

**8 pre-configured system roles:**

| Role | Scope Level | What They Can Do |
|------|-------------|-----------------|
| Cashier | Location | Operate POS, create orders, accept payments |
| Waiter | Location | Operate POS, create/view orders, manage tables |
| Store Manager | Location | Full location operations + reports + local settings |
| Area Manager | Location Group | Manage multiple locations, staff, inventory |
| Brand Ops Manager | Brand | Brand-wide operations, menu, staff, settings |
| Country Manager | Country | Country-level compliance, reporting, staff |
| Finance Viewer | Organisation | Read-only financial, invoice, and tax reports |
| Admin | Organisation | Full access to everything (`*:*`) |

Custom roles can be created per organisation with configurable permissions.

**Scoping rule:** A role assigned at any hierarchy node grants access to **all descendant nodes** below it. A Store Manager at "KSA Central" Location Group can access all locations within that group.

---

## User Lifecycle

| Stage | What Happens |
|-------|-------------|
| **Invite** | Admin provides name + mobile + role + scope. System generates a 6-digit OTP (72h expiry) |
| **Activate** | User enters OTP → status becomes `active`, access granted per role assignment |
| **Active** | User operates within their scoped permissions. Optional access expiry date |
| **Offboard** | All role assignments revoked, status → `offboarded`, timestamp recorded |

---

## Franchise Delegation

Allows one Organisation to grant another controlled access to a defined hierarchy subset:

| Delegation Type | Use Case |
|----------------|----------|
| Brand Franchise | Franchisee operates a specific brand in a market |
| Management Contract | Management company runs locations on behalf of the owner |
| Regional Partner | Partner manages operations in a specific country/region |

**Controls:**
- Delegating party retains full visibility and policy control
- Receiving party only sees their delegated scope and descendants
- Specific config settings can be **locked** to prevent the receiver from overriding
- Delegations can be time-limited (`expires_at`) or revoked instantly

---

## Onboarding & Signup

The system adapts its setup flow based on business segment:

| Segment | Profile | Auto-Created Structure |
|---------|---------|----------------------|
| **Micro** | 1–2 outlets, single owner | Org → Brand → Country → LE → Location |
| **Growing Chain** | 3–15 outlets, one brand | Org → Brand → Country → LE → Location Group → Location |
| **Mid-Market** | 16–100 outlets, multi-region | Org → Brand → Countries → LE → Location Groups → Location |
| **Enterprise** | 100+ outlets, multi-brand/franchise | Full hierarchy with multiple Brands, LEs, Countries |

After signup, the **dashboard setup guide** adapts to the selected business structure — prompting the user to add locations, legal entities, countries, and team members in the right order.

---

## Target Personas

| Persona | Needs |
|---------|-------|
| **Solo Operator** | Quick setup, single brand, single LE, minimal config |
| **Chain Owner** | Multi-location management, location groups, area managers |
| **Multi-Brand Group** | Brand isolation, shared LEs across brands, consolidated reporting |
| **Franchise Operator** | LE-scoped access, locked brand settings, split financials |
| **Finance Team** | Read-only access to invoices, tax reports, cross-LE views |
| **IT/Platform Admin** | SSO, data residency, config locks, user lifecycle management |

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Time to first location | < 5 minutes from signup |
| Hierarchy levels supported without migration | 1 (micro) to 8 (enterprise) |
| Config resolution latency | < 50ms per key lookup |
| Role assignment coverage | Any of 8 hierarchy levels |
| Franchise isolation | Zero cross-LE data leakage |

---

## Manage Settings Spec Coverage

This squad owns the Manage Settings / Business Setup / User Management area
(per the System Specification dated April 2026). The table below tracks each
spec section against its implementation status in this codebase.

| Spec § | Area                | Status | Notes |
|--------|---------------------|--------|-------|
| 2.1    | Brands              | Built  | `Brand` + `receipt_header`, `receipt_footer`, status. Brand-as-product-tag relation owned by Menu squad. |
| 2.2    | Branches / Locations | Built  | `Location` extended with `localized_name`, `branch_type`, ZATCA fields, DMS toggle, course-management toggles. **Branch settings copy** at `POST /hierarchy/locations/{src}/copy-to/{dst}` with selectable groups (`basic_info`, `opening_hours`, `zatca`, `online_orders`, `delivery`, `course_mgmt`, `reservations`, `branch_meta`). |
| 2.3    | Branch Tags         | Built  | `Tag.applies_to='branch'`. |
| 2.4    | Delivery Zones      | Built  | `DeliveryZone` (org + optional location). DMS-vs-zone consumer is the open question per spec. |
| 3.1    | Sections            | Built  | `Section` (per location). |
| 3.2    | Table Management    | Out of scope | Android-only floor designer; not built in Console. |
| 4      | Charges             | Partial | `Charge` exists at org level. Branch-charge link table is **not** built — spec flags charge model as open. |
| 5      | Timed Events        | Built  | `TimedEvent` with 6 type variants. Logic owned by Menu/Promotions. |
| 6      | Payment Method Overrides | Built | `BranchPaymentMethodOverride` link entity. |
| 7      | DMS Delivery        | Config-only | `Location.enable_dms_delivery` toggle. Workflow owned by Delivery squad. |
| 8      | Course Management   | Built  | `Course` entity + per-branch toggles on `Location` + 4 seeded system courses (Drinks, Appetizers, Main Course, Dessert). |
| 9      | Tags                | Built  | All 7 entity types: `branch`, `customer`, `inventory_item`, `supplier`, `user`, `order`, `product`. |
| 10     | Reasons             | Built  | All 5 categories + 10 seeded system reasons (`is_system=true`). |
| 11     | Revenue Centers     | Built  | `RevenueCenter` with section/table/device CSV refs. RMS-reporting only — never accounting. |
| 12     | Reservations        | Built  | `ReservationSetting` with days-of-week, auto-accept-online, table_ids; **server-side ≥30-min validation**. iOS Console only — Android uses ServeMe. |
| 13.1   | Roles               | Built  | Multiple roles per user, **additive** permissions (Spec §17 Rule 18). |
| 13.2   | Users               | Built  | `User` extended with `password_hash`, `email_verified`, `email_verified_at`, `user_type` (cashier/console/both), `tag_ids`, `notification_preferences`. **Activation guard enforces ≥1 role + ≥1 accessible Branch** (Spec §17 Rule 16). |
| 14     | Notification Rules  | Built  | `NotificationSetting` with `event_type`, `channel`, `frequency`, `apply_on` (JSON conditions), `recipients`. Email-default per spec. |
| 15     | Digital Channels    | Partial | Online Ordering / Pay at Table / Kitchen Flow / Devices all CRUD-modelled; Call-Center + Digital-Channels surfaces remain open per spec. |

**Spec rules enforced in code:**
- §17.1 — multiple Brands per Organisation (M:N via `brand_legal_entity`)
- §17.5 — branch ZATCA fields exposed and required for cashier activation downstream
- §17.8 — global payment methods + per-branch override entity
- §17.9–10 — Tags scoped per `applies_to` value
- §17.11 — Reasons are organisation-scoped (no branch/register/user binding)
- §17.16 — User activation rejects if no role assignment OR no accessible Location
- §17.18 — additive permissions (existing `RoleAssignment` model semantics)

**Open questions left for cross-squad alignment** (intentionally not modelled):
- DMS data flow vs. branch delivery zones (§2.4 / §7)
- ServeMe ↔ Console reservation source-of-truth (§12)
- Notification action enum + non-email channels (§14)
- Revenue-center scope: per-account vs. fine-dining-only (§11)
- Charge model: global-then-link vs. branch-direct (§4)

---

## Account Page Spec Coverage

The Account page (sidebar → System → Account) implements the four-tab spec:

| Tab | Section | Status | Notes |
|-----|---------|--------|-------|
| **My Profile** | Profile (Name, Phone, Email, Login PIN, Language, Display Localized Names) | Built | `User.language` (en/ar/es/fr), `User.display_localized_names`. PIN regenerated via `POST /users/{id}/regenerate-pin` (returns plaintext once, hashed in storage — spec: "Login PIN is not shown"). |
| | Change Password button | Built | `POST /users/{id}/change-password`, ≥8 chars enforced. |
| | Notifications (14 inventory event toggles + Toggle All) | Built | Stored as JSON in `User.notification_preferences`. Event keys mirrored exactly from spec list. |
| **Business Details** | General (Business Name, Account Number, Categories, Tax/CR/Tax Number, Country, Currency) | Built | All on `Organisation`. Save via `PUT /hierarchy/organisations/{id}`. |
| | Contacts (Primary Email, Owner Email, Owner Phone) | Built | `primary_email`, `owner_email`, `owner_phone`. |
| | Settings (Time Zone, Tax Inclusive, Localization, Restrict Purchased Items, Insurance Products, 2FA) | Built | All as Org boolean toggles + `time_zone` string. |
| **Support** | Account Manager (name + email) | Built | `Organisation.account_manager_name`, `account_manager_email`. |
| | Grant Support Access button | Built | `POST /hierarchy/organisations/{id}/grant-support-access` with `{hours: N}`. Stored as `support_access_granted_until` timestamp. `hours=0` revokes. |
| | Send An Email button | Built (link) | Mailto-style link to `support@foodics.com`. Real email-channel handoff is owned by support tooling. |
| | My Tickets list + filtering | Built | `SupportTicket` entity with subject, body, category (general/billing/technical/feature_request), priority (low/normal/high/urgent), state (open/in_progress/resolved/closed). |
| **Licenses & Invoices** | Informational banner ("not real-time") | Built | Static UI banner. |
| | General Information (Package Type, Creation Date, Creation Email) | Built | `account_package_type`, `account_creation_email`, `created_at` from Organisation. |
| | Licenses Overview (RMS, Add-Ons, Foodics Online, Foodics One, Foodics Pay) | Stub | Renders the 5 product-line rows as "No data to display" with link to `/merchant`. The merchant portal (`foodics_subscription_shared`) is the system-of-record for live license counts; wiring this Console tab to those endpoints is intentionally deferred until the squad confirms ownership. |
| | Invoices section + Pay / Upload Document | Stub | Same: links out to `/merchant`. |

**Endpoints added for the Account page:**
- `PUT  /api/v1/users/{id}/profile` — self-edit My Profile fields
- `POST /api/v1/users/{id}/regenerate-pin` — generate + return new login PIN once
- `POST /api/v1/users/{id}/change-password` — set Console password
- `POST /api/v1/hierarchy/organisations/{id}/grant-support-access` — toggle Foodics support access
- `*    /api/v1/manage/support-tickets/...` — full CRUD on tickets

**Defaults seeded per Organisation** (idempotent on every boot, never overwrites):
- `business_category=Restaurant`, `business_subcategory=Casual Dining`
- `country=Saudi Arabia`, `currency=SAR`, `time_zone=Asia/Riyadh`
- `account_number=ACC-<8-char-prefix>`
- `account_manager_name=Sarah Al-Mansouri`, `account_manager_email=sarah.am@foodics.com`
- `account_package_type=Foodics RMS Standard`

---

## Account Page Revamp (post-spec consolidation)

After the initial Account page build, the squad consolidated the surface so
nothing lived alone in "Account" — every field moved to the entity that
actually owns it. The Account page is now removed from the sidebar.

| Original section | New home | Storage |
|------------------|----------|---------|
| **My Profile → Notifications** (14 inventory event toggles + Toggle All) | Settings → **Notifications** tab | `User.notification_preferences` JSON, scoped to the logged-in user |
| **Business Details → General** (Account Number, Business Category/Subcategory, Tax Registration Name, Commercial Registration, Tax Number, Country, Currency) | LegalEntity (visible on the LE detail/edit page) | New columns on `legal_entities`: `account_number`, `business_category`, `business_subcategory`, `tax_registration_name`, `tax_number`. (`commercial_registration`, `country_id`, `currency_code` were already there.) |
| **Business Details → Contacts** (Primary Email, Owner Email, Owner Phone) | LegalEntity + Brand + Location (each gets its own contact fields) | LE: existing `email` + new `owner_phone`. Brand: new `contact_email`, `contact_phone`. Location: new `contact_email` (`phone` already existed). |
| **Business Details → Settings** (Time Zone, Tax Inclusive, Localization, Restrict Purchased Items, Insurance Products, 2FA) | Settings → **Business** tab | Direct columns on `Organisation` — saved via the existing `PUT /hierarchy/organisations/{id}` endpoint when the Business tab is saved. |
| **My Profile → Profile** (Name, Phone, Email, PIN, Language, Display Localized Names, Change Password) | Removed from UI | Endpoints (`/users/{id}/profile`, `regenerate-pin`, `change-password`) remain in place but unsurfaced. |
| **Support tab** (Account Manager, Grant Support Access, Send Email, My Tickets) | Removed from UI | Endpoint (`grant-support-access`) and `SupportTicket` entity remain in place but unsurfaced. |
| **Licenses & Invoices tab** | Removed from UI | Subscription/Invoice data lives in `foodics_subscription_shared` — accessed via the merchant portal. |

**One-time data move on boot** (idempotent — only fills NULLs):
`migrate_account_fields_to_le_brand_location()` copies the previously-on-Org
account values to the org's primary LegalEntity (and contact fallbacks to the
first Brand and Location). Existing user-level edits on those entities are
never overwritten.

**Settings page tab order** (after revamp):
1. Business · 2. Notifications · 3. Receipt · 4. Call Center · 5. Cashier App · 6. Display App · 7. Kitchen · 8. Payment Integrations · 9. SMS Providers · 10. Inventory Transactions

The first two tabs are the moved-here Account sections; tabs 3–10 are the
spec's original 8 JSON-blob category tabs. The Device Management cards row
(Devices / Kitchen Flows / Notification Rules) above the tab strip is
unchanged.
