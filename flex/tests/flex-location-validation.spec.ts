import { test, expect } from '@playwright/test';
import { FlexLocationPage } from '../pages/FlexLocationPage';
import { getFlexClientSites } from '../configs/urls';

const sites = getFlexClientSites();
const customUrl = process.env.FLEX_CUSTOM_URL?.trim();
if (customUrl) {
  sites.push({ url: customUrl, label: 'Custom URL' });
}

test.describe('Flex v4 — Location Page Validation', () => {

  for (const site of sites) {
    test(`${site.label} — page loads and shows units`, async ({ page }) => {
      const locationPage = new FlexLocationPage(page);

      await locationPage.goto(site.url);
      await locationPage.verifyPageLoaded();
      await locationPage.verifyHasStorageUnits();
      await locationPage.verifyHasRentButtons();
    });
  }

});
