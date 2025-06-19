import { test } from '@playwright/test';
import { StorageSitePage } from '../pages/HomePage';
import { storageSiteUrls } from '../configs/urls';

test.describe('Storage Site Landing Page Verification', () => {
  // Set timeout per test (not total)
  test.setTimeout(120000); // 2 minutes per test

  for (const url of storageSiteUrls) {
    test(`Verify landing page for ${url}`, async ({ page }) => {
      const storagePage = new StorageSitePage(page);
      await storagePage.goto(url);
      await storagePage.verifyLandingPage(url);
    });
  }
});