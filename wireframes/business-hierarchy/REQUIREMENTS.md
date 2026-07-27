# Business Hierarchy — High-Level CRUD Requirements

Scope: the functional requirements for managing the business-hierarchy entities, expressed
purely as **data operations** (Create / Read / Update / Delete). No UI, layout, or interaction
detail. Field-level specs and acceptance criteria live in [`USER_STORIES.md`](USER_STORIES.md);
this document defines *what operations must exist and the rules they obey*.

The hierarchy spans two dimensions:
- **Operating:** Organisation → Group → Brand → Country → Business Unit → Location Group → Location
- **Legal/Financial:** Legal Entity (first-class node, attached at Org/Group/Brand level)

---

## 1. Entity Classes

Entities fall into three CRUD profiles. The profile determines which operations are exposed.

| Class | Entities | CRUD Profile |
|---|---|---|
| **Managed** | Organisation, Brand, Legal Entity, Branch/Location, Franchisee | Full CRUD by merchant users; **delete is soft-delete only** |
| **Structural** | Group, Business Unit, Location Group | Full CRUD, but a hidden **default** is auto-created and cannot be deleted while in use |
| **Lookup / Reference** | Country, Currency, Business Category | **Read-only** to merchant users; create/update/delete are system- or admin-managed only |

---

## 2. Cross-Cutting CRUD Requirements

These apply to every operation regardless of entity.

- **CC-1 — Soft delete.** Managed entities (Brand, Legal Entity, Location, Organisation) are never
  hard-deleted. Delete transitions `status → deleted`; the record and its references are retained.
- **CC-2 — Referential safety on delete.** An entity may not be deleted (soft or otherwise) while
  active children reference it, unless the operation explicitly cascades or reassigns those children.
- **CC-3 — Scoping.** Every Read/List of a managed or structural entity is scoped to the caller's
  Organisation. Lookup entities are global and not Organisation-scoped.
- **CC-4 — Auto-creation.** Creating a parent may implicitly create hidden default children
  (Default Group, default Legal Entity, Default Business Unit). These are valid records that can
  later be surfaced and updated; they are not user-supplied on the create call.
- **CC-5 — Validation before persist.** Required fields and cross-entity constraints
  (see §13) are enforced at the service layer on Create and Update; invalid writes are rejected.
