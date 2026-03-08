import { test } from '../fixtures/singlepage-fixture';
import { getSinglePageUrls, SINGLE_PAGE_FMS_PLATFORM, CAPTCHA_CUSTOMER_URLS, STEP_FOUR_CAPTCHA_URLS } from '../configs/urls';
import { cleanupOldErrorScreenshots, takeErrorScreenshot } from '../utils/screenshot';
import { SINGLE_PAGE_USER } from '../configs/credentials';
import { RentResultCollector } from '../utils/RentResultCollector';
import * as fs from 'fs';
import * as path from 'path';

/**
 * ============================================
 * SINGLE-PAGE RENT VERIFICATION TEST SUITE
 * ============================================
 * 
 * This test suite verifies the single-page rent flow where 
 * Step 4 (Rental Details) and Step 5 (Payment Details) are 
 * combined on one page.
 * 
 * Test Flow:
 * 1. Navigate to storage listing page
 * 2. Click RESERVE button (if available) → Close popup
 * 3. Click RENT button
 * 4. Fill complete single-page form:
 *    - Tenant Details
 *    - Driver's License Details (if available)
 *    - Payment Details
 *    - Agreement Toggles
 * 5. Click RENT NOW
 * 6. Capture and report error from toast
 * 
 * URLs tested:
 * - First Storage (Travelers Rest)
 * - Columbia Self Storage (South Plainfield)
 */

// Clean up old error screenshots before starting tests
cleanupOldErrorScreenshots();

// Create a result collector to track all test results
const resultCollector = new RentResultCollector();

// Shared results file for cross-worker communication
const RESULTS_FILE = path.join(process.cwd(), 'test-results', 'singlepage-results.json');

// Helper function to write test results to shared file (thread-safe)
function writeResultToFile(result: { url: string; company: string; platform: string; error: string; success: boolean }) {
  const resultsDir = path.dirname(RESULTS_FILE);
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  let results: any[] = [];
  if (fs.existsSync(RESULTS_FILE)) {
    try {
      const data = fs.readFileSync(RESULTS_FILE, 'utf-8');
      results = JSON.parse(data);
    } catch (e) {
      results = [];
    }
  }

  // Upsert: if a result for this URL already exists (e.g. from a failed first attempt),
  // replace it so a successful retry overwrites the previous failure
  const existingIndex = results.findIndex((r: any) => r.url === result.url);
  if (existingIndex !== -1) {
    results[existingIndex] = { ...result, timestamp: new Date().toISOString() };
  } else {
    results.push({ ...result, timestamp: new Date().toISOString() });
  }
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
}

