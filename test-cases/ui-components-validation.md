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
| Smart Self Storage Ohio | <span style="color: white; background: #27ae60; border-radius: 4px; padding: 2px 6px; font-size: 90%;">SITELINK</span> |
| Storage Star | |
| Sunbird Storage | |
| Bluebird Storage | |
| Gatekeeper Self Storage | <span style="color: white; background: #27ae60; border-radius: 4px; padding: 2px 6px; font-size: 90%;">SITELINK</span> |
| Red Rocks Self Storage | <span style="color: white; background: #27ae60; border-radius: 4px; padding: 2px 6px; font-size: 90%;">SITELINK</span> |
| Distinct Storage | |
| Rhino Storage | |
| Storage Boss | |
| Mini Mall Storage ⭐ | |
| Storsafe Self Storage | <span style="color: white; background: #27ae60; border-radius: 4px; padding: 2px 6px; font-size: 90%;">SITELINK</span> |

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

## Module 7a — Filter Verification

**Test describe:** `[Location Page] Filter Validation`

### TC-UI-07a — Filter Verification (per location)

| Field | Value |
|---|---|
| **Test ID** | TC-UI-07a-[LocationLabel] |
| **Priority** | High |

**Description:**
Dynamically discovers all filter dropdowns on the location page, applies the first available option in each, verifies that the visible unit count changes accordingly, then resets all filters and confirms all units are restored.

**Steps:**

| # | Action | Expected Result |
|---|---|---|
| 1 | Navigate to the location page | Page loads |
| 2 | Verify filter UI is present (`#filterArea`, `#resetButton`) | Filter UI elements found |
| 3 | Discover all filter dropdowns dynamically | At least one filter dropdown found (if present) |
| 4 | For each filter: select first option, verify visible unit count | Unit count decreases or all units match the filter |
| 5 | Reset all filters | All units are visible again |

**Pass Criteria:**
- Each filter option applied results in a visible unit count ≤ baseline and > 0.
- After reset, all units are visible (matches baseline count).

**Fail Criteria:**
- No units are visible after applying a filter.
- Filtered count exceeds baseline.
- After reset, not all units are restored.

---

## Module 7b — Sort Verification

**Test describe:** `[Location Page] Sort Validation`

### TC-UI-07b — Sort Verification (per location)

| Field | Value |
|---|---|
| **Test ID** | TC-UI-07b-[LocationLabel] |
| **Priority** | High |

**Description:**
Dynamically discovers all sort options on the location page, applies each one, and verifies that the displayed units are sorted correctly by price or size in the expected direction (ascending/descending).

**Steps:**

| # | Action | Expected Result |
|---|---|---|
| 1 | Navigate to the location page | Page loads |
| 2 | Discover all sort options dynamically | At least one sort option found |
| 3 | For each sort option: apply sort, read visible units, verify order | Units are sorted as expected (asc/desc by price/size) |
| 4 | Log summary of sort results | Summary printed |

**Pass Criteria:**
- All sort options, when applied, result in the correct order of units (by price or size, asc/desc as labeled).

**Fail Criteria:**
- Any sort option produces an incorrect order.
- No sort options found when expected.

---

## Module 8 — Image & Carousel Validation (Production only, one-per-FMS smoke)

**Test describe:** `[Location Page] Image & Carousel Validation`

### TC-UI-08 — Location Image & Carousel Verification (per FMS)

| Field | Value |
|---|---|
| **Test ID** | TC-UI-08-[FMS-Location] |
| **Priority** | High |
| **Environment** | **Production only** — entire module is skipped in staging (staging serves placeholder images that 404 and produce false positives) |

**Locations tested — one representative per FMS** (kept minimal so standard UI runs stay fast):

| FMS      | Sample location                                  | URL |
|----------|--------------------------------------------------|-----|
| storEDGE | Distinct Storage — New Milford, CT               | `distinctstorage.com/storage-units/connecticut/new-milford/kent-road` |
| SiteLink | Bluebird Storage — Calgary, AB                   | `bluebirdstorage.ca/storage-units/alberta/calgary/mayland` |
| SSM      | Storage Star — Colorado Springs, CO              | `www.storagestar.com/storage-units/colorado/colorado-springs/aerotech-drive` |
| Yardi    | ⭐ Mini Mall Storage — Birmingham, AL             | `minimallstorage.com/storage-units/alabama/birmingham/richard-arrington-jr-blvd` |

For exhaustive coverage of **every facility URL of every client**, run the dedicated **All Pages — All Clients** suite in the control panel ([tests/allLocationsScan.spec.ts](../tests/allLocationsScan.spec.ts)). Mini Mall has its own dedicated full scan ([tests/miniMallFullScan.spec.ts](../tests/miniMallFullScan.spec.ts)). Both auto-include the same image + carousel checks per discovered location.

**Sections checked on each page:**

| Section | Selectors / Rule |
|---|---|
| **TOP CAROUSEL** | (1) Selector match: `.carousel`, `.swiper`, `.slick-slider`, `.hero`, `[class*=banner]`, `#topSection`, `.topPagePictures`. (2) **Position fallback**: any visible `<img>` whose top is above the first `.listviewrows` row (or above 40% viewport height when no rows exist) and not in chrome — catches future carousel renames so a 404 in a re-skinned hero still reports under TOP CAROUSEL. |
| **UNIT IMAGES** | `.listviewrows img`, `tr.shortableClass img`, `[class*=unit-type] img`, `.unit-listing img` |
| **BOTTOM IMAGES** | Every remaining `<img>` not in TOP/UNITS, EXCLUDING those nested in `<header>`, `<nav>`, `<footer>` or any element whose class contains `logo`/`navbar`/`header`/`footer`. This is a true catch-all so no `<img>` is ever silently dropped. |

