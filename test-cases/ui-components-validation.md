# Test Case: UI Components Validation

**Spec file:** `tests/uiComponents-validation.spec.ts`  
**Status:** Active  
**Config:** `configs/urls.ts` → `STORAGE_SITE_URLS`  
**Timeout:** 3 minutes per test  
**Environments:** Staging & Production (controlled by `CURRENT_ENVIRONMENT` in `configs/urls.ts`)

---

## Overview

A multi-module suite that verifies the core UI components across all Storagely client websites. Each module runs as its own `test.describe` block and can be run independently. Results are written to `test-results/ui-components-results.json` in real time.

---

## Sites Tested

### Staging

| Site | Notes |
|---|---|
| Smart Self Storage Ohio | — |
| Storage Star | — |
| Sunbird Storage | Contact page empty in staging |
| Bluebird Storage | Contact page empty in staging |
| Gatekeeper Self Storage | — |
| First Storage | — |
| Red Rocks Self Storage | — |
| Distinct Storage | — |
| Rhino Storage | — |
| Storage Boss | Contact page empty in staging |
| Mini Mall Storage ⭐ | — |
| Storsafe Self Storage | — |

### Production

Includes all of the above plus **ULok** (Storerocket — prod only, skipped in staging) and **Storsafe**.

---

## Module 1 — Home Page Verification

**Test describe:** `[Home Page] Landing Page Verification`

### TC-UI-01 — Landing Page Verification (per site)

| Field | Value |
|---|---|
| **Test ID** | TC-UI-01-[SiteName] |
| **Priority** | High |

**Steps:**

| # | Action | Expected Result |
|---|---|---|
| 1 | Clear cookies | Clean session |
| 2 | Navigate to site URL with cache-busting param | Page loads |
| 3 | Run `verifyLandingPage(url)` | All expected landing page elements are present |

**Pass Criteria:** Landing page verification passes for the site.  
**Skip condition:** Site uses Storerocket (no staging equivalent).

---

## Module 2 — Contact Page Full Verification

**Test describe:** `[Contact Page] Full Verification`

### TC-UI-02 — Contact Page Verification & Form Submission (per site)

| Field | Value |
|---|---|
| **Test ID** | TC-UI-02-[SiteName] |
| **Priority** | High |

**Steps:**

| # | Action | Expected Result |
|---|---|---|
| 1 | Navigate to the site's contact page | Page loads |
| 2 | Verify contact page elements are present | At least one contact element found |
| 3 | (Production only) Fill and submit contact form | Form fields filled; submission attempted |
| 4 | (Production only) Verify submission outcome | Success confirmation message appears |

**Pass Criteria (Production):** Form submits successfully and a confirmation message is displayed.  
**Pass Criteria (Staging):** Contact page elements are present (form submission skipped).  
**Skip conditions:**
- Storerocket sites (skipped in staging).
- Sites in `STAGING_CONTACT_SKIP` — contact page is empty or unavailable in staging.

**Captcha handling:** Sites in `CONTACT_CAPTCHA_SITES` receive unlimited timeout to allow manual captcha solving.

---

## Module 3 — Storage Location Page Tests

### TC-UI-03a — Offer Text Verification

**Test describe:** `[Location Page] Verify Offer Text`

| Client | URL | Expected Text |
|---|---|---|
| First Storage — North Wilkesboro, NC | `…first-storage/…/d-street` | `Sale` |
| Mini Mall Storage ⭐ — Courtland, AL | `…mini-mall-storage/…/highway-33` | `First Month Free` |

**Steps:**

| # | Action | Expected Result |
|---|---|---|
| 1 | Navigate to the location page | Page loads |
| 2 | Search discount/offer selectors (`.page_discount`, `.offer_content`, etc.) | Element with matching text found |
| 3 | Fall back to full page text search if no selector matches | Text found anywhere in page |

**Pass Criteria:** The expected offer text is found on the page.

---

### TC-UI-03b — Debug Discount Elements (Mini Mall)

**Test describe:** `[Location Page] Debug Discount Elements`

| Field | Value |
|---|---|
| **Test ID** | TC-UI-03b |
| **Priority** | Low / Diagnostic |

Navigates to the Mini Mall Courtland, AL location and logs all elements matching discount/offer/promo/banner class selectors. This is a diagnostic test and does not have a pass/fail assertion.

---

### TC-UI-03c — Banner Loading Verification

**Test describe:** `[Location Page] Verify Banner Loading`

| Client (Staging) | Client (Production) |
|---|---|
| Radiant Storage — Montgomery, AL | *(staging only)* |
| Storage Star — Cloverdale, CA | Storage Star — Cloverdale, CA |
| Best Box Storage — Pensacola, FL | *(staging only)* |
| First Storage — East Market St, Greensboro, NC | First Storage — East Market St |
| Mini Mall Storage ⭐ — Airdrie, AB | Mini Mall Storage ⭐ — Airdrie, AB |

