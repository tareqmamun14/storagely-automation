const { chromium } = require('playwright');

(async () => {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: false, slowMo: 500 });
  const page = await browser.newPage();
  
  console.log('\n=== STEP 1: Navigate to Red Rocks ===');
  try {
    await page.goto('https://test.staging.storagely-api.com/red-rocks-self-storage/storage-units/colorado/aurora/east-14th-avenue', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    console.log('✓ Page loaded');
    console.log(`Current URL: ${page.url()}`);
  } catch (e) {
    console.log('❌ Navigation failed:', e.message);
    await browser.close();
    return;
  }
  
  await page.waitForTimeout(3000);
  
  console.log('\n=== STEP 2: Look for RESERVE button ===');
  // Try the exact selector from the code
  const reserveSelectors = [
    'button:has-text("RESERVE")',
    'a:has-text("RESERVE")',
    'button.reserveBtnPop',
    '[class*="reserve"]'
  ];
  
  let reserveFound = false;
  for (const selector of reserveSelectors) {
    const count = await page.locator(selector).count();
    console.log(`  ${selector}: ${count} found`);
    if (count > 0 && !reserveFound) {
      try {
        const firstBtn = page.locator(selector).first();
        const isVisible = await firstBtn.isVisible({ timeout: 2000 });
        if (isVisible) {
          console.log(`  ✓ Found visible RESERVE button with: ${selector}`);
          await firstBtn.click();
          console.log('  ✓ Clicked RESERVE button');
          await page.waitForTimeout(2000);
          reserveFound = true;
          break;
        }
      } catch (e) {
        console.log(`  ⚠️  Button found but couldn't click: ${e.message}`);
      }
    }
  }
  
  if (!reserveFound) {
    console.log('  ⚠️  No RESERVE button clicked, skipping to rent button');
  }
  
  // Check for modal and close it
  console.log('\n=== STEP 2.5: Check for modal ===');
  const closeBtn = await page.locator('button:has-text("Close")').first();
  if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await closeBtn.click();
    console.log('  ✓ Closed modal');
    await page.waitForTimeout(1000);
  } else {
    console.log('  - No modal to close');
  }
  
  console.log('\n=== STEP 3: Look for RENT button ===');
  // List all rent buttons
  const rentButtonsList = await page.locator('button:has-text("rent"), a:has-text("rent")').all();
  console.log(`  Found ${rentButtonsList.length} elements with "rent" text`);
  
  // Try the exact selector from StorageListingPage
  const rentSelectors = [
    '.listviewrows .blackBtnStoragely:has-text("RENT")',
    'a:has-text("Reserve Unit")',
    'a.reserveBtnPop.whiteBtnStoragely:has-text("Select Pricing Option")',
    'button:has-text("rent")',
    'a:has-text("rent")'
  ];
  
  let rentClicked = false;
  for (const selector of rentSelectors) {
    const count = await page.locator(selector).count();
    if (count > 0) {
      console.log(`  ${selector}: ${count} found`);
      try {
        const firstBtn = page.locator(selector).first();
        const isVisible = await firstBtn.isVisible({ timeout: 2000 });
        if (isVisible && !rentClicked) {
          console.log(`  ✓ Attempting to click with: ${selector}`);
          await firstBtn.click();
          console.log('  ✓ Clicked RENT button!');
          rentClicked = true;
          break;
        }
      } catch (e) {
        console.log(`  ⚠️  Couldn't click: ${e.message}`);
      }
    }
  }
  
  if (!rentClicked) {
    console.log('  ❌ Could not click any rent button');
    await page.waitForTimeout(5000);
    await browser.close();
    return;
  }
  
  await page.waitForTimeout(2000);
  
  console.log('\n=== STEP 4: Check for immediate error ===');
  const errorSelectors = ['.toast', '[role="alert"]', '.alert', 'div[class*="toast"]', 'div[class*="error"]'];
  
  for (const sel of errorSelectors) {
    const elem = await page.locator(sel).first();
    if (await elem.isVisible().catch(() => false)) {
      const text = await elem.textContent();
      console.log(`  ⚠️  ERROR FOUND with ${sel}:`);
      console.log(`     "${text?.trim()}"`);
    }
  }
  
  console.log('\n=== STEP 5: Check navigation ===');
  const urlAfter = page.url();
  console.log(`  Current URL: ${urlAfter}`);
  console.log(`  Navigated to form? ${urlAfter.includes('step_four') || urlAfter.includes('step-four')}`);
  
  // Check if rental form appeared
  const summaryHeading = await page.getByRole('heading', { name: 'Summary of Rental' });
  const formVisible = await summaryHeading.isVisible({ timeout: 5000 }).catch(() => false);
  console.log(`  Rental form visible? ${formVisible}`);
  
  console.log('\nWaiting 30 seconds for you to inspect...');
  await page.waitForTimeout(30000);
  
  await browser.close();
  console.log('\n✓ Done');
})();
