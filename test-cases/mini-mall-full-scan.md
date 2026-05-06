# Test Case: Mini Mall Full Location Scan

**Spec file:** `tests/miniMallFullScan.spec.ts`  
**Status:** Active (run on-demand)  
**Environment:** Production only (`https://minimallstorage.com`)  
**Recommended run:** After a Yardi / SiteLink FMS sync update  
**Timeout:** No hard limit (discovery + scanning 100+ locations can take several minutes)

---

## Overview

A standalone, on-demand scan that discovers **every Mini Mall Storage facility page** by crawling the site's navigation, then for each discovered facility runs **TWO** checks back-to-back on the same loaded page:

1. **Unit feature conflict detection** — flags any unit showing contradictory labels (e.g. "Climate Controlled" + "Non-Climate Controlled" on the same unit).
2. **Image / carousel verification** — confirms every image in the page's TOP CAROUSEL, UNIT IMAGES and BOTTOM IMAGES sections actually loaded (no 404s / broken images).

This test is intentionally separate from `uiComponents-validation.spec.ts`. The UI components suite covers a targeted set of known critical locations; this suite covers the entire Mini Mall portfolio for both feature conflicts and image health in one pass.

---

## Discovery Strategy

The crawler starts from two aggregate pages and works down:

| Level | Pages Crawled | Purpose |
|---|---|---|
| 0 | `/storage-units-united-states`, `/storage-units-canada` | Collect all facility URLs directly |
| 1 | State/province hub pages (skipped) | Already captured in Level 0 |

Facility URL pattern (required for a URL to be included):  
`/storage-units/[state]/[city]/[facility-slug]` — exactly 3 path segments after `/storage-units/`.

---

## Conflicting Feature Pairs Detected

| Pair | Rule |
|---|---|
| `Climate Controlled` + `Non-Climate Controlled` | A unit cannot be both |
| `Covered` + `Uncovered` | A unit cannot be both |
| `Drive Up` + `Interior Hallway` | Mutually exclusive access types |
| `Heated` + `Non-Heated` | A unit cannot be both |

The detection logic masks the longer string (e.g. `Non-Climate Controlled`) from the row text before checking for the shorter string (`Climate Controlled`) to avoid false positives from substring matching.

---

## Test Cases

### TC-MM-01 — Discover All Mini Mall Facility URLs

| Field | Value |
|---|---|
| **Test ID** | TC-MM-01 |
| **Type** | Setup / Discovery |
| **Priority** | High |

**Steps:**

| # | Action | Expected Result |
|---|---|---|
| 1 | Navigate to `minimallstorage.com/storage-units-united-states` | Page loads |
| 2 | Navigate to `minimallstorage.com/storage-units-canada` | Page loads |
| 3 | Extract all `<a href>` links matching the facility URL pattern | Facility URL list is populated |
| 4 | Log count of discovered facilities | Progress written to `scan-progress.txt` |

**Pass Criteria:** At least one facility URL is discovered.

---

### TC-MM-02 — Unit Feature Conflict Detection (per facility)

One test case is generated per discovered facility URL.

| Field | Value |
|---|---|
| **Test ID** | TC-MM-02-[facility-slug] |
| **Priority** | High |

**Steps:**

| # | Action | Expected Result |
|---|---|---|
| 1 | Navigate to the facility listing page | Page loads within 15s |
| 2 | Find all unit rows (`.listviewrows`) | Row elements located |
| 3 | Extract text from each unit row | Text captured |
| 4 | For each conflicting pair: mask the longer string, then check for the shorter | No row contains both strings of any conflicting pair |
| 5 | Log result (`passed` / `failed` / `skipped` / `error`) | Progress appended to `scan-progress.txt` |

**Pass Criteria:** No unit row contains any conflicting feature pair.  
**Fail Criteria:** One or more unit rows contain both strings of a conflicting pair.

---

### TC-MM-03 — Image & Carousel Verification (per facility)

Runs inline on the same page load as TC-MM-02 — every discovered Mini Mall facility is image-checked, no separate run needed.

| Field | Value |
|---|---|
| **Test ID** | TC-MM-03-[facility-slug] |
| **Priority** | High |

**Sections checked on each facility page:**

| Section | Selectors |
|---|---|
| **TOP CAROUSEL** | `.carousel`, `.swiper`, `.slick-slider`, `.hero`, `[class*=banner]`, `#topSection`, `.topPagePictures` |
| **UNIT IMAGES** | `.listviewrows img`, `tr.shortableClass img`, `[class*=unit-type] img`, `.unit-listing img` |
| **BOTTOM IMAGES** | All other `<img>` not nested in `<header>`, `<nav>`, `<footer>` or any class containing `logo`/`navbar`/`header`/`footer` |

**Steps:**

| # | Action | Expected Result |
|---|---|---|
| 1 | Scroll the page top → bottom → top to trigger lazy-loaders | All lazy images get a fetch |
| 2 | For every `<img>` with an `http(s)://` src, read `complete && naturalWidth > 0 && naturalHeight > 0` | Browser confirms each image loaded |
| 3 | Group results by section, count loaded vs failed | Per-section counts captured |
| 4 | Append per-location image stats to the scan log (and a `🖼️` line under the facility's pass/fail line for any broken images) | Real-time visibility in `scan-progress.txt` and the control panel |

**Resilience:**
- **Position-based TOP fallback** — even if Storagely renames the carousel class, any `<img>` above the first unit row (and not in chrome) is still grouped as TOP CAROUSEL.
- **BOTTOM is a true catch-all** — no `<img>` is ever silently dropped from the scan.
- **Per-section dim stats** — every loaded section prints `dims minW×minH → maxW×maxH`, so a regression to 1×1 placeholders is visible across runs.
- **Tiny-image flag** — loaded images with both `naturalWidth < 30` and `naturalHeight < 30` are listed (likely placeholders) — soft warning, not a hard fail.

**Pass Criteria:** Every detected image in every section loaded (`complete && naturalWidth > 0 && naturalHeight > 0`).

**Fail Criteria (any of):**
- Any image fails to load (404, network error, decode error).
- **Structure regression** — `.listviewrows` / `tr.shortableClass` is in the DOM at any facility but the unit-image selectors found 0 images. Strong signal the unit row markup was restructured and our selectors need updating; the scan fails so the regression is caught immediately.
- Unit feature conflicts (TC-MM-02).

The Playwright test surfaces all three failure types in one consolidated message so they can be triaged together.

---

## Output

- Real-time progress is written to `scan-progress.txt` (readable while the test is running).
- Final summary is printed to the terminal after all locations are scanned, showing:
  - Total locations scanned
  - **Unit Conflicts** — Passed / Failed / Skipped / Error counts + details of any conflicting units
  - **Image / Carousel** — Passed / Failed counts, total images checked vs loaded, and per-location section breakdown (TOP CAROUSEL / UNIT IMAGES / BOTTOM IMAGES)
  - Per-location list of every broken image with section, src and alt text — grouped together for one-pass fixing

---

## How to Run

```bash
npx playwright test tests/miniMallFullScan.spec.ts --project=chrome
```

---

## Notes

- This test is **not** meant to run in CI on every commit due to the time it takes.
- The `scan-progress.txt` file is truncated at test start and written to incrementally so progress is visible in real time.
- Locations that time out or return a network error are recorded as `error` (not `failed`) and do not block the rest of the scan.
