import { test } from '../fixtures/rentReserveSPC-fixture';
import { getSinglePageUrls, SINGLE_PAGE_FMS_PLATFORM, CAPTCHA_CUSTOMER_URLS, STEP_FOUR_CAPTCHA_URLS, CURRENT_ENVIRONMENT, Environment } from '../configs/urls';
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
 * - Columbia Self Storage (South Plainfield)
 * - (and the rest of the SPC client list in configs/urls.ts)
 */

// Clean up old error screenshots before starting tests
cleanupOldErrorScreenshots();

// Create a result collector to track all test results
const resultCollector = new RentResultCollector();

// Results directory — each client writes its own file to avoid cross-worker race conditions
const RESULTS_FILE = path.join(process.cwd(), 'test-results', 'singlepage-results.json');
const RESULTS_DIR = path.join(process.cwd(), 'test-results', 'singlepage-results');

// Helper function to write a single test result to its own file (no race condition)
function writeResultToFile(result: { url: string; company: string; platform: string; error: string; success: boolean; attempt?: number; retried?: boolean; attempt1Error?: string }) {
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

function isRetryableUnexpectedError(errorMsg: string): boolean {
  if (!errorMsg) return false;
  return errorMsg.toLowerCase().includes('unexpected error');
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
      // Set timeout — captcha customers get NO timeout (user solves manually).
      // Defensive guard: on STAGING no SPC client uses hCaptcha (Mini Mall has its own
      // spec). Force both flags off so even if a URL is accidentally added back to
      // CAPTCHA_CUSTOMER_URLS, we won't waste time polling for a captcha that never appears.
      const isStaging = CURRENT_ENVIRONMENT === Environment.STAGING;
      const hasCaptchaUrl = !isStaging && CAPTCHA_CUSTOMER_URLS.includes(baseURL);
      const hasStepFourCaptcha = !isStaging && STEP_FOUR_CAPTCHA_URLS.includes(baseURL);
      test.setTimeout((hasCaptchaUrl || hasStepFourCaptcha) ? 0 : 360 * 1000); // 0 = no timeout for captcha, 6 min for others (allows retry)
      
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
        // PRE-STEP: Corp Code Setup (staging only) — runs once, outside retry loop
        // ============================================
        const browser = page.context().browser();
        if (browser) {
          await setupCorpCodeIfNeeded(browser, baseURL);
        }

        // ── Unified retry loop ──
        // Retries the WHOLE flow (navigate → click rent → fill form → submit)
        // when the first attempt either:
        //   • returned an "unexpected error" toast, or
        //   • crashed (page closed, browser died, third-party script killed page)
        const MAX_FLOW_ATTEMPTS = 2;
        let finalError = '';
        let wasRetried = false;
        let attempt1Error = '';
        let attempt1Type: 'unexpected' | 'crash' | null = null;

        for (let attempt = 1; attempt <= MAX_FLOW_ATTEMPTS; attempt++) {
          try {
            if (attempt > 1) {
              const icon = attempt1Type === 'crash' ? '💥' : '🔄';
              const label = attempt1Type === 'crash' ? 'CRASH RETRY' : 'UNEXPECTED ERROR RETRY';
              console.log(`\n${icon.repeat(40)}`);
              console.log(`${icon} ${label} for ${companyName} — attempt 1: "${attempt1Error}"`);
              console.log(`${icon.repeat(40)}`);
            }

            // ============================================
            // STEP 1: Navigate to the storage listing page
            // ============================================
            testResult.step = 'Navigation';
            console.log(`\n📍 STEP 1${attempt > 1 ? ' (retry)' : ''}: Navigating to storage listing page...`);
            await storageListingPage.navigateWithCacheBusting(baseURL);
            console.log('✅ Navigation completed successfully');

            // ============================================
            // STEP 2: Click the RENT button
            // ============================================
            testResult.step = 'Rent Button';
            console.log(`\n📍 STEP 2${attempt > 1 ? ' (retry)' : ''}: Clicking RENT button...`);
            const rentButtonResult = await storageListingPage.clickRentButton();
            console.log('✅ RENT button clicked successfully');

            // Short-circuit on JOIN WAITLIST flow (e.g. red-rocks, rhino) — site exposes
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

            await page.waitForTimeout(3000);
            console.log(`   Navigated to: ${page.url()}`);

            // ============================================
            // STEP 2.5: Detect errors that appear RIGHT AFTER landing
            // ============================================
            // Some clients surface an API error toast (e.g. "Could not find facility
            // for ID …") the instant the next page loads — before any form input.
            // Treat this like any other first-attempt failure: re-run the whole flow
            // on a fresh navigation. If it persists on the final attempt, capture the
            // error (same toast elements as the post-submit capture) and FAIL the test.
            testResult.step = 'Post-Landing Error Check';
            console.log(`\n📍 STEP 2.5${attempt > 1 ? ' (retry)' : ''}: Checking for errors right after landing...`);
            const landingError = await rentalDetailsPageSinglePage.captureLandingError();
            if (landingError) {
              if (attempt < MAX_FLOW_ATTEMPTS) {
                attempt1Error = landingError;
                attempt1Type = 'unexpected';
                wasRetried = true;
                console.log(`\n🚩 Error appeared right after landing for ${companyName}: "${landingError}"`);
                console.log(`🔄 Re-running the page (fresh navigation) to confirm it's reproducible...`);
                continue;
              }
              // Persisted after a fresh re-run → real, reproducible failure → FAIL.
              throw new Error(`Error on landing page (persisted after retry): ${landingError}`);
            }

            // ============================================
            // STEP 3: Fill complete single-page form
            // ============================================
            testResult.step = 'Single-Page Form Fill';
            console.log(`\n📍 STEP 3${attempt > 1 ? ' (retry)' : ''}: Filling single-page rental form...`);
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
              alternateFirstName: SINGLE_PAGE_USER.alternateFirstName,
              alternateLastName: SINGLE_PAGE_USER.alternateLastName,
              alternatePhone: SINGLE_PAGE_USER.alternatePhone,
              alternateEmail: SINGLE_PAGE_USER.alternateEmail,
              driversLicense: SINGLE_PAGE_USER.driversLicense,
              driversLicenseState: SINGLE_PAGE_USER.driversLicenseState,
              birthMonth: SINGLE_PAGE_USER.birthMonth,
              birthDate: SINGLE_PAGE_USER.birthDate,
              birthYear: SINGLE_PAGE_USER.birthYear,
              paymentInfo: SINGLE_PAGE_USER.paymentInfo
            }, hasStepFourCaptcha, companyName);
            console.log('✅ Single-page rental form completed successfully');

            // ============================================
            // STEP 4: Click RENT NOW and capture error
            // ============================================
            testResult.step = 'Payment Submission';
            console.log(`\n📍 STEP 4${attempt > 1 ? ' (retry)' : ''}: Submitting payment and checking for errors...`);
            const errorMessage = await rentalDetailsPageSinglePage.clickRentNowAndCaptureError(hasCaptchaUrl, companyName);

            if (errorMessage && errorMessage.startsWith('FAILED to fetch')) {
              console.log(`⚠️  Warning: Could not capture error toast for ${companyName}, but rent flow completed`);
            }
            console.log('✅ Payment submission completed');

            // Check whether to retry on "unexpected error" toast (only if attempts remain)
            if (attempt < MAX_FLOW_ATTEMPTS && isRetryableUnexpectedError(errorMessage || '')) {
              attempt1Error = errorMessage || '';
              attempt1Type = 'unexpected';
              wasRetried = true;
              console.log(`🔄 "${errorMessage}" — will retry full flow on a fresh navigation...`);
              continue;
            }

            finalError = errorMessage || 'No error - Test completed successfully';
            break;
          } catch (flowError) {
            const msg = (flowError as Error).message || '';
            // ANY first-attempt error is retryable. Rent button not found, form fill
            // failed, payment submission threw, page crashed, site killed by third-party
            // script — all the same recovery: refresh + run the whole flow from STEP 1.
            // The only hard stop is a closed page (can't reload what doesn't exist).
            if (attempt < MAX_FLOW_ATTEMPTS && !page.isClosed()) {
              const isCrashy =
                msg.includes('Target page, context or browser has been closed') ||
                msg.includes('Execution context was destroyed') ||
                msg.includes('frame was detached') ||
                msg.includes('Page/browser closed during') ||
                msg.includes('site crash') ||
                msg.includes('third-party script') ||
                msg.includes('Test timeout');
              attempt1Error = msg.substring(0, 200);
              attempt1Type = isCrashy ? 'crash' : 'unexpected';
              wasRetried = true;
              const icon = isCrashy ? '💥 CRASH' : '⚠️  ERROR';
              console.log(`\n${icon} on attempt 1 at "${testResult.step}":`);
              console.log(`   ${msg.substring(0, 200)}`);
              console.log(`🔄 Refreshing and retrying full flow from STEP 1...`);
              continue;
            }
            throw flowError;
          }
        }

        // ============================================
        // Build final result
        // ============================================
        if (wasRetried) {
          const prefix = attempt1Type === 'crash' ? '💥 Crash retry' : '🔄 Unexpected-error retry';
          testResult.error = `[${prefix} — Attempt 1: "${attempt1Error}"] → [Attempt 2: "${finalError}"]`;
        } else {
          testResult.error = finalError;
        }
        testResult.success = true;

        // Flag "unexpected error" in the FINAL result for manual review
        if (isRetryableUnexpectedError(finalError)) {
          testResult.error = `🔍 [MANUAL CHECK NEEDED] ${testResult.error}`;
        }

        // Flag unexpected "Alternate contact" error
        if (testResult.error.includes('Alternate contact must have a first name')) {
          console.log(`\n🚩 UNEXPECTED ERROR for ${companyName}: "Alternate contact must have a first name, last name, and address" — needs attention!`);
          testResult.error = `🚩 [NEEDS ATTENTION] ${testResult.error}`;
        }

        const retrySuffix = wasRetried ? ` (after ${attempt1Type === 'crash' ? 'crash' : 'unexpected-error'} retry)` : '';
        console.log(`\n✅ TEST COMPLETED${retrySuffix} FOR: ${companyName}`);
        console.log(`📊 Final Result: ${testResult.error}`);
        console.log(`${'='.repeat(80)}\n`);

        resultCollector.addResult(baseURL, companyName, platform, testResult.error, testResult.success);
        writeResultToFile({ url: baseURL, company: companyName, platform, error: testResult.error, success: testResult.success, attempt: wasRetried ? 2 : 1, retried: wasRetried, attempt1Error: wasRetried ? attempt1Error : undefined });
        
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
