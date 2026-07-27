# Business Hierarchy — User Stories (Backend / CRUD)

Backend domain work, **no frontend**. Each entity is described by its **CRUD operations**
(Create, Read, Update, Delete), the **facts** that govern them, the **fields** captured,
and **acceptance criteria** in plain English. UI behaviour is out of scope.

> The earlier backend-spec version is preserved in `USER_STORIES_legacy_backend.md`.

**Reading guide**
- **Facts** — the business rules that must hold true (the things we agreed on).
- **Fields** — what is stored, whether it is required, and whether it allows multiple values.
- **CRUD** — which operations exist and what each one does / rejects.
- **Acceptance Criteria** — pass/fail checks, operation by operation.

In the field tables:
- **Required** = Yes means the record cannot be saved without it.
- **Multiple** = Yes means the field accepts more than one value.
- **Read-only** means the value is set by the system and cannot be changed by the user.

---

## 1. Organisation

**Story**
As the platform, I provision exactly one Organisation per account so that all brands,
legal entities, and branches resolve to a single root.

**Facts**
- The Organisation is the **seed of the account** — the business reference / ID in the RMS, and the "concept" on the online side.
- There is **exactly one Organisation per account**.
- It is **auto-provisioned once** at account creation via **self-signup**, **Salesforce (SF)**, or **any integrated tool** that creates and activates an account.

**Fields**
| Field | Required | Multiple | Read-only | Definition |
|---|---|---|---|---|
| id | Yes | No | Yes | Auto-generated unique identifier of the account/Organisation. |
| name | Yes | No | No | The business name of the account. |
| owner_user_ids | Yes | Yes | No | One or more references to existing users who own the Organisation. |

**CRUD**
- **Create** — Not a public operation. The Organisation is created **only** by the provisioning flow (signup / SF / integration), exactly once per account.
- **Read** — Get the single Organisation for the account.
- **Update** — Update `name` and `owner_user_ids`.
- **Delete** — Not supported.

**Acceptance Criteria**
- The system stores **one and only one** Organisation per account.
- A normal Create request (outside provisioning) is **rejected**; provisioning creates the record automatically.
- `id` is system-generated and **cannot be changed** on Update.
- Update is rejected if `name` is empty or if `owner_user_ids` is empty.
- Every value in `owner_user_ids` must reference an **existing user**; unknown users are rejected.
- Delete is **not allowed** and returns an error.

---

## 2. Brand

**Story**
As a merchant, I create brands under my account, limited by my package entitlement.

**Facts**
- Brand count is **driven by the package, not by online products**.
- Every account is allowed **one (1) brand by default**.
- Creating **additional brands requires the "Multiple Brands" add-on**.
- The **data captured is identical** with or without the add-on.

**Fields**
| Field | Required | Multiple | Read-only | Definition |
|---|---|---|---|---|
| id | Yes | No | Yes | Auto-generated unique identifier. |
| name | Yes | No | No | The brand name. |
| legal_entity_id | Yes | No | No | Reference to the owning Legal Entity. |
| business_category_ids | Yes | Yes | No | One or more Business Category references (e.g. QSR, Fine Dining). |
| logo | No | No | No | Optional logo (image reference). |
| website | No | No | No | Optional website. |
| slogan | No | No | No | Optional tagline. |

**CRUD**
- **Create** — Create a brand. **Rejected** when the account already has its allowed number of brands and lacks the Multiple Brands add-on.
- **Read** — Get a brand by id; list brands for the account.
- **Update** — Update any editable field (`name`, `legal_entity_id`, `business_category_ids`, `logo`, `website`, `slogan`).
- **Delete** — Delete a brand (subject to referential rules — see open question).

**Acceptance Criteria**
- Create is **rejected** without `name`, `legal_entity_id`, and at least one `business_category_ids` value.
- `business_category_ids` accepts **more than one** value, each referencing a valid Business Category.
- Without the Multiple Brands add-on, a Create that would exceed **one brand** is **rejected** with a clear "limit reached / add-on required" reason.
- With the add-on, **additional brands** can be created.
- `logo`, `website`, `slogan` are optional and default to empty.
- The set of fields and validations is the **same** regardless of the package.

