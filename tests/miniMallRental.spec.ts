import { test } from '../fixtures/miniMallRental-fixture';
import { getMiniMallRentalUrls, MiniMallRentalConfig, detectMiniMallFms } from '../configs/urls';
import { cleanupOldErrorScreenshots, takeErrorScreenshot } from '../utils/screenshot';
import { SINGLE_PAGE_USER } from '../configs/credentials';
import { setupCorpCodeIfNeeded } from '../utils/corpCodeSetup';
import * as fs from 'fs';
import * as path from 'path';

/**
 * ============================================
 * ⭐ MINI-MALL RENTAL FLOW TEST SUITE
 * ============================================
 *
 * Dedicated rent flow test for Mini Mall Storage — the biggest client.
 * Supports two FMS backends:
 *
 *   SiteLink — Two-step layout:
 *     Step 4: Tenant details + hCaptcha → "CONTINUE TO NEXT STEP"
 *     Step 5: Payment details → RENT NOW → capture error
 *
 *   Yardi — Tenant details + hCaptcha → "CONTINUE TO NEXT STEP"
 *     → Redirects to securecafenet.com (no error to capture)
 *
 * Run standalone: npm run run:minimallrent
 */

cleanupOldErrorScreenshots();

const RESULTS_DIR = path.join(process.cwd(), 'test-results', 'minimallrent-results');
const RESULTS_FILE = path.join(process.cwd(), 'test-results', 'minimallrent-results.json');
const LOCK_FILE = RESULTS_FILE + '.lock';

function writeResultToFile(result: {
  url: string; company: string; fms: string; flowResult: string;
  success: boolean; attempt?: number;
}) {
  if (!fs.existsSync(RESULTS_DIR)) fs.mkdirSync(RESULTS_DIR, { recursive: true });
  const safeFileName = `${result.fms}-${result.company}`.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
  const resultFile = path.join(RESULTS_DIR, `${safeFileName}.json`);
  fs.writeFileSync(resultFile, JSON.stringify({ ...result, timestamp: new Date().toISOString() }, null, 2));
}

function readAllResults(): any[] {
  if (!fs.existsSync(RESULTS_DIR)) return [];
  const files = fs.readdirSync(RESULTS_DIR).filter(f => f.endsWith('.json'));
  const results: any[] = [];
  for (const file of files) {
    try {
      results.push(JSON.parse(fs.readFileSync(path.join(RESULTS_DIR, file), 'utf-8')));
    } catch { /* skip */ }
  }
  if (results.length > 0) {
    try { fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2)); } catch { /* ignore */ }
  }
  return results;
}

