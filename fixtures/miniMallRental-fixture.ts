import { test as base } from '@playwright/test';
import { StorageListingPage } from '../pages/StorageListingPage';
import { MiniMallRentalPage } from '../pages/MiniMallRentalPage';
import { getCompanyNameFromUrl } from '../configs/urls';

type MiniMallRentalFixtures = {
  storageListingPage: StorageListingPage;
  miniMallRentalPage: MiniMallRentalPage;
  companyNameFromUrl: (url: string) => string;
};

export const test = base.extend<MiniMallRentalFixtures>({
  storageListingPage: async ({ page }, use) => {
    await use(new StorageListingPage(page));
  },

  miniMallRentalPage: async ({ page }, use) => {
    await use(new MiniMallRentalPage(page));
  },

  companyNameFromUrl: async ({}, use) => {
    await use(getCompanyNameFromUrl);
  },
});
