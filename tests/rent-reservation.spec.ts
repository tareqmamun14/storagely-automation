// tests/payment-verification.spec.ts

import { test } from '../fixtures/payment-fixture';
import { getCurrentUrls, FMS_PLATFORM } from '../configs/urls';
import { cleanupOldErrorScreenshots, takeErrorScreenshot } from '../utils/screenshot';
import { TEST_USER } from '../configs/credentials';
import { ResultCollector } from '../utils/ResultCollector';

// Clean up old error screenshots before starting tests
cleanupOldErrorScreenshots();

// Create a result collector to track all test results
const resultCollector = new ResultCollector();

test.describe('Payment Verification Tests', () => {
  const customerUrls = getCurrentUrls().customer;
  
  for (const baseURL of customerUrls) {
    test(`Payment verification for ${baseURL}`, async ({ 
      page, 
      storageListingPage, 
      rentalDetailsPage, 
      paymentDetailsPage,
      companyNameFromUrl
    }) => {
      // Set longer timeout for these tests
      test.setTimeout(120 * 1000); // 2 minutes
      
      // Get company/client name and platform
      const companyName = companyNameFromUrl(baseURL);
      const platform = FMS_PLATFORM[baseURL] ?? 'Unknown';
      
      // Print Storage Facility URL and Platform
      console.log(`\nRunning test for Storage Facility: ${baseURL}`);
      console.log(`Company: ${companyName}`);
      console.log(`Platform: ${platform}`);
      
      try {
        // STEP 1: Navigate to the storage listing page
        await storageListingPage.navigateWithCacheBusting(baseURL);
        
        // STEP 2: Try to click the reserve button if available
        const reserveButtonText = await storageListingPage.clickReserveButtonIfAvailable();
        
        // If the button was "Join Waitlist", finish the test run
        if (reserveButtonText?.trim() === 'Join Waitlist') {
          console.log('Test finished after handling "Join Waitlist"');
          resultCollector.addResult(baseURL, companyName, platform, 'No error - Join Waitlist option', true);
          return;
        }
        
        // STEP 3: Click the rent button
        await storageListingPage.clickRentButton();
        
        // STEP 4: Fill out rental details form
        await rentalDetailsPage.fillRentalDetails({
          firstName: TEST_USER.firstName,
          lastName: TEST_USER.lastName,
          email: TEST_USER.email,
          phone: TEST_USER.phone,
          address: TEST_USER.address,
          city: TEST_USER.city,
          province: TEST_USER.province,
          zipCode: TEST_USER.zipCode
        });
        
        // STEP 5: Fill lease details if available
        await paymentDetailsPage.fillLeaseDetailsIfAvailable({
          alternatePhone: TEST_USER.alternatePhone || undefined,
          alternateEmail: TEST_USER.alternateEmail || undefined,
          driversLicense: TEST_USER.driversLicense,
          driversLicenseState: TEST_USER.driversLicenseState,
          birthMonth: TEST_USER.birthMonth,
          birthDate: TEST_USER.birthDate,
          birthYear: TEST_USER.birthYear
        });
        
        // STEP 6: Fill payment details
        await paymentDetailsPage.fillPaymentDetails(TEST_USER.paymentInfo);
        
        // STEP 7: Check agreement checkboxes
        await paymentDetailsPage.checkAgreementCheckboxes();
        
        // STEP 8: Submit payment and check for errors
        const errorMessage = await paymentDetailsPage.submitPaymentAndCheckError();
        
        // Record the result
        resultCollector.addResult(baseURL, companyName, platform, errorMessage, true);
        
      } catch (error) {
        console.error(`Test failed for ${baseURL}:`, error);
        
        // Take screenshot on error
        if (!page.isClosed()) {
          const screenshotFile = await takeErrorScreenshot(page, companyName.replace(/\s/g, '-').toLowerCase());
          console.log(`Screenshot saved: ${screenshotFile}`);
        }
        
        // Record the failure
        resultCollector.addResult(
          baseURL, 
          companyName, 
          platform, 
          `Test execution error: ${error instanceof Error ? error.message : String(error)}`,
          false
        );
      }
    });
  }
});

// Print a summary of all results at the end
test.afterAll(() => {
  resultCollector.printSummary();
});