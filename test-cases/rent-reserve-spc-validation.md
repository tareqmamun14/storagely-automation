# Test Case: Single-Page Rent Flow (SPC) Validation

**Spec file:** `tests/rentReserveSPC-validation.spec.ts`  
**Status:** Active  
**Fixture:** `fixtures/rentReserveSPC-fixture.ts`  
**Config:** `configs/urls.ts` → `SINGLE_PAGE_RENT_URLS`  
**Credentials:** `configs/credentials.ts` → `SINGLE_PAGE_USER`  
**Timeout:** 4 minutes per test (no timeout for captcha-protected sites)  
**Retries:** 0

---

## Overview

Verifies the **single-page rent flow** where Rental Details (Step 4) and Payment Details (Step 5) are combined on one page. The test navigates to a storage listing page, clicks **RENT**, fills the complete form, submits it, and captures the resulting toast message (expected to be a payment-processor error such as "Card Declined" — not a real charge).

---

## Clients Tested

### Staging

| Client | FMS | Captcha |
|---|---|---|
| First Storage — Huntsville, AL | storEDGE | — |
| Columbia Self Storage — South Plainfield, NJ | storEDGE | — |
| Bluebird Storage — Calgary, AB | SiteLink | — |
| Sunbird Storage — Winston-Salem, NC | SiteLink | — |
| Purely Storage — Pasco, WA | storEDGE | — |
| YourWay Storage — Augusta, GA | SSM | — |
| Red Rocks Self Storage — Aurora, CO | SiteLink | — |
| Storage Star — Colorado Springs, CO | SSM | — |
| Storsafe Self Storage — Melbourne, FL | storEDGE | hCaptcha at RENT NOW |

### Production

| Client | FMS | Captcha |
|---|---|---|
| First Storage — Huntsville, AL | storEDGE | hCaptcha at RENT NOW |
| Columbia Self Storage — South Plainfield, NJ | storEDGE | hCaptcha at RENT NOW |
| Bluebird Storage — Calgary, AB | SiteLink | hCaptcha at RENT NOW |
| Sunbird Storage — Winston-Salem, NC | SiteLink | hCaptcha at RENT NOW |
| Purely Storage — Pasco, WA | storEDGE | hCaptcha at RENT NOW |
| YourWay Storage — Augusta, GA | SSM | hCaptcha at RENT NOW |
| Red Rocks Self Storage — Aurora, CO | SiteLink | hCaptcha at RENT NOW |
| Storage Star — Colorado Springs, CO | SSM | hCaptcha at RENT NOW |

> Mini Mall and Storsafe (prod) are currently disabled (commented out).

---

## Test Cases

### TC-SPC-01 — Single-Page Rent Verification (per client)

One test case runs per client URL. Test ID uses the client's company name.

| Field | Value |
|---|---|
| **Test ID** | TC-SPC-[ClientName] |
| **Priority** | High |

**Pre-conditions:**
- Environment is set in `configs/urls.ts` (`CURRENT_ENVIRONMENT`)
- Corp code is configured in staging if required (handled automatically by `setupCorpCodeIfNeeded`)

**Steps:**

| # | Step | Action | Expected Result |
|---|---|---|---|
| 0 | Pre-step | Run `setupCorpCodeIfNeeded` for staging | Corp code set if required |
| 1 | Navigation | Navigate to storage listing page with cache-busting param | Page loads, units are visible |
| 2 | Rent Button | Click the **RENT** button on any available unit | Navigates to single-page rent form |
| — | — | Wait 3 seconds for page to settle | — |
| 3 | Form Fill | Fill **Tenant Details**: first name, last name, email, phone, address, city, state/province, ZIP | All fields populated |
| 3 | Form Fill | Fill **Driver's License Details** (if section is present): license number, state, birth date | Fields populated or section skipped |
| 3 | Form Fill | Fill **Payment Details**: card number, expiry, CVV | Payment fields populated |
| 3 | Form Fill | Toggle all **Agreement** checkboxes | All agreements accepted |
| 4 | Submission | Click **RENT NOW** | Toast message appears |
| 4 | Submission | (Captcha sites) Pause for manual hCaptcha solve, then click RENT NOW | Captcha solved, toast appears |
| 4 | Submission | Capture toast message | Error message recorded (e.g. "Card Declined") |

**Pass Criteria:**
- The test reaches and completes the form submission step without throwing.
- A toast/error message is captured (any message, including "Card Declined", counts as a pass — it means the form submitted successfully to the payment processor).

**Fail Criteria:**
- Any step throws before reaching form submission.
- Navigation fails or the rent form cannot be reached.

**Special cases:**
- If the RENT button leads to a **Join Waitlist** flow → test is marked successful with note "No error — Join Waitlist option".
- If the toast contains `"Alternate contact must have a first name, last name, and address"` → result is flagged with `[NEEDS ATTENTION]` in the output.

---

## Result Files

| File | Contents |
|---|---|
| `test-results/singlepage-results.json` | Consolidated results for all clients (written after all workers finish) |
| `test-results/singlepage-results/[client].json` | Per-client result file (written immediately after each test) |

---

## How to Run

```bash
# All SPC clients
npx playwright test tests/rentReserveSPC-validation.spec.ts

# Specific client (filter by URL substring)
npx playwright test tests/rentReserveSPC-validation.spec.ts --grep "first-storage"
```

---

## Adding a New SPC Client

1. Add the location URL to `SINGLE_PAGE_RENT_URLS` in `configs/urls.ts` (staging & production).
2. Add `URL → FMS` mapping to `SINGLE_PAGE_FMS_PLATFORM`.
3. If hCaptcha appears on the **RENT NOW** button: add URL to `CAPTCHA_CUSTOMER_URLS`.
4. If hCaptcha appears on **Step 4** (before "Continue"): add URL to `STEP_FOUR_CAPTCHA_URLS`.

## Disabling a Client Temporarily

Comment out the URL in all four of the above arrays.