- **CC-6 — Derived references are not duplicated.** Where a relationship can be derived
  (e.g. a Location's Legal Entity via its Brand), it is resolved at read time, not stored or
  set independently.

---

## 3. Organisation

- **Create:** Establish a new Organisation (requires `name`). Auto-creates a hidden Default Group
  and may auto-create a default Legal Entity / Default Business Unit (CC-4).
- **Read:** Fetch a single Organisation; list/query Organisations. Reads can include aggregate
  counts (e.g. number of Brands, Locations).
- **Update:** Edit Organisation attributes (name, billing, SSO, data residency, status).
- **Delete:** Soft-delete only (CC-1). Blocked or cascaded per CC-2.

## 4. Group

- **Create:** Add a Group under an Organisation. A Default Group already exists from Org creation.
- **Read:** Fetch a Group; list Groups within an Organisation.
- **Update:** Edit Group attributes; reassign Brands between Groups.
- **Delete:** Allowed for non-default Groups with no active Brands; the Default Group cannot be deleted.

## 5. Brand

- **Create:** Add a Brand under an Organisation (requires `name` + owning Legal Entity).
  Implicitly attached to the Organisation's Default Group unless one is specified.
- **Read:** Fetch a Brand; list Brands (by Organisation / Group). Reads can include Location counts
  and associated Legal Entities (primary + franchise).
- **Update:** Edit Brand attributes; move between Groups; change owning Legal Entity.
- **Delete:** Soft-delete only (CC-1). Locations under a deleted Brand retain their reference but
  are flagged accordingly.

## 6. Franchisee

The bridge record realising the **many-to-many** Brand ↔ Legal Entity relationship for external operators.

- **Create:** Link a Brand to a (possibly externally-owned) Legal Entity (requires `brand_id`
  + `legal_entity_id`). Defaults to `status = pending`. Does not alter the Brand's primary Legal Entity.
- **Read:** Fetch a Franchisee link; list Franchisees by Brand or by Legal Entity.
- **Update:** Transition status (`pending → active → …`); edit link attributes.
- **Delete:** Remove the franchise association; the underlying Brand and Legal Entity are unaffected.

## 7. Legal Entity

First-class financial node (VAT, CR, tax, currency, fiscal year).

- **Create:** Register a Legal Entity under an Organisation (requires `legal_name`; `country_id`
  required per CC/§13). May be system-auto-created as an invisible default and refined later.
- **Read:** Fetch a Legal Entity; list by Organisation. Reads expose linked Brands, Country, and
  the Locations resolving to it.
- **Update:** Edit financial identity (VAT, CR list, tax mode, fiscal year, currency, address);
  manage Brand associations.
- **Delete:** Soft-delete only (CC-1). Blocked while any active Location resolves to it (CC-2).

## 8. Business Unit (Structural / Lookup)

- **Create:** Add a Business Unit for internal P&L grouping. A hidden Default Business Unit exists per Org.
- **Read:** Fetch / list Business Units available to the Organisation.
- **Update:** Edit attributes (name, cost-centre code).
- **Delete:** Allowed for non-default units with no active references; Default Business Unit cannot be deleted.
- *Open: whether custom Business Units are per-Organisation or drawn from a fixed global set (see §14).*

## 9. Location Group (Structural)

- **Create:** Add a Location Group under a Legal Entity (optionally under a Business Unit).
- **Read:** Fetch / list Location Groups within a Legal Entity.
- **Update:** Edit attributes; reassign member Locations.
- **Delete:** Allowed when empty; a default Location Group cannot be deleted while in use.

## 10. Branch / Location

The operational leaf node.

- **Create:** Add a Location (requires `name` + `brand_id`). Currency auto-derives from
  Brand → Legal Entity → Country unless supplied. Legal Entity is derived, not set directly (CC-6).
- **Read:** Fetch a Location; list/filter by Brand, Legal Entity, Group, or Business Unit.
- **Update:** Edit attributes (address, hours, coordinates, type, currency override, status).
- **Delete:** Soft-delete only (CC-1).

---

## 11. Lookup / Reference Entities (Read-Only to Merchants)

Country, Currency, and Business Category are global reference data.

- **Create / Update / Delete:** Restricted to system seeding or admin tooling — **not exposed to
  merchant users**. New Country records may be auto-created by the system from an address (admin/system path only).
- **Read:** Freely readable for selection and defaulting:
  - **Country** — pre-seeded supported markets; required reference for every Legal Entity.
  - **Currency** — pre-seeded per supported country; drives Location currency defaulting (Country → Currency).
  - **Business Category** — global classification (QSR, Fine Dining, etc.); *attachment point TBD, see §14*.

---

## 12. Read / Query Requirements (cross-entity)

- **R-1 — Hierarchy traversal:** Any node can be read with its ancestors and immediate children resolved.
- **R-2 — Aggregate counts:** Parent reads can include counts of descendants (Brands per Org, Locations per Brand/LE).
- **R-3 — Scoped lists:** All list operations are Organisation-scoped (CC-3) and exclude
  soft-deleted records by default, with an option to include them.
- **R-4 — Derived resolution:** A Location's effective Legal Entity and default Currency are
  resolvable on read without separate stored fields (CC-6).

---

## 13. Constraints Enforced on Every Write

| # | Rule |
|---|---|
| 1 | Every Location belongs to exactly one Legal Entity (derived via its Brand). |
| 2 | Every Location belongs to exactly one Brand (`brand_id` required). |
| 3 | Every Legal Entity must reference exactly one Country (`country_id` required). |
| 4 | Brand ↔ Legal Entity is many-to-many (primary LE + Franchisee records). |
| 5 | Soft-delete only for Brand, Legal Entity, Location, Organisation (`status = deleted`). |
| 6 | Deletes respect referential safety — no orphaning of active children (CC-2). |

---

## 14. Open Questions (blocking full CRUD definition)

1. **Legal Entity `country_id` at create time** — hard-reject if missing, or assign a placeholder
   Country that must be resolved before the LE can be referenced?
2. **Business Category attachment** — which entity holds the reference (Brand / Organisation /
   Location), and is it required?
3. **Custom Business Units** — per-Organisation custom records, or a fixed global lookup?
4. **Auto-creation triggers** — define the event, default values, and "surface later" behavior for
   each implicit default (Default Group, default Legal Entity, Default Business Unit, Location Group).
5. **Franchisee lifecycle** — the full status state machine and who can transition it.
6. **Soft-delete downstream handling** — how reads and writes treat children of a soft-deleted parent.
