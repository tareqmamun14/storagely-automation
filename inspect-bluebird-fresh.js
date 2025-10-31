const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('Navigating to Bluebird...');
  await page.goto('https://test.staging.storagely-api.com/bluebirdstorage/storage-units/alberta/calgary/mayland');
  console.log('✓ Page loaded');
  await page.waitForTimeout(5000); // Wait longer for page to fully load
  
  // Check what buttons are visible
  console.log('\nChecking what buttons exist on the page...');
  const allButtons = await page.locator('button').all();
  console.log(`Found ${allButtons.length} buttons total`);
  
  // Check for rent-like text in buttons
  const rentButtons = await page.locator('button, a').filter({ hasText: /rent|reserve/i }).all();
  console.log(`\nFound ${rentButtons.length} rent/reserve elements:`);
  for (let i = 0; i < rentButtons.length; i++) {
    const text = await rentButtons[i].textContent().catch(() => '');
    const isVisible = await rentButtons[i].isVisible().catch(() => false);
    console.log(`  ${i + 1}. "${text.trim()}" (visible: ${isVisible})`);
  }
  
  // Click RESERVE button
  console.log('\nStep 1: Clicking RESERVE button...');
  const reserveBtn = await page.locator('button:has-text("RESERVE")').first();
  if (await reserveBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await reserveBtn.click();
    console.log('✓ Clicked RESERVE');
    await page.waitForTimeout(1000);
  } else {
    console.log('- RESERVE button not found');
  }
  
  // Close modal
  console.log('\nStep 2: Closing modal...');
  const closeBtn = await page.locator('button:has-text("Close")').first();
  if (await closeBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await closeBtn.click();
    console.log('✓ Closed modal');
    await page.waitForTimeout(1000);
  } else {
    console.log('- Close button not found');
  }
  
  // Get current URL before clicking rent
  const urlBefore = page.url();
  console.log(`\nCurrent URL BEFORE rent click: ${urlBefore}`);
  
  // Click rent button
  console.log('\nStep 3: Clicking RENT button...');
  const rentBtn = await page.getByText('rent', { exact: true }).first();
  try {
    await rentBtn.click({ timeout: 5000 });
    console.log('✓ Clicked RENT button');
  } catch (e) {
    console.log('❌ RENT button not clickable, error:', e.message);
    await browser.close();
    return;
  }
  
  // IMMEDIATELY check for errors (this is key!)
  console.log('\nStep 4: Checking for immediate errors (waiting 1.5 seconds)...');
  await page.waitForTimeout(1500);
  
  const selectors = [
    '.toast',
    '[role="alert"]', 
    '.alert',
    'div[class*="toast"]',
    'div[class*="error"]',
    '.error-message',
    '.notification-error',
    '.message.error',
    '[class*="alert"]'
  ];
  
  let errorFound = false;
  for (const sel of selectors) {
    const elem = await page.locator(sel).first();
    if (await elem.isVisible().catch(() => false)) {
      const text = await elem.textContent();
      console.log(`\n✓ FOUND ERROR with selector "${sel}":`);
      console.log(`   Message: "${text?.trim()}"`);
      errorFound = true;
      break;
    }
  }
  
  if (!errorFound) {
    console.log('\n✅ NO IMMEDIATE ERROR FOUND');
  }
  
  // Check URL after error check
  const urlAfter = page.url();
  console.log(`\nCurrent URL AFTER rent click: ${urlAfter}`);
  console.log(`\nDid page navigate? ${urlBefore !== urlAfter}`);
  console.log(`Still on listing page? ${urlAfter.includes('/storage-units/')}`);
  
  // Wait to see the page state
  console.log('\nWaiting 30 seconds for you to observe...');
  await page.waitForTimeout(30000);
  
  await browser.close();
})();
