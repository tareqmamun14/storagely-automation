# Test Case: All Locations — Full Scan (All Clients, All Pages)

**Spec file:** [tests/allLocationsScan.spec.ts](../tests/allLocationsScan.spec.ts)
**Status:** Active (run on-demand via control panel)
**Environment:** **Production only** — skipped under staging
**Recommended run:** Before releases / after platform-wide changes
**Timeout:** No hard limit — full scan typically takes 20–60 minutes

---

## Overview

For **every Storagely client** (V1 + V2, excluding Mini Mall and Storerocket sites), this spec:

1. **Crawls each client's site** to discover every facility URL.
2. **For each discovered location**, runs two checks back-to-back on the same page load:
   - **Image & Carousel scan** (TOP CAROUSEL / UNIT IMAGES / BOTTOM IMAGES) — detects 404s, decode errors, AND placeholder fallbacks like `no-storage-available.png`.
   - **Unit Feature Conflict scan** — same conflicting-pair list as Mini Mall scan (Climate vs Non-Climate, Covered vs Uncovered, etc.).
3. **Reports** per-client summaries plus a grand total, with a detailed failure dump showing every broken/placeholder image grouped by location.

Mini Mall is excluded from this scan because it has its own dedicated, optimized full scan ([tests/miniMallFullScan.spec.ts](../tests/miniMallFullScan.spec.ts)) that uses dedicated US/Canada aggregate pages instead of the per-client crawl. Storerocket-fronted sites (`ulok.com`) are excluded because they're external pages without our normal carousel/units markup.

---

## Why This Is a Separate Suite (Opt-In)

The standard UI Components run in the control panel keeps the **Image & Carousel** module to **one location per FMS** (4 tests total) so it stays fast — that's the smoke test. This All Pages suite is the exhaustive sweep: 12+ clients × 5–30 locations each = 60–300+ facility scans. At ~15 seconds per scan, total runtime is 20–60 minutes.

Run it from the control panel by ticking **"All Pages — All Clients"** under the suite list. Run it manually via:

```bash
npx playwright test tests/allLocationsScan.spec.ts --project=chrome
```

---

## Discovery Strategy (per client)

| Level | Pages crawled                                | Purpose |
|-------|----------------------------------------------|---------|
| 0     | The client's homepage                        | Collect all `/storage-units/state/city/slug` 3-segment links + hub links |
| 1     | First 25 hub URLs found at Level 0           | `/storage-units-XX`, `/locations`, `/find-storage`, `/our-locations` — gathers any facility URLs only reachable via these pages |

Hub crawl is bounded to 25 pages per client to keep discovery time predictable.

Facility URL pattern: `/storage-units/[state-or-province]/[city]/[facility-slug]` — exactly 3 path segments after `/storage-units/`. Same convention used by `miniMallFullScan.spec.ts`.

---

## Test Cases

### TC-AL-01 — Discover Facility URLs (per client)

| Field | Value |
|---|---|
| **Test ID** | TC-AL-01-[client] |
| **Type** | Setup / Discovery |

**Steps:**
1. Navigate to client homepage.
2. Collect every `<a href>` matching the facility-URL pattern.
3. Collect every hub URL; visit up to 25 of them; collect any additional facility URLs.
4. Dedupe and report count.

**Pass Criteria:** Discovery completes without throwing. Empty discovery is allowed (some clients have a single location served from the homepage).

---

### TC-AL-02 — Image & Carousel Verification (per facility)

Same logic as Module 8 in `uiComponents-validation.spec.ts` — backed by [utils/imageScan.ts](../utils/imageScan.ts). See [ui-components-validation.md](./ui-components-validation.md) for full pass/fail criteria, section selectors, and placeholder-pattern handling.

**Failure types reported:**

| Kind          | What it means | How it's detected |
|---------------|---------------|--------------------|
| `NETWORK`     | 404 / decode error | `complete === true && naturalWidth === 0` |
| `PLACEHOLDER` | Loaded fine but src matches a known "No Image Available" pattern | `src.toLowerCase()` contains any of `PLACEHOLDER_IMAGE_PATTERNS` (e.g. `no-storage-available`) |
| `STRUCTURE REGRESSION` | `.listviewrows` exists in DOM but 0 unit images detected | Selectors likely outdated — update `utils/imageScan.ts` |

---

### TC-AL-03 — Unit Feature Conflict Detection (per facility)

Same logic as `miniMallFullScan.spec.ts` TC-MM-02 — backed by [utils/unitConflictScan.ts](../utils/unitConflictScan.ts). Conflicting feature pairs are sourced from `CONFLICTING_FEATURE_PAIRS` so updates roll out everywhere at once.

---

## Output

- Real-time per-location progress is written to `all-locations-scan.txt` (readable while the test is running).
- Final report includes:
  - **Per-client section** — facilities count, conflict-failure count, image-failure count (broken into network + placeholder), structure-regression count, load-error count.
  - **Grand totals** — the same aggregated across all clients.
  - **Detailed failure dump** — every failing location with its URL, every conflicting unit, every broken image grouped by section + kind (NETWORK or PLACEHOLDER) with src + alt.

---

## How to Run

Via the control panel: tick **"All Pages — All Clients"** under the suite list, then **Run**.

Manually:

```bash
npx playwright test tests/allLocationsScan.spec.ts --project=chrome
```

---

## Adding a New Client

Add the client's homepage URL to `STORAGE_SITE_URLS` in [configs/urls.ts](../configs/urls.ts). It will be picked up automatically on the next run. To exclude a client, add its hostname slug to `STOREROCKET_SITES` (treated as "no compatible markup → skip") or hardcode a filter in the spec.

---

## Notes

- The scan is **production-only** — staging serves placeholder images that 404 and would produce noise.
- Per-location load uses `domcontentloaded` + 800ms settle, then `scanPageImages` (which scrolls top→bottom→top to trigger lazy loaders + waits 2.5s).
- Discovery failures for a single client do not block scanning of other clients — they're reported per-client.
- The single Playwright test fails if any client has any failure (so CI catches regressions); the full report sits above the assertion failure for triage.
