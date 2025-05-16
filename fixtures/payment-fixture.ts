// fixtures/payment-fixture.ts

import { test as base } from '@playwright/test';
import { AdminLoginPage } from '../pages/AdminLoginPage';
import { StorageListingPage } from '../pages/StorageListingPage';
import { RentalDetailsPage } from '../pages/RentalDetailsPage';
import { PaymentDetailsPage } from '../pages/PaymentDetailsPage';
import { getCompanyNameFromUrl } from '../configs/urls';

// Define the fixture type
type PaymentFixtures = {
  adminLoginPage: AdminLoginPage;
  storageListingPage: StorageListingPage;
  rentalDetailsPage: RentalDetailsPage;
  paymentDetailsPage: PaymentDetailsPage;
  companyNameFromUrl: (url: string) => string;
};

// Extend the base test with our fixture
export const test = base.extend<PaymentFixtures>({
  // Initialize page objects 
  adminLoginPage: async ({ page }, use) => {
    await use(new AdminLoginPage(page));
  },
  
  storageListingPage: async ({ page }, use) => {
    await use(new StorageListingPage(page));
  },
  
  rentalDetailsPage: async ({ page }, use) => {
    await use(new RentalDetailsPage(page));
  },
  
  paymentDetailsPage: async ({ page }, use) => {
    await use(new PaymentDetailsPage(page));
  },
  
  // Helper functions
  companyNameFromUrl: async ({}, use) => {
    await use(getCompanyNameFromUrl);
  }
});