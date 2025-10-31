const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('🌐 Navigating to Bluebird page...');
  await page.goto('https://test.staging.storagely-api.com/bluebirdstorage/storage-units/alberta/calgary/mayland');
  
  console.log('⏳ Waiting for page to load...');
  await page.waitForTimeout(3000);
  
  console.log('🔍 Looking for RENT button...');
  
  // Find and click rent button
  const rentButton = page.locator('.listviewrows .blackBtnStoragely:has-text("RENT")').first();
  
  if (await rentButton.isVisible({ timeout: 5000 })) {
    console.log('✅ Found RENT button, clicking it...');
    await rentButton.click();
    
    console.log('⏳ Waiting for navigation or error messages...');
    await page.waitForTimeout(3000);
    
    // Check current URL
    console.log(`📍 Current URL: ${page.url()}`);
    
    // Capture all visible text on the page
    console.log('\n📋 Capturing page content after click...');
    
    // Look for common error elements
    const errorSelectors = [
      '.toast',
      '.toast-error',
      '.alert',
      '.error',
      '[role="alert"]',
      '.notification',
      '.message',
      '.brz-forms2__alert',
      '.brz-forms__alert',
      'div[class*="error"]',
      'div[class*="alert"]',
      'div[class*="toast"]'
    ];
    
    for (const selector of errorSelectors) {
      const elements = page.locator(selector);
      const count = await elements.count();
      if (count > 0) {
        console.log(`\n🔍 Found ${count} element(s) with selector: ${selector}`);
        for (let i = 0; i < count; i++) {
          const text = await elements.nth(i).textContent();
          const isVisible = await elements.nth(i).isVisible();
          console.log(`   [${i}] Visible: ${isVisible}, Text: ${text?.trim()}`);
        }
      }
    }
    
    // Get the page HTML to inspect
    console.log('\n📄 Getting page HTML...');
    const bodyHTML = await page.locator('body').innerHTML();
    
    // Search for error-related text in HTML
    const errorKeywords = ['error', 'invalid', 'not available', 'unavailable', 'failed'];
    console.log('\n🔍 Searching for error keywords in HTML...');
    for (const keyword of errorKeywords) {
      if (bodyHTML.toLowerCase().includes(keyword)) {
        console.log(`   ✅ Found keyword: "${keyword}"`);
        
        // Try to extract surrounding context
        const regex = new RegExp(`.{0,100}${keyword}.{0,100}`, 'gi');
        const matches = bodyHTML.match(regex);
        if (matches && matches.length > 0) {
          console.log(`   Context: ${matches[0].replace(/<[^>]*>/g, '').trim().substring(0, 150)}...`);
        }
      }
    }
    
    console.log('\n⏸️  Keeping browser open for manual inspection...');
    console.log('📸 Taking screenshot...');
    await page.screenshot({ path: 'bluebird-after-rent-click.png', fullPage: true });
    console.log('✅ Screenshot saved as bluebird-after-rent-click.png');
    console.log('Press Ctrl+C to close when done inspecting.');
    
    // Keep browser open
    await page.waitForTimeout(60000); // 1 minute
    
  } else {
    console.log('❌ Could not find RENT button');
  }
  
  await browser.close();
})();
