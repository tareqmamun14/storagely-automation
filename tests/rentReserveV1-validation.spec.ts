import { test } from '../fixtures/rentReserveV1-fixture';
import { getCurrentUrls, FMS_PLATFORM } from '../configs/urls';
import { cleanupOldErrorScreenshots, takeErrorScreenshot } from '../utils/screenshot';
import { TEST_USER } from '../configs/credentials';
import { RentResultCollector } from '../utils/RentResultCollector';
import { setupCorpCodeIfNeeded } from '../utils/corpCodeSetup';
import * as fs from 'fs';
import * as path from 'path';

// Clean up old error screenshots before starting tests
cleanupOldErrorScreenshots();

// Create a result collector to track all test results
const resultCollector = new RentResultCollector();

// Results directory — each worker writes its own file to avoid cross-worker race conditions
const V1_RESULTS_DIR = path.join(process.cwd(), 'test-results', 'v1-results');

function writeV1ResultToFile(result: { url: string; company: string; platform: string; error: string; success: boolean; attempt?: number }) {
  if (!fs.existsSync(V1_RESULTS_DIR)) {
    fs.mkdirSync(V1_RESULTS_DIR, { recursive: true });
  }
  const safeFileName = result.company.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
  const resultFile = path.join(V1_RESULTS_DIR, `${safeFileName}.json`);
  fs.writeFileSync(resultFile, JSON.stringify({ ...result, timestamp: new Date().toISOString() }, null, 2));
}

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
      // Set longer timeout for these tests - 6 minutes for slow-loading sites
      test.setTimeout(360 * 1000); // 6 minutes to handle slow sites reliably
      
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
        // ============================================
        // PRE-STEP: Corp Code Setup (staging only) — runs once, outside retry loop
        // ============================================
        const browser = page.context().browser();
        if (browser) {
          await setupCorpCodeIfNeeded(browser, baseURL);
        }

        // ── Unified retry loop ──
        // Retries the WHOLE flow (navigate → click rent → fill forms → submit)
        // on ANY first-attempt error. The page is reloaded automatically via
        // navigateWithCacheBusting() so the second attempt starts fresh.
        const MAX_FLOW_ATTEMPTS = 2;
        let finalErrorMessage = '';
        let immediateError = '';
        let wasRetried = false;
        let attempt1Error = '';
        let attempt1Type: 'unexpected' | 'crash' | null = null;

        for (let attempt = 1; attempt <= MAX_FLOW_ATTEMPTS; attempt++) {
          try {
            if (attempt > 1) {
              const icon = attempt1Type === 'crash' ? '💥' : '⚠️ ';
              console.log(`\n${icon.repeat(20)}`);
              console.log(`${icon} RETRY for ${companyName} — attempt 1 failed at "${testResult.step}": "${attempt1Error}"`);
              console.log(`${icon.repeat(20)}`);
            }

            // ============================================
            // STEP 1: Navigate to the storage listing page
            // ============================================
            testResult.step = 'Navigation';
            console.log(`📍 STEP 1${attempt > 1 ? ' (retry)' : ''}: Navigating to storage listing page...`);
            await storageListingPage.navigateWithCacheBusting(baseURL);
            console.log('✅ Navigation completed successfully');

            // ============================================
            // STEP 2: Click the RENT button
            // ============================================
            testResult.step = 'Rent Button';
            console.log(`📍 STEP 2${attempt > 1 ? ' (retry)' : ''}: Clicking rent button...`);
            const rentButtonResult = await storageListingPage.clickRentButton();
            console.log('✅ Rent button clicked successfully');

            if (rentButtonResult === 'WAITLIST') {
              console.log('ℹ️  This site uses JOIN WAITLIST instead of direct rental');
              testResult.error = 'No error - JOIN WAITLIST option (not direct rental)';
              testResult.success = true;
              resultCollector.addResult(baseURL, companyName, platform, testResult.error, testResult.success);
              writeV1ResultToFile({ url: baseURL, company: companyName, platform, error: testResult.error, success: testResult.success, attempt: test.info().retry });
              console.log(`✅ TEST COMPLETED (Join Waitlist scenario) FOR: ${companyName}`);
              console.log(`${'='.repeat(80)}\n`);
              return;
            }

            // ============================================
            // STEP 3: Detect errors that appear RIGHT AFTER landing
            // ============================================
            // An error toast the instant the next page loads (before any form fill)
            // is retryable: re-run the WHOLE flow on a fresh navigation. If it
            // persists on the final attempt, FAIL the test so it gets handled —
            // we no longer silently pass a reproducible landing error.
            testResult.step = 'Post-Landing Error Check';
            console.log(`\n📍 STEP 3${attempt > 1 ? ' (retry)' : ''}: Checking for errors right after landing...`);
            const stepImmediateError = await storageListingPage.checkForImmediateError();
            if (stepImmediateError) {
              testResult.immediateError = stepImmediateError;
              console.log(`⚠️  IMMEDIATE ERROR DETECTED: ${stepImmediateError}`);
              if (attempt < MAX_FLOW_ATTEMPTS) {
                attempt1Error = stepImmediateError;
                attempt1Type = 'unexpected';
                wasRetried = true;
                console.log(`🔄 Re-running the page (fresh navigation) to confirm it's reproducible...`);
                continue;
              }
              // Persisted after a fresh re-run → real, reproducible failure → FAIL.
              throw new Error(`Error on landing page (persisted after retry): ${stepImmediateError}`);
            }
            console.log('✅ No immediate error detected - proceeding with test');

            // ============================================
            // STEP 4: Fill out rental details form
            // ============================================
            testResult.step = 'Rental Details Form';
            console.log(`\n📍 STEP 4${attempt > 1 ? ' (retry)' : ''}: Filling rental details form...`);
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
            // STEP 5: Fill lease details if available
            // ============================================
            testResult.step = 'Lease Details Form';
            console.log(`\n📍 STEP 5${attempt > 1 ? ' (retry)' : ''}: Filling lease details if available...`);
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
            // STEP 6: Fill payment details
            // ============================================
            testResult.step = 'Payment Details Form';
            console.log(`\n📍 STEP 6${attempt > 1 ? ' (retry)' : ''}: Filling payment details...`);
            await paymentDetailsPage.fillPaymentDetails(TEST_USER.paymentInfo);
            console.log('✅ Payment details filled successfully');

            // ============================================
            // STEP 7: Check agreement checkboxes
            // ============================================
            testResult.step = 'Agreement Checkboxes';
            console.log(`\n📍 STEP 7${attempt > 1 ? ' (retry)' : ''}: Checking agreement checkboxes...`);
            await paymentDetailsPage.checkAgreementCheckboxes();
            console.log('✅ Agreement checkboxes processed');

            // ============================================
            // STEP 8: Submit payment and check for errors
            // ============================================
            testResult.step = 'Payment Submission';
            console.log(`\n📍 STEP 8${attempt > 1 ? ' (retry)' : ''}: Submitting payment and checking for errors...`);
            const errorMessage = await paymentDetailsPage.submitPaymentAndCheckError(TEST_USER.paymentInfo);
            console.log('✅ Payment submission completed');

            finalErrorMessage = errorMessage || 'No error - Test completed successfully';
            break;
          } catch (flowError) {
            const msg = (flowError as Error).message || '';
            // ANY first-attempt error is retryable. Refresh the page and run the
            // whole flow from STEP 1. Only hard stop: a closed page (can't reload).
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
              const banner = isCrashy ? '💥 CRASH' : '⚠️  ERROR';
              console.log(`\n${banner} on attempt 1 at "${testResult.step}":`);
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
          const prefix = attempt1Type === 'crash' ? '💥 Crash retry' : '⚠️ Error retry';
          testResult.error = `[${prefix} — Attempt 1: "${attempt1Error}"] → [Attempt 2: "${finalErrorMessage}"]`;
        } else {
          testResult.error = finalErrorMessage;
        }
        testResult.success = true;

        // Flag unexpected "Alternate contact" error
        if (testResult.error.includes('Alternate contact must have a first name')) {
          console.log(`\n🚩 UNEXPECTED ERROR for ${companyName}: "Alternate contact must have a first name, last name, and address" — needs attention!`);
          testResult.error = `🚩 [NEEDS ATTENTION] ${testResult.error}`;
        }

        // Build final error message including immediate error if found
        let finalErrorWithImmediate = testResult.error;
        if (immediateError) {
          finalErrorWithImmediate = `[Step 4 Immediate Error: ${immediateError}] | ${testResult.error}`;
        }

        const retrySuffix = wasRetried ? ` (after ${attempt1Type === 'crash' ? 'crash' : 'error'} retry)` : '';
        console.log(`\n✅ TEST COMPLETED${retrySuffix} FOR: ${companyName}`);
        if (immediateError) {
          console.log(`⚠️  Immediate Error (Step 3): ${immediateError}`);
        }
        console.log(`📊 Final Result: ${testResult.error}`);
        console.log(`${'='.repeat(80)}\n`);

        if (!page.isClosed()) {
          await page.close();
          console.log(`🔒 Browser closed for ${companyName}`);
        }

        resultCollector.addResult(baseURL, companyName, platform, finalErrorWithImmediate, testResult.success);
        writeV1ResultToFile({ url: baseURL, company: companyName, platform, error: finalErrorWithImmediate, success: testResult.success, attempt: test.info().retry });
        
      } catch (error) {
        testResult.success = false;
        testResult.error = `${testResult.step} failed: ${error instanceof Error ? error.message : String(error)}`;
        
        console.error(`\n❌ TEST FAILED FOR: ${companyName}`);
        console.error(`📍 Failed at step: ${testResult.step}`);
        console.error(`💥 Error: ${testResult.error}`);
        console.log(`${'='.repeat(80)}\n`);
        
        // Close browser immediately on failure too
        if (!page.isClosed()) {
          await page.close();
          console.log(`🔒 Browser closed for ${companyName} (failed test)`);
        }
        
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
        writeV1ResultToFile({ url: baseURL, company: companyName, platform, error: testResult.error, success: false, attempt: test.info().retry });
        
        // Re-throw the error to mark the test as failed
        throw error;
      }
    });
  }
});

// Clean up V1 results before all workers start (uses a lock file to run once)
const V1_LOCK_FILE = path.join(process.cwd(), 'test-results', 'v1-results.json.lock');
test.beforeAll(() => {
  if (!fs.existsSync(V1_LOCK_FILE)) {
    try {
      fs.writeFileSync(V1_LOCK_FILE, String(process.pid), { flag: 'wx' });
      if (fs.existsSync(V1_RESULTS_DIR)) {
        const oldFiles = fs.readdirSync(V1_RESULTS_DIR);
        for (const f of oldFiles) { try { fs.unlinkSync(path.join(V1_RESULTS_DIR, f)); } catch { /* ignore */ } }
      }
    } catch {
      // Another worker already created the lock — skip cleanup
    }
  }
});

// Summary printing moved to global-teardown.ts so it runs ONCE after ALL workers finish.