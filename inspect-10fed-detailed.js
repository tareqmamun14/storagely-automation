const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('🚀 Navigating to 10federal...');
  await page.goto('https://10federalstorage.com/storage-units/georgia/dahlonega/highway-19-north', { 
    waitUntil: 'domcontentloaded',
    timeout: 60000 
  });

  console.log('✅ Page loaded');
  
  // Wait for page to stabilize
  await page.waitForTimeout(5000);
  
  console.log('\n📏 Checking page scroll and viewport...');
  const pageInfo = await page.evaluate(() => ({
    scrollHeight: document.documentElement.scrollHeight,
    clientHeight: document.documentElement.clientHeight,
    scrollTop: document.documentElement.scrollTop,
    viewportHeight: window.innerHeight
  }));
  console.log('Page info:', pageInfo);
  
  console.log('\n⟳ Scrolling down 500px...');
  await page.evaluate(() => window.scrollBy(0, 500));
  await page.waitForTimeout(2000);
  
  const afterScroll = await page.evaluate(() => ({
    scrollTop: document.documentElement.scrollTop
  }));
  console.log('After scroll:', afterScroll);
  
  console.log('\n🔍 Checking for tables...');
  const tables = await page.locator('table').count();
  console.log(`Found ${tables} tables`);
  
  if (tables > 0) {
    console.log('\n🔍 Checking for rent buttons in tables...');
    
    // Wait up to 3 minutes for rent buttons to appear
    console.log('⏳ Waiting for rent buttons to appear (timeout: 180s)...');
    const startTime = Date.now();
    
    let rentButtons = 0;
    let attempts = 0;
    
    while (rentButtons === 0 && (Date.now() - startTime) < 180000) {
      attempts++;
      rentButtons = await page.locator('table').getByRole('link', { name: /^rent$/i }).count();
      
      if (rentButtons > 0) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`\n✅ Found ${rentButtons} rent buttons after ${elapsed}s (attempt ${attempts})`);
        
        // Check if first button is visible
        const firstButton = page.locator('table').getByRole('link', { name: /^rent$/i }).first();
        const isVisible = await firstButton.isVisible().catch(() => false);
        const boundingBox = await firstButton.boundingBox().catch(() => null);
        
        console.log(`First button visible: ${isVisible}`);
        console.log(`First button position:`, boundingBox);
        
        break;
      }
      
      if (attempts % 10 === 0) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`⏳ Still waiting... ${elapsed}s elapsed (attempt ${attempts})`);
      }
      
      await page.waitForTimeout(1000);
    }
    
    if (rentButtons === 0) {
      console.log('\n❌ No rent buttons found after 180 seconds');
    }
  }
  
  console.log('\n✋ Keeping browser open for manual inspection...');
  console.log('Press Ctrl+C to close');
  
  // Keep browser open
  await new Promise(() => {});
})();