---

## 3. Legal Entity

**Story**
As a merchant, I register the legal companies behind my business so that compliance,
tax, and ownership are recorded.

**Facts**
- A Legal Entity is the **financial / legal identity** behind brands and branches.
- It can carry **more than one CR**.
- Each Legal Entity belongs to one **Country**.
- **Owner User** values must reference **existing users**.

**Fields**
| Field | Required | Multiple | Read-only | Definition |
|---|---|---|---|---|
| id | Yes | No | Yes | Auto-generated unique identifier. |
| legal_name | Yes | No | No | The registered company name. |
| cr | Yes | Yes | No | Commercial Registration number(s); more than one allowed. |
| vat | Yes | No | No | VAT registration number. |
| country_id | Yes | No | No | Reference to a Country (lookup). |
| owner_ids | Yes | Yes | No | One or more owner identifiers. |
| owner_user_ids | Yes | Yes | No | One or more references to existing users. |

**CRUD**
- **Create** — Create a Legal Entity with all required fields.
- **Read** — Get by id; list for the account.
- **Update** — Update any field except `id`.
- **Delete** — Delete a Legal Entity (subject to referential rules — see open question).

**Acceptance Criteria**
- Create/Update are **rejected** unless **legal_name, cr, vat, country_id, owner_ids, and owner_user_ids** are all present.
- `cr` stores **multiple values** (accepts a comma-separated input, persisted as a list).
- `owner_ids` stores **multiple values**.
- `owner_user_ids` stores **multiple values**, each referencing an **existing user**; unknown users are rejected.
- `country_id` must reference a valid Country in the lookup.

---

## 4. Branch / Location

**Story**
As a merchant, I create branches under a brand; the required data depends on whether the
account's subscription includes an online product.

**Facts**
- Branch validation has **two modes**, driven by the **subscription**:
  - **Base mode** — the subscription has **no online product**.
  - **Online mode** — the subscription **includes an online product**.
- In **Base mode**, `latitude`/`longitude` are **optional**.
- In **Online mode**, `latitude`/`longitude` are **required**, and the online/delivery fields apply.
- **currency_ids** is **multiple**, from the **Currency** lookup.
- **business_category_ids** is **required** and **multiple**.
- **business_unit_ids** is **multiple**, from the **Business Unit** lookup.
- `city` and `region_city` are **two separate fields**.
- `prep_plus_delivery_time` and `prep_time` are **two separate fields**.
- `reference` is **auto-generated**.

**Fields — always present**
| Field | Required | Multiple | Read-only | Definition |
|---|---|---|---|---|
| id | Yes | No | Yes | Auto-generated unique identifier. |
| name | Yes | No | No | Branch name. |
| reference | Yes | No | Yes | Auto-generated reference code. |
| brand_id | Yes | No | No | The brand this branch operates under. |
| currency_ids | Yes | Yes | No | One or more currencies, from the Currency lookup. |
| country_id | Yes | No | No | Branch country (lookup reference). |
| business_category_ids | Yes | Yes | No | One or more Business Category references. |
| business_unit_ids | No | Yes | No | One or more Business Unit references. |
| opening_hours | No | No | No | Operating hours (e.g. 09:00–23:00). |
| city | No | No | No | City, from a predefined list based on `country_id`. |
| governorate | No | No | No | Governorate. |
| region_city | No | No | No | Region / city (separate from `city`). |
| street | No | No | No | Street. |
| building_number | No | No | No | Building number. |
| latitude | Conditional | No | No | Map latitude. Optional in Base mode, required in Online mode. |
| longitude | Conditional | No | No | Map longitude. Optional in Base mode, required in Online mode. |

