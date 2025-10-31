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
      // Set longer timeout for these tests - increased to 5 minutes for slow-loading sites
      test.setTimeout(300 * 1000); // 5 minutes to handle very slow sites like 10 Federal Storage
      
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
        step: '',
        immediateError: '' // Track immediate error after rent button click
      };
      
      try {
        // STEP 1: Navigate to the storage listing page
        testResult.step = 'Navigation';
        console.log('📍 STEP 1: Navigating to storage listing page...');
        await storageListingPage.navigateWithCacheBusting(baseURL);
        console.log('✅ Navigation completed successfully');
        
        // ============================================
        // STEP 2: RESERVE BUTTON - COMMENTED OUT FOR DEBUGGING
        // ============================================
        // testResult.step = 'Reserve Button';
        // console.log('📍 STEP 2: Checking for reserve button...');
        // const reserveButtonText = await storageListingPage.clickReserveButtonIfAvailable();
        // 
        // // If the button was "Join Waitlist", finish the test run
        // if (reserveButtonText?.trim() === 'Join Waitlist') {
        //   console.log('ℹ️  Test completed - Join Waitlist option encountered');
        //   testResult.error = 'No error - Join Waitlist option';
        //   testResult.success = true;
        //   resultCollector.addResult(baseURL, companyName, platform, testResult.error, testResult.success);
        //   return;
        // }
        
        // ============================================
        // STEP 2: Click the RENT button (STEP 3 renumbered to STEP 2)
        // ============================================
        testResult.step = 'Rent Button';
        console.log('📍 STEP 2: Clicking rent button...');
        await storageListingPage.clickRentButton();
        console.log('✅ Rent button clicked successfully');
        
        // ============================================
        // STEP 3: Check for immediate error (STEP 4 renumbered to STEP 3)
        // ============================================
        console.log('\n� STEP 3: Checking for immediate errors...');
        const immediateError = await storageListingPage.checkForImmediateError();
        if (immediateError) {
          testResult.immediateError = immediateError;
          console.log(`⚠️  IMMEDIATE ERROR DETECTED: ${immediateError}`);
          
          // Check if page actually navigated to rental form - if not, the error blocked navigation
          const currentUrl = page.url();
          const hasNavigatedToForm = currentUrl.includes('/step_four') || 
                                     currentUrl.includes('/step-four') ||
                                     currentUrl.includes('/checkout') ||
                                     currentUrl.includes('/rental-details') ||
                                     currentUrl.match(/\/(4|four|step4)/);
          
          if (!hasNavigatedToForm) {
            // Error blocked navigation - mark as successful detection and exit
            testResult.error = `[Immediate Error - Blocked Navigation] ${immediateError}`;
            testResult.success = true;
            console.log(`✅ TEST COMPLETED (immediate error blocked navigation) FOR: ${companyName}`);
            console.log(`📊 Final Result: ${testResult.error}`);
            console.log('='.repeat(80));
            
            resultCollector.addResult(baseURL, companyName, platform, testResult.error, true);
            return; // Exit test early - error prevented navigation
          } else {
            // Page navigated despite error - continue to see what happens
            console.log('⚠️  Note: Error detected but page navigated - will combine with final results');
          }
        } else {
          console.log('✅ No immediate error detected - proceeding with test');
        }
        
        // ============================================
        // STEP 4: Fill out rental details form (STEP 5 renumbered to STEP 4)
        // ============================================
        testResult.step = 'Rental Details Form';
        console.log('\n📍 STEP 4: Filling rental details form...');
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
        
        // ============================================
        // STEP 5: Fill lease details if available (STEP 6 renumbered to STEP 5)
        // ============================================
        testResult.step = 'Lease Details Form';
        console.log('\n📍 STEP 5: Filling lease details if available...');
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
        
        // ============================================
        // STEP 6: Fill payment details (STEP 7 renumbered to STEP 6)
        // ============================================
        testResult.step = 'Payment Details Form';
        console.log('\n📍 STEP 6: Filling payment details...');
        await paymentDetailsPage.fillPaymentDetails(TEST_USER.paymentInfo);
        console.log('✅ Payment details filled successfully');
        
        // ============================================
        // STEP 7: Check agreement checkboxes (STEP 8 renumbered to STEP 7)
        // ============================================
        testResult.step = 'Agreement Checkboxes';
        console.log('\n📍 STEP 7: Checking agreement checkboxes...');
        await paymentDetailsPage.checkAgreementCheckboxes();
        console.log('✅ Agreement checkboxes processed');
        
        // ============================================
        // STEP 8: Submit payment and check for errors (STEP 9 renumbered to STEP 8)
        // ============================================
        testResult.step = 'Payment Submission';
        console.log('\n📍 STEP 8: Submitting payment and checking for errors...');
        const errorMessage = await paymentDetailsPage.submitPaymentAndCheckError(TEST_USER.paymentInfo);
        console.log('✅ Payment submission completed');
        
        // Test completed successfully
        testResult.error = errorMessage || 'No error - Test completed successfully';
        testResult.success = true;
        
        // Build final error message including immediate error if found
        let finalErrorMessage = testResult.error;
        if (testResult.immediateError) {
          finalErrorMessage = `[Step 4 Immediate Error: ${testResult.immediateError}] | ${testResult.error}`;
        }
        
        console.log(`\n✅ TEST COMPLETED SUCCESSFULLY FOR: ${companyName}`);
        if (testResult.immediateError) {
          console.log(`⚠️  Immediate Error (Step 4): ${testResult.immediateError}`);
        }
        console.log(`📊 Final Result: ${testResult.error}`);
        console.log(`${'='.repeat(80)}\n`);
        
        // Record the result with immediate error included
        resultCollector.addResult(baseURL, companyName, platform, finalErrorMessage, testResult.success);
        
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