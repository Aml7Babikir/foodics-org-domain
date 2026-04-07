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
