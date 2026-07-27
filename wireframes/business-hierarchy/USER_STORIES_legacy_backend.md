# Business Hierarchy — Entity Specs & Acceptance Criteria (Backend)

Derived from the wireframes in `wireframes/business-hierarchy/`. Framed as backend domain entities — fields, relationships, validation rules, and behaviors — independent of any UI.

---

## 1. Organisation

**Description**
Top-level account entity. Owns contracts, billing, SSO, data residency, and is the root of the hierarchy for all brands, legal entities, and locations.

**Fields**
| Field | Type | Required | Notes |
|---|---|---|---|
| id | identifier | system-generated | |
| name | string | Yes | |
| created_at | timestamp | system-generated | |

**Relationships**
- Has many Brands (via Group).
- Has many Legal Entities.
- Has one Default Group, auto-created on Organisation creation.

**Acceptance Criteria**
- An Organisation cannot be created without a `name`.
- Creating an Organisation auto-creates a "Default Group" beneath it (hidden until needed).
- An Organisation can be queried with a count of associated Brands.
- An Organisation record is never hard-deleted (soft delete only, per Core Constraint #7 — status transitions to `deleted`).

---

## 2. Brand

**Description**
Customer-facing concept entity (menu, loyalty, identity). Always required; every Location belongs to exactly one Brand.

**Fields**
| Field | Type | Required | Notes |
|---|---|---|---|
| id | identifier | system-generated | |
| name | string | Yes | |
| legal_entity_id | reference → Legal Entity | Yes | |
| logo | image/file reference | No | |
| slogan | string | No | |
| website | string | No | |

**Relationships**
- Belongs to a Group (auto-assigned to the Organisation's Default Group on creation).
- Many-to-many with Legal Entity (a Brand can be operated by multiple LEs via Franchisee; `legal_entity_id` is the primary/owning LE).
- Has many Branches/Locations.

**Acceptance Criteria**
- A Brand cannot be created without `name` and `legal_entity_id`.
- `logo`, `slogan`, `website` default to null/empty if not provided.
- On creation, a Brand is implicitly attached to its Organisation's Default Group (no explicit input required).
- Brand ↔ Legal Entity is many-to-many at the data-model level (Core Constraint #4): the `legal_entity_id` field represents the primary owning LE; additional LE associations are created via Franchisee records.
- A Brand record is never hard-deleted (soft delete only — status transitions to `deleted`); existing Locations under a deleted Brand retain their reference but are flagged accordingly.
- A Brand can be queried with a count of associated Branches/Locations.

---

## 3. Franchisee

**Description**
Created on demand. Represents the link between an external operator's Legal Entity and one of the Organisation's Brands — the mechanism that realizes the Brand↔Legal Entity many-to-many relationship for franchise arrangements.

**Fields**
| Field | Type | Required | Notes |
|---|---|---|---|
| id | identifier | system-generated | |
| name | string | Yes | |
| brand_id | reference → Brand | Yes | |
| legal_entity_id | reference → Legal Entity | Yes | |
| status | enum (`pending`, `active`, ...) | system-managed, defaults to `pending` | |

**Relationships**
- References one Brand and one Legal Entity, forming a many-to-many bridge between Brand and Legal Entity.

**Acceptance Criteria**
- A Franchisee cannot be created without `name`, `brand_id`, and `legal_entity_id`.
- The referenced `legal_entity_id` may belong to a different Organisation than the Brand's owning Organisation (external operator's legal entity).
- Creating a Franchisee does not alter or remove the Brand's primary `legal_entity_id`.
- A newly created Franchisee defaults to `status = pending`; status can transition (e.g., `pending` → `active`) via a separate update operation.
- A Brand may be associated with multiple Franchisees (one per franchise partner); a Legal Entity may operate multiple Brands via multiple Franchisee records.

---

## 4. Country (Lookup)

**Description**
Reference/lookup entity providing market context — locale, regulations, currency. Auto-created as merchants expand into new countries.

**Fields**
| Field | Type | Required | Notes |
|---|---|---|---|
| id | identifier | system-generated | |
| name | string | Yes | e.g., "Saudi Arabia" |
| key | string (ISO 3166-1 alpha-2) | Yes | e.g., "SA" |

**Relationships**
- Referenced by Legal Entity (required, Core Constraint #3).
- Maps to a default Currency.

**Acceptance Criteria**
- Country records are reference/shared data, not scoped to a single Organisation.
- The lookup table is pre-seeded with at least: Saudi Arabia (SA), UAE (AE), Kuwait (KW), Qatar (QA), Bahrain (BH), Oman (OM), Jordan (JO), Egypt (EG), Türkiye (TR), Pakistan (PK).
- A new Country record can be auto-created by the system when a merchant's address/Legal Entity references a country not yet present (per Overview's "auto-created from address" behavior) — this creation path must be system/admin-triggered, not end-user-facing.
- Every Legal Entity must reference exactly one Country (Core Constraint #3).

---

## 5. Legal Entity

**Description**
First-class node representing financial identity — VAT, tax, commercial registration (CR), compliance. Auto-created as an invisible default and later refined as the merchant formalises.

**Fields**
| Field | Type | Required | Notes |
|---|---|---|---|
| id | identifier | system-generated | |
| legal_name | string | Yes | |
| vat | string | No | |
| cr | array of strings | No | Multiple CR numbers allowed |
| country_id | reference → Country | Yes (per Core Constraint #3) | |
| organisation_id | reference → Organisation | Yes | |
| extra | text/notes | No | Free-form |

**Relationships**
- Belongs to one Organisation.
- Belongs to one Country.
- Many-to-many with Brand (directly, and via Franchisee for external operators).
- Referenced by exactly one Location each (Core Constraint #1 — a Location belongs to exactly one Legal Entity, derived via its Brand).

**Acceptance Criteria**
- A Legal Entity cannot be created without `legal_name`.
- `vat`, `cr`, `extra` are optional and default to empty/null.
- `cr` accepts multiple values (e.g., comma-separated input mapped to an array/list of CR strings).
- Per Core Constraint #3, `country_id` is required at the data-model level; if not supplied at creation time, the system must either (a) reject the record, or (b) assign a placeholder/default Country that must be resolved before the Legal Entity can be referenced by a Brand or Location — **needs business confirmation**.
- A Legal Entity may be system-auto-created (as an "invisible default") with only `legal_name`, `country_id`, and `organisation_id` populated, and later updated with `vat`/`cr`/`extra`.
- A Legal Entity record is never hard-deleted (soft delete only — status transitions to `deleted`).

---

## 6. Business Unit (Lookup)

**Description**
Internal P&L grouping. Optional level; auto-created as a hidden default ("Default Business Unit") and surfaces once a merchant separates operations.

**Fields**
| Field | Type | Required | Notes |
|---|---|---|---|
| id | identifier | system-generated | |
| name | string | Yes | |
| key | string | Yes | |

**Relationships**
- Optionally referenced by Locations/Brands for internal grouping (level 5 in the operating hierarchy).

**Acceptance Criteria**
- Business Unit records are reference data; pre-seeded set includes: Default Business Unit (DEFAULT-BU), Central Kitchen (CTRL-KIT), Commissary (COMMISSARY), Cloud Kitchen (CLOUD-KIT), Catering & Events (CATERING), Franchise Operations (FRANCHISE-OPS).
- Every Organisation has a "Default Business Unit" assigned implicitly (auto-created, hidden) until the merchant explicitly separates operations and assigns a different Business Unit.
- **Open question**: confirm whether Business Units beyond the pre-seeded list can be created per-Organisation (custom) or whether the list is global/fixed.

---

## 7. Branch / Location

**Description**
Physical or virtual outlet — the leaf node of the operating hierarchy. Always required.

**Fields**
| Field | Type | Required | Notes |
|---|---|---|---|
| id | identifier | system-generated | |
| name | string | Yes | |
| brand_id | reference → Brand | Yes | |
| currency_id | reference → Currency | No (auto-defaulted) | Defaults from the country derived via Brand → Legal Entity → Country |
| opening_hours | string | No | e.g., "09:00–23:00" |
| address | string | No | |
| cr | string | No | |
| latitude | decimal | No | |
| longitude | decimal | No | |

**Relationships**
- Belongs to one Brand (Core Constraint #2).
- Belongs to exactly one Legal Entity (Core Constraint #1), derived transitively via Brand → Legal Entity.
- References one Currency (defaulted via Brand → Legal Entity → Country → Currency mapping).
- Optionally belongs to a Location Group and/or Business Unit.

**Acceptance Criteria**
- A Branch/Location cannot be created without `name` and `brand_id`.
- If `currency_id` is not supplied, it is auto-derived from the Country associated with the Brand's Legal Entity, via the Country→Currency default mapping.
- `opening_hours`, `address`, `cr`, `latitude`, `longitude` are optional and default to null/empty.
- If `latitude`/`longitude` are supplied, both must be present together and conform to valid coordinate ranges (lat: -90 to 90, lon: -180 to 180).
- A Location's effective Legal Entity is always derivable (not stored redundantly) via `brand_id → legal_entity_id`, satisfying Core Constraint #1.
- A Location record is never hard-deleted (soft delete only — status transitions to `deleted`, Core Constraint #7).

---

## 8. Business Category (Lookup)

**Description**
Reference/shared classification data describing the type of food business concept (e.g., QSR, Fine Dining).

**Fields**
| Field | Type | Required | Notes |
|---|---|---|---|
| id | identifier | system-generated | |
| name | string | Yes | |
| key | string | Yes | |

**Relationships**
- Not currently mapped to any entity field in the wireframe set — **needs an integration point defined** (likely as an optional field on Brand or Organisation).

**Acceptance Criteria**
- Business Category records are global reference data shared across all Organisations.
- Pre-seeded set includes: Quick Service Restaurant (QSR), Fine Dining (FINE-DINE), Cafe (CAFE), Casual Dining (CASUAL-DINE), Bakery & Pastry (BAKERY), Food Truck (FOOD-TRUCK), Cloud Kitchen (CLOUD-KIT), Bar & Lounge (BAR-LOUNGE).
- **Open question**: define which entity (Brand vs. Organisation vs. Location) holds a `business_category_id` reference, and whether it's required or optional at that level.

---

## 9. Currency (Lookup)

**Description**
Reference data used to determine each Branch/Location's default currency based on country.

**Fields**
| Field | Type | Required | Notes |
|---|---|---|---|
| id | identifier | system-generated | |
| name | string | Yes | e.g., "Saudi Riyal" |
| key | string (ISO 4217) | Yes | e.g., "SAR" |

**Relationships**
- Each Country maps to exactly one default Currency (1:1 mapping used for Location currency defaulting).
- Referenced by Branch/Location (`currency_id`).

**Acceptance Criteria**
- Currency records are global reference data; pre-seeded set covers the 10 supported countries (SAR, AED, KWD, QAR, BHD, OMR, JOD, EGP, TRY, PKR).
- A Country → Currency default mapping must exist for every seeded Country, used by the Branch/Location auto-default logic.
- A Branch/Location's `currency_id` can be overridden from the default at creation/update time.

---

## 10. Hierarchy / Cross-Entity Rules Summary

These cut across multiple entities and should be enforced at the domain/service layer regardless of UI:

| # | Rule | Enforced via |
|---|---|---|
| 1 | Every Location belongs to exactly one Legal Entity | Derived: `Location.brand_id → Brand.legal_entity_id` |
| 2 | Every Location belongs to exactly one Brand | `Location.brand_id` required |
| 3 | Every Legal Entity must belong to a Country | `LegalEntity.country_id` required |
| 4 | Brand ↔ Legal Entity is many-to-many | `Brand.legal_entity_id` (primary) + `Franchisee` records (additional) |
| 5 | Config locks are authoritative (ancestor locks cascade down, non-overridable) | Config service — not covered by these entities directly |
| 6 | Permissions cascade downward | Access/role service — not covered by these entities directly |
| 7 | Soft deletes only (Brand, Legal Entity, Location) | `status` field with `deleted` state, no hard delete |
| 8 | Mobile number is the primary user identifier (OTP activation) | User/identity service — not covered by these entities directly |

---

## Open Questions / Gaps to Resolve Before Implementation

1. **Group** and **Location Group** entities are referenced in the hierarchy model (levels 1 and 6) but have no field/entity spec here — need to define their schema and auto-creation rules.
2. **Business Category** has no defined attachment point on any entity — needs a decision (Brand vs. Organisation vs. Location).
3. **Legal Entity.country_id required-but-possibly-blank-at-creation** tension (Core Constraint #3) needs a resolution: hard validation vs. system default/placeholder.
4. **Auto-creation triggers** (Default Group, Country-from-address, Legal Entity default, Default Business Unit, Location Group) need explicit service-level specs: what event triggers creation, what default values are populated, and whether/how the record becomes "visible" later.
5. **Franchisee status** lifecycle (`pending` → `active` → ?) needs a defined state machine and transition triggers.
6. **Soft delete** (`status = deleted`) needs to be defined consistently across Brand, Legal Entity, and Location — including how downstream references (e.g., a Location under a deleted Brand) are handled.
