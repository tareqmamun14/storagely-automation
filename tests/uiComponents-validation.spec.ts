import { test, expect } from '@playwright/test';
import { StorageSitePage } from '../pages/HomePage';
import { ContactPage, ContactFormResult } from '../pages/ContactPage';
import { StorageListingPage } from '../pages/StorageListingPage';
import { getStorageSiteUrls, CURRENT_ENVIRONMENT, Environment, STOREROCKET_SITES, STAGING_CONTACT_SKIP, CONTACT_CAPTCHA_SITES } from '../configs/urls';
import * as fs from 'fs';
import * as path from 'path';

// ============================================
// SITE VERIFICATION TEST SUITE
// ============================================
// Combines: Home Page, Contact Page, Storage Location Page tests
// Add more common component/page tests as new describe blocks below.
// ============================================

// --------------- Mini Mall Detection ---------------

const MINI_MALL_TAG = '⭐ MINI MALL';

function isMiniMall(urlOrName: string): boolean {
  return urlOrName.toLowerCase().includes('minimall') || urlOrName.toLowerCase().includes('mini mall') || urlOrName.toLowerCase().includes('mini-mall');
}

function clientLabel(name: string): string {
  return isMiniMall(name) ? `${MINI_MALL_TAG} | ${name}` : name;
}

// --------------- Environment Helpers ---------------

const isStaging = CURRENT_ENVIRONMENT === Environment.STAGING;
const envTag = isStaging ? '[STAGING]' : '[PROD]';

function isStorerocket(url: string): boolean {
  return STOREROCKET_SITES.some(s => url.toLowerCase().includes(s));
}

function isStagingContactSkip(url: string): boolean {
  return isStaging && STAGING_CONTACT_SKIP.some(s => url.toLowerCase().includes(s));
}

function isContactCaptchaSite(url: string): boolean {
  return CONTACT_CAPTCHA_SITES.some(s => url.toLowerCase().includes(s));
}

const siteUrls = getStorageSiteUrls();

// --------------- Shared Helpers ---------------

