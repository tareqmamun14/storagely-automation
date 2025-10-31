import { test, expect, Page } from '@playwright/test';
import { StorageListingPage } from '../pages/StorageListingPage_steptwo';

const discountChecks = [
  {
    customer: 'First Storage : StorEDGE',
    url: 'https://www.firststorage.com/storage-units/north-carolina/north-wilkesboro/d-street',
    expected: 'Sale'
  },
  {
    customer: 'Smart Self Storage : SSM',
    url: 'https://app.storagely.io/smart-self-storage-ohio/storage-units/ohio/macedonia/bavaria-road',
    expected: 'Off 3 Months'
  },
  {
    customer: 'Mini Mall : SiteLink',
    url: 'https://app.storagely.io/mini-mall-storage/storage-units/alabama/courtland/highway-33',
    expected: 'First Month Free'
  }
];

// Results storage
const testResults: {
  customer: string;
  status: 'PASSED' | 'FAILED';
  expected: string;
  actual?: string;
  error?: string;
}[] = [];

// Helper function to add cache busting parameter to URL
function addCacheBustingParam(url: string): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2);
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}_cache_bust=${timestamp}_${randomString}`;
}

// Helper function to normalize text for comparison
function normalizeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim().toLowerCase();
}

// Helper function to check if expected text matches actual text (flexible matching)
function isTextMatch(actualText: string, expectedText: string): boolean {
  const normalizedActual = normalizeText(actualText);
  const normalizedExpected = normalizeText(expectedText);
  
  // Split expected text into words for partial matching
  const expectedWords = normalizedExpected.split(' ');
  
  // Check if all expected words are present in actual text
  return expectedWords.every(word => normalizedActual.includes(word));
}

test.describe('Verify Offer Text from Storage Unit', () => {
  // Print results after all tests complete
  test.afterAll(() => {
    const passed = testResults.filter(r => r.status === 'PASSED');
    const failed = testResults.filter(r => r.status === 'FAILED');

    console.log('\n' + '='.repeat(70));
    console.log('🏷️  DISCOUNT VERIFICATION RESULTS SUMMARY');
    console.log('='.repeat(70));
    console.log(`✅ Total Passed: ${passed.length}`);
    console.log(`❌ Total Failed: ${failed.length}`);
    console.log(`📋 Total Tests: ${testResults.length}`);
    
    if (passed.length > 0) {
      console.log('\n✅ SUCCESSFUL VERIFICATIONS:');
      passed.forEach((result, index) => {
        console.log(`   ${index + 1}. Customer: ${result.customer}`);
        console.log(`      Expected: "${result.expected}"`);
        console.log(`      Found: "${result.actual}"`);
        console.log('');
      });
    }
    
    if (failed.length > 0) {
      console.log('\n❌ FAILED VERIFICATIONS:');
      failed.forEach((result, index) => {
        console.log(`   ${index + 1}. Customer: ${result.customer}`);
        console.log(`      Expected: "${result.expected}"`);
        console.log(`      Actual Text Found: ${result.actual || 'No matching discount text found'}`);
        if (result.error) {
          console.log(`      Error Details: ${result.error}`);
        }
        console.log('');
      });
    }
    console.log('='.repeat(70) + '\n');
  });

  for (const { customer, url, expected } of discountChecks) {
    test(`Verify Offer Text ${customer}`, async ({ page }) => {
      console.log(`\n🔍 Testing ${customer}`);
      console.log(`📋 Expected: "${expected}"`);
      
      let matched = false;
      let foundTexts: string[] = [];
      let actualMatchedText = '';
      let errorDetails = '';

      try {
        // Add cache busting parameter to the URL
        const urlWithCacheBust = addCacheBustingParam(url);
        console.log(`🌐 Navigating to: ${urlWithCacheBust}`);
        
        await page.goto(urlWithCacheBust, { waitUntil: 'domcontentloaded', timeout: 30000 });
        
        // Wait for discount elements to load
        await page.waitForTimeout(2000);
        
        // Look for discount elements with multiple selectors
        const discountSelectors = [
          '.page_discount',
          '.offer_content',
          '.discount',
          '.promo',
          '.banner',
          '[class*="discount"]',
          '[class*="offer"]',
          '[class*="promo"]'
        ];
        
        for (const selector of discountSelectors) {
          try {
            const elements = page.locator(selector);
            const count = await elements.count();
            
            if (count > 0) {
              console.log(`📍 Found ${count} elements with selector: ${selector}`);
              
              for (let i = 0; i < count; i++) {
                try {
                  const element = elements.nth(i);
                  
                  // Check if element is visible
                  if (await element.isVisible()) {
                    const text = await element.innerText();
                    
                    if (text && text.trim().length > 0) {
                      foundTexts.push(`${selector}[${i}]: "${text.trim()}"`);
                      
                      // Flexible matching - check if expected text matches
                      if (isTextMatch(text, expected)) {
                        console.log(`✅ ${customer} | Found matching banner: "${text.trim()}"`);
                        matched = true;
                        actualMatchedText = text.trim();
                        break;
                      }
                    }
                  }
                } catch (elementError) {
                  // Skip this element if there's an error
                  continue;
                }
              }
              
              if (matched) break;
            }
          } catch (selectorError) {
            // Skip this selector if it fails
            continue;
          }
        }
        
        // If no match found, try fallback search
        if (!matched) {
          console.log(`❌ ${customer} | No matching banner found`);
          console.log(`📝 All found discount texts:`);
          foundTexts.forEach(text => console.log(`   ${text}`));
          
          // Additional fallback: search in all text content
          console.log(`🔍 Searching in full page content...`);
          const pageText = await page.textContent('body');
          if (pageText && isTextMatch(pageText, expected)) {
            console.log(`✅ ${customer} | Found expected text in page content`);
            matched = true;
            actualMatchedText = `Found in page content: "${expected}"`;
          }
        }

        // Store result
        if (matched) {
          testResults.push({
            customer,
            status: 'PASSED',
            expected,
            actual: actualMatchedText
          });
        } else {
          const allFoundText = foundTexts.join(' | ');
          testResults.push({
            customer,
            status: 'FAILED',
            expected,
            actual: allFoundText || 'No discount text found on page'
          });
        }

        } catch (error) {
          errorDetails = (error as Error).message || 'Unknown error occurred';
          console.log(`💥 ${customer} | Error occurred: ${errorDetails}`);
          
          testResults.push({
            customer,
            status: 'FAILED',
            expected,
            actual: 'Test execution failed',
            error: errorDetails
          });
        }
      
      expect(matched, `Expected discount text "${expected}" not found for ${customer}`).toBeTruthy();
    });
  }
});

// Additional test for debugging - can be used separately
test.describe('Debug Discount Elements', () => {
  test('Debug discount elements structure', async ({ page }) => {
    const url = 'https://app.storagely.io/mini-mall-storage/storage-units/alabama/courtland/highway-33';
    
    // Add cache busting parameter to the URL
    const urlWithCacheBust = addCacheBustingParam(url);
    console.log(`🐛 Debug navigating to: ${urlWithCacheBust}`);
    
    await page.goto(urlWithCacheBust, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    
    // Find all elements that might contain discount info
    const allDiscountElements = await page.locator('[class*="discount"], [class*="offer"], [class*="promo"], [class*="banner"], .page_discount').all();
    
    console.log(`Found ${allDiscountElements.length} potential discount elements:`);
    
    for (let i = 0; i < allDiscountElements.length; i++) {
      try {
        const element = allDiscountElements[i];
        const text = await element.innerText();
        const className = await element.getAttribute('class');
        const isVisible = await element.isVisible();
        
        console.log(`Element ${i + 1}:`);
        console.log(`  Class: ${className}`);
        console.log(`  Visible: ${isVisible}`);
        console.log(`  Text: "${text}"`);
        console.log('---');
      } catch (error) {
        console.log(`Element ${i + 1}: Error reading element`);
      }
    }
  });
});

// Banner verification test data
// ENVIRONMENT CONFIG: Comment/uncomment the line below to switch between environments
const USE_STAGING = true; // Set to false for production URLs

const bannerChecks = USE_STAGING ? [
  // STAGING URLS
  // {
  //   client: 'Premier Storage - Laurel',
  //   url: 'https://test.staging.storagely-api.com/premier-storage/storage-units/mississippi/laurel/ms-15'
  // },
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
  }
] : [
  // PRODUCTION URLS
  // {
  //   client: 'Premier Storage - Laurel',
  //   url: 'https://yourpremierstorage.com/storage-units/mississippi/laurel/ms-15'
  // },
  {
    client: 'Radiant Storage - Montgomery',
    url: 'https://radiantstorage.com/storage-units/alabama/montgomery/east-south-blvd'
  },
  {
    client: 'Storage Star - Cloverdale',
    url: 'https://www.storagestar.com/storage-units/california/cloverdale/industrial-drive'
  },
  {
    client: 'Best Box Storage - Pensacola',
    url: 'https://www.bestboxstorage.com/storage-units/florida/pensacola/north-palafox'
  },
  {
    client: 'First Storage - E Market St',
    url: 'https://www.firststorage.com/storage-units/north-carolina/greensboro/east-market-street'
  }
];

// Banner test results storage
const bannerResults: {
  client: string;
  status: 'PASSED' | 'FAILED';
  message: string;
}[] = [];

test.describe('Verify Banner Loading on Storage Unit Pages', () => {
  // Print banner results after all tests complete
  test.afterAll(() => {
    const passed = bannerResults.filter(r => r.status === 'PASSED');
    const failed = bannerResults.filter(r => r.status === 'FAILED');

    console.log('\n' + '='.repeat(60));
    console.log('🎯 BANNER LOADING VERIFICATION RESULTS');
    console.log('='.repeat(60));
    
    if (passed.length > 0) {
      console.log('\n✅ CLIENTS WITH BANNERS PROPERLY LOADED:');
      passed.forEach((result, index) => {
        console.log(`   ${index + 1}. ${result.client} - PASSED (${result.message})`);
      });
    }
    
    if (failed.length > 0) {
      console.log('\n❌ CLIENTS WITH BANNER LOADING ISSUES:');
      failed.forEach((result, index) => {
        console.log(`   ${index + 1}. ${result.client} - FAILED (${result.message})`);
      });
    }
    
    console.log(`\n📊 Summary: ${passed.length} Passed, ${failed.length} Failed`);
    console.log('='.repeat(60) + '\n');
  });

  for (const { client, url } of bannerChecks) {
    test(`Verify banner loading for ${client}`, async ({ page }) => {
      const storagePage = new StorageListingPage(page);
      let bannerResult;

      try {
        // Navigate to the page
        await storagePage.navigateWithCacheBusting(url);
        
        // Check banner status
        bannerResult = await storagePage.checkBannerStatus();
        
        // Store result for summary
        bannerResults.push({
          client,
          status: bannerResult.status,
          message: bannerResult.message
        });

      } catch (error) {
        bannerResults.push({
          client,
          status: 'FAILED',
          message: 'Test execution failed'
        });
        bannerResult = { status: 'FAILED' as const };
      }
      
      // Test assertion
      expect(bannerResult.status, `Banner loading verification failed for ${client}: ${bannerResult?.message || 'Unknown error'}`).toBe('PASSED');
    });
  }
});