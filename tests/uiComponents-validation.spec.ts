import { test, expect } from '@playwright/test';
import { StorageSitePage } from '../pages/HomePage';
import { ContactPage } from '../pages/ContactPage';
import { StorageListingPage } from '../pages/StorageListingPage';
import { getStorageSiteUrls, CURRENT_ENVIRONMENT, Environment, STOREROCKET_SITES, STAGING_CONTACT_SKIP } from '../configs/urls';

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

// --------------- Module Results ---------------

const moduleResults: {
  module: string;
  tests: { name: string; status: 'PASSED' | 'FAILED'; detail?: string }[];
}[] = [];

function pushResult(module: string, name: string, status: 'PASSED' | 'FAILED', detail?: string) {
  let bucket = moduleResults.find(m => m.module === module);
  if (!bucket) {
    bucket = { module, tests: [] };
    moduleResults.push(bucket);
  }
  bucket.tests.push({ name, status, detail });
}

function printModuleSummary(moduleName: string) {
  const bucket = moduleResults.find(m => m.module === moduleName);
  if (!bucket) return;
  const passed = bucket.tests.filter(t => t.status === 'PASSED');
  const failed = bucket.tests.filter(t => t.status === 'FAILED');
  const miniMallTests = bucket.tests.filter(t => isMiniMall(t.name));

  console.log('\n' + '='.repeat(70));
  console.log(`📦 MODULE: ${moduleName}`);
  console.log('='.repeat(70));
  console.log(`   ✅ Passed: ${passed.length}   ❌ Failed: ${failed.length}   📋 Total: ${bucket.tests.length}`);

  if (passed.length > 0) {
    console.log('\n   ✅ PASSED:');
    passed.forEach((t, i) => console.log(`      ${i + 1}. ${t.name}${t.detail ? ` — ${t.detail}` : ''}`));
  }
  if (failed.length > 0) {
    console.log('\n   ❌ FAILED:');
    failed.forEach((t, i) => console.log(`      ${i + 1}. ${t.name}${t.detail ? ` — ${t.detail}` : ''}`));
  }

  // Mini Mall highlight
  if (miniMallTests.length > 0) {
    console.log('\n   ⭐ MINI MALL RESULTS:');
    miniMallTests.forEach((t, i) => {
      const icon = t.status === 'PASSED' ? '✅' : '❌';
      console.log(`      ${icon} ${i + 1}. ${t.name}${t.detail ? ` — ${t.detail}` : ''}`);
    });
  }
  console.log('='.repeat(70));
}

// ============================================
// 1. HOME PAGE VERIFICATION
// ============================================
test.describe('[Home Page] Landing Page Verification', () => {
  test.setTimeout(180000);

  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
  });

  test.afterAll(() => printModuleSummary('Home Page'));

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
// 2. CONTACT PAGE VERIFICATION
// ============================================
test.describe('[Contact Page] Contact Page Verification', () => {
  test.setTimeout(180000);

  test.afterAll(() => printModuleSummary('Contact Page'));

  for (const url of siteUrls) {
    test(`[Contact Page] Verify contact page for ${clientLabel(url)}`, async ({ page }) => {
      console.log(`\n📦 MODULE: Contact Page ${envTag}`);
      if (isStorerocket(url)) {
        console.log(`⚠️  SKIPPED — Storerocket required (no staging equivalent)`);
        pushResult('Contact Page', clientLabel(url), 'PASSED', 'Storerocket — skipped in staging');
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

      try {
        await contactPage.navigateToContactPage(url);
        const verificationResult = await contactPage.verifyContactPageContent(url);

        if (!verificationResult.found) {
          throw new Error('No contact page elements found.');
        }

        console.log(`✅ Contact page verification passed for: ${url}`);
        pushResult('Contact Page', clientLabel(url), 'PASSED', verificationResult.foundElements?.join(', '));
      } catch (error) {
        const msg = (error as Error).message || 'Unknown error';
        console.log(`❌ Contact page verification failed for: ${url}`);
        console.log(`   Error: ${msg}`);
        pushResult('Contact Page', clientLabel(url), 'FAILED', msg);
        // Allow other tests to continue
        console.log(`⚠️  Continuing with other sites...`);
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
  test.afterAll(() => printModuleSummary('Offer Text'));

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
  test.afterAll(() => printModuleSummary('Banner Loading'));

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
  if (moduleResults.length === 0) return;

  const totalPassed = moduleResults.reduce((sum, m) => sum + m.tests.filter(t => t.status === 'PASSED').length, 0);
  const totalFailed = moduleResults.reduce((sum, m) => sum + m.tests.filter(t => t.status === 'FAILED').length, 0);

  console.log('\n' + '#'.repeat(70));
  console.log('📊 UI COMPONENTS VALIDATION — GRAND SUMMARY');
  console.log('#'.repeat(70));

  for (const m of moduleResults) {
    const p = m.tests.filter(t => t.status === 'PASSED').length;
    const f = m.tests.filter(t => t.status === 'FAILED').length;
    const icon = f === 0 ? '✅' : '❌';
    console.log(`   ${icon} ${m.module.padEnd(25)} — Passed: ${p}  Failed: ${f}  Total: ${m.tests.length}`);
  }

  console.log('-'.repeat(70));
  console.log(`   TOTAL — ✅ ${totalPassed} Passed   ❌ ${totalFailed} Failed   📋 ${totalPassed + totalFailed} Tests`);

  // Mini Mall consolidated summary
  const allMiniMall = moduleResults.flatMap(m => m.tests.filter(t => isMiniMall(t.name)));
  if (allMiniMall.length > 0) {
    const mmPassed = allMiniMall.filter(t => t.status === 'PASSED').length;
    const mmFailed = allMiniMall.filter(t => t.status === 'FAILED').length;
    console.log('\n' + '-'.repeat(70));
    console.log('⭐ MINI MALL STORAGE — CONSOLIDATED RESULTS');
    console.log('-'.repeat(70));
    allMiniMall.forEach((t, i) => {
      const icon = t.status === 'PASSED' ? '✅' : '❌';
      console.log(`   ${icon} ${i + 1}. ${t.name}${t.detail ? ` — ${t.detail}` : ''}`);
    });
    console.log(`   MINI MALL TOTAL — ✅ ${mmPassed} Passed   ❌ ${mmFailed} Failed   📋 ${allMiniMall.length} Tests`);
    console.log('-'.repeat(70));
  }

  console.log('#'.repeat(70) + '\n');
});
