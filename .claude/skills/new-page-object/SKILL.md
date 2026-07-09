---
name: new-page-object
description: Scaffold a new Page Object Model class (or a Flex section) following this repo's conventions. Use when adding coverage for a new page/flow/component — e.g. "create a page object for the new pricing modal", "add a POM for the waitlist flow", "scaffold a Flex footer section".
---

# Create a Page Object following repo conventions

Page Objects encapsulate all selectors and actions for a page. Match the existing files before inventing structure — read a close neighbor first (`pages/StorageListingPage.ts`, `pages/RentalDetailsPage_V1.ts`, `pages/ContactPage.ts`, or for Flex `flex/pages/sections/*.ts`).

## Conventions
- **Location**: main flows → `pages/`; Flex → `flex/pages/` (sections under `flex/pages/sections/`).
- **Naming**: PascalCase class + file, e.g. `PricingPage.ts` exporting `class PricingPage`. Flow variants get a suffix: `_V1`, `_SPC`.
- **Constructor** takes the Playwright `Page`: `constructor(private page: Page) {}`.
- **Selectors live here, nowhere else.** No raw selectors in spec files (hard repo rule). Define locators as readonly fields or getters.
- **Semantic locators**: prefer `getByRole`/`getByText` (role + text) over CSS classes; use regex for dynamic text; `.first()` for repeated rows.
- **Actions** are intention-revealing methods (`rentFirstAvailableUnit()`, `selectPrice()`), returning the next page object on navigation handoffs where that's the existing pattern.
- No `waitForNetworkIdle` / deprecated APIs. Lean on Playwright auto-waiting and web-first assertions.

## Steps
1. Read the nearest existing page object and mirror its imports, constructor, and method style.
2. Verify real selectors against the live page with the Playwright MCP (`browser_navigate` → `browser_snapshot` → `browser_generate_locator`) — don't guess.
3. Create the class; wire it into the relevant fixture (`fixtures/*-fixture.ts`) if the suite uses fixtures.
4. Add/extend the spec that uses it (specs call POM methods only).
5. Run it: `npx playwright test <spec> --project=chrome --headed`.

## Flex sections
Flex sections follow the `flex/pages/sections/*.ts` pattern and register in `index.ts` + `types.ts`; the manifest (`configs/components.ts`, `configs/facilities.ts`) is the source of truth — see [flex/CLAUDE.md](../../../flex/CLAUDE.md).
