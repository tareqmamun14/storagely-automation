const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  await page.goto('https://test.staging.storagely-api.com/red-rocks-self-storage/storage-units/colorado/aurora/east-14th-avenue');
  console.log('✓ Page loaded');
  await page.waitForTimeout(2000);
  
  // Click RESERVE
  const reserveBtn = await page.locator('a:has-text("RESERVE")').first();
  await reserveBtn.click();
  console.log('✓ Clicked RESERVE');
  await page.waitForTimeout(2000);
  
  // Check what close options are available
  console.log('\nLooking for close button options...');
  const closeSelectors = [
    'button:has-text("Close")',
    'button[data-dismiss="modal"]',
    '[aria-label="Close"]',
    '.close',
    'button.close',
    '[class*="close"]',
    '#reserveFormModal_v3 button:has-text("×")',
    '#reserveFormModal_v3 .close'
  ];
  
  for (const sel of closeSelectors) {
    const count = await page.locator(sel).count();
    if (count > 0) {
      console.log(`  ${sel}: ${count} found`);
      const firstElem = page.locator(sel).first();
      const isVisible = await firstElem.isVisible().catch(() => false);
      if (isVisible) {
        console.log(`    ✓ First one is VISIBLE - trying to click...`);
        try {
          await firstElem.click({ timeout: 3000 });
          console.log(`    ✓ CLICKED successfully!`);
          await page.waitForTimeout(1000);
          
          // Check if modal closed
          const modalStillVisible = await page.locator('#reserveFormModal_v3').isVisible().catch(() => false);
          console.log(`    Modal still visible after click? ${modalStillVisible}`);
          if (!modalStillVisible) {
            console.log(`    ✓ Modal was successfully closed with: ${sel}`);
            break;
          }
        } catch (e) {
          console.log(`    ⚠️  Couldn't click: ${e.message.split('\n')[0]}`);
        }
      }
    }
  }
  
  await page.waitForTimeout(30000);
  await browser.close();
})();
