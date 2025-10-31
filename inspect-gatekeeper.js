const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  await page.goto('https://test.staging.storagely-api.com/gatekeeper-self-storage/storage-units/georgia/peachtree-city/senoia-road');
  console.log('✓ Page loaded');
  await page.waitForTimeout(2000);
  
  // Click RESERVE button
  const reserveBtn = await page.locator('button:has-text("RESERVE")').first();
  if (await reserveBtn.isVisible()) {
    await reserveBtn.click();
    console.log('✓ Clicked RESERVE');
  }
  await page.waitForTimeout(1000);
  
  // Close modal if present
  const closeBtn = await page.locator('button:has-text("Close")').first();
  if (await closeBtn.isVisible()) {
    await closeBtn.click();
    console.log('✓ Closed modal');
    await page.waitForTimeout(1000);
  }
  
  // Click rent button
  const rentBtn = await page.locator('button:has-text("rent")').first();
  console.log('Found rent button');
  await rentBtn.click({ force: true });
  console.log('✓ Clicked rent button');
  
  console.log('Waiting 2 seconds for errors...');
  await page.waitForTimeout(2000);
  
  // Check for error messages
  const selectors = ['.toast', '[role="alert"]', '.alert', 'div[class*="toast"]', 'div[class*="error"]'];
  for (const sel of selectors) {
    const elem = await page.locator(sel).first();
    if (await elem.isVisible()) {
      const text = await elem.textContent();
      console.log(`✓ Found error with ${sel}: ${text}`);
    }
  }
  
  // Check if rental form appeared
  console.log('\nChecking if rental form appeared...');
  const summaryHeading = await page.getByRole('heading', { name: 'Summary of Rental' });
  const isVisible = await summaryHeading.isVisible().catch(() => false);
  console.log(`Summary heading visible: ${isVisible}`);
  
  // Check current URL
  console.log(`Current URL: ${page.url()}`);
  
  await page.waitForTimeout(30000);
  await browser.close();
})();
