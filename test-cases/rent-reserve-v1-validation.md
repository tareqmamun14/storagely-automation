# Test Case: V1 Rent Flow Validation

**Spec file:** `tests/rentReserveV1-validation.spec.ts`  
**Status:** Active  
**Fixture:** `fixtures/rentReserveV1-fixture.ts`  
**Config:** `configs/urls.ts` → `CUSTOMER_URLS`  
**Credentials:** `configs/credentials.ts` → `TEST_USER`  
**Timeout:** 6 minutes per test  
**Retries:** Not configured (default)

---

## Overview

Verifies the **V1 multi-step rent flow** where Rental Details (Step 4) and Payment Details (Step 5) are on **separate pages**. The test navigates to a storage listing page, clicks **RENT**, fills the rental details form, fills the payment form, submits, and captures the resulting toast/error message.

---

## Clients Tested

### Staging

| Client | FMS |
|---|---|
| Distinct Storage — New Milford, CT | storEDGE |
| Rhino Storage — Covington, LA | SiteLink |
| Gatekeeper Self Storage — Peachtree City, GA | SiteLink |
| Storage Boss — Ponchatoula, LA | SiteLink |
| Smart Self Storage Ohio — Macedonia, OH | SSM |

### Production

| Client | FMS |
|---|---|
| Distinct Storage — New Milford, CT | storEDGE |
| Rhino Storage — Covington, LA | SiteLink |
| Gatekeeper Self Storage — Peachtree City, GA | SiteLink |
| Storage Depot LA — Hammond, LA | SiteLink |
| Smart Self Storage Ohio — Macedonia, OH | SSM |

---

## Test Cases

### TC-V1-01 — V1 Payment Verification (per client)

One test case runs per client URL.

| Field | Value |
|---|---|
| **Test ID** | TC-V1-[ClientName] |
| **Priority** | High |

**Pre-conditions:**
- Environment is set in `configs/urls.ts` (`CURRENT_ENVIRONMENT`)
- Corp code is configured in staging if required (handled automatically by `setupCorpCodeIfNeeded`)

**Steps:**

| # | Step | Action | Expected Result |
|---|---|---|---|
| 0 | Pre-step | Run `setupCorpCodeIfNeeded` for staging | Corp code set if required |
| 1 | Navigation | Navigate to storage listing page with cache-busting | Page loads, units visible |
| 2 | Rent Button | Click **RENT** button | Navigates to Step 4 (Rental Details page) |
| 3 | Immediate Error Check | Check for any error toast immediately after clicking RENT | Error captured (if any); if error blocks navigation, test exits as pass with note |
| 4 | Rental Details | Fill: first name, last name, email, phone, address, city, state/province, ZIP | All fields populated on Step 4 |
| 5 | Lease Details | Fill (if present): alternate phone, alternate email, driver's license number, license state, birth date | Fields populated or section skipped |
| 6 | Payment Details | Fill: card number, expiry, CVV | Payment fields populated on Step 5 |
| 7 | Agreements | Check all agreement checkboxes | All agreements accepted |
| 8 | Submission | Click **RENT NOW** / submit payment | Toast message appears |
| 8 | Submission | Capture the toast/error message | Error message recorded |

**Pass Criteria:**
- The test completes all steps without throwing.
- A toast/error message is captured (any message, including "Card Declined", counts as a pass).

**Fail Criteria:**
- Any step throws before reaching form submission.
- Navigation to Step 4 or Step 5 fails.

**Special cases:**
- If RENT button leads to **Join Waitlist** → test marked successful with note "No error — JOIN WAITLIST option".
- If an immediate error blocks navigation after clicking RENT → test marked successful with note `[Immediate Error - Blocked Navigation]`.
- If toast contains `"Alternate contact must have a first name, last name, and address"` → result is flagged `[NEEDS ATTENTION]`.

---

## Result Output

Results are collected in memory via `RentResultCollector` and printed as a summary table in the terminal after all tests complete.

---

## How to Run

```bash
# All V1 clients
npx playwright test tests/rentReserveV1-validation.spec.ts

# Specific client (filter by URL substring)
npx playwright test tests/rentReserveV1-validation.spec.ts --grep "distinct-storage"
```

---

## Adding a New V1 Client

1. Add the location URL to `CUSTOMER_URLS` in `configs/urls.ts` (both staging & production).
2. Add the production `URL → FMS` mapping to `FMS_PLATFORM`.

## Admin URLs

The admin panel URL used for login/settings flows is configured in `ADMIN_URLS`:
- Staging: `https://test.staging.storagely-api.com/distinct-storage/admin`
- Production: `https://distinctstorage.com/admin`
