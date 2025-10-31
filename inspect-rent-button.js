const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const sites = [
    {
      name: 'Bluebird Storage (SiteLink)',
      url: 'https://bluebirdstorage.ca/storage-units/alberta/calgary/mayland',
      platform: 'SiteLink'
    },
    {
      name: '10 Federal Storage (storEDGE)',
      url: 'https://10federalstorage.com/storage-units/georgia/dahlonega/highway-19-north',
      platform: 'storEDGE'
    }
  ];
  
  for (const site of sites) {
    console.log('\n' + '='.repeat(80));
    console.log(`🏢 ${site.name}`);
    console.log(`🌐 URL: ${site.url}`);
    console.log(`⚙️  Platform: ${site.platform}`);
    console.log('='.repeat(80));
    
    try {
      console.log('\n📍 Navigating to page...');
      await page.goto(site.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      console.log('✅ Page loaded');
      
      // Wait for page to stabilize
      await page.waitForTimeout(3000);
      
      // Scroll down to help rent button become visible
      console.log('\n📜 Scrolling down...');
      await page.evaluate(() => window.scrollBy(0, 400));
      await page.waitForTimeout(1000);
      
      console.log('\n🔍 CHECKING RENT BUTTON STRUCTURE:');
      console.log('-'.repeat(80));
      
      // Check different rent button selectors
      const selectors = [
        { name: 'storEDGE: getByRole("link", name: /^rent$/i)', locator: page.getByRole('link', { name: /^rent$/i }) },
        { name: 'SiteLink: .listviewrows .blackBtnStoragely:has-text("RENT")', locator: page.locator('.listviewrows .blackBtnStoragely:has-text("RENT")') },
        { name: 'Any table rent link', locator: page.locator('table').getByRole('link', { name: /rent/i }) },
        { name: 'Any unit-row rent link', locator: page.locator('.unit-row, .listing-row').getByRole('link', { name: /rent/i }) },
        { name: 'Generic: a:has-text("rent")', locator: page.locator('a:has-text("rent")') },
        { name: 'Generic: button:has-text("rent")', locator: page.locator('button:has-text("rent")') }
      ];
      
      for (const sel of selectors) {
        const count = await sel.locator.count();
        console.log(`\n${sel.name}`);
        console.log(`   Count: ${count}`);
        
        if (count > 0) {
          // Check first 3 instances
          const limit = Math.min(count, 3);
          for (let i = 0; i < limit; i++) {
            const elem = sel.locator.nth(i);
            const isVisible = await elem.isVisible().catch(() => false);
            const text = await elem.textContent().catch(() => '');
            const href = await elem.getAttribute('href').catch(() => '');
            console.log(`   [${i + 1}] Text: "${text.trim()}" | Visible: ${isVisible} | Href: ${href}`);
          }
        }
      }
      
      console.log('\n' + '-'.repeat(80));
      console.log('✅ Inspection complete for this site');
      
      // Wait a bit before moving to next site
      await page.waitForTimeout(2000);
      
    } catch (error) {
      console.error(`\n❌ ERROR inspecting ${site.name}:`, error.message);
    }
  }
  
  console.log('\n\n' + '='.repeat(80));
  console.log('🏁 INSPECTION COMPLETE FOR ALL SITES');
  console.log('='.repeat(80));
  console.log('\nBrowser will stay open for 30 seconds for manual inspection...');
  await page.waitForTimeout(30000);
  
  await browser.close();
})();
