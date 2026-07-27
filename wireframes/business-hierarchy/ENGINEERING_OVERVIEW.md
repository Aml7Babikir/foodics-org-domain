# Business Hierarchy — Engineering Overview

Source of truth for domain rules: `PRD.md` (Core Constraints) + entity specs in `USER_STORIES.md`. This doc summarizes the data model and implementation-relevant rules for engineers picking up this work.

---

## 1. Entity Summary

| Entity | Table type | PK | Required FKs | Notes |
|---|---|---|---|---|
| `organisation` | Core | id | — | Root entity. Auto-creates `group` (default) on insert. |
| `group` | Core (auto) | id | `organisation_id` | Always exists ("Default Group"), hidden in UI until merchant has >1. |
| `brand` | Core | id | `legal_entity_id`, `group_id` | `group_id` set implicitly to org's default group. |
| `franchisee` | Core | id | `brand_id`, `legal_entity_id` | Bridge table realizing Brand↔LegalEntity M:M for franchise cases. `status` enum. |
| `legal_entity` | Core | id | `country_id`, `organisation_id` | Auto-created as default; `vat`/`cr`/`extra` filled in later. |
| `business_unit` | Lookup | id | — | Global/seeded list; `default_business_unit_id` referenced per org. |
| `location_group` | Core (auto) | id | `organisation_id` (or business_unit?) | Not yet specced — needs schema definition. |
| `location` (Branch) | Core | id | `brand_id` | `legal_entity_id` and `currency_id` derived, not stored redundantly (or stored + validated on write — TBD). |
| `country` | Lookup | id | — | Seeded: SA, AE, KW, QA, BH, OM, JO, EG, TR, PK. |
| `currency` | Lookup | id | — | Seeded: SAR, AED, KWD, QAR, BHD, OMR, JOD, EGP, TRY, PKR. |
| `business_category` | Lookup | id | — | Seeded list; **no FK target yet — needs decision**. |

---

## 2. Field Reference (non-lookup entities)

```
organisation
  id, name (string, required), created_at, status

group                          # auto-created
  id, organisation_id (fk, required), name, status

brand
  id, name (string, required), legal_entity_id (fk, required),
  group_id (fk, set implicitly), logo (file ref, nullable),
  slogan (string, nullable), website (string, nullable), status

franchisee
  id, name (string, required), brand_id (fk, required),
  legal_entity_id (fk, required), status (enum: pending|active|..., default=pending)

legal_entity
  id, legal_name (string, required), vat (string, nullable),
  cr (string[], nullable), country_id (fk, required*), organisation_id (fk, required),
  extra (text, nullable), status
  * required per Core Constraint #3 — enforcement strategy TBD (hard fail vs placeholder)

location (branch)
  id, name (string, required), brand_id (fk, required),
  currency_id (fk, nullable -> defaulted via country lookup),
  opening_hours (string, nullable), address (string, nullable),
  cr (string, nullable), latitude (decimal, nullable), longitude (decimal, nullable),
  status
```

---

## 3. Derived / Cascading Data

- **Location → Legal Entity**: `location.brand_id → brand.legal_entity_id`. Not a direct FK on `location`. If denormalized for query performance, must be kept in sync on `brand.legal_entity_id` changes.
- **Location → Currency default**: `location.brand_id → brand.legal_entity_id → legal_entity.country_id → country → currency` (1:1 country-to-currency mapping). Override allowed at `location` level.
- **Brand → Group**: implicit, set to `organisation.default_group_id` at creation time. No user input.

---

## 4. Enforcement Rules (Core Constraints → implementation)

| # | Rule | Where to enforce |
|---|---|---|
| 1 | Location → exactly one Legal Entity | Derived via Brand; enforce at query/service layer, not a separate FK |
| 2 | Location → exactly one Brand | `location.brand_id` NOT NULL FK |
| 3 | Legal Entity → exactly one Country | `legal_entity.country_id` NOT NULL FK — **needs decision**: reject on create vs. system default |
| 4 | Brand ↔ Legal Entity M:M | `brand.legal_entity_id` (primary) + `franchisee` rows (additional links) |
| 5 | Config locks authoritative, non-overridable downstream | Config service (out of scope for these entities) |
| 6 | Permissions cascade downward | Access/role service (out of scope) |
| 7 | Soft delete only for Brand, Legal Entity, Location | `status` enum incl. `deleted`; no hard DELETE in repo layer |
| 8 | Mobile number = primary user identifier (OTP) | User/identity service (out of scope) |

---

## 5. Seed / Reference Data

- `country`: 10 rows (id, name, key) — SA, AE, KW, QA, BH, OM, JO, EG, TR, PK
- `currency`: 10 rows (id, name, key) — SAR, AED, KWD, QAR, BHD, OMR, JOD, EGP, TRY, PKR
- `business_unit`: 6 rows — Default Business Unit, Central Kitchen, Commissary, Cloud Kitchen, Catering & Events, Franchise Operations
- `business_category`: 8 rows — QSR, Fine Dining, Cafe, Casual Dining, Bakery & Pastry, Food Truck, Cloud Kitchen, Bar & Lounge
- Country → Currency 1:1 mapping table needed for default logic (e.g., SA→SAR, AE→AED, ...)

---

## 6. Open Engineering Decisions (blocking items)

1. **`group` and `location_group` schemas** — not specced. Need: columns, auto-creation trigger, parent FK, visibility flag.
2. **`business_category` FK target** — which entity gets `business_category_id`? (Brand is most likely candidate.)
3. **`legal_entity.country_id` NOT NULL vs nullable-with-placeholder** — affects whether auto-created "default" Legal Entity rows can exist pre-Country-assignment.
4. **Auto-creation triggers** — define as DB triggers, service-layer hooks on insert, or async jobs:
   - `organisation` insert → create `group` (default)
   - `legal_entity` country detected from address → create/lookup `country`
   - `organisation`/`brand` separation event → create `business_unit` (default) / `location_group`
5. **Franchisee status state machine** — define enum values + valid transitions (`pending → active`, `active → suspended`?, etc.) and what triggers each transition.
6. **Soft delete cascade** — if `brand.status = deleted`, what happens to its `location` rows? Flag-only, or cascade status, or block delete if active locations exist?
7. **Location.currency_id and legal_entity_id** — store as denormalized FK + validate, or compute on read? Affects indexing/query design.

---

## 7. Suggested Build Order

1. Lookup tables + seed data (`country`, `currency`, `business_unit`, `business_category`, country→currency map)
2. `organisation` + auto `group` creation
3. `legal_entity` (resolve country_id requirement decision first)
4. `brand` (depends on legal_entity)
5. `location` (depends on brand; implement currency default logic)
6. `franchisee` (depends on brand + legal_entity)
7. `location_group` / business_unit assignment flows (pending schema decisions)
8. Soft-delete + cascade rules across all core entities
