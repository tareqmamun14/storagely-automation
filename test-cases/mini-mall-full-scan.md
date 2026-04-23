# Test Case: Mini Mall Full Location Scan

**Spec file:** `tests/miniMallFullScan.spec.ts`  
**Status:** Active (run on-demand)  
**Environment:** Production only (`https://minimallstorage.com`)  
**Recommended run:** After a Yardi / SiteLink FMS sync update  
**Timeout:** No hard limit (discovery + scanning 100+ locations can take several minutes)

---

## Overview

A standalone, on-demand scan that discovers **every Mini Mall Storage facility page** by crawling the site's navigation, then checks each unit listing for contradictory feature label pairs (e.g. a unit showing both "Climate Controlled" and "Non-Climate Controlled" simultaneously).

This test is intentionally separate from `uiComponents-validation.spec.ts`. The UI components suite covers a targeted set of known critical locations; this suite covers the entire portfolio.

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

## Output

- Real-time progress is written to `scan-progress.txt` (readable while the test is running).
- Final summary is printed to the terminal after all locations are scanned, showing:
  - Total locations scanned
  - Passed / Failed / Skipped / Error counts
  - Details of any conflicting units found

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
