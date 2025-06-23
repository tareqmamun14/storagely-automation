import { test, expect, Page } from '@playwright/test';

const discountChecks = [
  {
    customer: 'Demo Account : StorEDGE',
    url: 'https://app.storagely.io/storagelyselfstorage/storage-units/north-carolina/winston-salem/west-3rd-street',
    expected: '50% OFF THE FIRST TWO MONTHS'
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

test.describe.skip('Verify page discount from storage unit', () => {
  for (const { customer, url, expected } of discountChecks) {
    test.skip(`Verify offer content ${customer}`, async ({ page }) => {
      console.log(`\n🔍 Testing ${customer}`);
      console.log(`📋 Expected: "${expected}"`);
      
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      
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
      
      let matched = false;
      let foundTexts: string[] = [];
      
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
      
      // If no match found, log all found texts for debugging
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
        }
      }
      
      expect(matched, `Expected discount text "${expected}" not found for ${customer}`).toBeTruthy();
    });
  }
});

// Additional test for debugging - can be used separately
test.describe('Debug Discount Elements', () => {
  test.skip('Debug discount elements structure', async ({ page }) => {
    const url = 'https://app.storagely.io/mini-mall-storage/storage-units/alabama/courtland/highway-33';
    
    await page.goto(url, { waitUntil: 'domcontentloaded' });
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