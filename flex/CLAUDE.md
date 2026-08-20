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

**Page-aware handoff (mixed-FMS clients).** A client profile's rent handoff is
a DEFAULT, not a truth: Mini Mall has Yardi locations (`/yardi/start`) AND
SiteLink locations (`/step-four`, e.g. Sainte-Thérèse QC) on Flex. The journey
resolves each PAGE's real handoff from the live DOM
(`LiveFacilityPage.resolveRentHandoff`) and passes it to health, sections
(`ctx.handoff`), and the rent step. Sainte-Thérèse (fr-ca.minimallstorage.com)
is a SiteLink / French page — verified 2026-08-03: section headings are
English ("Customer Reviews", "Amenities", "Have a Question?") so the standard
minimall profile works; only SEO copy + H1 are French. Added to rotation.

**📝 Reservation submission (panel-toggled).** The journey's reserve step has
two depths: the read-only modal check (default), and a REAL reservation
SUBMISSION when the panel's "📝 Reservation Submissions" toggle enables a
client (`STORAGELY_RESERVATION`) — fill tenant details → submit → REQUIRE the
confirmation message (error/silence = FAIL; that bug class was revenue-
impacting on prod). Only ever runs on the client's DESIGNATED location from
`configs/reservations.ts` (rotation pins it in when enabled). Every submission
is recorded in `test-results/reservations/` with a Slack-ready cancellation
message for Jacob. Adding a client = one manifest entry in
`configs/reservations.ts`.

**Sibling cross-check** (journey step 5, auto): when a NEW section failure
survives the gate, the journey re-runs exactly those detectors on a sibling
location of the same client and attaches a verdict — `SYSTEMIC` (sibling fails
too → template/config-level) vs `PAGE-SPECIFIC` (sibling clean → local to this
page). Info-only; `FLEX_SIBLING=off` disables.

**Regression cadence — one location per client per run (rotation, DEFAULT).**
A prod regression runs ONE location per client; the NEXT regression advances
to the next location in the client's CURATED rotation list (registry rows +
committed seeds in `configs/locationPool.ts` — never the unvetted discovered
cache). Fast runs, coverage spreads run-over-run. The pick is advanced+pinned
ONCE per run by `global-setup.ts` (`test-results/run-rotation.json` +
`rotation-state.json`) so workers/retries agree. Overrides:
- Pinning (`FLEX_CUSTOM_URL` / `FLEX_FACILITY_FILTER`, or unchecking 🔄 Rotate
  in the panel) — investigations/verifications always hit the exact page.
- `FLEX_ROTATE=off` — every registry row in one run (the old default).
- `FLEX_SAMPLE=random[:N]` — wide sweep over the FULL pool incl. sitemap-
  discovered URLs (`npm run run:flex:discover` / panel 🌐 button grows it;
  robots.txt-aware). Sample picks are seed-pinned per run (`run-seed.json`).

**Growing the FIXED test pool (graduation).** The source of truth is the live
page DOM — fixed checks encode what we've LEARNED about it. The pool grows
along this path, so nothing stays ad-hoc and nothing is duplicated:
1. Exploratory probe FINDING → auto-filed as a `candidate` issue (dashboard).
2. Triage: real + worth guarding → probe gets `alwaysRun: true` (runs every
   journey, still info-only); bad probe → fix it (`false-flag` on the issue).
3. Full graduation: port the logic into the owning section detector as a
   hard-fail check, remove/retire the probe, note it on the issue.
4. Discovered-URL graduation: a sitemap URL that proved healthy can be added
   to the committed seed pool → it joins the default rotation.

**Red-run TRIAGE PROTOCOL (script bug vs product bug).** A failure is only a
product bug once the script is exonerated — never blame the page first:
1. Read the journey report: the failing check's detail + the SIBLING verdict
   (SYSTEMIC vs PAGE-SPECIFIC) + trace/screenshot artifacts.
2. Verify the live DOM (Playwright MCP: navigate → snapshot → generate
   locator) — is the element there but our selector/assumption stale?
3. Script's fault → fix the detector NOW; mark the issue `false-flag` until
   the fix lands (run stays green, dashboard shows "suite fix needed").
4. Real product bug → `informed`/`acknowledged` (+ Slack channel, comment);
   the gate keeps future runs green while the dashboard tracks it. When dev
   ships the fix → `fixed` re-arms the check.

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
