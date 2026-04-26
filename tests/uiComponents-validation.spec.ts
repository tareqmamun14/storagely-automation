import { test, expect } from '@playwright/test';
import { StorageSitePage } from '../pages/HomePage';
import { ContactPage, ContactFormResult } from '../pages/ContactPage';
import { StorageListingPage } from '../pages/StorageListingPage';
import { FAQPage, FAQTestResult } from '../pages/FAQPage';
import { PricingPage, PricingTestResult } from '../pages/PricingPage';
import { getStorageSiteUrls, CURRENT_ENVIRONMENT, Environment, STOREROCKET_SITES, STAGING_CONTACT_SKIP, CONTACT_SKIP_SITES, FAQ_SKIP_SITES, CONTACT_CAPTCHA_SITES, PRICING_VALIDATION_LOCATIONS, UNIT_FEATURES_CONFLICT_LOCATIONS } from '../configs/urls';
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
  return (isStaging && STAGING_CONTACT_SKIP.some(s => url.toLowerCase().includes(s)))
    || CONTACT_SKIP_SITES.some(s => url.toLowerCase().includes(s));
}

function isContactCaptchaSite(url: string): boolean {
  return CONTACT_CAPTCHA_SITES.some(s => url.toLowerCase().includes(s));
}

// Sites whose FAQ page has NO accordion (flat Q&A layout) — test runs but failure is expected
const FAQ_NO_ACCORDION_SITES: string[] = [];

function isFaqExpectedFail(url: string): boolean {
  return FAQ_NO_ACCORDION_SITES.some(s => url.toLowerCase().includes(s));
}

function isFaqSkip(url: string): boolean {
  return FAQ_SKIP_SITES.some(s => url.toLowerCase().includes(s));
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
  status: 'PASSED' | 'FAILED' | 'EXPECTED';
  detail?: string;
  timestamp: string;
}

