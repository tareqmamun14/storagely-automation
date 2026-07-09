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
  pages/
    FlexLoginPage    Login form driver
    FlexEditorPage   Editor: palette, sidebar tabs, preview iframe
    LiveFacilityPage  Live site: units, Rent Now, sections, token audit
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
`FLEX_LAYERS` env var: `health`, `sections`), not separate browsers. The order
is: health → sections → reserve modal → rent flow (always last, because it
navigates away from the listing page to V2 SPC). Adding a customer = one row
in `facilities.ts` → one more browser, run identically. A clean per-customer
test report (terminal + JSON + Markdown) is generated at the end of each journey.

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

## Rules

- Selectors live in page objects, never in test files
- All live-site locators use semantic selectors (role + text, not CSS class)
- Stop at V2 handoff URL — do not drive V2 checkout forms from flex tests
- Password goes through env var only — never hardcode to disk
- The manifest (`components.ts`, `facilities.ts`) is the source of truth