function addCacheBustingParam(url: string): string {
  const skipCacheBust = ['minimallstorage.com', 'mini-mall-storage', '10federal', 'bluebird'];
  if (skipCacheBust.some(site => url.toLowerCase().includes(site))) {
    return url;
  }
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2);
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}_cache_bust=${timestamp}_${randomString}`;
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim().toLowerCase();
}

function isTextMatch(actualText: string, expectedText: string): boolean {
  const normalizedActual = normalizeText(actualText);
  const normalizedExpected = normalizeText(expectedText);
  const expectedWords = normalizedExpected.split(' ');
  return expectedWords.every(word => normalizedActual.includes(word));
}

// --------------- Shared Results File (cross-worker) ---------------

const UI_RESULTS_FILE = path.join(process.cwd(), 'test-results', 'ui-components-results.json');

interface UITestResult {
  module: string;
  name: string;
  status: 'PASSED' | 'FAILED';
  detail?: string;
  timestamp: string;
}

function pushResult(module: string, name: string, status: 'PASSED' | 'FAILED', detail?: string) {
  const resultsDir = path.dirname(UI_RESULTS_FILE);
  if (!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir, { recursive: true });

  let results: UITestResult[] = [];
  if (fs.existsSync(UI_RESULTS_FILE)) {
    try { results = JSON.parse(fs.readFileSync(UI_RESULTS_FILE, 'utf-8')); } catch { results = []; }
  }

  // Upsert by module + name (retry overwrites previous failure)
  const key = `${module}::${name}`;
  const idx = results.findIndex(r => `${r.module}::${r.name}` === key);
  const entry: UITestResult = { module, name, status, detail, timestamp: new Date().toISOString() };
  if (idx !== -1) { results[idx] = entry; } else { results.push(entry); }

  fs.writeFileSync(UI_RESULTS_FILE, JSON.stringify(results, null, 2));
}

function readAllUIResults(): UITestResult[] {
  if (!fs.existsSync(UI_RESULTS_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(UI_RESULTS_FILE, 'utf-8')); } catch { return []; }
}

// Clear results file at start of this test file (only first worker to arrive)
try {
  const resultsDir = path.dirname(UI_RESULTS_FILE);
  if (!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir, { recursive: true });
  // Only clear if file is from a previous run (older than 30 seconds)
  if (fs.existsSync(UI_RESULTS_FILE)) {
    const stat = fs.statSync(UI_RESULTS_FILE);
    if (Date.now() - stat.mtimeMs > 30000) {
      fs.writeFileSync(UI_RESULTS_FILE, '[]');
    }
  } else {
    fs.writeFileSync(UI_RESULTS_FILE, '[]');
  }
} catch { /* ignore */ }



// ============================================
// 1. HOME PAGE VERIFICATION
// ============================================
test.describe('[Home Page] Landing Page Verification', () => {
  test.setTimeout(180000);

  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
  });

  for (const url of siteUrls) {
    test(`[Home Page] Verify landing page for ${clientLabel(url)}`, async ({ page }) => {
      console.log(`\n📦 MODULE: Home Page ${envTag}`);
      if (isStorerocket(url)) {
        console.log(`⚠️  SKIPPED — Storerocket required (no staging equivalent)`);
        pushResult('Home Page', clientLabel(url), 'PASSED', 'Storerocket — skipped in staging');
        test.skip();
        return;
      }
      if (isMiniMall(url)) console.log(`⭐ MINI MALL CLIENT DETECTED`);
      console.log(`🔍 Testing landing page: ${url}`);
      const urlWithCacheBust = addCacheBustingParam(url);

      try {
        const storagePage = new StorageSitePage(page);
        await storagePage.goto(urlWithCacheBust);
        await storagePage.verifyLandingPage(url);

        console.log(`✅ Landing page verification passed for: ${url}`);
        pushResult('Home Page', clientLabel(url), 'PASSED');
      } catch (error) {
        const msg = (error as Error).message || 'Unknown error';
        console.log(`❌ Landing page verification failed for: ${url}`);
        console.log(`   Error: ${msg}`);
        pushResult('Home Page', clientLabel(url), 'FAILED', msg);
        throw error;
      }
    });
  }
});

// ============================================
// 2. CONTACT PAGE — FULL VERIFICATION + FORM SUBMISSION (Prod only)
// ============================================
test.describe('[Contact Page] Full Verification', () => {
  test.setTimeout(180000);

  for (const url of siteUrls) {
    test(`[Contact Page] Verify & submit contact form for ${clientLabel(url)}`, async ({ page }) => {
      // Unlimited timeout for CAPTCHA sites (user needs to solve manually)
      if (isContactCaptchaSite(url)) test.setTimeout(0);

      console.log(`\n📦 MODULE: Contact Page ${envTag}`);
      if (isStorerocket(url)) {
        console.log(`⚠️  SKIPPED — Storerocket required (no staging equivalent)`);
        pushResult('Contact Page', clientLabel(url), 'PASSED', 'Storerocket — skipped');
        test.skip();
        return;
      }
      if (isStagingContactSkip(url)) {
        console.log(`⚠️  SKIPPED — Contact page empty/unavailable in staging`);
        pushResult('Contact Page', clientLabel(url), 'PASSED', 'Contact page unavailable in staging — skipped');
        test.skip();
        return;
      }
      if (isMiniMall(url)) console.log(`⭐ MINI MALL CLIENT DETECTED`);
      console.log(`🔍 Testing contact page: ${url}`);
      const contactPage = new ContactPage(page);

      let verificationPassed = false;
      let formResult: ContactFormResult | null = null;

      // --- STEP 1: Navigate & verify contact page elements ---
      try {
        await contactPage.navigateToContactPage(url);
        const verificationResult = await contactPage.verifyContactPageContent(url);

        if (!verificationResult.found) {
          throw new Error('No contact page elements found.');
        }
        verificationPassed = true;
        console.log(`✅ Contact page element verification passed`);
        console.log(`   Elements found: ${verificationResult.foundElements?.join(', ')}`);
      } catch (error) {
        const msg = (error as Error).message || 'Unknown error';
        console.log(`❌ Contact page verification failed for: ${url}`);
        console.log(`   Error: ${msg}`);
        pushResult('Contact Page', clientLabel(url), 'FAILED', `Element verification failed: ${msg}`);
        return; // No point trying form submission if verification fails
      }

      // --- STEP 2: Fill & submit contact form (PROD only) ---
      if (!isStaging) {
        try {
          console.log(`\n   📝 Attempting contact form fill & submit...`);
          formResult = await contactPage.verifyAndSubmitContactForm(url, isContactCaptchaSite(url));

          // Build detail string
          const detailParts: string[] = [];
          detailParts.push(`Elements: OK`);

          if (!formResult.hasForm) {
            detailParts.push(`Form: not present (info-only page)`);
          } else {
            detailParts.push(`Fields: ${formResult.fieldsFilled.join(', ') || 'none filled'}`);
            detailParts.push(`Submit: ${formResult.submitOutcome}`);
            if (formResult.successMessage) detailParts.push(`Msg: ${formResult.successMessage.substring(0, 60)}`);
            if (formResult.errorMessage) detailParts.push(`Err: ${formResult.errorMessage.substring(0, 60)}`);
            if (formResult.fieldsWithIssues.length > 0) detailParts.push(`Issues: ${formResult.fieldsWithIssues.join('; ')}`);
          }
          const detail = detailParts.join(' | ');

          // Determine overall status
          // The goal of the contact page is to SEND. If submission didn't succeed, it's a FAIL.
          if (!formResult.hasForm) {
            // No form on the page — can't send contact = FAIL
            console.log(`❌ No contact form found — cannot send contact: ${url}`);
            pushResult('Contact Page', clientLabel(url), 'FAILED', detail);
          } else if (formResult.submitOutcome === 'SUCCESS') {
            console.log(`✅ Contact form submitted successfully for: ${url}`);
            pushResult('Contact Page', clientLabel(url), 'PASSED', detail);
          } else {
            console.log(`❌ Contact form submission FAILED for: ${url}`);
            pushResult('Contact Page', clientLabel(url), 'FAILED', detail);
          }

          // --- Submitted data summary ---
          if (formResult.hasForm && Object.keys(formResult.submittedData).length > 0) {
            console.log(`\n   📋 SUBMITTED DATA:`);
            for (const [field, value] of Object.entries(formResult.submittedData)) {
              console.log(`      ${field}: ${value}`);
            }
            console.log(`   📋 OUTCOME: ${formResult.submitOutcome}`);
            if (formResult.successMessage) console.log(`   ✅ CONFIRMATION: ${formResult.successMessage}`);
            if (formResult.errorMessage) console.log(`   ❌ ERROR: ${formResult.errorMessage}`);
          }
        } catch (error) {
          const msg = (error as Error).message || 'Unknown error';
          console.log(`❌ Contact form submission error for: ${url}`);
          console.log(`   Error: ${msg}`);
          pushResult('Contact Page', clientLabel(url), 'FAILED', `Elements: OK | Form submission error: ${msg}`);
        }
      } else {
        // Staging — only element verification
        pushResult('Contact Page', clientLabel(url), 'PASSED', 'Elements: OK (staging — form submission skipped)');
        console.log(`✅ Contact page verification passed for: ${url} (staging — form submission skipped)`);
      }
    });
  }
});

// ============================================
// 3. STORAGE LOCATION PAGE TESTS
// ============================================
// All location-page-level validations: Offer Text, Debug Discount, Banner Loading
// Add more location page validations as new describe blocks inside this section.
// ============================================

const discountChecks = isStaging ? [
  {
    customer: 'First Storage : StorEDGE',
    url: 'https://test.staging.storagely-api.com/first-storage/storage-units/north-carolina/north-wilkesboro/d-street',
    expected: 'Sale'
  },
  {
    customer: 'Mini Mall : SiteLink',
    url: 'https://test.staging.storagely-api.com/mini-mall-storage/storage-units/alabama/courtland/highway-33',
    expected: 'First Month Free'
  }
] : [
  {
    customer: 'First Storage : StorEDGE',
    url: 'https://www.firststorage.com/storage-units/north-carolina/north-wilkesboro/d-street',
    expected: 'Sale'
  },
  {
    customer: 'Mini Mall : SiteLink',
    url: 'https://minimallstorage.com/storage-units/alabama/courtland/highway-33',
    expected: 'First Month Free'
  }
];

// --- 3a. Offer Text ---
test.describe('[Location Page] Verify Offer Text', () => {
  for (const { customer, url, expected } of discountChecks) {
    test(`[Location Page] Verify Offer Text ${clientLabel(customer)}`, async ({ page }) => {
      console.log(`\n📦 MODULE: Location Page > Offer Text ${envTag}`);
      if (isMiniMall(customer)) console.log(`⭐ MINI MALL CLIENT DETECTED`);
      console.log(`🔍 Testing ${customer}`);
      console.log(`📋 Expected: "${expected}"`);

      let matched = false;
      let foundTexts: string[] = [];
      let actualMatchedText = '';

      try {
        const urlWithCacheBust = addCacheBustingParam(url);
        await page.goto(urlWithCacheBust, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(2000);

        const discountSelectors = [
          '.page_discount', '.offer_content', '.offer__content', '.discount', '.promo', '.banner',
          '[class*="discount"]', '[class*="offer"]', '[class*="promo"]'
        ];

        for (const selector of discountSelectors) {
          try {
            const elements = page.locator(selector);
            const count = await elements.count();
            if (count > 0) {
              for (let i = 0; i < count; i++) {
                try {
                  const element = elements.nth(i);
                  if (await element.isVisible()) {
                    const text = await element.innerText();
                    if (text && text.trim().length > 0) {
                      foundTexts.push(`${selector}[${i}]: "${text.trim()}"`);
                      if (isTextMatch(text, expected)) {
                        matched = true;
                        actualMatchedText = text.trim();
                        break;
                      }
                    }
                  }
                } catch { continue; }
              }
              if (matched) break;
            }
          } catch { continue; }
        }

        if (!matched) {
          const pageText = await page.textContent('body');
          if (pageText && isTextMatch(pageText, expected)) {
            matched = true;
            actualMatchedText = `Found in page content: "${expected}"`;
          }
        }

        if (matched) {
          console.log(`✅ ${customer} | Found: "${actualMatchedText}"`);
          pushResult('Offer Text', clientLabel(customer), 'PASSED', actualMatchedText);
        } else {
          pushResult('Offer Text', clientLabel(customer), 'FAILED', foundTexts.join(' | ') || 'No discount text found');
        }
      } catch (error) {
        const msg = (error as Error).message || 'Unknown error';
        console.log(`💥 ${customer} | Error: ${msg}`);
        pushResult('Offer Text', clientLabel(customer), 'FAILED', msg);
      }

      expect(matched, `Expected discount text "${expected}" not found for ${customer}`).toBeTruthy();
    });
  }
});

// --- 3b. Debug Discount Elements ---
test.describe('[Location Page] Debug Discount Elements', () => {
  test('[Location Page] Debug discount elements structure (Mini Mall)', async ({ page }) => {
    console.log(`\n📦 MODULE: Location Page > Debug Discount Elements ${envTag}`);
    console.log(`⭐ MINI MALL CLIENT DETECTED`);
    const url = isStaging
      ? 'https://test.staging.storagely-api.com/mini-mall-storage/storage-units/alabama/courtland/highway-33'
      : 'https://minimallstorage.com/storage-units/alabama/courtland/highway-33';
    const urlWithCacheBust = addCacheBustingParam(url);
    console.log(`🐛 Debug navigating to: ${urlWithCacheBust}`);

    await page.goto(urlWithCacheBust, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const allDiscountElements = await page.locator(
      '[class*="discount"], [class*="offer"], [class*="promo"], [class*="banner"], .page_discount'
    ).all();

    console.log(`Found ${allDiscountElements.length} potential discount elements:`);
    for (let i = 0; i < allDiscountElements.length; i++) {
      try {
        const element = allDiscountElements[i];
        const text = await element.innerText();
        const className = await element.getAttribute('class');
        const isVisible = await element.isVisible();
        console.log(`Element ${i + 1}: Class=${className} | Visible=${isVisible} | Text="${text}"`);
      } catch {
        console.log(`Element ${i + 1}: Error reading element`);
      }
    }
  });
});

// --- 3c. Banner Loading ---
const bannerChecks = isStaging ? [
  {
    client: 'Radiant Storage - Montgomery',
    url: 'https://test.staging.storagely-api.com/radiant-storage/storage-units/alabama/montgomery/east-south-blvd'
  },
  {
    client: 'Storage Star - Cloverdale',
    url: 'https://test.staging.storagely-api.com/storage-star/storage-units/california/cloverdale/industrial-drive'
  },
  {
    client: 'Best Box Storage - Pensacola',
    url: 'https://test.staging.storagely-api.com/bestbox-storage/storage-units/florida/pensacola/north-palafox'
  },
  {
    client: 'First Storage - E Market St',
    url: 'https://test.staging.storagely-api.com/first-storage/storage-units/north-carolina/greensboro/east-market-street'
  },
  {
    client: 'Mini Mall Storage - Airdrie',
    url: 'https://test.staging.storagely-api.com/mini-mall-storage/storage-units/alberta/airdrie/east-lake-road-ne'
  }
] : [
  {
    client: 'Storage Star - Cloverdale',
    url: 'https://www.storagestar.com/storage-units/california/cloverdale/industrial-drive'
  },
  {
    client: 'First Storage - E Market St',
    url: 'https://www.firststorage.com/storage-units/north-carolina/greensboro/east-market-street'
  },
  {
    client: 'Mini Mall Storage - Airdrie',
    url: 'https://minimallstorage.com/storage-units/alberta/airdrie/east-lake-road-ne'
  }
];

test.describe('[Location Page] Verify Banner Loading', () => {
  for (const { client, url } of bannerChecks) {
    test(`[Location Page] Verify banner loading for ${clientLabel(client)}`, async ({ page }) => {
      console.log(`\n📦 MODULE: Location Page > Banner Loading ${envTag}`);
      if (isMiniMall(client)) console.log(`⭐ MINI MALL CLIENT DETECTED`);
      console.log(`🔍 Testing banner for: ${client}`);
      const storagePage = new StorageListingPage(page);
      let bannerResult;

      try {
        await storagePage.navigateWithCacheBusting(url);
        bannerResult = await storagePage.checkBannerStatus();

        pushResult('Banner Loading', clientLabel(client), bannerResult.status, bannerResult.message);
      } catch (error) {
        pushResult('Banner Loading', clientLabel(client), 'FAILED', 'Test execution failed');
        bannerResult = { status: 'FAILED' as const, message: 'Test execution failed' };
      }

      expect(bannerResult.status, `Banner loading verification failed for ${client}: ${bannerResult?.message || 'Unknown error'}`).toBe('PASSED');
    });
  }
});

// ============================================
// GRAND SUMMARY (prints after ALL modules)
// ============================================
test.afterAll(() => {
  // Read consolidated results from shared file (all workers combined)
  const allResults = readAllUIResults();
  if (allResults.length === 0) return;

  // Rebuild module buckets from flat results
  const moduleMap = new Map<string, UITestResult[]>();
  for (const r of allResults) {
    if (!moduleMap.has(r.module)) moduleMap.set(r.module, []);
    moduleMap.get(r.module)!.push(r);
  }
  const modules = [...moduleMap.entries()].map(([module, tests]) => ({ module, tests }));

  const totalPassed = allResults.filter(r => r.status === 'PASSED').length;
  const totalFailed = allResults.filter(r => r.status === 'FAILED').length;
  const totalTests = totalPassed + totalFailed;

  console.log('\n\n');
  console.log('#'.repeat(80));
  console.log('##  📊 UI COMPONENTS VALIDATION — GRAND SUMMARY');
  console.log('#'.repeat(80));

  // --- Module-level overview ---
  console.log('\n📦 MODULE OVERVIEW:');
  console.log('-'.repeat(80));
  console.log(`   ${'Module'.padEnd(25)} | ${'Passed'.padEnd(8)} | ${'Failed'.padEnd(8)} | Total  | Status`);
  console.log('-'.repeat(80));

  for (const m of modules) {
    const p = m.tests.filter(t => t.status === 'PASSED').length;
    const f = m.tests.filter(t => t.status === 'FAILED').length;
    const icon = f === 0 ? '✅' : '❌';
    console.log(`   ${m.module.padEnd(25)} | ${String(p).padEnd(8)} | ${String(f).padEnd(8)} | ${String(p + f).padEnd(6)} | ${icon} ${f === 0 ? 'ALL PASSED' : `${f} FAILED`}`);
  }

  console.log('-'.repeat(80));
  console.log(`   ${'TOTAL'.padEnd(25)} | ${String(totalPassed).padEnd(8)} | ${String(totalFailed).padEnd(8)} | ${String(totalTests).padEnd(6)} | ${totalFailed === 0 ? '✅ ALL CLEAR' : `❌ ${totalFailed} ISSUE(S)`}`);
  console.log('-'.repeat(80));

  // --- Per-Client x Module matrix ---
  console.log('\n\n📋 ALL CLIENT RESULTS (per module):');
  console.log('='.repeat(80));

  // Collect unique client names across all modules (exclude Mini Mall — shown in dedicated section below)
  const clientNames = [...new Set(modules.flatMap(m => m.tests.map(t => t.name)))].filter(n => !isMiniMall(n));

  for (const client of clientNames) {
    const resultsForClient = modules.map(m => {
      const t = m.tests.find(t => t.name === client);
      return { module: m.module, ...t };
    }).filter(r => r.status);

    const anyFailed = resultsForClient.some(r => r.status === 'FAILED');
    const clientIcon = anyFailed ? '❌' : '✅';

    console.log(`\n   ${clientIcon} ${client}`);
    for (const r of resultsForClient) {
      const statusIcon = r.status === 'PASSED' ? '✅' : '🚩';
      const detailStr = r.detail ? ` → ${r.detail.substring(0, 80)}` : '';
      console.log(`      ${statusIcon} ${r.module}${detailStr}`);
    }
  }

  console.log('\n' + '='.repeat(80));

  // --- Failures call-out section ---
  const allFailed = modules.flatMap(m => m.tests.filter(t => t.status === 'FAILED').map(t => ({ ...t, module: m.module })));

  if (allFailed.length > 0) {
    console.log('\n\n');
    console.log('🚩'.repeat(20));
    console.log('❌  FAILURES THAT NEED ATTENTION:');
    console.log('🚩'.repeat(20));

    allFailed.forEach((f, i) => {
      console.log(`\n   ${i + 1}. ❌ [${f.module}] ${f.name}`);
      if (f.detail) console.log(`      ↳ ${f.detail}`);
    });

    console.log('\n' + '🚩'.repeat(20));
  } else {
    console.log('\n\n🎉 ALL TESTS PASSED — NO FAILURES!\n');
  }

  // --- Mini Mall consolidated section ---
  const allMiniMall = modules.flatMap(m =>
    m.tests.filter(t => isMiniMall(t.name)).map(t => ({ ...t, module: m.module }))
  );

  if (allMiniMall.length > 0) {
    const mmPassed = allMiniMall.filter(t => t.status === 'PASSED').length;
    const mmFailed = allMiniMall.filter(t => t.status === 'FAILED').length;

    console.log('\n\n');
    console.log('⭐'.repeat(20));
    console.log('⭐  MINI MALL STORAGE — DEDICATED REPORT');
    console.log('⭐'.repeat(20));
    console.log(`\n   Results: ✅ ${mmPassed} Passed   ❌ ${mmFailed} Failed   📋 ${allMiniMall.length} Total`);
    console.log('-'.repeat(60));

    for (const t of allMiniMall) {
      const icon = t.status === 'PASSED' ? '✅' : '🚩';
      console.log(`   ${icon} [${t.module}] ${t.name}`);
      if (t.detail) console.log(`      ↳ ${t.detail}`);
    }

    if (mmFailed > 0) {
      console.log('\n   ⚠️  MINI MALL HAS FAILURES — REVIEW ABOVE');
    } else {
      console.log('\n   🎉 MINI MALL — ALL CLEAR!');
    }

    console.log('-'.repeat(60));
    console.log('⭐'.repeat(20));
  }

  console.log('\n' + '#'.repeat(80) + '\n');
});
