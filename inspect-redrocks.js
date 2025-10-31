const { chromium } = require('playwright');

(async () => {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('\nNavigating to Red Rocks...');
  try {
    await page.goto('https://test.staging.storagely-api.com/red-rocks-self-storage/storage-units/colorado/aurora/east-14th-avenue', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    console.log('✓ Page loaded');
  } catch (e) {
    console.log('❌ Navigation failed:', e.message);
    await browser.close();
    return;
  }
  
  await page.waitForTimeout(3000);
  
  console.log('\nChecking page status...');
  console.log(`Current URL: ${page.url()}`);
  console.log(`Page title: ${await page.title()}`);
  
  // Check for any error messages on page
  console.log('\nChecking for errors on page...');
  const bodyText = await page.locator('body').textContent();
  if (bodyText.toLowerCase().includes('error') || bodyText.toLowerCase().includes('not found')) {
    console.log('⚠️  Page contains error text');
  }
  
  // Check for RESERVE button
  console.log('\nChecking for RESERVE button...');
  const reserveBtn = await page.locator('button:has-text("RESERVE"), a:has-text("RESERVE")').count();
  console.log(`Found ${reserveBtn} RESERVE buttons`);
  
  // Check for rent/Reserve buttons
  console.log('\nChecking for rent buttons...');
  const rentButtons = await page.locator('button, a').filter({ hasText: /rent|reserve/i }).all();
  console.log(`Found ${rentButtons.length} rent/reserve elements`);
  
  for (let i = 0; i < Math.min(10, rentButtons.length); i++) {
    const text = await rentButtons[i].textContent().catch(() => '');
    const isVisible = await rentButtons[i].isVisible().catch(() => false);
    if (isVisible) {
      console.log(`  ${i + 1}. "${text.trim()}" (visible)`);
    }
  }
  
  console.log('\nWaiting 30 seconds for you to inspect the page...');
  await page.waitForTimeout(30000);
  
  await browser.close();
  console.log('\n✓ Done');
})();
