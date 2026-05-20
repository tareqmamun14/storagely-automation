import { test, expect } from '@playwright/test';
import { HelixLocationPage } from '../pages/HelixLocationPage';
import { getHelixClientSites } from '../configs/urls';

const sites = getHelixClientSites();
const customUrl = process.env.HELIX_CUSTOM_URL?.trim();
if (customUrl) {
  sites.push({ url: customUrl, label: 'Custom URL' });
}

test.describe('Helix v4 — Location Page Validation', () => {

  for (const site of sites) {
    test(`${site.label} — page loads and shows units`, async ({ page }) => {
      const locationPage = new HelixLocationPage(page);

      await locationPage.goto(site.url);
      await locationPage.verifyPageLoaded();
      await locationPage.verifyHasStorageUnits();
      await locationPage.verifyHasRentButtons();
    });
  }

});
