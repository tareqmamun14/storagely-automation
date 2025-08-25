import { test } from '@playwright/test';
import { StorageSitePage } from '../pages/HomePage';
import { storageSiteUrls } from '../configs/urls';

// Results storage
const landingPageResults: {
  url: string;
  actualUrl: string;
  status: 'PASSED' | 'FAILED';
  error?: string;
}[] = [];

// Function to add cache busting parameter to URL
function addCacheBustingParam(url: string): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2);
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}_cache_bust=${timestamp}_${randomString}`;
}

test.describe('Storage Site Landing Page Verification', () => {
  // Set timeout per test (not total)
  test.setTimeout(120000); // 2 minutes per test

  // Print results after all tests complete
  test.afterAll(() => {
    const passed = landingPageResults.filter(r => r.status === 'PASSED');
    const failed = landingPageResults.filter(r => r.status === 'FAILED');

    console.log('\n' + '='.repeat(70));
    console.log('🌐 LANDING PAGE VERIFICATION RESULTS SUMMARY');
    console.log('='.repeat(70));
    console.log(`✅ Total Passed: ${passed.length}`);
    console.log(`❌ Total Failed: ${failed.length}`);
    console.log(`📋 Total Tests: ${landingPageResults.length}`);
    
    if (passed.length > 0) {
      console.log('\n✅ SUCCESSFULLY VERIFIED PAGES:');
      passed.forEach((result, index) => {
        console.log(`   ${index + 1}. ${result.url}`);
        console.log(`       (Accessed: ${result.actualUrl})`);
      });
    }
    
    if (failed.length > 0) {
      console.log('\n❌ FAILED PAGE VERIFICATIONS:');
      failed.forEach((result, index) => {
        console.log(`   ${index + 1}. ${result.url}`);
        console.log(`       (Attempted: ${result.actualUrl})`);
        if (result.error) {
          console.log(`      Error: ${result.error}`);
        }
        console.log('');
      });
    }
    console.log('='.repeat(70) + '\n');
  });

  for (const url of storageSiteUrls) {
    test(`Verify landing page for ${url}`, async ({ page }) => {
      // Add cache busting parameter to the URL
      const urlWithCacheBust = addCacheBustingParam(url);
      
      console.log(`\n🔍 Testing landing page: ${url}`);
      console.log(`   Cache-busted URL: ${urlWithCacheBust}`);
      
      try {
        const storagePage = new StorageSitePage(page);
        await storagePage.goto(urlWithCacheBust);
        await storagePage.verifyLandingPage(url); // Still pass original URL for logging
        
        console.log(`✅ Landing page verification passed for: ${url}`);
        
        // Store successful result
        landingPageResults.push({
          url,
          actualUrl: urlWithCacheBust,
          status: 'PASSED'
        });
        
      } catch (error) {
        const errorMessage = (error as Error).message || 'Unknown error occurred';
        console.log(`❌ Landing page verification failed for: ${url}`);
        console.log(`   Error: ${errorMessage}`);
        
        // Store failed result
        landingPageResults.push({
          url,
          actualUrl: urlWithCacheBust,
          status: 'FAILED',
          error: errorMessage
        });
        
        // Re-throw the error to maintain test failure behavior
        throw error;
      }
    });
  }
});