test.describe('⭐ Mini-Mall Rental Flow Tests', () => {
  test.describe.configure({ retries: 0 });

  const rentalConfigs = getMiniMallRentalUrls();

  for (const config of rentalConfigs) {
    test(`⭐ Mini-Mall ${config.fms} rent flow — ${config.label}`, async ({
      page,
      storageListingPage,
      miniMallRentalPage,
      companyNameFromUrl,
    }) => {
      // No timeout — captcha requires manual interaction
      test.setTimeout(0);

      const companyName = companyNameFromUrl(config.url);
      let fms = config.fms;

      console.log(`\n${'⭐'.repeat(40)}`);
      console.log(`⭐ MINI-MALL RENTAL FLOW TEST`);
      console.log(`⭐ FMS: ${fms}`);
      console.log(`⭐ Location: ${config.label}`);
      console.log(`⭐ URL: ${config.url}`);
      console.log(`${'⭐'.repeat(40)}\n`);

      let testResult = {
        url: config.url,
        company: companyName,
        fms: fms,
        flowResult: '',
        success: false,
        step: '',
      };

      try {
        // ============================================
        // PRE-STEP: Corp Code Setup (staging SiteLink only)
        // ============================================
        const browser = page.context().browser();
        if (browser) {
          await setupCorpCodeIfNeeded(browser, config.url);
        }

        // ============================================
        // STEP 1: Navigate to storage listing page
        // ============================================
        testResult.step = 'Navigation';
        console.log('\n📍 STEP 1: Navigating to storage listing page...');
        await storageListingPage.navigateWithCacheBusting(config.url);
        console.log('✅ Navigation completed');

        // ============================================
        // STEP 2: Click RENT button
        // ============================================
        testResult.step = 'Rent Button';
        console.log('\n📍 STEP 2: Clicking RENT button...');
        await storageListingPage.clickRentButton();
        console.log('✅ RENT button clicked');

        await page.waitForTimeout(3000);
        const postRentUrl = page.url();
        console.log(`   Navigated to: ${postRentUrl}`);

        // ============================================
        // RUNTIME FMS DETECTION (for custom/prod URLs)
        // ============================================
        if (postRentUrl.includes('/yardi/')) {
          fms = 'Yardi';
          testResult.fms = 'Yardi';
        } else if (config.fms === 'Yardi' && !postRentUrl.includes('/yardi/')) {
          // Config says Yardi but URL doesn't have /yardi/ — detect from page
          const detected = await miniMallRentalPage.detectFlowType();
          fms = detected;
          testResult.fms = detected;
        }

        console.log(`   🔀 Detected flow: ${fms}`);

        if (fms === 'SiteLink') {
          // ============================================
          // SITELINK FLOW
          // ============================================

          // STEP 3: Fill tenant details (Step 4)
          testResult.step = 'SiteLink Tenant Details';
          console.log('\n📍 STEP 3: Filling SiteLink tenant details...');
          await miniMallRentalPage.fillSiteLinkTenantDetails({
            firstName: SINGLE_PAGE_USER.firstName,
            lastName: SINGLE_PAGE_USER.lastName,
            email: SINGLE_PAGE_USER.email,
            phone: SINGLE_PAGE_USER.phone,
            address: SINGLE_PAGE_USER.address,
            city: SINGLE_PAGE_USER.city,
            province: SINGLE_PAGE_USER.province.alberta,
            zipCode: SINGLE_PAGE_USER.zipCode,
          });

          // STEP 4: hCaptcha
          testResult.step = 'SiteLink Captcha';
          console.log('\n�� STEP 4: hCaptcha — waiting for manual solve...');
          await miniMallRentalPage.waitForManualCaptcha(`⭐ Mini Mall SiteLink — ${config.label}`);

          // STEP 5: Click CONTINUE TO NEXT STEP
          testResult.step = 'SiteLink Continue';
          console.log('\n📍 STEP 5: Clicking CONTINUE TO NEXT STEP...');
          await miniMallRentalPage.clickContinueToNextStep(companyName);

          // STEP 6: Payment + RENT NOW + capture error
          testResult.step = 'SiteLink Payment';
          console.log('\n📍 STEP 6: Filling payment and submitting...');
          const errorMessage = await miniMallRentalPage.fillSiteLinkPaymentAndSubmit({
            cardNumber: SINGLE_PAGE_USER.paymentInfo.cardNumber,
            expiryDate: SINGLE_PAGE_USER.paymentInfo.expiryDate,
            cvv: SINGLE_PAGE_USER.paymentInfo.cvv,
          });

          testResult.flowResult = errorMessage;
          testResult.success = true;

          if (testResult.flowResult.includes('Alternate contact must have a first name')) {
            console.log(`\n🚩 UNEXPECTED ERROR: "Alternate contact" — needs attention!`);
            testResult.flowResult = `🚩 [NEEDS ATTENTION] ${testResult.flowResult}`;
          }

        } else {
          // ============================================
          // YARDI FLOW
          // ============================================

          // STEP 3: Fill tenant details
          testResult.step = 'Yardi Tenant Details';
          console.log('\n📍 STEP 3: Filling Yardi tenant details...');
          await miniMallRentalPage.fillYardiTenantDetails({
            firstName: SINGLE_PAGE_USER.firstName,
            lastName: SINGLE_PAGE_USER.lastName,
            email: SINGLE_PAGE_USER.email,
            phone: SINGLE_PAGE_USER.phone,
            address: '6255 Towncenter Drive',
          });

          // STEP 4: hCaptcha
          testResult.step = 'Yardi Captcha';
          console.log('\n📍 STEP 4: hCaptcha — waiting for manual solve...');
          await miniMallRentalPage.waitForManualCaptcha(`⭐ Mini Mall Yardi — ${config.label}`);

          // STEP 5: Click CONTINUE TO NEXT STEP
          testResult.step = 'Yardi Continue';
          console.log('\n📍 STEP 5: Clicking CONTINUE TO NEXT STEP...');
          await miniMallRentalPage.clickContinueToNextStep(companyName);

          // STEP 6: Wait for redirect to securecafenet.com
          testResult.step = 'Yardi Redirect';
          console.log('\n📍 STEP 6: Waiting for Yardi redirect...');
          const redirectResult = await miniMallRentalPage.waitForYardiRedirect();

          testResult.flowResult = redirectResult;
          testResult.success = redirectResult.startsWith('SUCCESS');
        }

        // ============================================
        // Test completed
        // ============================================
        const statusIcon = testResult.success ? '✅' : '❌';
        console.log(`\n${statusIcon} TEST COMPLETED FOR: ⭐ Mini Mall ${fms} — ${companyName}`);
        console.log(`📊 Result: ${testResult.flowResult}`);
        console.log(`${'⭐'.repeat(40)}\n`);

        writeResultToFile({
          url: config.url, company: companyName, fms,
          flowResult: testResult.flowResult, success: testResult.success,
          attempt: test.info().retry,
        });

      } catch (error) {
        testResult.success = false;
        testResult.flowResult = `${testResult.step} failed: ${error instanceof Error ? error.message : String(error)}`;

        console.error(`\n❌ TEST FAILED FOR: ⭐ Mini Mall ${fms} — ${companyName}`);
        console.error(`📍 Failed at step: ${testResult.step}`);
        console.error(`💥 Error: ${testResult.flowResult}`);
        console.log(`${'⭐'.repeat(40)}\n`);

        if (!page.isClosed()) {
          try {
            const screenshotFile = await takeErrorScreenshot(
              page,
              `minimall-${fms}-${companyName.replace(/\s/g, '-').toLowerCase()}`
            );
            console.log(`📸 Screenshot saved: ${screenshotFile}`);
          } catch (screenshotError) {
            console.warn(`⚠️ Could not save screenshot: ${screenshotError}`);
          }
        }

        writeResultToFile({
          url: config.url, company: companyName, fms,
          flowResult: testResult.flowResult, success: false,
          attempt: test.info().retry,
        });

        throw error;
      }
    });
  }
});

// Clean up results before all workers start
test.beforeAll(() => {
  if (!fs.existsSync(LOCK_FILE)) {
    try {
      fs.writeFileSync(LOCK_FILE, String(process.pid), { flag: 'wx' });
      if (fs.existsSync(RESULTS_DIR)) {
        const oldFiles = fs.readdirSync(RESULTS_DIR);
        for (const f of oldFiles) { try { fs.unlinkSync(path.join(RESULTS_DIR, f)); } catch { /* ignore */ } }
      }
      if (fs.existsSync(RESULTS_FILE)) fs.unlinkSync(RESULTS_FILE);
    } catch { /* another worker already created lock */ }
  }
});
