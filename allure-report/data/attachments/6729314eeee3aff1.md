# Test info

- Name: Verify page discount from storage unit >> Verify offer content Mini Mall : SiteLink
- Location: C:\Users\tareq\OneDrive\Documents\GitHub\storagely-automation\tests\discountBanner-verification.spec.ts:40:9

# Error details

```
Error: page.goto: net::ERR_CONNECTION_TIMED_OUT at https://app.storagely.io/mini-mall-storage/storage-units/alabama/courtland/highway-33
Call log:
  - navigating to "https://app.storagely.io/mini-mall-storage/storage-units/alabama/courtland/highway-33", waiting until "domcontentloaded"

    at C:\Users\tareq\OneDrive\Documents\GitHub\storagely-automation\tests\discountBanner-verification.spec.ts:44:18
```

# Page snapshot

```yaml
- heading "This site can’t be reached" [level=1]
- paragraph:
  - strong: app.storagely.io
  - text: took too long to respond.
- paragraph: "Try:"
- list:
  - listitem: Checking the connection
  - listitem:
    - link "Checking the proxy and the firewall":
      - /url: "#buttons"
  - listitem:
    - link "Running Windows Network Diagnostics":
      - /url: javascript:diagnoseErrors()
- text: ERR_CONNECTION_TIMED_OUT
- button "Reload"
- button "Details"
```

# Test source

```ts
   1 | import { test, expect, Page } from '@playwright/test';
   2 |
   3 | const discountChecks = [
   4 |   {
   5 |     customer: 'Demo Account : StorEDGE',
   6 |     url: 'https://app.storagely.io/storagelyselfstorage/storage-units/north-carolina/winston-salem/west-3rd-street',
   7 |     expected: '50% OFF THE FIRST TWO MONTHS'
   8 |   },
   9 |   {
   10 |     customer: 'Smart Self Storage : SSM',
   11 |     url: 'https://app.storagely.io/smart-self-storage-ohio/storage-units/ohio/macedonia/bavaria-road',
   12 |     expected: 'Off 3 Months'
   13 |   },
   14 |   {
   15 |     customer: 'Mini Mall : SiteLink',
   16 |     url: 'https://app.storagely.io/mini-mall-storage/storage-units/alabama/courtland/highway-33',
   17 |     expected: 'First Month Free'
   18 |   }
   19 | ];
   20 |
   21 | // Helper function to normalize text for comparison
   22 | function normalizeText(text: string): string {
   23 |   return text.replace(/\s+/g, ' ').trim().toLowerCase();
   24 | }
   25 |
   26 | // Helper function to check if expected text matches actual text (flexible matching)
   27 | function isTextMatch(actualText: string, expectedText: string): boolean {
   28 |   const normalizedActual = normalizeText(actualText);
   29 |   const normalizedExpected = normalizeText(expectedText);
   30 |   
   31 |   // Split expected text into words for partial matching
   32 |   const expectedWords = normalizedExpected.split(' ');
   33 |   
   34 |   // Check if all expected words are present in actual text
   35 |   return expectedWords.every(word => normalizedActual.includes(word));
   36 | }
   37 |
   38 | test.describe('Verify page discount from storage unit', () => {
   39 |   for (const { customer, url, expected } of discountChecks) {
   40 |     test(`Verify offer content ${customer}`, async ({ page }) => {
   41 |       console.log(`\n🔍 Testing ${customer}`);
   42 |       console.log(`📋 Expected: "${expected}"`);
   43 |       
>  44 |       await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      |                  ^ Error: page.goto: net::ERR_CONNECTION_TIMED_OUT at https://app.storagely.io/mini-mall-storage/storage-units/alabama/courtland/highway-33
   45 |       
   46 |       // Wait for discount elements to load
   47 |       await page.waitForTimeout(2000);
   48 |       
   49 |       // Look for discount elements with multiple selectors
   50 |       const discountSelectors = [
   51 |         '.page_discount',
   52 |         '.offer_content',
   53 |         '.discount',
   54 |         '.promo',
   55 |         '.banner',
   56 |         '[class*="discount"]',
   57 |         '[class*="offer"]',
   58 |         '[class*="promo"]'
   59 |       ];
   60 |       
   61 |       let matched = false;
   62 |       let foundTexts: string[] = [];
   63 |       
   64 |       for (const selector of discountSelectors) {
   65 |         try {
   66 |           const elements = page.locator(selector);
   67 |           const count = await elements.count();
   68 |           
   69 |           if (count > 0) {
   70 |             console.log(`📍 Found ${count} elements with selector: ${selector}`);
   71 |             
   72 |             for (let i = 0; i < count; i++) {
   73 |               try {
   74 |                 const element = elements.nth(i);
   75 |                 
   76 |                 // Check if element is visible
   77 |                 if (await element.isVisible()) {
   78 |                   const text = await element.innerText();
   79 |                   
   80 |                   if (text && text.trim().length > 0) {
   81 |                     foundTexts.push(`${selector}[${i}]: "${text.trim()}"`);
   82 |                     
   83 |                     // Flexible matching - check if expected text matches
   84 |                     if (isTextMatch(text, expected)) {
   85 |                       console.log(`✅ ${customer} | Found matching banner: "${text.trim()}"`);
   86 |                       matched = true;
   87 |                       break;
   88 |                     }
   89 |                   }
   90 |                 }
   91 |               } catch (elementError) {
   92 |                 // Skip this element if there's an error
   93 |                 continue;
   94 |               }
   95 |             }
   96 |             
   97 |             if (matched) break;
   98 |           }
   99 |         } catch (selectorError) {
  100 |           // Skip this selector if it fails
  101 |           continue;
  102 |         }
  103 |       }
  104 |       
  105 |       // If no match found, log all found texts for debugging
  106 |       if (!matched) {
  107 |         console.log(`❌ ${customer} | No matching banner found`);
  108 |         console.log(`📝 All found discount texts:`);
  109 |         foundTexts.forEach(text => console.log(`   ${text}`));
  110 |         
  111 |         // Additional fallback: search in all text content
  112 |         console.log(`🔍 Searching in full page content...`);
  113 |         const pageText = await page.textContent('body');
  114 |         if (pageText && isTextMatch(pageText, expected)) {
  115 |           console.log(`✅ ${customer} | Found expected text in page content`);
  116 |           matched = true;
  117 |         }
  118 |       }
  119 |       
  120 |       expect(matched, `Expected discount text "${expected}" not found for ${customer}`).toBeTruthy();
  121 |     });
  122 |   }
  123 | });
  124 |
  125 | // Additional test for debugging - can be used separately
  126 | test.describe('Debug Discount Elements', () => {
  127 |   test.skip('Debug discount elements structure', async ({ page }) => {
  128 |     const url = 'https://app.storagely.io/mini-mall-storage/storage-units/alabama/courtland/highway-33';
  129 |     
  130 |     await page.goto(url, { waitUntil: 'domcontentloaded' });
  131 |     await page.waitForTimeout(3000);
  132 |     
  133 |     // Find all elements that might contain discount info
  134 |     const allDiscountElements = await page.locator('[class*="discount"], [class*="offer"], [class*="promo"], [class*="banner"], .page_discount').all();
  135 |     
  136 |     console.log(`Found ${allDiscountElements.length} potential discount elements:`);
  137 |     
  138 |     for (let i = 0; i < allDiscountElements.length; i++) {
  139 |       try {
  140 |         const element = allDiscountElements[i];
  141 |         const text = await element.innerText();
  142 |         const className = await element.getAttribute('class');
  143 |         const isVisible = await element.isVisible();
  144 |         
```