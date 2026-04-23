# Test Case: Admin Login

**Spec file:** `tests/admin-login.spec.ts`  
**Status:** SKIPPED (entire suite marked `test.describe.skip`)  
**Environment:** Staging  
**Target URL:** `https://test.staging.storagely-api.com/bluebirdstorage/login`

---

## Overview

Verifies that an admin user can log in to the Storagely admin panel and land on a fully loaded dashboard with all expected navigation and metric elements present.

---

## Test Cases

### TC-AL-01 — Admin Login & Dashboard Verification

| Field        | Value |
|---|---|
| **Test ID**  | TC-AL-01 |
| **Status**   | Skipped |
| **Priority** | Medium |

**Pre-conditions:**
- Admin account exists with email `admin@localhost.com` / password `adminadmin`
- Staging environment is accessible

**Steps:**

| # | Action | Expected Result |
|---|---|---|
| 1 | Navigate to `https://test.staging.storagely-api.com/bluebirdstorage/login` | Page title matches `/Login \| Bluebird Self Storage/` |
| 2 | Fill email field with `admin@localhost.com` | Field is populated |
| 3 | Fill password field with `adminadmin` | Field is populated |
| 4 | Click **Login** button | Page navigates to `/admin` dashboard |
| 5 | Verify dashboard URL | URL matches `.*\/admin$` |
| 6 | Verify dashboard title | Title matches `/Dashboard.*Storagely/` |
| 7 | Handle Wingman popup (if visible) | Popup is dismissed by clicking the `×` close button |
| 8 | Verify heading: **Total Rentals** | Heading is visible |
| 9 | Verify heading: **Future Rentals** | Heading is visible |
| 10 | Verify heading: **Google My Business** | Heading is visible |
| 11 | Verify heading: **Google Organic Search** | Heading is visible |
| 12 | Verify nav link: **Reporting Engine** | Link is visible |
| 13 | Verify nav link: **Rental System** | Link is visible |
| 14 | Verify nav link: **Marketing Tools** | Link is visible |
| 15 | Verify nav link: **Storage Website** | Link is visible |
| 16 | Verify nav link: **Settings** | Link is visible |
| 17 | Verify location selector `#location_select` | Selector is visible and has value `46` |
| 18 | Verify displayed location text | Shows `L001- Calgary - Dufferin` |

**Pass Criteria:** All headings, nav links, and the location selector are visible with correct values after login.

---

## Notes

- Wingman popup check has a 5-second timeout; if it does not appear the test continues normally.
- The entire suite is currently skipped pending environment readiness.
