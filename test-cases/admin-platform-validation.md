# Test Case: Admin Platform Validation

**Spec file:** `tests/adminPlatform-validation.spec.ts`  
**Status:** Partially active — TC-AP-01 and TC-AP-02 are skipped; TC-AP-03 is active  
**Environment:** Staging  
**Target Tenant:** `10-federal-storage`  
**Base URL:** `https://test.staging.storagely-api.com/10-federal-storage/admin`  
**Credentials:** `admin@localhost.com` / `adminadmin`

---

## Overview

Validates admin platform navigation, tenant context preservation, and UI behaviour across multiple admin pages. Each test shares a single login session established in `beforeEach`.

---

## Test Cases

### TC-AP-01 — Tenant Context & Logo Preservation (SKIPPED)

| Field | Value |
|---|---|
| **Test ID** | TC-AP-01 |
| **Status** | Skipped |
| **Priority** | High |

**Purpose:** Ensure that saving changes on the Integrations page does not alter the tenant's branding (logo, company name) or URL context.

**Steps:**

| # | Action | Expected Result |
|---|---|---|
| 1 | Navigate to **Integrations** page | URL contains `integrations` |
| 2 | Capture current logo `src` and company name | Baseline recorded |
| 3 | Click **Save Changes** button | Save completes without error |
| 4 | Verify URL still contains `10-federal-storage` | Tenant context preserved |
| 5 | Compare logo `src` before vs after save | Logo is identical |
| 6 | Compare company text before vs after save | Company name is identical |
| 7 | Navigate to **Branding** page | URL contains `branding` and tenant slug |
| 8 | Navigate to **Location Setup** page | URL contains `location` or `setup` and tenant slug |
| 9 | Verify page loads without 404 | All pages load successfully |
| 10 | Verify user is still logged in | Session is maintained |

**Pass Criteria:** Logo, company name, and URL tenant slug are unchanged after a save operation and subsequent page navigations.

---

### TC-AP-02 — Rental System Submenu Behaviour (SKIPPED)

| Field | Value |
|---|---|
| **Test ID** | TC-AP-02 |
| **Status** | Skipped |
| **Priority** | Medium |

**Purpose:** Verify that Rental System submenus are hidden by default and become visible after a location is selected from the dropdown.

**Steps:**

| # | Action | Expected Result |
|---|---|---|
| 1 | Navigate to Rental System Settings page | URL contains `rental-reservation-settings` |
| 2 | Check initial submenu visibility | All submenus hidden (or document current state) |
| 3 | Select a location from the dropdown | Location is selected successfully |
| 4 | Check submenu visibility after selection | **Location Settings**, **Storage Unit Settings**, **Keyword Setup** submenus are visible |
| 5 | Verify tenant context in URL | URL still contains `10-federal-storage` |
| 6 | Verify page functions without errors | No error state on the page |

**Pass Criteria:** All three submenus are visible after location selection and tenant context is intact.  
**Note:** If submenus do not appear the result is documented (not hard-failed) as it may reflect a known bug under investigation.

---

### TC-AP-03 — Multi-Page Navigation Stress Test (ACTIVE)

| Field | Value |
|---|---|
| **Test ID** | TC-AP-03 |
| **Status** | Active |
| **Priority** | High |

**Purpose:** Confirm tenant context survives a rapid sequence of page navigations with intermittent save operations.

**Navigation sequence tested:**
1. Integrations
2. Branding
3. Location Setup
4. Rental System

**Steps per navigation:**

| # | Action | Expected Result |
|---|---|---|
| 1 | Navigate to each page in the sequence | Page loads without errors |
| 2 | Verify URL contains `10-federal-storage` | Tenant context intact |
| 3 | Click **Save Changes** (where available) | Save completes |
| 4 | Re-verify tenant context in URL after save | Tenant slug still present |
| 5 | Repeat for all pages in sequence | All pages pass checks |
| 6 | Verify no 404 errors throughout | All responses are successful |
| 7 | Verify user remains logged in at the end | Session is active |

**Pass Criteria:** Tenant context (`10-federal-storage`) is preserved in the URL across all pages and save operations, with no unexpected logouts or 404s.

---

## Shared Setup

- A fresh login is performed in `beforeEach` for every test.
- Wingman popup is dismissed (up to 3 retry attempts) after login.
- Final summary is printed in `afterAll` via `AdminTestResultCollector`.
