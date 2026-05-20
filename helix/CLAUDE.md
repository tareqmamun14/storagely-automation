# Helix V4 Test Automation

## What this tests

Storagely's **Helix / V4** site builder. Two surfaces:

1. **Editor** — `sites.apps.mystoragely.com` — where pages are authored from components + template tokens
2. **Published live sites** — e.g. `safeguard.test.getstoragely.com` — what the customer sees

V4 is becoming the entire product pipeline (zero code deployments). Tests must be **layout-tolerant** and **config-agnostic** — semantic locators, parameterized by facility, never hardcoded CSS paths.

## Architecture

```
helix/
  configs/
    urls.ts           Editor + live site URLs
    credentials.ts    Login creds (password via HELIX_PASSWORD env var only)
    facilities.ts     Facility registry — all live tests parameterize over this
    components.ts     Editor palette — 54 components across 6 categories
  pages/
    HelixLoginPage    Login form driver
    HelixEditorPage   Editor: palette, sidebar tabs, preview iframe
    LiveFacilityPage  Live site: units, Rent Now, sections, token audit
  tests/
    setup/            Auth storageState capture (runs once)
    e2e/              P0: Full rent journey (land → browse → Rent Now → V2 handoff)
    live/             P0/P1: Page health, token audit, V2 URL validation
    editor/           P2: Editor smoke, palette inventory, preview iframe
```

## 3 Playwright projects

| Project | Auth | Matches | Purpose |
|---------|------|---------|---------|
| `setup` | none | `setup/**/*.setup.ts` | Captures editor storageState |
| `editor` | storageState | `editor/**/*.spec.ts` | Editor tests (depends on setup) |
| `live` | none | `live/**/*.spec.ts`, `e2e/**/*.spec.ts` | Live site + E2E journeys |

## Running tests

```bash
# All helix tests (setup runs first automatically)
npx playwright test --config=helix/playwright.config.ts

# Just live site + E2E (no login needed)
npx playwright test --config=helix/playwright.config.ts --project=live

# Just editor tests (setup runs first)
npx playwright test --config=helix/playwright.config.ts --project=editor

# Specific test file
npx playwright test --config=helix/playwright.config.ts tests/e2e/rent-journey.spec.ts
```

**Password**: Set `HELIX_PASSWORD` env var before running. The control panel handles this automatically.

## Adding coverage

- **New facility**: Add entry to `configs/facilities.ts` — all live + E2E tests auto-run against it
- **New component found in editor**: Add to `configs/components.ts` — palette inventory test catches drift
- **New test layer**: Create folder under `tests/`, add `testMatch` pattern to `playwright.config.ts`

## Rules

- Selectors live in page objects, never in test files
- All live-site locators use semantic selectors (role + text, not CSS class)
- Stop at V2 handoff URL — do not drive V2 checkout forms from helix tests
- Password goes through env var only — never hardcode to disk
- The manifest (`components.ts`, `facilities.ts`) is the source of truth
