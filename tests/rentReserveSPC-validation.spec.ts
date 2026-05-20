import { test } from '../fixtures/rentReserveSPC-fixture';
import { getSinglePageUrls, SINGLE_PAGE_FMS_PLATFORM, CAPTCHA_CUSTOMER_URLS, STEP_FOUR_CAPTCHA_URLS } from '../configs/urls';
import { cleanupOldErrorScreenshots, takeErrorScreenshot } from '../utils/screenshot';
import { SINGLE_PAGE_USER } from '../configs/credentials';
import { RentResultCollector } from '../utils/RentResultCollector';
import { setupCorpCodeIfNeeded } from '../utils/corpCodeSetup';
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
 * 2. Click RENT button
 * 3. Fill complete single-page form:
 *    - Tenant Details
 *    - Driver's License Details (if available)
 *    - Payment Details
 *    - Agreement Toggles
 * 4. Click RENT NOW
 * 5. Capture and report error from toast
 * 
 * URLs tested:
 * - First Storage (Travelers Rest)
 * - Columbia Self Storage (South Plainfield)
 */

// Clean up old error screenshots before starting tests
cleanupOldErrorScreenshots();

// Create a result collector to track all test results
const resultCollector = new RentResultCollector();

// Results directory — each client writes its own file to avoid cross-worker race conditions
const RESULTS_FILE = path.join(process.cwd(), 'test-results', 'singlepage-results.json');
const RESULTS_DIR = path.join(process.cwd(), 'test-results', 'singlepage-results');

// Helper function to write a single test result to its own file (no race condition)
function writeResultToFile(result: { url: string; company: string; platform: string; error: string; success: boolean; attempt?: number }) {
  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
  }
  const safeFileName = result.company.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
  const resultFile = path.join(RESULTS_DIR, `${safeFileName}.json`);
  fs.writeFileSync(resultFile, JSON.stringify({ ...result, timestamp: new Date().toISOString() }, null, 2));
}

// Helper function to read all individual result files and consolidate
function readAllResults(): any[] {
  if (!fs.existsSync(RESULTS_DIR)) {
    return [];
  }
  const files = fs.readdirSync(RESULTS_DIR).filter(f => f.endsWith('.json'));
  const results: any[] = [];
  for (const file of files) {
    try {
      const data = fs.readFileSync(path.join(RESULTS_DIR, file), 'utf-8');
      results.push(JSON.parse(data));
    } catch {
      // skip corrupted files
    }
  }
  // Also write consolidated file for easy access
  if (results.length > 0) {
    try { fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2)); } catch { /* ignore */ }
  }
  return results;
}

test.describe('Single-Page Rent Verification Tests', () => {
  test.describe.configure({ retries: 0 });
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
        // PRE-STEP: Corp Code Setup (staging only)
        // ============================================
        const browser = page.context().browser();
        if (browser) {
          await setupCorpCodeIfNeeded(browser, baseURL);
        }

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
        const rentButtonResult = await storageListingPage.clickRentButton();
        console.log('✅ RENT button clicked successfully');

        // Short-circuit on JOIN WAITLIST flow (e.g. red-rocks-self-storage) — site exposes
        // only "Join our waitlist" / "Reserve" instead of a rent button. No form to fill.
        if (rentButtonResult === 'WAITLIST') {
          console.log('ℹ️  This site uses JOIN WAITLIST instead of direct rental — stopping here');
          testResult.error = 'No error - JOIN WAITLIST option (not direct rental)';
          testResult.success = true;
          resultCollector.addResult(baseURL, companyName, platform, testResult.error, testResult.success);
          writeResultToFile({ url: baseURL, company: companyName, platform, error: testResult.error, success: testResult.success, attempt: test.info().retry });
          console.log(`\n✅ TEST COMPLETED (Join Waitlist scenario) FOR: ${companyName}`);
          console.log(`${'='.repeat(80)}\n`);
          return;
        }

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
        }, hasStepFourCaptcha, companyName);
        
        console.log('✅ Single-page rental form completed successfully');
        
        // ============================================
        // STEP 4: Click RENT NOW and capture error (STEP 5 renumbered to STEP 4)
        // ============================================
        testResult.step = 'Payment Submission';
        console.log('\n📍 STEP 4: Submitting payment and checking for errors...');
        
        // For step-four captcha customers (e.g. Minimall), captcha was already handled during form fill
        // Only pass hasCaptcha for RENT NOW-level captcha customers
        const errorMessage = await rentalDetailsPageSinglePage.clickRentNowAndCaptureError(hasCaptchaUrl, companyName);
        
        // If error capture itself failed, log warning but DON'T throw —
        // the rent flow completed successfully, only the toast capture had an issue.
        // Throwing here was causing passed tests (e.g. Bluebird, Red Rocks) to retry.
        if (errorMessage && errorMessage.startsWith('FAILED to fetch')) {
          console.log(`⚠️  Warning: Could not capture error toast for ${companyName}, but rent flow completed`);
        }
        
        console.log('✅ Payment submission completed');
        
        // ============================================
        // Test completed successfully
        // ============================================
        testResult.error = errorMessage || 'No error - Test completed successfully';
        testResult.success = true;
        
        // Flag unexpected "Alternate contact" error — this means the site requires alternate contact address
        if (testResult.error.includes('Alternate contact must have a first name')) {
          console.log(`\n🚩 UNEXPECTED ERROR for ${companyName}: "Alternate contact must have a first name, last name, and address" — needs attention!`);
          testResult.error = `🚩 [NEEDS ATTENTION] ${testResult.error}`;
        }
        
        console.log(`\n✅ TEST COMPLETED SUCCESSFULLY FOR: ${companyName}`);
        console.log(`📊 Final Result: ${testResult.error}`);
        console.log(`${'='.repeat(80)}\n`);
        
        // Record the result
        resultCollector.addResult(baseURL, companyName, platform, testResult.error, testResult.success);
        
        // Write result to shared file for cross-worker consolidation
        writeResultToFile({ url: baseURL, company: companyName, platform, error: testResult.error, success: testResult.success, attempt: test.info().retry });
        
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
        writeResultToFile({ url: baseURL, company: companyName, platform, error: testResult.error, success: false, attempt: test.info().retry });
        
        // Re-throw the error to mark the test as failed
        throw error;
      }
    });
  }
});

// Clean up results before all workers start (uses a lock file to run once)
const LOCK_FILE = RESULTS_FILE + '.lock';
test.beforeAll(() => {
  if (!fs.existsSync(LOCK_FILE)) {
    try {
      fs.writeFileSync(LOCK_FILE, String(process.pid), { flag: 'wx' });
      // Clean up individual results directory and consolidated file
      if (fs.existsSync(RESULTS_DIR)) {
        const oldFiles = fs.readdirSync(RESULTS_DIR);
        for (const f of oldFiles) { try { fs.unlinkSync(path.join(RESULTS_DIR, f)); } catch { /* ignore */ } }
      }
      if (fs.existsSync(RESULTS_FILE)) {
        fs.unlinkSync(RESULTS_FILE);
      }
    } catch {
      // Another worker already created the lock — skip cleanup
    }
  }
});

// Summary printing moved to global-teardown.ts so it runs ONCE after ALL workers finish.
// The lock file must survive until teardown so later workers do not reopen cleanup races.