**Fields — apply only in Online mode**
| Field | Required | Multiple | Read-only | Definition |
|---|---|---|---|---|
| prep_plus_delivery_time | Yes | No | No | Total time shown to the customer (prep + delivery), minutes. |
| prep_time | Yes | No | No | Kitchen preparation time, minutes. |
| base_delivery_charge | Yes | No | No | Starting delivery fee. |
| per_km_additional_charge | Yes | No | No | Extra fee per kilometre. |
| base_max_distance | Yes | No | No | Maximum delivery distance (km). |
| enable_delivery | No | No | No | Boolean flag. |
| enable_pickup | No | No | No | Boolean flag. |
| enable_curbside | No | No | No | Boolean flag. |
| open_24_hours | No | No | No | Boolean flag. |
| enable_inventory_update | No | No | No | Boolean flag. |
| enable_drive_thru | No | No | No | Boolean flag. |
| table_number_prompt | No | No | No | Boolean flag. |
| table_tents_prompt | No | No | No | Boolean flag. |
| pager_prompt | No | No | No | Boolean flag. |

**CRUD**
- **Create** — Create a branch. The required-field set depends on the subscription mode (Base vs Online). `reference` is generated by the system.
- **Read** — Get by id; list branches (e.g. by brand or account).
- **Update** — Update editable fields; `id` and `reference` cannot be changed. Online-mode rules apply when the account is in Online mode.
- **Delete** — Delete a branch (subject to referential rules — see open question).

**Acceptance Criteria**
- In **both modes**, Create/Update are **rejected** without **name, brand_id, currency_ids, country_id, and business_category_ids**.
- `reference` is **system-generated** and **cannot be changed**.
- `currency_ids` accepts **more than one** value, each from the **Currency** lookup.
- `business_category_ids` accepts **more than one** value and is **required**.
- `business_unit_ids` accepts **more than one** value and is **optional**, each from the **Business Unit** lookup.
- `city` must be a value from the **predefined list for the selected `country_id`**.
- `city` and `region_city` are stored as **two separate fields**.
- In **Base mode**, `latitude`/`longitude` may be empty.
- In **Online mode**, Create/Update are **rejected** without `latitude`, `longitude`, and the five required delivery fields (`prep_plus_delivery_time`, `prep_time`, `base_delivery_charge`, `per_km_additional_charge`, `base_max_distance`).
- `prep_plus_delivery_time` and `prep_time` are stored as **two distinct fields**.
- The boolean flags default to **false** when not provided.

---

## 5. Franchisee

**Story**
As a brand owner (franchisor), I create franchisees so other operators can run my brand,
with the correct party owning licence renewals.

**Facts**
- Foodics supports **two franchise models**, which differ in **who owns the licence renewal**:
  - **Model A — Franchisor-owned:** the franchisor (brand owner) **owns the account and distributes licences**. → **Renewal ownership: Franchisor.**
  - **Model B — Franchisee-owned (merged):** the franchisee **buys Foodics and merges their account** into the main account. → **Renewal ownership: Franchisee.**
- The **data captured on create is the same in both models**.
- **owner_user_ids is inherited from the selected Legal Entity** (not set directly on the Franchisee).

**Fields**
| Field | Required | Multiple | Read-only | Definition |
|---|---|---|---|---|
| id | Yes | No | Yes | Auto-generated unique identifier. |
| name | Yes | No | No | Franchisee name. |
| legal_entity_id | Yes | No | No | The Legal Entity that operates the franchise. |
| brand_id | Yes | No | No | The brand being franchised. |
| owner_user_ids | No | Yes | Yes | Derived from the Legal Entity (read-only on the Franchisee). |
| contract | No | No | No | Optional contract document reference. |

**CRUD**
- **Create** — Create a franchisee linking a Brand and a Legal Entity. `owner_user_ids` is resolved from the chosen Legal Entity, not supplied.
- **Read** — Get by id; list franchisees (by brand or legal entity).
- **Update** — Update `name`, `brand_id`, `legal_entity_id`, `contract`. `owner_user_ids` stays derived.
- **Delete** — Delete the franchisee link (the Brand and Legal Entity are unaffected).

