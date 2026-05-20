import { test, expect } from '@playwright/test';
import { LiveFacilityPage } from '../../pages/LiveFacilityPage';
import { getAllFacilities } from '../../configs/facilities';

const facilities = getAllFacilities();

test.describe('Live Page Health', () => {
  for (const facility of facilities) {
    test.describe(facility.name, () => {

      test('page loads with expected title', async ({ page }) => {
        const livePage = new LiveFacilityPage(page);
        await livePage.goto(facility.url);
        await livePage.expectPageLoaded();
        await livePage.expectTitleMatches(facility.expectedTitle);
      });

      test('facility heading is visible', async ({ page }) => {
        const livePage = new LiveFacilityPage(page);
        await livePage.goto(facility.url);
        await livePage.expectFacilityHeading(facility.expectedHeading);
      });

      test('no unresolved template tokens in page text', async ({ page }) => {
        const livePage = new LiveFacilityPage(page);
        await livePage.goto(facility.url);
        await livePage.expectNoUnresolvedTokens();
      });

      test('no unresolved tokens in image/link attributes', async ({ page }) => {
        const livePage = new LiveFacilityPage(page);
        await livePage.goto(facility.url);
        await livePage.expectNoUnresolvedTokensInAttributes();
      });

      test('all visible images load successfully', async ({ page }) => {
        const livePage = new LiveFacilityPage(page);
        await livePage.goto(facility.url);
        await livePage.expectAllImagesLoaded();
      });

      test('no critical console errors', async ({ page }) => {
        const livePage = new LiveFacilityPage(page);
        await livePage.goto(facility.url);
        await page.waitForTimeout(3000);
        const errors = livePage.getConsoleErrors();
        expect(errors, `Console errors:\n${errors.join('\n')}`).toHaveLength(0);
      });

      if (facility.hasUnits) {
        test('storage units are displayed with Rent Now links', async ({ page }) => {
          const livePage = new LiveFacilityPage(page);
          await livePage.goto(facility.url);
          await livePage.expectUnitsVisible();
          const hrefs = await livePage.getRentNowHrefs();
          expect(hrefs.length).toBeGreaterThan(0);
        });

        test('Rent Now URLs have valid V2 handoff format', async ({ page }) => {
          const livePage = new LiveFacilityPage(page);
          await livePage.goto(facility.url);
          const hrefs = await livePage.getRentNowHrefs();
          for (const href of hrefs) {
            LiveFacilityPage.validateRentNowUrl(href);
          }
        });
      }

      if (facility.hasReviews) {
        test('customer reviews section is visible', async ({ page }) => {
          const livePage = new LiveFacilityPage(page);
          await livePage.goto(facility.url);
          await livePage.expectReviewsSection();
        });
      }

      if (facility.hasAmenities) {
        test('amenities section is visible', async ({ page }) => {
          const livePage = new LiveFacilityPage(page);
          await livePage.goto(facility.url);
          await livePage.expectAmenitiesSection();
        });
      }

    });
  }
});
