import { test } from '../fixtures/payment-fixture';
import { getCurrentUrls, FMS_PLATFORM } from '../configs/urls';
import { cleanupOldErrorScreenshots, takeErrorScreenshot } from '../utils/screenshot';
import { TEST_USER } from '../configs/credentials';
import { RentResultCollector } from '../utils/RentResultCollector';

// Clean up old error screenshots before starting tests
cleanupOldErrorScreenshots();

// Create a result collector to track all test results
const resultCollector = new RentResultCollector();

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
      test.setTimeout(180 * 1000); // 3 minutes to handle slower sites
      
      // Get company/client name and platform
      const companyName = companyNameFromUrl(baseURL);
      const platform = FMS_PLATFORM[baseURL] ?? 'Unknown';
      
      // Print Storage Facility URL and Platform
      console.log(`\n${'='.repeat(80)}`);
      console.log(`🏢 TESTING: ${companyName}`);
      console.log(`🌐 URL: ${baseURL}`);
      console.log(`⚙️  Platform: ${platform}`);
      console.log(`${'='.repeat(80)}`);
      
      let testResult = {
        url: baseURL,
        company: companyName,
        platform: platform,
        error: '',
        success: false,
        step: ''
      };
      
      try {
        // STEP 1: Navigate to the storage listing page
        testResult.step = 'Navigation';
        console.log('📍 STEP 1: Navigating to storage listing page...');
        await storageListingPage.navigateWithCacheBusting(baseURL);
        console.log('✅ Navigation completed successfully');
        
        // STEP 2: Try to click the reserve button if available
        testResult.step = 'Reserve Button';
        console.log('📍 STEP 2: Checking for reserve button...');
        const reserveButtonText = await storageListingPage.clickReserveButtonIfAvailable();
        
        // If the button was "Join Waitlist", finish the test run
        if (reserveButtonText?.trim() === 'Join Waitlist') {
          console.log('ℹ️  Test completed - Join Waitlist option encountered');
          testResult.error = 'No error - Join Waitlist option';
          testResult.success = true;
          resultCollector.addResult(baseURL, companyName, platform, testResult.error, testResult.success);
          return;
        }
        
        // STEP 3: Click the rent button
        testResult.step = 'Rent Button';
        console.log('📍 STEP 3: Clicking rent button...');
        await storageListingPage.clickRentButton();
        console.log('✅ Rent button clicked successfully');
        
        // Handle popup immediately after URL transition to step_four
        await rentalDetailsPage.handlePopupIfNeeded();
        
        // STEP 4: Fill out rental details form
        testResult.step = 'Rental Details Form';
        console.log('📍 STEP 4: Filling rental details form...');
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
        console.log('✅ Rental details form completed successfully');
        
        // Handle popup immediately after URL transition to step_five
        await paymentDetailsPage.handlePopupIfNeeded();
        
        // STEP 5: Fill lease details if available
        testResult.step = 'Lease Details Form';
        console.log('📍 STEP 5: Filling lease details if available...');
        await paymentDetailsPage.fillLeaseDetailsIfAvailable({
          alternatePhone: TEST_USER.alternatePhone || undefined,
          alternateEmail: TEST_USER.alternateEmail || undefined,
          driversLicense: TEST_USER.driversLicense,
          driversLicenseState: TEST_USER.driversLicenseState,
          birthMonth: TEST_USER.birthMonth,
          birthDate: TEST_USER.birthDate,
          birthYear: TEST_USER.birthYear
        });
        console.log('✅ Lease details form completed (or skipped if not available)');
        
        // STEP 6: Fill payment details
        testResult.step = 'Payment Details Form';
        console.log('📍 STEP 6: Filling payment details...');
        await paymentDetailsPage.fillPaymentDetails(TEST_USER.paymentInfo);
        console.log('✅ Payment details filled successfully');
        
        // STEP 7: Check agreement checkboxes
        testResult.step = 'Agreement Checkboxes';
        console.log('📍 STEP 7: Checking agreement checkboxes...');
        await paymentDetailsPage.checkAgreementCheckboxes();
        console.log('✅ Agreement checkboxes processed');
        
        // STEP 8: Submit payment and check for errors
        testResult.step = 'Payment Submission';
        console.log('📍 STEP 8: Submitting payment and checking for errors...');
        const errorMessage = await paymentDetailsPage.submitPaymentAndCheckError();
        console.log('✅ Payment submission completed');
        
        // Test completed successfully
        testResult.error = errorMessage || 'No error - Test completed successfully';
        testResult.success = true;
        
        console.log(`\n✅ TEST COMPLETED SUCCESSFULLY FOR: ${companyName}`);
        console.log(`📊 Result: ${testResult.error}`);
        console.log(`${'='.repeat(80)}\n`);
        
        // Record the result
        resultCollector.addResult(baseURL, companyName, platform, testResult.error, testResult.success);
        
      } catch (error) {
        testResult.success = false;
        testResult.error = `${testResult.step} failed: ${error instanceof Error ? error.message : String(error)}`;
        
        console.error(`\n❌ TEST FAILED FOR: ${companyName}`);
        console.error(`📍 Failed at step: ${testResult.step}`);
        console.error(`💥 Error: ${testResult.error}`);
        console.log(`${'='.repeat(80)}\n`);
        
        // Take screenshot on error
        if (!page.isClosed()) {
          try {
            const screenshotFile = await takeErrorScreenshot(page, companyName.replace(/\s/g, '-').toLowerCase());
            console.log(`📸 Screenshot saved: ${screenshotFile}`);
          } catch (screenshotError) {
            console.warn(`⚠️  Could not save screenshot: ${screenshotError}`);
          }
        }
        
        // Record the failure
        resultCollector.addResult(
          baseURL, 
          companyName, 
          platform, 
          testResult.error,
          false
        );
        
        // Re-throw the error to mark the test as failed
        throw error;
      }
    });
  }
});

// Print a comprehensive summary of all results at the end
test.afterAll(() => {
  console.log(`\n${'='.repeat(100)}`);
  console.log(`🏁 PAYMENT VERIFICATION TEST SUMMARY`);
  console.log(`${'='.repeat(100)}`);
  resultCollector.printSummary();
  console.log(`${'='.repeat(100)}\n`);
});