**Steps:**

| # | Action | Expected Result |
|---|---|---|
| 1 | Navigate to location page with cache-busting | Page loads |
| 2 | Run `checkBannerStatus()` | Banner loads without errors |

**Pass Criteria:** `bannerResult.status === 'PASSED'`.

---

## Module 4 — FAQ Page Accordion Expansion

**Test describe:** `[FAQ Page] Accordion Expansion Verification`

### TC-UI-04 — FAQ Accordion Expansion (per site)

| Field | Value |
|---|---|
| **Test ID** | TC-UI-04-[SiteName] |
| **Priority** | Medium |

**Steps:**

| # | Action | Expected Result |
|---|---|---|
| 1 | Navigate to the site's FAQ page | FAQ page found |
| 2 | Detect accordion type | Accordion type identified |
| 3 | Click the first question | Question clicked |
| 4 | Verify the answer expands | Answer is visible after click |

**Pass Criteria:** At least one FAQ accordion item expands on click.  
**Expected Fail:** `almightystorage.com` uses a flat Q&A layout (no accordion) — recorded as `EXPECTED` rather than `FAILED`.

---

## Module 5 — Unit Pricing Validation

**Test describe:** `[Location Page] Unit Pricing Validation`

### TC-UI-05 — Dual-Price Unit Validation (per location)

| Field | Value |
|---|---|
| **Test ID** | TC-UI-05-[LocationLabel] |
| **Priority** | High |

**Rule:** For units displaying two prices, the first price (promo / web rate) must be **less than** the second price (standard / after-promo rate).

**Locations tested:** Configured in `PRICING_VALIDATION_LOCATIONS` in `configs/urls.ts`. Each entry includes `label`, `url`, `fms`, and `version`.

**Steps:**

| # | Action | Expected Result |
|---|---|---|
| 1 | Navigate to the location page | Page loads |
| 2 | Find all unit rows | Units listed |
| 3 | For each unit with two prices: compare first vs second | First price < second price |
| 4 | Log summary: total units, dual-price count, valid count, invalid count | Summary printed |

**Pass Criteria:** `invalidCount === 0`.  
**Fail Criteria:** Any unit has first price ≥ second price.

---

## Module 6 — Unit Feature Conflict Detection

**Test describe:** `[Location Page] Unit Feature Conflict Detection`

### TC-UI-06 — Conflicting Feature Labels (per location)

| Field | Value |
|---|---|
| **Test ID** | TC-UI-06-[LocationLabel] |
| **Priority** | High |

**Background:** A previous bug in Yardi FMS attribute sync used substring matching, causing units to display contradictory feature labels simultaneously (e.g. "Covered" + "Uncovered"). This test guards against that regression.

**Conflicting pairs checked:**

| Pair A | Pair B | Note |
|---|---|---|
| Climate Controlled | Non-Climate Controlled | Cannot be both |
| Covered | Uncovered | Cannot be both |
| Drive Up | Interior Hallway | Mutually exclusive access types |
| Heated | Non-Heated | Cannot be both |

**Locations tested:** Configured in `UNIT_FEATURES_CONFLICT_LOCATIONS` in `configs/urls.ts` (primarily Mini Mall — Yardi & SiteLink locations).

**Steps:**

| # | Action | Expected Result |
|---|---|---|
| 1 | Navigate to the location listing page | Page loads |
| 2 | Find all unit rows (`.listviewrows`) | Rows found |
| 3 | For each row and each conflicting pair: mask the longer string, check for the shorter | Neither string found alone after masking |
| 4 | Report any conflicting units | No conflicts found |

**Pass Criteria:** No unit row contains both strings from any conflicting pair.

---

## Results File

`test-results/ui-components-results.json` — updated after each test (upsert by module + test name so retries overwrite previous failures).

---

## How to Run

```bash
# Full suite
npx playwright test tests/uiComponents-validation.spec.ts

# Single module (by grep)
npx playwright test tests/uiComponents-validation.spec.ts --grep "Home Page"
npx playwright test tests/uiComponents-validation.spec.ts --grep "Contact Page"
npx playwright test tests/uiComponents-validation.spec.ts --grep "FAQ Page"
npx playwright test tests/uiComponents-validation.spec.ts --grep "Unit Pricing"
npx playwright test tests/uiComponents-validation.spec.ts --grep "Unit Feature Conflict"
```

---

## Adding a New Site

1. Add URL to `STORAGE_SITE_URLS` in `configs/urls.ts` (staging & production).
2. If the site uses Storerocket (no staging version): add domain to `STOREROCKET_SITES`.
3. If staging contact page is empty/broken: add slug to `STAGING_CONTACT_SKIP`.
4. If the site requires captcha on the contact form: add to `CONTACT_CAPTCHA_SITES`.
