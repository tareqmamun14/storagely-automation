# Flex V4 Test Automation

## What this tests

Storagely's **Flex / V4** site builder. Two surfaces:

1. **Editor** — `sites.apps.mystoragely.com` — where pages are authored from components + template tokens
2. **Published live sites** — e.g. `safeguard.test.getstoragely.com` — what the customer sees

V4 is becoming the entire product pipeline (zero code deployments). Tests must be **layout-tolerant** and **config-agnostic** — semantic locators, parameterized by facility, never hardcoded CSS paths.

## Architecture

```
flex/
  configs/
    urls.ts           Editor + live site URLs
    credentials.ts    Login creds (password via FLEX_PASSWORD env var only)
    facilities.ts     Facility registry — all live tests parameterize over this
    components.ts     Editor palette — 54 components across 6 categories
    profiles.ts       Per-client template profiles (nav, rent handoff) + DEFAULT
    sections.ts       Section-detector manifest (drives panel checkboxes)
    issueDb.ts        Known-issue gate (reads ../issue-db/issues.json)
    anomalyPolicy.ts  Anomaly classification (FMS vs product) + thresholds
    known-anomalies.json  Curated acknowledged data quirks (committed)
    exploratoryCatalog.ts Rotating industry-aware probes (info-only)
    locationPool.ts   Location pools + FLEX_SAMPLE random sampling
  issue-db/
    issues.json       COMMITTED issue database — triaged in the control panel's
                      "Issues & Coverage" card; the journey demotes matching
                      informed/acknowledged/false-flag failures to tagged info
                      (red run = something NEW). Suite auto-files, humans triage.
  pages/
    FlexLoginPage    Login form driver
    FlexEditorPage   Editor: palette, sidebar tabs, preview iframe
    LiveFacilityPage  Live site: units, Rent Now, sections, token audit
    SpcCheckoutEntryPage  /step-four handshake verification (no submit)
    YardiCheckoutStartPage /yardi/start handshake + full Yardi drive
  tests/
    setup/            Auth storageState capture (runs once)
    e2e/              P0: facility-journey.spec.ts — the UNIFIED journey.
                      ONE browser per facility, top-down: page health → sections
                      → reserve modal → MANDATORY rent flow (last — navigates
                      away to V2 SPC). Mirrors V1/SPC.
    live/             sections/*.spec.ts — per-section detectors for the SLOWER
                      "each as own test" pinpoint mode (one browser per section).
                      visual/ — screenshot baselines.
    editor/           P2: Editor smoke, palette inventory, preview iframe
```

### One browser per customer (the V1/SPC pattern)

`facility-journey.spec.ts` is the headline layer and the single source of truth
for the control-panel run. For each facility it opens **one** browser, navigates
**once**, then runs every selected check **top-down in that same page** — exactly
like `tests/rentReserveSPC-validation.spec.ts` loops one customer per test. The
control panel's "Journey Steps" checkboxes are STEPS of this one flow (via the
`FLEX_LAYERS` env var: `health`, `sections`, `rent`), not separate browsers. The
order is: health → sections (incl. Anomaly Scan + Exploratory Probe) → reserve
modal → rent flow (always last, because it navigates away from the listing page
to checkout). Adding a customer = one row in `facilities.ts` → one more browser,
run identically. A clean per-customer test report (terminal + JSON + Markdown)
is generated at the end of each journey.

**Rent depth — `FLEX_RENT_MODE`** (default: prod→`handshake`, test→`full`):
- `handshake` — autonomous-safe: click Rent → verify the checkout ENTRY rendered
  with the right unit (URL unit id, tenant form, move-in charges; Yardi:
  summary + tenant form + captcha gate) → stop. No fill, no captcha, no submits
  against a live FMS — so reserve+rent coverage runs on EVERY regression.
- `full` — user-present: drive the checkout to submit (SPC test-card decline /
  Yardi outcome fetch), pausing for manual captcha where prod gates it.

**Known-issue gate** (`configs/issueDb.ts` + `issue-db/issues.json`): failures
matching a triaged issue (informed / acknowledged / false-flag) are demoted to
tagged info-passes — a RED journey always means something NEW. Statuses are
managed in the control panel's 🐞 Issues & Coverage card (which also auto-files
new failures + exploratory findings, per client). `fixed` re-arms the check.

The old layout (rent-journey + page-health + all-sections as separate specs)
spawned ~13 browsers per facility and never ran the full rent flow — replaced.

## 3 Playwright projects

| Project | Auth | Matches | Purpose |
|---------|------|---------|---------|
| `setup` | none | `setup/**/*.setup.ts` | Captures editor storageState |
| `editor` | storageState | `editor/**/*.spec.ts` | Editor tests (depends on setup) |
| `live` | none | `live/**/*.spec.ts`, `e2e/**/*.spec.ts` | Live site + E2E journeys |

## Running tests

```bash
# All flex tests (setup runs first automatically)
npx playwright test --config=flex/playwright.config.ts

# Just live site + E2E (no login needed)
npx playwright test --config=flex/playwright.config.ts --project=live

# Just editor tests (setup runs first)
npx playwright test --config=flex/playwright.config.ts --project=editor

# The unified facility journey (one browser per facility, top-down)
npx playwright test --config=flex/playwright.config.ts --project=live --grep "Flex Facility Journey"
```

**Password**: Set `FLEX_PASSWORD` env var before running. The control panel handles this automatically.

## Adding coverage

- **New facility**: Add entry to `configs/facilities.ts` — all live + E2E tests auto-run against it
- **New component found in editor**: Add to `configs/components.ts` — palette inventory test catches drift
- **New test layer**: Create folder under `tests/`, add `testMatch` pattern to `playwright.config.ts`
- **New exploratory probe**: Add to `configs/exploratoryCatalog.ts` — the rotation picks it up next run

### Onboarding a NEW Flex client (when a prod URL is handed over)

An unknown host already runs with safe defaults (standard/Safeguard-baseline
template via `DEFAULT_PROFILE`) — paste the URL as the panel's Ad-hoc URL for a
first read. To onboard properly:

1. `configs/facilities.ts` — `clientForUrl()`: map the hostname → client slug;
   add one `env: 'production'` facility row (+ features via `featuresForClient`).
2. `configs/profiles.ts` — add a profile ONLY for real template deltas
   (nav items, rent CTA text, handoff); otherwise DEFAULT_PROFILE covers it.
3. `configs/locationPool.ts` — seed 2–3 known location URLs (enables FLEX_SAMPLE).
4. Journey `SPC_CONFIG_BY_CLIENT` (facility-journey.spec.ts) — captcha/add-on
   config if the client's FULL checkout drive differs.
5. Run the journey against the URL; triage anything new in the panel's
   🐞 Issues & Coverage card (FMS data quirks → `known-anomalies.json`).
6. Control panel picks up the client automatically (labels in `FLEX_CLIENT_LABELS`).

## Rules

- Selectors live in page objects, never in test files
- All live-site locators use semantic selectors (role + text, not CSS class)
- Rent-flow boundary: `handshake` stops at the checkout ENTRY; `full` drives
  checkout ONLY through the shared legacy drivers (`RentalDetailsPage_SPC`,
  `MiniMallRentalPage`) — never re-implement checkout inside flex/
- Password goes through env var only — never hardcode to disk
- The manifest (`components.ts`, `facilities.ts`, `sections.ts`) is the source of truth
- Issue triage lives in `issue-db/issues.json` (committed) — the suite
  auto-files but NEVER auto-triages; humans change statuses (panel buttons)
