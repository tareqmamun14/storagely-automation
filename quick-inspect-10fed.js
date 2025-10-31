const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  const site = {
    name: '10 Federal Storage',
    url: 'https://10federalstorage.com/storage-units/georgia/dahlonega/highway-19-north',
  };
  
  console.log('='.repeat(80));
  console.log(`🏢 ${site.name}`);
  console.log(`🌐 URL: ${site.url}`);
  console.log('='.repeat(80));
  
  try {
    console.log('\nNavigating...');
    await page.goto(site.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    console.log('✅ Page loaded\n');
    
    await page.waitForTimeout(3000);
    
    // Scroll
    await page.evaluate(() => window.scrollBy(0, 400));
    await page.waitForTimeout(500);
    
    // Check strategies
    console.log('CHECKING RENT BUTTON STRATEGIES:\n');
    
    // Strategy 1: Table
    const tableRent = page.locator('table').getByRole('link', { name: /^rent$/i });
    const tableCount = await tableRent.count();
    console.log(`1. Table rent links: ${tableCount}`);
    if (tableCount > 0) {
      const first = tableRent.first();
      const visible = await first.isVisible().catch(() => false);
      const text = await first.textContent().catch(() => '');
      console.log(`   First element: visible=${visible}, text="${text.trim()}"`);
    }
    
    // Strategy 2: SiteLink
    const siteLink = page.locator('.listviewrows .blackBtnStoragely:has-text("RENT")');
    const siteLinkCount = await siteLink.count();
    console.log(`\n2. SiteLink rent buttons: ${siteLinkCount}`);
    if (siteLinkCount > 0) {
      const first = siteLink.first();
      const visible = await first.isVisible().catch(() => false);
      const text = await first.textContent().catch(() => '');
      console.log(`   First element: visible=${visible}, text="${text.trim()}"`);
    }
    
    // Strategy 3: Container
    const container = page.locator('.unit-listing, .listing-row, [class*="listing"]').getByRole('link', { name: /rent/i });
    const containerCount = await container.count();
    console.log(`\n3. Container rent links: ${containerCount}`);
    if (containerCount > 0) {
      const first = container.first();
      const visible = await first.isVisible().catch(() => false);
      const text = await first.textContent().catch(() => '');
      console.log(`   First element: visible=${visible}, text="${text.trim()}"`);
    }
    
    // Try clicking
    console.log('\n\nTRYING TO CLICK...\n');
    
    if (tableCount > 0) {
      console.log('Attempting table strategy...');
      try {
        await tableRent.first().waitFor({ state: 'visible', timeout: 2000 });
        await tableRent.first().click();
        console.log('✅ CLICKED!');
        await page.waitForTimeout(2000);
        console.log(`New URL: ${page.url()}`);
      } catch (e) {
        console.log(`❌ Failed: ${e.message}`);
      }
    }
    
    console.log('\n\nKeeping browser open for 30 seconds...');
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error('ERROR:', error.message);
  }
  
  await browser.close();
})();
