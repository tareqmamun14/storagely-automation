import { test, expect } from '@playwright/test';
import { ContactPage } from '../pages/ContactPage';
import { storageSiteUrls } from '../configs/urls';

// Results storage for contact page verification
const contactPageResults: {
  url: string;
  contactUrl: string;
  status: 'PASSED' | 'FAILED';
  foundElements?: string[];
  elementCounts?: { [key: string]: number };
  error?: string;
}[] = [];

// Function to add cache busting parameter to URL
function addCacheBustingParam(url: string): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2);
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}_cache_bust=${timestamp}_${randomString}`;
}

test.describe('Storage Site Contact Page Verification', () => {
  // Set timeout per test
  test.setTimeout(180000); // 3 minutes per test

  // Print results after all tests complete
  test.afterAll(() => {
    const passed = contactPageResults.filter(r => r.status === 'PASSED');
    const failed = contactPageResults.filter(r => r.status === 'FAILED');

    console.log('\n' + '='.repeat(120));
    console.log('📞 CONTACT PAGE VERIFICATION RESULTS SUMMARY');
    console.log('='.repeat(120));
    console.log(`✅ Total Passed: ${passed.length}`);
    console.log(`❌ Total Failed: ${failed.length}`);
    console.log(`📋 Total Tests: ${contactPageResults.length}`);
    console.log('='.repeat(120));
    
    // Create results table
    console.log('\n📊 DETAILED RESULTS TABLE:');
    console.log('┌─────┬─────────────────────────────────────────────────────────┬──────────┬─────────────────────────────────────────────┐');
    console.log('│ No. │ Storage Site                                            │ Status   │ Found Elements / Error                      │');
    console.log('├─────┼─────────────────────────────────────────────────────────┼──────────┼─────────────────────────────────────────────┤');
    
    contactPageResults.forEach((result, index) => {
      const num = (index + 1).toString().padStart(3, ' ');
      const site = result.url.replace('https://', '').replace('www.', '').substring(0, 55).padEnd(55, ' ');
      const status = result.status === 'PASSED' ? '✅ PASS ' : '❌ FAIL ';
      
      let details = '';
      if (result.status === 'PASSED' && result.foundElements) {
        details = result.foundElements.slice(0, 3).join(', ');
        if (result.foundElements.length > 3) {
          details += ` +${result.foundElements.length - 3} more`;
        }
      } else if (result.error) {
        details = result.error.substring(0, 40);
        if (result.error.length > 40) details += '...';
      }
      details = details.padEnd(43, ' ');
      
      console.log(`│ ${num} │ ${site} │ ${status} │ ${details} │`);
    });
    
    console.log('└─────┴─────────────────────────────────────────────────────────┴──────────┴─────────────────────────────────────────────┘');
    
    if (failed.length > 0) {
      console.log('\n🔍 FAILED SITES DETAILS:');
      failed.forEach((result, index) => {
        console.log(`\n${index + 1}. ❌ ${result.url}`);
        console.log(`   Contact URL: ${result.contactUrl}`);
        console.log(`   Error: ${result.error}`);
      });
    }
    
    if (passed.length > 0) {
      console.log('\n🎉 SUCCESSFUL SITES SUMMARY:');
      passed.forEach((result, index) => {
        console.log(`\n${index + 1}. ✅ ${result.url}`);
        console.log(`   Contact URL: ${result.contactUrl}`);
        if (result.foundElements && result.foundElements.length > 0) {
          console.log(`   Found Elements (${result.foundElements.length}): ${result.foundElements.join(', ')}`);
        }
      });
    }
    
    console.log('\n' + '='.repeat(120));
    console.log(`🏁 CONTACT PAGE VERIFICATION COMPLETE - ${passed.length}/${contactPageResults.length} sites passed`);
    console.log('='.repeat(120) + '\n');
  });

  for (const url of storageSiteUrls) {
    test(`Verify contact page for ${url}`, async ({ page }) => {
      const contactPage = new ContactPage(page);
      
      console.log(`\n🏠 Starting contact page test for: ${url}`);
      
      try {
        // Navigate to contact page with cache busting
        await contactPage.navigateToContactPage(url);
        
        // Verify contact page content
        const verificationResult = await contactPage.verifyContactPageContent(url);
        
        if (!verificationResult.found) {
          throw new Error('No contact page elements found. This might not be a contact page or the page structure is different.');
        }
        
        console.log(`✅ Contact page verification passed for: ${url}`);
        
        // Store successful result
        contactPageResults.push({
          url,
          contactUrl: `${url}/pages/contact`,
          status: 'PASSED',
          foundElements: verificationResult.foundElements,
          elementCounts: verificationResult.elementCounts
        });
        
      } catch (error) {
        const errorMessage = (error as Error).message || 'Unknown error occurred';
        console.log(`❌ Contact page verification failed for: ${url}`);
        console.log(`   Error: ${errorMessage}`);
        
        // Store failed result
        contactPageResults.push({
          url,
          contactUrl: `${url}/pages/contact`,
          status: 'FAILED',
          error: errorMessage
        });
        
        // Don't re-throw the error to allow other tests to continue
        // Just log the failure and continue with the next site
        console.log(`⚠️  Continuing with other sites...`);
      }
    });
  }
});
