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

        // 5. Click first Rent Now — verify V2 SPC checkout loads.
        //
        // IMPORTANT — we use a plain click() + waitForURL pattern, not
        // Promise.all([click, waitForURL]) (race condition) and NOT a
        // page.goto(href) fallback. page.goto() bypasses the Referer/session
        // state the V2 SPC requires and produces a false-positive "redirected
        // back to listing" failure even when the real click flow works fine.
        const targetHref = rentHrefs[0];
        const firstLink = livePage.getRentNowLinks().first();
        await firstLink.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {});
        await page.waitForTimeout(300); // tiny settle — let any layout shift complete

        const beforeUrl = page.url();
        console.log(`  [V2-SPC] target:    ${targetHref}`);
        await firstLink.click({ timeout: 15_000 });

        // Wait for the URL to reach /step-four. If the click never navigates,
        // this throws with a clear message — that IS a real failure to surface.
        try {
          await page.waitForURL(/step-four/, { timeout: 30_000 });
        } catch {
          // Click happened but URL didn't change. That's a real regression.
          throw new Error(
            `V2 SPC handoff failed: clicking Rent Now did not navigate to /step-four.\n` +
            `   before: ${beforeUrl}\n` +
            `   after:  ${page.url()}\n` +
            `   target: ${targetHref}\n` +
            `   Manual repro:\n` +
            `     1. Open ${facility.url}\n` +
            `     2. Scroll to any unit card\n` +
            `     3. Click "Rent Now"\n` +
            `     4. Expected: lands on /step-four with Tenant Details form\n` +
            `     5. Observed (in this run): URL stayed on the listing page`
          );
        }

        // V2 SPC is a SPA — wait for the checkout form to actually render.
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
        const landed = page.url();
        const bodyText = await page.locator('body').innerText();
        const bodyHead = bodyText.replace(/\n/g, ' | ').slice(0, 180);
        console.log(`  [V2-SPC] landed at: ${landed}`);
        console.log(`  [V2-SPC] body:      ${bodyHead}`);

        expect(landed, 'expected V2 SPC URL after Rent Now').toContain('/step-four');
        expect(landed, 'unit_id missing in V2 URL').toMatch(/unit_id=\d+/);

        // Contract: SPC should expose checkout-flow shape — at least one form
        // input (renter info / payment) AND tenant/checkout keyword text. We
        // don't drive V2 from here (separate suite owns that); we just verify
        // the handoff lands on a recognisable SPC page rather than a 404 / blank.
        const spcShape = await page.evaluate(() => ({
          inputCount:  document.querySelectorAll('input, select, textarea').length,
          hasStepText: /tenant|first name|last name|move-?in|payment|protection|checkout/i.test(document.body.innerText || ''),
          unitIdInUrl: new URL(location.href).searchParams.get('unit_id'),
        }));
        console.log(`  [V2-SPC] shape: inputs=${spcShape.inputCount} step-text=${spcShape.hasStepText} unit_id=${spcShape.unitIdInUrl}`);
        expect(spcShape.inputCount, 'V2 SPC should render checkout form inputs').toBeGreaterThan(0);
        expect(spcShape.hasStepText, 'V2 SPC should show tenant/move-in/payment text').toBe(true);
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
