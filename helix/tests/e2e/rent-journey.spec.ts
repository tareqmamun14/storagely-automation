import { test, expect } from '@playwright/test';
import { LiveFacilityPage } from '../../pages/LiveFacilityPage';
import { getAllFacilities } from '../../configs/facilities';

const facilities = getAllFacilities();

test.describe('E2E — Rent Journey', () => {
  for (const facility of facilities) {
    test.describe(facility.name, () => {

      test('complete rent journey: land → browse → Rent Now → V2 handoff', async ({ page }) => {
        const livePage = new LiveFacilityPage(page);

        // 1. Land on facility page
        await livePage.goto(facility.url);
        await livePage.expectPageLoaded();

        // 2. Verify facility identity
        await livePage.expectFacilityHeading(facility.expectedHeading);

        // 3. Verify units are browsable
        await livePage.expectUnitsVisible();
        const rentHrefs = await livePage.getRentNowHrefs();
        expect(rentHrefs.length, 'Should have at least one rentable unit').toBeGreaterThan(0);

        // 4. Validate every Rent Now URL has correct V2 handoff format
        for (const href of rentHrefs) {
          LiveFacilityPage.validateRentNowUrl(href);
        }

        // 5. Click first Rent Now — verify V2 checkout loads
        const firstLink = livePage.getRentNowLinks().first();
        await firstLink.click();
        await page.waitForLoadState('domcontentloaded', { timeout: 30_000 });

        expect(page.url()).toContain('/step-four');
        expect(page.url()).toMatch(/unit_id=\d+/);

        // V2 checkout is a SPA — wait for the app to render rather than checking title
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
        const bodyText = await page.locator('body').innerText();
        expect(bodyText.length, 'V2 checkout page rendered content').toBeGreaterThan(0);
      });

      test('multiple units have distinct unit_ids', async ({ page }) => {
        const livePage = new LiveFacilityPage(page);
        await livePage.goto(facility.url);
        await livePage.expectUnitsVisible();

        const hrefs = await livePage.getRentNowHrefs();
        const unitIds = hrefs.map(h => new URL(h).searchParams.get('unit_id'));
        const unique = new Set(unitIds);

        if (hrefs.length > 1) {
          expect(unique.size, 'Multiple Rent Now links should point to different units').toBeGreaterThan(1);
        }
      });

    });
  }
});