// Helper function to read all results from shared file
function readAllResults(): any[] {
  if (!fs.existsSync(RESULTS_FILE)) {
    return [];
  }
  try {
    const data = fs.readFileSync(RESULTS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

test.describe('Single-Page Rent Verification Tests', () => {
  const singlePageUrls = getSinglePageUrls().customer;
  
  for (const baseURL of singlePageUrls) {
    test(`Single-page rent verification for ${baseURL}`, async ({
      page,
      storageListingPage, 
      rentalDetailsPageSinglePage,
      companyNameFromUrl
    }) => {
      // Set timeout — captcha customers get NO timeout (user solves manually)
      const hasCaptchaUrl = CAPTCHA_CUSTOMER_URLS.includes(baseURL);
      const hasStepFourCaptcha = STEP_FOUR_CAPTCHA_URLS.includes(baseURL);
      test.setTimeout((hasCaptchaUrl || hasStepFourCaptcha) ? 0 : 240 * 1000); // 0 = no timeout for captcha, 4 min for others
      
      // Get company/client name and platform
      const companyName = companyNameFromUrl(baseURL);
      const platform = SINGLE_PAGE_FMS_PLATFORM[baseURL] ?? 'Unknown';
      
      // Print Storage Facility URL and Platform
      console.log(`\n${'='.repeat(80)}`);
      console.log(`🏢 TESTING: ${companyName}`);
      console.log(`🌐 URL: ${baseURL}`);
      console.log(`⚙️  Platform: ${platform}`);
      console.log(`📄 Layout: ${hasStepFourCaptcha ? 'Two-Step Flow (Step 4 → Step 5) + hCaptcha at Step 4' : hasCaptchaUrl ? 'Single-Page Rent Flow + hCaptcha at RENT NOW' : 'Single-Page Rent Flow'}`);
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
        // ============================================
        // STEP 1: Navigate to the storage listing page
        // ============================================
        testResult.step = 'Navigation';
        console.log('\n📍 STEP 1: Navigating to storage listing page...');
        await storageListingPage.navigateWithCacheBusting(baseURL);
        console.log('✅ Navigation completed successfully');
        
        // ============================================
        // STEP 2: RESERVE BUTTON - COMMENTED OUT FOR DEBUGGING
        // ============================================
        // testResult.step = 'Reserve Button';
        // console.log('\n📍 STEP 2: Checking for RESERVE button...');
        // const reserveButtonText = await storageListingPage.clickReserveButtonIfAvailable();
        // 
        // if (reserveButtonText) {
        //   console.log(`   Found and clicked: "${reserveButtonText}"`);
        //   
        //   // If the button was "Join Waitlist", finish the test run
        //   if (reserveButtonText?.trim() === 'Join Waitlist') {
        //     console.log('ℹ️  Test completed - Join Waitlist option encountered');
        //     testResult.error = 'No error - Join Waitlist option';
        //     testResult.success = true;
        //     resultCollector.addResult(baseURL, companyName, platform, testResult.error, testResult.success);
        //     return;
        //   }
        // } else {
        //   console.log('   No RESERVE button found, proceeding...');
        // }
        
        // ============================================
        // STEP 2: Click the RENT button (STEP 3 renumbered to STEP 2)
        // ============================================
        testResult.step = 'Rent Button';
        console.log('\n📍 STEP 2: Clicking RENT button...');
        await storageListingPage.clickRentButton();
        console.log('✅ RENT button clicked successfully');
        
        // Wait for page to load
        await page.waitForTimeout(3000);
        
        // Verify we landed on the single-page form
        const currentUrl = page.url();
        console.log(`   Navigated to: ${currentUrl}`);
        
        // ============================================
        // STEP 3: Fill complete single-page form (STEP 4 renumbered to STEP 3)
        // ============================================
        testResult.step = 'Single-Page Form Fill';
        console.log('\n📍 STEP 3: Filling single-page rental form...');
        console.log('   This includes: Tenant Details + Driver\'s License + Payment + Agreements');
        
        await rentalDetailsPageSinglePage.fillCompleteSinglePageForm({
          firstName: SINGLE_PAGE_USER.firstName,
          lastName: SINGLE_PAGE_USER.lastName,
          email: SINGLE_PAGE_USER.email,
          phone: SINGLE_PAGE_USER.phone,
          address: SINGLE_PAGE_USER.address,
          city: SINGLE_PAGE_USER.city,
          province: SINGLE_PAGE_USER.province,
          zipCode: SINGLE_PAGE_USER.zipCode,
          driversLicense: SINGLE_PAGE_USER.driversLicense,
          driversLicenseState: SINGLE_PAGE_USER.driversLicenseState,
          birthMonth: SINGLE_PAGE_USER.birthMonth,
          birthDate: SINGLE_PAGE_USER.birthDate,
          birthYear: SINGLE_PAGE_USER.birthYear,
          paymentInfo: SINGLE_PAGE_USER.paymentInfo
        }, hasStepFourCaptcha);
        
        console.log('✅ Single-page rental form completed successfully');
        
        // ============================================
        // STEP 4: Click RENT NOW and capture error (STEP 5 renumbered to STEP 4)
        // ============================================
        testResult.step = 'Payment Submission';
        console.log('\n📍 STEP 4: Submitting payment and checking for errors...');
        
        // For step-four captcha customers (e.g. Minimall), captcha was already handled during form fill
        // Only pass hasCaptcha for RENT NOW-level captcha customers (e.g. Purely, StorageStar)
        const errorMessage = await rentalDetailsPageSinglePage.clickRentNowAndCaptureError(hasCaptchaUrl);
        
        // If failed to capture error message, throw so Playwright retries once
        if (errorMessage && errorMessage.startsWith('FAILED to fetch')) {
          throw new Error(errorMessage);
        }
        
        console.log('✅ Payment submission completed');
        
        // ============================================
        // Test completed successfully
        // ============================================
        testResult.error = errorMessage || 'No error - Test completed successfully';
        testResult.success = true;
        
        console.log(`\n✅ TEST COMPLETED SUCCESSFULLY FOR: ${companyName}`);
        console.log(`📊 Final Result: ${testResult.error}`);
        console.log(`${'='.repeat(80)}\n`);
        
        // Record the result
        resultCollector.addResult(baseURL, companyName, platform, testResult.error, testResult.success);
        
        // Write result to shared file for cross-worker consolidation
        writeResultToFile({ url: baseURL, company: companyName, platform, error: testResult.error, success: testResult.success });
        
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
            const screenshotFile = await takeErrorScreenshot(
              page, 
              `${companyName.replace(/\s/g, '-').toLowerCase()}-singlepage`
            );
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
        
        // Write result to shared file for cross-worker consolidation
        writeResultToFile({ url: baseURL, company: companyName, platform, error: testResult.error, success: false });
        
        // Re-throw the error to mark the test as failed
        throw error;
      }
    });
  }
});

// Clean up results file before tests start
test.beforeAll(() => {
  if (fs.existsSync(RESULTS_FILE)) {
    fs.unlinkSync(RESULTS_FILE);
  }
});

// Print a comprehensive summary of all results at the end (consolidated across workers)
test.afterAll(async () => {
  const allResults = readAllResults();
  
  if (allResults.length === 0) {
    return; // No results to print (worker didn't run any tests)
  }
  
  console.log(`\n${'='.repeat(100)}`);
  console.log(`🏁 SINGLE-PAGE RENT VERIFICATION - CONSOLIDATED SUMMARY`);
  console.log(`${'='.repeat(100)}\n`);
  
  // Calculate summary stats
  const totalTests = allResults.length;
  const successfulTests = allResults.filter(r => r.success).length;
  const failedTests = totalTests - successfulTests;
  const successRate = ((successfulTests / totalTests) * 100).toFixed(1);
  
  console.log(`📊 TEST EXECUTION SUMMARY:`);
  console.log(`   Total Tests: ${totalTests}`);
  console.log(`   ✅ Successful: ${successfulTests}`);
  console.log(`   ❌ Failed: ${failedTests}`);
  console.log(`   📈 Success Rate: ${successRate}%\n`);
  
  // Print results table
  console.log(`📋 DETAILED RESULTS:`);
  console.log(`${'='.repeat(100)}`);
  console.log(`Company                   | Platform   | Status   | Error Message`);
  console.log(`${'='.repeat(100)}`);
  
  // Helper to strip "Error Occurred — Dismiss — " prefix from error messages
  const cleanError = (msg: string) => msg.replace(/^Error Occurred\s*[—–-]+\s*Dismiss\s*[—–-]+\s*/i, '');

  allResults.forEach(result => {
    const companyName = result.company.padEnd(25);
    const platform = result.platform.padEnd(10);
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    const statusPadded = status.padEnd(8);
    const cleaned = cleanError(result.error);
    const errorPreview = cleaned.length > 50 ? cleaned.substring(0, 47) + '...' : cleaned;
    console.log(`${companyName} | ${platform} | ${statusPadded} | ${errorPreview}`);
  });
  
  console.log(`${'='.repeat(100)}\n`);
  
  // Print full error messages
  console.log(`🚨 ALL ERROR MESSAGES:`);
  console.log(`${'='.repeat(100)}\n`);
  
  allResults.forEach((result, index) => {
    const icon = result.success ? '⚠️  WARNING' : '❌ ERROR';
    console.log(`${index + 1}. ${icon} - ${result.company} (${result.platform})`);
    console.log(`   URL: ${result.url}`);
    console.log(`   Message: ${cleanError(result.error)}`);
    console.log(`   Time: ${new Date(result.timestamp).toLocaleString()}`);
    if (index < allResults.length - 1) {
      console.log(`   ${'-'.repeat(80)}\n`);
    }
  });
  
  console.log(`${'='.repeat(100)}`);
  console.log(`${'='.repeat(100)}\n`);
});
