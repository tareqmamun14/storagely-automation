// fixtures/singlepage-fixture.ts

import { test as base } from '@playwright/test';
import { StorageListingPage } from '../pages/StorageListingPage_steptwo';
import { RentalDetailsPageSinglePage } from '../pages/RentalDetailsPage_singlepage';
import { getCompanyNameFromUrl } from '../configs/urls';

// Define the fixture type for single-page rent flow
type SinglePageFixtures = {
  storageListingPage: StorageListingPage;
  rentalDetailsPageSinglePage: RentalDetailsPageSinglePage;
  companyNameFromUrl: (url: string) => string;
};

// Extend the base test with our single-page fixture
export const test = base.extend<SinglePageFixtures>({
  // Initialize page objects 
  storageListingPage: async ({ page }, use) => {
    await use(new StorageListingPage(page));
  },
  
  rentalDetailsPageSinglePage: async ({ page }, use) => {
    await use(new RentalDetailsPageSinglePage(page));
  },
  
  // Helper functions
  companyNameFromUrl: async ({}, use) => {
    await use(getCompanyNameFromUrl);
  }
});
