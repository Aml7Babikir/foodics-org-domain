# Foodics Organisation Domain — Architecture One-Pager

## What It Is
A multi-tenant merchant hierarchy system for managing restaurant chains across brands, countries, legal entities, and locations — with scoped roles, config inheritance, and franchise delegation.

---

## Hierarchy (8 Levels)

```
Organisation          Top-level merchant account (billing, SSO, data residency)
  └─ Group            Optional holding structure for multiple brands
      └─ Brand        Customer-facing restaurant concept (menu, loyalty, identity)
          └─ Country  Market context (locale, regulations, currency)
              └─ Legal Entity   Financial identity (VAT, tax, compliance) — M:N with Brand
                  └─ Business Unit   Internal P&L grouping (optional)
                      └─ Location Group   Operational cluster (optional)
                          └─ Location   Physical or virtual outlet (leaf node)
```

**Hard constraints:**
- Every Location must belong to exactly **one Legal Entity** and exactly **one Brand**
- Every Legal Entity must belong to exactly **one Country**
- Brand ↔ Legal Entity is **many-to-many** (one brand operated by multiple LEs, one LE serving multiple brands)
- A default Group is auto-created per Organisation; Brand falls into it if none specified

---

## Legal Entity & Franchise Model

| Field | Rule |
|-------|------|
| `country_id` | Required — LE must be tied to a regulatory jurisdiction |
| `currency_code` | Required — financial reporting currency |
| `tax_mode` | `inclusive` or `exclusive` |
| `vat_registration_number` | Saudi format: 15 digits starting with `3` |
| `is_franchise` | Flags franchisee-owned entities |
| `owner_name` | Tracks the franchisee's identity |

Franchise = different Legal Entities (owners) operating under the same Brand. Each Location's ownership is determined by its `legal_entity_id`.

---

## Config Inheritance

Settings cascade down the hierarchy with three modes:

| Mode | Behavior |
|------|----------|
| **Inherit** | No local value — uses parent's setting |
| **Override** | Local value takes precedence over parent |
| **Lock** | Sets value AND prevents any descendant from changing it |

Resolution walks the ancestor chain upward and returns the first Lock or Override found.

**Example:** Organisation locks `tax_mode = inclusive` → no Brand, LE, or Location can change it.

---

## Users & Roles

**8 system roles** with pre-configured permissions:

| Role | Default Level | Permissions |
|------|--------------|-------------|
| Cashier | Location | pos:operate, orders:create, payments:accept |
| Waiter | Location | pos:operate, orders:create/view, tables:manage |
| Store Manager | Location | pos, orders, inventory, staff:view, reports:view, settings:location |
| Area Manager | Location Group | locations, staff, reports:view, inventory, settings:location_group |
| Brand Ops Manager | Brand | brands, locations:view, staff, reports:view, menu, settings:brand |
| Country Manager | Country | brands:view, locations, staff, reports, compliance, settings:country |
| Finance Viewer | Organisation | reports:view, financial:view, invoices:view, tax:view |
| Admin | Organisation | `*:*` (full access) |

**Scoped access:** A role assigned at a hierarchy node grants access to **all descendants** below it.

**User lifecycle:** Invited (OTP sent, 72h expiry) → Active (OTP verified) → Offboarded (access revoked)

---

## Delegation (Franchise/Partner Access)

Allows one Organisation to grant another controlled access to a hierarchy subset:

| Type | Use Case |
|------|----------|
| `brand_franchise` | Franchisee operates a specific brand |
| `management_contract` | Management company operates locations |
| `regional_partner` | Partner manages regional operations |

The delegating party retains full visibility and can **lock config settings** the receiver cannot override. Delegations can be revoked or time-expired.

---

## API Surface

| Domain | Endpoints | Key Operations |
|--------|-----------|----------------|
| Hierarchy | 30+ | CRUD all 8 levels, tree view, ancestor/descendant queries, Brand-LE link/unlink |
| Config | 4 | Set setting, list at node, resolve single key, resolve all |
| Users | 8 | Invite, activate (OTP), offboard, assignments, accessible locations |
| Roles | 3 | Create, list, assign |
| Delegation | 5 | Create, list by delegator/receiver, revoke, receiver locations |

**Stack:** Python 3.9 / FastAPI / SQLAlchemy / SQLite — Vanilla JS SPA frontend

---

## Signup Flow

1. Select business segment (Micro / Growing Chain / Mid-Market / Enterprise)
2. Enter business name + phone + email
3. Select countries of operation
4. Choose business structure (single brand, multi-brand, multi-LE, franchise)
5. System auto-creates: Organisation → Brand → Country → Legal Entity → Location Group → Location
6. Redirects to dashboard with setup guide tailored to the selected structure

---

## Key Business Rules

1. **Location ownership is immutable per LE** — a location cannot float between legal entities without re-assignment
2. **VAT numbers follow Saudi ZATCA format** — 15-digit validation starting with `3`
3. **Config locks are authoritative** — once an ancestor locks a setting, no descendant can override
4. **Role scope is inherited downward** — Brand Manager sees all locations under that brand
5. **Franchise isolation** — franchisee LE can only see/manage its own locations, even under a shared brand
6. **Soft deletes** — Brands, Legal Entities, and Locations are soft-deleted (status → deleted), not removed
7. **Mobile number is the primary user identifier** — unique across the system, used for OTP activation
8. **OTP wildcard in dev** — any 6-digit code is accepted for testing