function pushResult(module: string, name: string, status: 'PASSED' | 'FAILED' | 'EXPECTED', detail?: string) {
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
        console.log(`⚠️  SKIPPED — Contact page has no form or is unavailable`);
        pushResult('Contact Page', clientLabel(url), 'PASSED', 'Contact page has no form — skipped');
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
            // Only show errorMessage if the overall outcome was not SUCCESS (avoids printing success toasts classified as errors)
            if (formResult.errorMessage && formResult.submitOutcome !== 'SUCCESS') console.log(`   ❌ ERROR: ${formResult.errorMessage}`);
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
// 4. FAQ PAGE — ACCORDION EXPANSION VERIFICATION
// ============================================
test.describe('[FAQ Page] Accordion Expansion Verification', () => {
  test.setTimeout(180000);

  for (const url of siteUrls) {
    test(`[FAQ Page] Verify FAQ accordion for ${clientLabel(url)}`, async ({ page }) => {
      console.log(`\n📦 MODULE: FAQ Page ${envTag}`);
      if (isMiniMall(url)) console.log(`⭐ MINI MALL CLIENT DETECTED`);
      console.log(`🔍 Testing FAQ page: ${url}`);

      if (isFaqSkip(url)) {
        console.log(`⚠️  SKIPPED — FAQ page has no accordion on this site`);
        pushResult('FAQ Page', clientLabel(url), 'PASSED', 'FAQ page has no accordion — skipped');
        test.skip();
        return;
      }

      const faqPage = new FAQPage(page);
      let faqResult: FAQTestResult | null = null;

      try {
        await faqPage.navigateToFAQPage(url);
        faqResult = await faqPage.verifyFAQAccordion();

        // Build detail string
        const parts: string[] = [];
        if (!faqResult.hasFaqPage) {
          parts.push('FAQ page not found');
        } else {
          parts.push(`Page: OK`);
          parts.push(`Type: ${faqResult.accordionType}`);
          parts.push(`Questions: ${faqResult.totalQuestions}`);
          if (faqResult.clickedQuestion) parts.push(`Clicked: "${faqResult.clickedQuestion.substring(0, 50)}"`);
          parts.push(`Expanded: ${faqResult.expanded ? 'YES' : 'NO'}`);
        }
        if (faqResult.error) parts.push(`Err: ${faqResult.error}`);
        const detail = parts.join(' | ');

        if (faqResult.expanded) {
          console.log(`✅ FAQ accordion verified for: ${url}`);
          pushResult('FAQ Page', clientLabel(url), 'PASSED', detail);
        } else if (isFaqExpectedFail(url)) {
          console.log(`⚠️  FAQ accordion EXPECTED FAIL for: ${url} (no accordion on this site)`);
          pushResult('FAQ Page', clientLabel(url), 'EXPECTED', detail);
        } else {
          console.log(`❌ FAQ accordion FAILED for: ${url}`);
          pushResult('FAQ Page', clientLabel(url), 'FAILED', detail);
        }

        // Print summary
        console.log(`\n   📋 FAQ RESULT:`);
        console.log(`      Page found: ${faqResult.hasFaqPage ? 'YES' : 'NO'}`);
        console.log(`      Accordion type: ${faqResult.accordionType}`);
        console.log(`      Total questions: ${faqResult.totalQuestions}`);
        console.log(`      Clicked: "${faqResult.clickedQuestion}"`);
        console.log(`      Expanded: ${faqResult.expanded ? '✅ YES' : '❌ NO'}`);
        if (faqResult.error) console.log(`      Error: ${faqResult.error}`);

        if (!isFaqExpectedFail(url)) {
          expect(faqResult.expanded, `FAQ accordion expansion failed for ${url}: ${faqResult.error || 'did not expand'}`).toBeTruthy();
        }
      } catch (error) {
        const msg = (error as Error).message || 'Unknown error';
        if (!faqResult) {
          console.log(`❌ FAQ page error for: ${url} — ${msg}`);
          pushResult('FAQ Page', clientLabel(url), 'FAILED', msg);
        }
        throw error;
      }
    });
  }
});

// ============================================
// 5. LOCATION PAGE — UNIT PRICING VALIDATION
// ============================================
// For each location: verify dual-price units have first price < second price.
// First price = promo / web rate. Second price = standard / after promo rate.
// ============================================
test.describe('[Location Page] Unit Pricing Validation', () => {
  test.setTimeout(180000);

  for (const loc of PRICING_VALIDATION_LOCATIONS) {
    test(`[Unit Pricing] ${loc.label} [${loc.fms}/${loc.version}]`, async ({ page }) => {
      console.log(`\n📦 MODULE: Unit Pricing ${envTag}`);
      console.log(`🔍 Location: ${loc.label}`);
      console.log(`   FMS: ${loc.fms} | Version: ${loc.version}`);

      const pricingPage = new PricingPage(page);
      let pricingResult: PricingTestResult | null = null;

      try {
        await pricingPage.navigateToLocation(loc.url);
        pricingResult = await pricingPage.validatePricing();

        // Build detail string
        const parts: string[] = [];
        parts.push(`FMS: ${loc.fms}`);
        parts.push(`Ver: ${loc.version}`);
        parts.push(`Units: ${pricingResult.totalUnits}`);
        parts.push(`Dual: ${pricingResult.dualPriceUnits}`);
        parts.push(`Single: ${pricingResult.singlePriceUnits}`);

        if (pricingResult.dualPriceUnits > 0) {
          parts.push(`Valid: ${pricingResult.validCount}`);
          if (pricingResult.invalidCount > 0) {
            parts.push(`INVALID: ${pricingResult.invalidCount}`);
          }
        }
        if (pricingResult.error) parts.push(`Err: ${pricingResult.error}`);
        const detail = parts.join(' | ');

        if (pricingResult.invalidCount > 0) {
          // FAILED: at least one unit has first price >= second price
          console.log(`\n   🚨 ALERT: ${pricingResult.invalidCount} unit(s) have INVALID pricing (first price >= second price)`);
          for (const u of pricingResult.units.filter(u => !u.isValid)) {
            console.log(`      🚨 ${u.dimensions} ${u.unitType} → $${u.firstPrice} (${u.firstLabel}) ≥ $${u.secondPrice} (${u.secondLabel})`);
          }
          pushResult('Unit Pricing', loc.label, 'FAILED', detail);
        } else if (pricingResult.error) {
          console.log(`   ❌ Error: ${pricingResult.error}`);
          pushResult('Unit Pricing', loc.label, 'FAILED', detail);
        } else if (pricingResult.dualPriceUnits === 0) {
          // No dual-price units — still pass, but note it
          console.log(`   ℹ️  All units show single price — no comparison needed`);
          pushResult('Unit Pricing', loc.label, 'PASSED', detail);
        } else {
          console.log(`   ✅ All ${pricingResult.validCount} dual-price unit(s) have valid pricing (first < second)`);
          pushResult('Unit Pricing', loc.label, 'PASSED', detail);
        }

        // Print summary table
        console.log(`\n   📋 PRICING SUMMARY:`);
        console.log(`      Location: ${loc.label}`);
        console.log(`      URL: ${loc.url}`);
        console.log(`      Total units: ${pricingResult.totalUnits}`);
        console.log(`      Dual-price: ${pricingResult.dualPriceUnits} | Single-price: ${pricingResult.singlePriceUnits}`);
        if (pricingResult.dualPriceUnits > 0) {
          console.log(`      Valid pricing: ${pricingResult.validCount} | Invalid: ${pricingResult.invalidCount}`);
        }

        // Fail the test on invalid pricing
        if (pricingResult.invalidCount > 0) {
          const invalidUnits = pricingResult.units.filter(u => !u.isValid);
          const msg = invalidUnits.map(u => `${u.dimensions}: $${u.firstPrice} >= $${u.secondPrice}`).join('; ');
          expect(pricingResult.invalidCount, `PRICING ALERT for ${loc.label}: ${msg}`).toBe(0);
        }

        // Fail on errors (no units found etc)
        if (pricingResult.error) {
          expect(pricingResult.error, `Pricing validation error for ${loc.label}`).toBeUndefined();
        }

      } catch (error) {
        const msg = (error as Error).message || 'Unknown error';
        if (!pricingResult) {
          console.log(`   ❌ Pricing test error: ${msg}`);
          pushResult('Unit Pricing', loc.label, 'FAILED', msg);
        }
        throw error;
      }
    });
  }
});

// ============================================
// 6. LOCATION PAGE — UNIT FEATURE CONFLICT DETECTION
// ============================================
// Verifies no unit simultaneously shows contradictory feature labels.
//
// The bug: Yardi FMS attribute sync used substring matching, so
// "covered" matched inside "uncovered" — a unit could show BOTH
// "Covered" and "Uncovered" at the same time (and similarly,
// "Climate Controlled" + "Non-Climate Controlled" on the same unit).
//
// The FMS sync was patched to use strict whole-word matching.
// This test guards against that regression returning in any future update.
//
// HOW IT WORKS:
//   For each unit row (.listviewrows) on the page, the test extracts the
//   row text and checks for conflicting feature keyword pairs.
//   To avoid false positives from substrings (e.g., "Covered" inside
//   "Uncovered"), it masks the longer/containing string first before
//   testing for the shorter/contained string.
//
// CONFLICTING PAIRS DETECTED:
//   - "Climate Controlled"  +  "Non-Climate Controlled"  (same unit)
//   - "Covered"             +  "Uncovered"               (same unit)
//
// PRIMARY COVERAGE: Mini Mall (Yardi & SiteLink locations listed in
// UNIT_FEATURES_CONFLICT_LOCATIONS in configs/urls.ts)
// ============================================

// Conflicting feature pairs — extend if new contradictory combinations are ever found.
// For each pair: pair.b should be the string that CONTAINS pair.a as a substring
// (or they are fully independent). The mask-then-check logic below handles both cases.
const CONFLICTING_FEATURE_PAIRS: Array<{ a: string; b: string; note: string }> = [
  // Pair rule: 'b' must be the string that contains 'a' as a substring (or be fully
  // independent). The masking logic strips 'b' from the row text before checking for
  // 'a', preventing "Non-X" from triggering a false positive for "X".
  // To add a new pair: just append an entry — no other code changes needed.
  {
    a: 'Climate Controlled',
    b: 'Non-Climate Controlled',
    note: 'A unit cannot be both climate-controlled AND non-climate-controlled',
  },
  {
    a: 'Covered',
    b: 'Uncovered',
    note: 'A unit cannot be both covered AND uncovered',
  },
  {
    a: 'Drive Up',
    b: 'Interior Hallway',
    note: 'A unit cannot have both drive-up and interior hallway access — these are mutually exclusive access types',
  },
  {
    a: 'Heated',
    b: 'Non-Heated',
    note: 'A unit cannot be both heated and non-heated',
  },
];

test.describe('[Location Page] Unit Feature Conflict Detection', () => {
  test.setTimeout(90000);

  for (const loc of UNIT_FEATURES_CONFLICT_LOCATIONS) {
    test(`[Unit Features] ${loc.label} [${loc.fms}]`, async ({ page }) => {
      console.log(`\n📦 MODULE: Unit Feature Conflicts ${envTag}`);
      console.log(`🔍 Location: ${loc.label}`);
      console.log(`   FMS: ${loc.fms} | URL: ${loc.url}`);

      const conflicts: string[] = [];

      try {
        await page.goto(loc.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForSelector('.listviewrows', { timeout: 20000 }).catch(() => {});
        await page.waitForTimeout(1500);

        const unitRows = page.locator('.listviewrows');
        const rowCount = await unitRows.count();

        if (rowCount === 0) {
          console.log(`   ⚠️  No unit rows (.listviewrows) found — page may have no units`);
          pushResult('Unit Feature Conflicts', loc.label, 'PASSED', 'No units found — skipped');
          return;
        }

        console.log(`   ✓ Found ${rowCount} unit row(s) — scanning for conflicting features...`);

        for (let i = 0; i < rowCount; i++) {
          const row = unitRows.nth(i);
          const rowText = await row.innerText();

          // Build a short identifier for this unit (for clear error messages)
          const unitNameLoc = row.locator('.unit-type-listing-name');
          const unitName = (await unitNameLoc.count() > 0)
            ? (await unitNameLoc.first().innerText()).replace(/\d{4,}/g, '').trim()
            : '';
          const dimsLoc = row.locator('h2.widthHeight');
          const dims = (await dimsLoc.count() > 0)
            ? (await dimsLoc.first().innerText()).replace(/WIDTH|DEPTH/gi, '').replace(/\s+/g, ' ').trim()
            : '';
          const unitLabel = [dims, unitName].filter(Boolean).join(' ').trim() || `Row ${i + 1}`;

          // Check each conflicting pair.
          // Key technique: mask pair.b (the "longer" / containing string) from the row text
          // BEFORE testing for pair.a — this prevents false positives where pair.a's text
          // appears only as a substring inside pair.b.
          //
          // Example: row text = "Non-Climate Controlled Drive Up Unit"
          //   mask pair.b ('Non-Climate Controlled') → "[MASKED] Drive Up Unit"
          //   check for pair.a ('Climate Controlled') → NOT FOUND → no false conflict ✓
          //
          // Example: row text = "Climate Controlled Non-Climate Controlled" (the BUG)
          //   mask pair.b ('Non-Climate Controlled') → "Climate Controlled [MASKED]"
          //   check for pair.a ('Climate Controlled') → FOUND → conflict detected ✓
          for (const pair of CONFLICTING_FEATURE_PAIRS) {
            const escapedB = pair.b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const maskedText = rowText.replace(new RegExp(escapedB, 'gi'), '[MASKED]');
            const hasA = maskedText.includes(pair.a);
            const hasB = rowText.includes(pair.b);

            if (hasA && hasB) {
              const msg = `${unitLabel} — shows "${pair.a}" AND "${pair.b}" simultaneously`;
              console.log(`   🚨 CONFLICT: ${msg}`);
              console.log(`      → ${pair.note}`);
              conflicts.push(msg);
            }
          }
        }

        if (conflicts.length > 0) {
          console.log(`\n   ❌ ${conflicts.length} conflicting feature issue(s) found at ${loc.label}:`);
          conflicts.forEach((c, idx) => console.log(`   ${idx + 1}. ${c}`));
          const detail = `${conflicts.length} conflict(s): ${conflicts.slice(0, 3).join(' | ')}${conflicts.length > 3 ? ' ...' : ''}`;
          pushResult('Unit Feature Conflicts', loc.label, 'FAILED', detail);
          expect(conflicts.length,
            `Unit feature conflicts at ${loc.label}:\n${conflicts.map((c, i) => `  ${i + 1}. ${c}`).join('\n')}`
          ).toBe(0);
        } else {
          console.log(`   ✅ All ${rowCount} unit(s) have consistent, non-conflicting features`);
          pushResult('Unit Feature Conflicts', loc.label, 'PASSED', `${rowCount} units checked — no conflicts`);
        }

      } catch (error) {
        const msg = (error as Error).message || 'Unknown error';
        console.log(`   ❌ Error: ${msg}`);
        pushResult('Unit Feature Conflicts', loc.label, 'FAILED', msg);
        throw error;
      }
    });
  }
});


// ============================================
// 7. LOCATION PAGE — FILTER & SORT VALIDATION
// ============================================
// MODULE 7a — FILTER: dynamically discovers every filter dropdown present on the
//   page (#filterArea .btn-group select), selects the first available option in
//   each, verifies the row count changes correctly, then resets and confirms all
//   rows are restored.
//
// MODULE 7b — SORT: discovers every sort option in the sort menu dynamically,
//   applies each one, reads the resulting price/size values from the DOM, and
//   verifies the ordering is correct (asc or desc).
//
// FILTER ARCHITECTURE (shared across all Storagely clients):
//   #filterArea > .newFilterSection
//     [1..N .btn-group elements — one per filter dimension]
//       <select hidden>  — Bootstrap Multiselect reads options from here
//       <button.multiselect>  — the visible button
//     #resetButton  — resets all active filters
//
//   Filtering hides non-matching tr.shortableClass rows (display:none).
//
// EVENT BINDING NOTE:
//   Bootstrap Multiselect binds jQuery handlers on the <a> inside each <li>.
//   Playwright pointer events are also blocked on some clients by the filter bar
//   overlay. Solution: $(el).trigger('click') via page.evaluate() throughout.
// ============================================

const FILTER_TEST_CLIENTS = isStaging ? [
  {
    label: 'First Storage — Huntsville, AL',
    fms:   'storEDGE',
    url:   'https://test.staging.storagely-api.com/first-storage/storage-units/alabama/huntsville/memorial-parkway-sw',
  },
  {
    label: 'Sunbird Storage — Winston-Salem, NC',
    fms:   'SiteLink',
    url:   'https://test.staging.storagely-api.com/sunbirdstorage/storage-units/nc/winston-salem/country-club',
  },
  {
    label: 'Storage Star — Colorado Springs, CO',
    fms:   'SSM',
    url:   'https://test.staging.storagely-api.com/storage-star/storage-units/colorado/colorado-springs/aerotech-drive',
  },
  {
    label: '⭐ Mini Mall — Courtland, AL',
    fms:   'Yardi/SiteLink',
    url:   'https://test.staging.storagely-api.com/mini-mall-storage/storage-units/alabama/courtland/highway-33',
  },
] : [
  {
    label: 'First Storage — Huntsville, AL',
    fms:   'storEDGE',
    url:   'https://www.firststorage.com/storage-units/alabama/huntsville/memorial-parkway-sw',
  },
  {
    label: 'Sunbird Storage — Winston-Salem, NC',
    fms:   'SiteLink',
    url:   'https://sunbirdstorage.com/storage-units/nc/winston-salem/country-club',
  },
  {
    label: 'Storage Star — Colorado Springs, CO',
    fms:   'SSM',
    url:   'https://www.storagestar.com/storage-units/colorado/colorado-springs/aerotech-drive',
  },
  {
    label: '⭐ Mini Mall — Birmingham, AL',
    fms:   'Yardi',
    url:   'https://minimallstorage.com/storage-units/alabama/birmingham/richard-arrington-jr-blvd',
  },
];

// ── MODULE 7a: FILTER VALIDATION ──────────────────────────────────────────────
test.describe('[Location Page] Filter Validation', () => {
  test.setTimeout(120_000);

  for (const client of FILTER_TEST_CLIENTS) {
    test(`[Filter] ${clientLabel(client.label)} [${client.fms}]`, async ({ page }) => {
      console.log(`\n📦 MODULE: Location Page > Filter Validation ${envTag}`);
      if (isMiniMall(client.label)) console.log(`⭐ MINI MALL CLIENT DETECTED`);
      console.log(`🔍 Client : ${client.label}`);
      console.log(`   FMS    : ${client.fms}`);
      console.log(`   URL    : ${client.url}`);

      let totalCount      = 0;
      let afterResetCount = 0;

      interface DiscoveredFilter {
        selectId: string;
        label:    string;
        options:  Array<{ value: string; text: string }>;
      }
      interface AppliedFilter {
        label:        string;
        chosenOption: string;
        countBefore:  number;
        countAfter:   number;
        optionFound:  boolean;
      }

      const discoveredFilters: DiscoveredFilter[] = [];
      const appliedFilters:    AppliedFilter[]    = [];

      try {
        // ── Navigate & wait ─────────────────────────────────────────────
        await page.goto(client.url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
        await page.waitForSelector('tr.shortableClass', { timeout: 20_000 });
        await page.waitForTimeout(1500); // Bootstrap Multiselect init

        // ── STEP 1: Verify filter container present ────────────────────
        console.log(`\n   ──────────────────────────────────────────────`);
        console.log(`   📋 STEP 1 — Verify Filter UI`);
        await expect(page.locator('#filterArea'), '#filterArea must be in DOM').toBeAttached({ timeout: 5000 });
        await expect(page.locator('#resetButton'), '#resetButton must be visible').toBeVisible({ timeout: 5000 });
        console.log(`   ✅ #filterArea and #resetButton confirmed present`);

        // ── STEP 2: Count total unit rows ──────────────────────────────
        console.log(`\n   📋 STEP 2 — Count Total Units (baseline)`);
        totalCount = await page.evaluate(() => document.querySelectorAll('tr.shortableClass').length);
        expect(totalCount, 'Page must have at least 1 unit').toBeGreaterThan(0);
        console.log(`   ✅ Baseline unit count: ${totalCount} units`);

        // ── STEP 3: Discover ALL filter dropdowns dynamically ─────────
        // Scans every .btn-group inside #filterArea that has a hidden <select>
        // with at least one non-empty option AND a button.multiselect.
        // This captures Size, Floor, Type — and anything added in the future —
        // without hardcoding class names.
        console.log(`\n   📋 STEP 3 — Discover Filter Dropdowns (dynamic)`);

        const discovered: DiscoveredFilter[] = await page.evaluate(() => {
          const result: { selectId: string; label: string; options: { value: string; text: string }[] }[] = [];
          // <select> is a SIBLING of .btn-group (both inside .form-group).
          // Query .form-group and then find both the select and button inside it.
          document.querySelectorAll('#filterArea .form-group').forEach(grp => {
            const select = grp.querySelector<HTMLSelectElement>('select');
            const btn    = grp.querySelector<HTMLButtonElement>('button.multiselect');
            if (!select || !btn) return;
            const opts = Array.from(select.options)
              .filter(o => o.value && o.value.trim() !== '')
              .map(o => ({ value: o.value.trim(), text: o.text.trim() }));
            if (opts.length === 0) return;
            const rawTitle = btn.getAttribute('title') ?? btn.textContent?.trim() ?? select.id;
            const label    = rawTitle.replace(/\s*\(\d+\)$/, '').trim() || select.id;
            result.push({ selectId: select.id || select.name || 'filter', label, options: opts });
          });
          return result;
        });

        discoveredFilters.push(...discovered);

        if (discovered.length === 0) {
          console.log(`   ⚠️  No filter dropdowns found on this page`);
        } else {
          console.log(`   ✅ Found ${discovered.length} filter dropdown(s):`);
          discovered.forEach((d, i) => {
            console.log(`      ${i + 1}. [${d.selectId}] "${d.label}"`);
            console.log(`         Options: ${d.options.map(o => `"${o.text}"`).join(', ')}`);
          });
        }

        // ── STEP 4: Select first option in each dropdown and verify ───
        console.log(`\n   📋 STEP 4 — Apply Each Filter (first option)`);

        for (const dropdown of discovered) {
          const chosen = dropdown.options[0];

          const countBefore = await page.evaluate(() =>
            Array.from(document.querySelectorAll('tr.shortableClass'))
              .filter(r => window.getComputedStyle(r).display !== 'none').length
          );

          // Open the dropdown via jQuery trigger (native click + pointer events both
          // fail on some clients due to sticky header / filter bar overlay)
          await page.evaluate((selectId: string) => {
            const jq  = (window as any).jQuery;
            const sel = document.getElementById(selectId) as HTMLElement | null;
            // <select> is sibling of .btn-group — use parentElement to reach .form-group
            const btn = sel?.parentElement?.querySelector<HTMLElement>('button.multiselect');
            if (btn) { if (jq) jq(btn).trigger('click'); else btn.click(); }
          }, dropdown.selectId);
          await page.waitForTimeout(500);

          // Click the matching <a> via jQuery trigger
          // (Bootstrap Multiselect binds mousedown+click on <a>, not on <li>)
          const optionFound = await page.evaluate(
            ([selectId, optText]: [string, string]) => {
              const jq   = (window as any).jQuery;
              if (!jq) return false;
              const sel  = document.getElementById(selectId) as HTMLElement | null;
              // <select> is sibling of .btn-group — use parentElement to reach .form-group
              const menu = sel?.parentElement?.querySelector<HTMLElement>('ul.multiselect-container');
              if (!menu) return false;
              let clicked = false;
              jq(menu).find('li:not(.multiselect-item) a').each(function (this: HTMLElement) {
                if (jq(this).text().trim().toLowerCase().indexOf(optText.toLowerCase()) !== -1) {
                  jq(this).trigger('click');
                  clicked = true;
                  return false; // break $.each
                }
              });
              return clicked;
            },
            [dropdown.selectId, chosen.text] as [string, string]
          );
          await page.waitForTimeout(1000);

          const countAfter = await page.evaluate(() =>
            Array.from(document.querySelectorAll('tr.shortableClass'))
              .filter(r => window.getComputedStyle(r).display !== 'none').length
          );

          appliedFilters.push({ label: dropdown.label, chosenOption: chosen.text, countBefore, countAfter, optionFound });

          const changeTag = countAfter < countBefore
            ? `${countBefore} → ${countAfter}  (reduced by ${countBefore - countAfter})`
            : `${countAfter}  (all units match this option)`;
          const status    = optionFound ? '✅' : '⚠️ ';
          console.log(`\n      ${status} Filter: "${dropdown.label}"  |  Option selected: "${chosen.text}"`);
          console.log(`         Visible units : ${changeTag}`);

          expect(countAfter, `Filter "${chosen.text}" in "${dropdown.label}" produced 0 results`).toBeGreaterThan(0);
          expect(countAfter, `Filtered count must not exceed baseline`).toBeLessThanOrEqual(totalCount);
        }

        // ── STEP 5: Reset and verify full restore ──────────────────────
        console.log(`\n   📋 STEP 5 — Reset All Filters`);

        await page.evaluate(() => {
          const jq  = (window as any).jQuery;
          const btn = document.getElementById('resetButton') as HTMLElement | null;
          if (btn) { if (jq) jq(btn).trigger('click'); else btn.click(); }
        });
        await page.waitForTimeout(1000);

        afterResetCount = await page.evaluate(() =>
          Array.from(document.querySelectorAll('tr.shortableClass'))
            .filter(r => window.getComputedStyle(r).display !== 'none').length
        );
        expect(afterResetCount, `After reset all ${totalCount} units must be visible`).toBe(totalCount);
        console.log(`   ✅ Reset successful — ${afterResetCount} units visible (matches baseline ✅)`);

        // ── Result & console summary ────────────────────────────────────
        const filterSummary = appliedFilters.length > 0
          ? appliedFilters.map(f => `${f.label}:"${f.chosenOption}"(${f.countBefore}→${f.countAfter})`).join(', ')
          : 'no filter dropdowns';
        const detail = `FMS: ${client.fms} | Total: ${totalCount} | Filters: ${filterSummary} | After reset: ${afterResetCount}`;
        pushResult('Filter', clientLabel(client.label), 'PASSED', detail);

        console.log(`\n   ══════════════════════════════════════════════`);
        console.log(`   📊 FILTER SUMMARY — ${client.label}`);
        console.log(`   ══════════════════════════════════════════════`);
        console.log(`   FMS          : ${client.fms}`);
        console.log(`   Baseline     : ${totalCount} units`);
        if (appliedFilters.length === 0) {
          console.log(`   Filters      : none found`);
        } else {
          appliedFilters.forEach(f => {
            const tag = f.countAfter < f.countBefore ? `→ ${f.countAfter} (↓${f.countBefore - f.countAfter})` : `→ ${f.countAfter} (all match)`;
            console.log(`   ${f.label.padEnd(16)}: "${f.chosenOption}" ${tag}`);
          });
        }
        console.log(`   After reset  : ${afterResetCount} (restored ✅)`);
        console.log(`   ══════════════════════════════════════════════`);
        console.log(`   🎉 PASSED\n`);

      } catch (error) {
        const msg = (error as Error).message ?? 'Unknown error';
        console.log(`\n   ❌ FAILED: ${client.label}`);
        console.log(`   Error: ${msg}`);
        const detail = `FMS: ${client.fms} | Total: ${totalCount} | After reset: ${afterResetCount} | Error: ${msg.substring(0, 120)}`;
        pushResult('Filter', clientLabel(client.label), 'FAILED', detail);
        throw error;
      }
    });
  }
});


// ── MODULE 7b: SORT VALIDATION ────────────────────────────────────────────────
test.describe('[Location Page] Sort Validation', () => {
  test.setTimeout(180_000);

  for (const client of FILTER_TEST_CLIENTS) {
    test(`[Sort] ${clientLabel(client.label)} [${client.fms}]`, async ({ page }) => {
      console.log(`\n📦 MODULE: Location Page > Sort Validation ${envTag}`);
      if (isMiniMall(client.label)) console.log(`⭐ MINI MALL CLIENT DETECTED`);
      console.log(`🔍 Client : ${client.label}`);
      console.log(`   FMS    : ${client.fms}`);
      console.log(`   URL    : ${client.url}`);

      let totalCount = 0;

      interface SortResult {
        label:       string;
        sortType:    'price' | 'size';
        dir:         'asc' | 'desc';
        availValues: number[];
        waitValues:  number[];
        passed:      boolean;
        reason:      string;
      }
      const sortResults: SortResult[] = [];

      // Read sqft and price for every visible tr.shortableClass.
      // Groups rows into 'available' (rentable) and 'waitlist' (join-waitlist/inquiry only).
      // The page sorts each group independently, so we verify order within each group separately.
      async function readVisibleUnits(): Promise<{ sqft: number; price: number; group: 'available' | 'waitlist' }[]> {
        return page.evaluate(() =>
          Array.from(document.querySelectorAll('tr.shortableClass'))
            .filter(r => window.getComputedStyle(r).display !== 'none')
            .map(r => {
              const isWaitlist = Array.from(r.querySelectorAll('a, button'))
                .some(el => /waitlist|inquiry/i.test(el.textContent ?? ''));
              const group: 'available' | 'waitlist' = isWaitlist ? 'waitlist' : 'available';

              let price = parseFloat(r.getAttribute('data-price') ?? '0');
              if (!price) {
                // Match only the first dollar-amount (e.g. "$24.00\n/4 weeks" → "24.00")
                const txt = r.querySelector('h3.actualMoPrice')?.textContent?.match(/[\d,]+(?:\.\d{1,2})?/)?.[0]?.replace(/,/g, '') ?? '0';
                price = parseFloat(txt) || 0;
              }
              let sqft = parseFloat(r.getAttribute('data-sqft') ?? r.getAttribute('data-size') ?? '0');
              if (!sqft) {
                const dim = r.querySelector('h2.widthHeight')?.textContent ?? '';
                const m   = dim.match(/(\d+)[^0-9]+(\d+)/);
                sqft = m ? parseInt(m[1]) * parseInt(m[2]) : 0;
              }
              return { sqft, price, group };
            })
        );
      }

      // Returns true if values are in the expected order (ties are allowed).
      function isSorted(vals: number[], dir: 'asc' | 'desc'): boolean {
        for (let i = 0; i < vals.length - 1; i++) {
          if (vals[i] === 0 || vals[i + 1] === 0) continue; // skip unparseable
          if (dir === 'asc'  && vals[i] > vals[i + 1]) return false;
          if (dir === 'desc' && vals[i] < vals[i + 1]) return false;
        }
        return true;
      }

      try {
        // ── Navigate & wait ─────────────────────────────────────────────
        await page.goto(client.url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
        await page.waitForSelector('tr.shortableClass', { timeout: 20_000 });
        await page.waitForTimeout(1500);

        totalCount = await page.evaluate(() => document.querySelectorAll('tr.shortableClass').length);
        expect(totalCount, 'Page must have at least 1 unit').toBeGreaterThan(0);

        const sortBtn         = page.locator('sortvalue.multi-select-button').first();
        const initialSortText = (await sortBtn.textContent() ?? '').trim();
        console.log(`\n   ✅ Baseline: ${totalCount} units | Default sort: "${initialSortText}"`);

        // ── STEP 1: Discover all sort options ──────────────────────────
        console.log(`\n   ──────────────────────────────────────────────`);
        console.log(`   📋 STEP 1 — Discover Sort Options`);

        await sortBtn.click({ force: true });
        await page.waitForTimeout(400);

        interface SortOption { forAttr: string; text: string }
        const sortOptions: SortOption[] = await page.evaluate(() =>
          // sortvalue element is NOT a wrapper — .multi-select-menu is a sibling/elsewhere.
          // Query the sort labels directly from the document.
          Array.from(document.querySelectorAll('.multi-select-menu label[for^="sortby_"], label[for^="sortby_"]'))
            .map(l => ({ forAttr: l.getAttribute('for') ?? '', text: (l.textContent ?? '').replace(/\s+/g, ' ').trim() }))
            .filter(o => o.forAttr && o.text)
        );

        await page.keyboard.press('Escape');
        await page.waitForTimeout(200);

        if (sortOptions.length === 0) {
          console.log(`   ⚠️  No sort options found — skipping`);
          pushResult('Sort', clientLabel(client.label), 'PASSED', `FMS: ${client.fms} | No sort options found`);
          return;
        }

        console.log(`   ✅ Found ${sortOptions.length} sort option(s):`);
        sortOptions.forEach((o, i) => console.log(`      ${i + 1}. [${o.forAttr}] "${o.text}"`));

        // ── STEP 2: Apply each sort and verify order ───────────────────
        console.log(`\n   📋 STEP 2 — Apply Each Sort & Verify Order`);

        for (const opt of sortOptions) {
          // force:true bypasses overlay hit-testing (Crisp chat, sticky header) while still firing mousedown/mouseup/click
          await sortBtn.click({ force: true });
          await page.waitForTimeout(400);

          const isVisible = await page.locator(`label[for="${opt.forAttr}"]`).first()
            .isVisible({ timeout: 2000 }).catch(() => false);
          if (!isVisible) {
            console.log(`\n      ⚠️  "${opt.text}" — label not visible, skipped`);
            continue;
          }

          await page.evaluate((forAttr: string) => {
            const jq  = (window as any).jQuery;
            const lbl = document.querySelector(`label[for="${forAttr}"]`);
            if (lbl) { if (jq) jq(lbl).trigger('click'); else (lbl as HTMLElement).click(); }
          }, opt.forAttr);
          await page.waitForTimeout(800);

          const units     = await readVisibleUnits();
          const available = units.filter(u => u.group === 'available');
          const waitlist  = units.filter(u => u.group === 'waitlist');
          const txt       = opt.text.toLowerCase();
          const sortType: 'price' | 'size' = txt.includes('price') ? 'price' : 'size';
          const dir: 'asc' | 'desc' =
            (txt.includes('low to high') || txt.includes('small to large')) ? 'asc' : 'desc';

          const getVals = (arr: typeof units) => arr.map(u => sortType === 'price' ? u.price : u.sqft);
          const availVals = getVals(available);
          const waitVals  = getVals(waitlist);

          // Each section (available / waitlist) must be sorted independently
          const availOk = availVals.filter(v => v > 0).length < 2 || isSorted(availVals, dir);
          const waitOk  = waitVals.filter(v => v > 0).length < 2  || isSorted(waitVals, dir);
          const passed  = availOk && waitOk;

          const failParts: string[] = [];
          if (!availOk) failParts.push(`available section out of order`);
          if (!waitOk)  failParts.push(`waitlist section out of order`);
          const reason = passed
            ? `order confirmed (${available.length} available + ${waitlist.length} waitlist)`
            : failParts.join('; ');

          sortResults.push({ label: opt.text, sortType, dir, availValues: availVals, waitValues: waitVals, passed, reason });

          const nzAvail = availVals.filter(v => v > 0);
          const nzWait  = waitVals.filter(v => v > 0);
          const icon    = passed ? '✅' : '❌';
          console.log(`\n      ${icon} "${opt.text}"`);
          console.log(`         Sort type   : ${sortType}  |  Direction: ${dir === 'asc' ? 'ascending ↑' : 'descending ↓'}`);
          if (available.length > 0)
            console.log(`         Available   : [${nzAvail.slice(0, 8).join(', ')}${nzAvail.length > 8 ? '…' : ''}] (${available.length} units) ${availOk ? '✅' : '❌ OUT OF ORDER'}`);
          if (waitlist.length > 0)
            console.log(`         Waitlist    : [${nzWait.slice(0, 8).join(', ')}${nzWait.length > 8 ? '…' : ''}] (${waitlist.length} units) ${waitOk ? '✅' : '❌ OUT OF ORDER'}`);
          console.log(`         Ordered?    : ${passed ? 'YES ✅' : 'NO ❌  — ' + failParts.join('; ')}`);
        }

        // ── Result ─────────────────────────────────────────────────────
        const verifiedCount = sortResults.filter(r => r.passed).length;
        const allPassed     = verifiedCount === sortResults.length;

        const detail = [
          `FMS: ${client.fms}`,
          `Total: ${totalCount}`,
          `Options: ${sortResults.length}`,
          `Verified: ${verifiedCount}/${sortResults.length}`,
          ...sortResults.filter(r => !r.passed).map(r => `⚠️ "${r.label}": ${r.reason}`),
        ].join(' | ');

        pushResult('Sort', clientLabel(client.label), allPassed ? 'PASSED' : 'FAILED', detail);

        console.log(`\n   ══════════════════════════════════════════════`);
        console.log(`   📊 SORT SUMMARY — ${client.label}`);
        console.log(`   ══════════════════════════════════════════════`);
        console.log(`   FMS            : ${client.fms}`);
        console.log(`   Default sort   : "${initialSortText}"`);
        console.log(`   Units on page  : ${totalCount}`);
        console.log(`   Options tested : ${sortResults.length}`);
        console.log(`   ─────────────────────────────────────────────`);
        sortResults.forEach(r => {
          const icon   = r.passed ? '✅' : '❌';
          const dirTag = r.dir === 'asc' ? '↑ asc' : '↓ desc';
          const nzA    = r.availValues.filter(v => v > 0);
          const nzW    = r.waitValues.filter(v => v > 0);
          console.log(`   ${icon} ${r.label.padEnd(30)} [${r.sortType} ${dirTag}]`);
          if (nzA.length > 0) console.log(`      Available : [${nzA.slice(0, 6).join(', ')}${nzA.length > 6 ? '…' : ''}]`);
          if (nzW.length > 0) console.log(`      Waitlist  : [${nzW.slice(0, 6).join(', ')}${nzW.length > 6 ? '…' : ''}]`);
          console.log(`      Result    : ${r.reason}`);
        });
        console.log(`   ─────────────────────────────────────────────`);
        console.log(`   Verified : ${verifiedCount}/${sortResults.length} sort(s) confirmed correct`);
        console.log(`   ══════════════════════════════════════════════`);

        if (!allPassed) {
          const failedOpts = sortResults.filter(r => !r.passed)
            .map(r => `"${r.label}" (${r.reason})`).join(', ');
          console.log(`\n   ❌ SORT FAILURES DETECTED:`);
          console.log(`      ${failedOpts}`);
          throw new Error(`Sort order incorrect — ${failedOpts}`);
        }
        console.log(`   🎉 PASSED\n`);

      } catch (error) {
        const msg = (error as Error).message ?? 'Unknown error';
        console.log(`\n   ❌ FAILED: ${client.label}`);
        console.log(`   Error: ${msg}`);
        const detail = `FMS: ${client.fms} | Total: ${totalCount} | Error: ${msg.substring(0, 120)}`;
        pushResult('Sort', clientLabel(client.label), 'FAILED', detail);
        throw error;
      }
    });
  }
});


// ============================================
// GRAND SUMMARY (prints after ALL modules)
// ============================================
const SUMMARY_LOCK_FILE = path.join(process.cwd(), 'test-results', '.ui-summary-lock');

test.afterAll(async () => {
  // ── Deduplication: with multiple workers each worker runs afterAll once.
  // We use a last-writer-wins lock so only the LAST worker to finish prints.
  const myToken = `${process.pid}-${Date.now()}`;
  try {
    const resultsDir = path.dirname(UI_RESULTS_FILE);
    if (!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir, { recursive: true });
    fs.writeFileSync(SUMMARY_LOCK_FILE, myToken);
  } catch { /* ignore */ }

  // Wait long enough for any other worker that's about to write its token
  await new Promise<void>(r => setTimeout(r, 2500));

  try {
    const lockToken = fs.readFileSync(SUMMARY_LOCK_FILE, 'utf-8').trim();
    if (lockToken !== myToken) return; // Another worker wrote after us — let them print
  } catch { /* if unreadable, proceed */ }

  // Re-read the results file now that all workers have had a chance to finish
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
  const totalExpected = allResults.filter(r => r.status === 'EXPECTED').length;
  const totalTests = totalPassed + totalFailed + totalExpected;

  console.log('\n\n');
  console.log('#'.repeat(80));
  console.log('##  📊 UI COMPONENTS VALIDATION — GRAND SUMMARY');
  console.log('#'.repeat(80));

  // --- Module-level overview ---
  console.log('\n📦 MODULE OVERVIEW:');
  console.log('-'.repeat(80));
  console.log(`   ${'Module'.padEnd(25)} | ${'Passed'.padEnd(8)} | ${'Failed'.padEnd(8)} | ${'Expected'.padEnd(8)} | Total  | Status`);
  console.log('-'.repeat(80));

  for (const m of modules) {
    const p = m.tests.filter(t => t.status === 'PASSED').length;
    const f = m.tests.filter(t => t.status === 'FAILED').length;
    const e = m.tests.filter(t => t.status === 'EXPECTED').length;
    const icon = f === 0 ? '✅' : '❌';
    let statusStr: string;
    if (f === 0) {
      statusStr = e > 0 ? `ALL PASSED (${e} expected fail)` : 'ALL PASSED';
    } else {
      const failedNames = m.tests.filter(t => t.status === 'FAILED').map(t => t.name);
      const namesList = failedNames.length > 3
        ? failedNames.slice(0, 3).join(', ') + ` +${failedNames.length - 3} more`
        : failedNames.join(', ');
      statusStr = `${f} FAILED: ${namesList}`;
    }
    console.log(`   ${m.module.padEnd(25)} | ${String(p).padEnd(8)} | ${String(f).padEnd(8)} | ${String(e).padEnd(8)} | ${String(p + f + e).padEnd(6)} | ${icon} ${statusStr}`);
  }

  console.log('-'.repeat(80));
  const totalStatusStr = totalFailed === 0 ? (totalExpected > 0 ? `✅ ALL CLEAR (${totalExpected} expected fail)` : '✅ ALL CLEAR') : `❌ ${totalFailed} ISSUE(S)`;
  console.log(`   ${'TOTAL'.padEnd(25)} | ${String(totalPassed).padEnd(8)} | ${String(totalFailed).padEnd(8)} | ${String(totalExpected).padEnd(8)} | ${String(totalTests).padEnd(6)} | ${totalStatusStr}`);
  console.log('-'.repeat(80));

  // --- Per-Client x Module matrix ---
  console.log('\n\n📋 ALL CLIENT RESULTS — UI COMPONENTS VALIDATION (per module):');
  console.log('='.repeat(80));

  // Collect unique client names across all modules (exclude Mini Mall — shown in dedicated section below)
  const clientNames = [...new Set(modules.flatMap(m => m.tests.map(t => t.name)))].filter(n => !isMiniMall(n));

  for (const client of clientNames) {
    const resultsForClient = modules.map(m => {
      const t = m.tests.find(t => t.name === client);
      return { module: m.module, ...t };
    }).filter(r => r.status);

    const anyFailed = resultsForClient.some(r => r.status === 'FAILED');
    const anyExpected = resultsForClient.some(r => r.status === 'EXPECTED');
    const clientIcon = anyFailed ? '❌' : anyExpected ? '⚠️' : '✅';

    console.log(`\n   ${clientIcon} ${client}`);
    for (const r of resultsForClient) {
      const statusIcon = r.status === 'PASSED' ? '✅' : r.status === 'EXPECTED' ? '⚠️' : '🚩';
      const detailStr = r.detail ? ` → ${r.detail.substring(0, 80)}` : '';
      console.log(`      ${statusIcon} ${r.module}${detailStr}`);
    }
  }

  console.log('\n' + '='.repeat(80));

  // --- Failures call-out section ---
  const allFailed = modules.flatMap(m => m.tests.filter(t => t.status === 'FAILED').map(t => ({ ...t, module: m.module })));
  const allExpected = modules.flatMap(m => m.tests.filter(t => t.status === 'EXPECTED').map(t => ({ ...t, module: m.module })));

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
  }

  if (allExpected.length > 0) {
    console.log('\n\n');
    console.log('⚠️'.repeat(20));
    console.log('⚠️  EXPECTED FAILURES (known issues):');
    console.log('⚠️'.repeat(20));

    allExpected.forEach((f, i) => {
      console.log(`\n   ${i + 1}. ⚠️ [${f.module}] ${f.name}`);
      if (f.detail) console.log(`      ↳ ${f.detail}`);
    });

    console.log('\n' + '⚠️'.repeat(20));
  }

  if (allFailed.length === 0 && allExpected.length === 0) {
    console.log('\n\n🎉 ALL TESTS PASSED — NO FAILURES!\n');
  } else if (allFailed.length === 0) {
    console.log('\n\n🎉 ALL TESTS PASSED (expected failures are known issues)\n');
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