**Acceptance Criteria**
- Create/Update are **rejected** without **name, legal_entity_id, and brand_id**.
- `owner_user_ids` is **not accepted as input** — it is **derived** from the Legal Entity's owners and is read-only.
- The franchise **model** determines **who owns licence renewal** (Model A → Franchisor, Model B → Franchisee); the captured fields are the **same** in both models.
- `contract` is optional and stores a **document reference**.

---

## 6. Lookups (reference data)

**Story**
As the platform, I maintain standard reference lists so entities reference consistent,
shared values.

**Facts**
- Lookups are **Country, Currency, Business Category, Business Unit**.
- For merchants they are **read-only** — selected/referenced, not created.

**CRUD**
- **Create / Update / Delete** — Restricted to **system seeding / admin only**; not part of merchant CRUD.
- **Read** — Get by id; list values (used to validate references on other entities).

**Where each lookup is referenced**
| Lookup | Referenced by |
|---|---|
| Country | Legal Entity (`country_id`), Branch (`country_id`). Also drives the Branch `city` list. |
| Currency | Branch (`currency_ids`, multiple). |
| Business Category | Brand and Branch (`business_category_ids`, multiple). |
| Business Unit | Branch (`business_unit_ids`, multiple). |

**Acceptance Criteria**
- Merchant-facing CRUD exposes **Read only** for lookups.
- Any entity field referencing a lookup is **rejected** if the referenced value does not exist.
- Branch `city` values are validated against the **list for the selected `country_id`**.

---

## 7. Facts Summary (everything we agreed)

| # | Fact |
|---|---|
| 1 | The Organisation is the seed of the account (RMS business reference / online concept). |
| 2 | Exactly **one Organisation per account**; auto-provisioned (signup / SF / integrated tool); no public Create, no Delete. |
| 3 | Brand count depends on the **package**: 1 by default, more requires the **Multiple Brands add-on**; unrelated to online. |
| 4 | Brand data/validation is the same with or without the add-on. |
| 5 | **Business Category** is required and multi-value on **both Brand and Branch**. |
| 6 | Branch has **two validation modes** by subscription: Base (no online product) and Online (has an online product). |
| 7 | Base mode: lat/long optional. Online mode: lat/long **required** plus the delivery fields. |
| 8 | `prep_plus_delivery_time` and `prep_time` are **two separate fields**. |
| 9 | Branch **currency_ids** is **multiple**, from the **Currency** lookup. |
| 10 | Branch **business_unit_ids** is **multiple**, from the **Business Unit** lookup. |
| 11 | Branch `city` and `region_city` are **separate fields**; `city` is a predefined list per Country. |
| 12 | Legal Entity **owner_user_ids** reference **existing users**; **cr** and **owner_ids** allow **multiple** values. |
| 13 | Franchisee behaviour depends on the **franchise model** (two models). |
| 14 | Model A (Franchisor-owned): renewal owned by **franchisor**. Model B (Franchisee-owned/merged): renewal owned by **franchisee**. |
| 15 | Franchisee fields are the same in both models; **owner_user_ids inherited from the Legal Entity**; contract optional. |
| 16 | Lookups (Country, Currency, Business Category, Business Unit) are **Read-only** for merchants; references are validated against them. |

---

## 8. Open Questions (to confirm before build)

1. **Delete semantics** — Are Brand / Legal Entity / Branch **hard-deleted** or **soft-deleted** (status flag)? What happens to children on delete (block vs. cascade)?
2. **Legal Entity `owner_ids` vs `owner_user_ids`** — are these two distinct concepts (external owner identifiers vs. platform users), or the same set viewed two ways?
3. **Subscription mode source** — what exactly tells the backend the account is in "Online mode" (which product/entitlement flag), and is it evaluated at Create time, Update time, or both?
4. **Brand limit** — is the default exactly 1, and does the Multiple Brands add-on set a fixed higher cap or unlimited?
5. **Franchisee model** — is the model stored on the Franchisee/account, or derived purely from how the account was provisioned? Where does "renewal owner" live?