**Steps:**

| # | Action | Expected Result |
|---|---|---|
| 1 | Navigate to the location URL | Page loads |
| 2 | Scroll the entire page (top → bottom → top) to trigger lazy-loaders | All lazy images are requested |
| 3 | For each `<img>` element with an `http(s)://` src, read `complete && naturalWidth > 0 && naturalHeight > 0` | Browser confirms the image actually loaded (not 404/error) |
| 4 | Group every image into one of the 3 sections above | Each section has its own checked / loaded / failed counts |
| 5 | Print SECTION RESULTS — pass/fail per section + image counts | Per-section status visible in console + control panel + log file |
| 6 | If any image failed: print every failed image grouped with section, src, alt | All broken images listed in one block at bottom of test output |

**Pass Criteria:** Every detected image in every section has `complete && naturalWidth > 0 && naturalHeight > 0` AND no image's src matches a known placeholder pattern. If a page has zero detected images at all, the test fails (probable page load failure).

**Fail Criteria (any of):**
- **Network failure** — any image with an `http(s)://` src fails to load (`naturalWidth === 0` after `complete === true` — i.e. 404, network error, decode failure).
- **Placeholder fallback** — an image LOADED successfully but its src matches a known "No Image Available" pattern (e.g. `no-storage-available.png`). The bytes decoded fine, but the page is showing a generic graphic because the real unit/carousel image was missing on the backend. Patterns are listed in `PLACEHOLDER_IMAGE_PATTERNS` in [utils/imageScan.ts](../utils/imageScan.ts) — add new ones there as they're spotted.
- **Structure regression** — `.listviewrows` / `tr.shortableClass` is in the DOM but our unit-image selectors found 0 images inside them. Strong signal the unit row markup was restructured and the selectors need updating.
- Page has zero detected images across all 3 sections.

**Soft warning (does not fail the test):**
- **Tiny-image flag** — any LOADED image with both `naturalWidth < 30` and `naturalHeight < 30`. Likely a 1×1 placeholder or broken-but-decoded response. Listed in the section breakdown with dimensions and src; reviewers should confirm intent.

**Per-section dimension stats:** For every section with at least one loaded image the report prints `dims: minW×minH → maxW×maxH, avg avgW×avgH` — a sudden shift between runs (e.g. carousel went from 1920×1080 to 1×1) makes a "loaded but visually broken" placeholder visible without manual inspection.

The test prints a single consolidated list of all broken images so they can all be addressed in one pass.

**Result entry (added to `test-results/ui-components-results.json`):**
- Module: `Image & Carousel`
- Detail format: `Ver: V1|V2 | Top: X/Y | Units: X/Y | Bottom: X/Y | Total: X/Y` (and `FAILED: N | First: …` when failures exist)

**Run alone:**
```bash
npx playwright test tests/uiComponents-validation.spec.ts --grep "Image & Carousel"
```

**Control panel:** Selectable as the "Image & Carousel (PROD)" sub-module under UI Components in `control-panel/index.html`.

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
npx playwright test tests/uiComponents-validation.spec.ts --grep "Filter Validation"
npx playwright test tests/uiComponents-validation.spec.ts --grep "Sort Validation"
npx playwright test tests/uiComponents-validation.spec.ts --grep "Image & Carousel"
npx playwright test tests/uiComponents-validation.spec.ts --grep "Location Page"
```

---

## Adding a New Site

### Core modules (Home Page + Contact Page — Modules 1 & 2)

1. Add URL to `STORAGE_SITE_URLS` in `configs/urls.ts` (staging & production).
2. If the site uses Storerocket (no staging version): add domain to `STOREROCKET_SITES`.
3. If staging contact page is empty/broken: add slug to `STAGING_CONTACT_SKIP`.
4. If the site requires captcha on the contact form: add to `CONTACT_CAPTCHA_SITES`.
5. If the site's FAQ page should be skipped entirely: add domain slug to `FAQ_SKIP_SITES` in `configs/urls.ts`.
6. If the site's FAQ page uses a flat Q&A layout (no accordion): add domain slug to `FAQ_NO_ACCORDION_SITES` in `tests/uiComponents-validation.spec.ts`.

### Location page modules (Modules 5, 6, 7)

7. **Unit Pricing Validation (Module 5):** To test that promo prices are lower than standard prices on a location page, add an entry to `PRICING_VALIDATION_LOCATIONS` in `configs/urls.ts` with `label`, `url`, `fms`, and `version`.
8. **Unit Feature Conflict Detection (Module 6):** To scan a location for contradictory feature labels (e.g. a Yardi or SiteLink FMS sync issue), add an entry to `UNIT_FEATURES_CONFLICT_LOCATIONS` in `configs/urls.ts`.
9. **Filter & Sort Validation (Modules 7a & 7b):** To test filter dropdowns and sort options on a location page, add an entry to `FILTER_TEST_CLIENTS` in `tests/uiComponents-validation.spec.ts`. Both the filter and sort modules share this list.
10. **Image & Carousel Validation (Module 8):** Pulls automatically from `CUSTOMER_URLS` (V1) and `SINGLE_PAGE_RENT_URLS` (V2) production lists — adding any new client to either list automatically enrolls it in image/carousel coverage. The module is **production-only** and skipped in staging. Mini Mall coverage runs separately in `tests/miniMallFullScan.spec.ts` (every discovered facility is image-checked there).
