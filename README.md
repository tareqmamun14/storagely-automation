# storagely-automation

End-to-end Playwright test automation suite for Storagely storage facility client websites. Tests cover rent flows, UI components, admin platform navigation, and FMS data sync across staging and production environments.

---

## Prerequisites

- Node.js 18+
- npm

## Setup

```bash
npm install
npx playwright install chromium
```

---

## Running Tests

### All tests (with Allure report)

```bash
node test-runner.js test
```

### Individual suites

```bash
# UI components — home, contact, FAQ, location page, pricing, filters, sort
npx playwright test tests/uiComponents-validation.spec.ts

# Single-page checkout rent flow (SPC)
npx playwright test tests/rentReserveSPC-validation.spec.ts

# Multi-step V1 rent flow
npx playwright test tests/rentReserveV1-validation.spec.ts

# Admin platform navigation
npx playwright test tests/adminPlatform-validation.spec.ts

# FMS data sync (SiteLink, storEDGE, SSM)
npx playwright test tests/data-sync-validation.spec.ts --headed

# Mini Mall full portfolio scan (on-demand)
npx playwright test tests/miniMallFullScan.spec.ts --project=chrome
```

### Run a specific module by grep

```bash
npx playwright test tests/uiComponents-validation.spec.ts --grep "Home Page"
npx playwright test tests/uiComponents-validation.spec.ts --grep "Contact Page"
npx playwright test tests/uiComponents-validation.spec.ts --grep "FAQ Page"
npx playwright test tests/uiComponents-validation.spec.ts --grep "Unit Pricing"
npx playwright test tests/uiComponents-validation.spec.ts --grep "Unit Feature Conflict"
npx playwright test tests/uiComponents-validation.spec.ts --grep "Filter Validation"
npx playwright test tests/uiComponents-validation.spec.ts --grep "Sort Validation"
npx playwright test tests/uiComponents-validation.spec.ts --grep "Location Page"
```

---

## Environment

Tests run against **staging** or **production** based on `CURRENT_ENVIRONMENT` in `configs/urls.ts`:

```ts
export const CURRENT_ENVIRONMENT: Environment = Environment.STAGING;
// or
export const CURRENT_ENVIRONMENT: Environment = Environment.PRODUCTION;
```

For data sync tests, the environment is toggled in `configs/data-sync-config.ts`:

```ts
export const CURRENT_ENV: 'stage' | 'prod' = 'stage';
```

---

## Test Reports

Generate and deploy an Allure report to GitHub Pages:

```bash
node test-runner.js test:deploy
```

Report: `https://tareqmamun14.github.io/storagely-automation`

---

## Project Structure

```
configs/        URLs, credentials, data-sync client config
fixtures/       Custom Playwright fixtures (SPC & V1 rent flows)
pages/          Page Object Models
tests/          Spec files
test-cases/     Test case documentation (Markdown)
utils/          Shared helpers: screenshots, result collectors, corp code setup
```

---

## Test Suites

| Spec file | Purpose | Status |
|---|---|---|
| `uiComponents-validation.spec.ts` | Home, Contact, FAQ, Location page (offers, banners, pricing, filters, sort, feature conflicts) | Active |
| `rentReserveSPC-validation.spec.ts` | Single-page checkout rent flow | Active |
| `rentReserveV1-validation.spec.ts` | Multi-step V1 rent flow | Active |
| `adminPlatform-validation.spec.ts` | Admin dashboard navigation & tenant context | Active |
| `data-sync-validation.spec.ts` | FMS data sync verification | Active |
| `miniMallFullScan.spec.ts` | Full Mini Mall portfolio conflict scan | On-demand |
| `admin-login.spec.ts` | Admin login & dashboard elements | Skipped — pending env readiness |

---

## Adding a New Client Site

See [`test-cases/ui-components-validation.md`](test-cases/ui-components-validation.md#adding-a-new-site) for the full checklist when onboarding a new site.
