const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  const sites = [
    { name: 'Red Rocks Storage', url: 'https://redrocksstorage.com/storage-units/colorado/aurora/east-14th-avenue' },
    { name: 'Distinct Storage', url: 'https://distinctstorage.com/storage-units/connecticut/new-milford/kent-road' },
    { name: 'Bluebird Storage', url: 'https://bluebirdstorage.ca/storage-units/alberta/calgary/mayland' },
    { name: 'Rhino Storage', url: 'https://rhino-storage.com/storage-units/louisiana/covington/philip-drive' },
    { name: 'Gatekeeper Storage', url: 'https://gatekeeperstoragega.com/storage-units/georgia/peachtree-city/senoia-road' }
  ];
  
  for (const site of sites) {
    console.log('\n' + '='.repeat(80));
    console.log(`🏢 ${site.name}`);
    console.log(`🌐 URL: ${site.url}`);
    console.log('='.repeat(80));
    
    try {
      console.log('\n📍 Step 1: Navigating...');
      await page.goto(site.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      console.log('✅ Loaded\n');
      
      await page.waitForTimeout(2000);
      
      // Check page title and URL
      console.log(`Title: ${await page.title()}`);
      console.log(`URL: ${page.url()}\n`);
      
      // Scroll down
      console.log('📜 Scrolling down 400px...');
      await page.evaluate(() => window.scrollBy(0, 400));
      await page.waitForTimeout(500);
      
      // Check for rent buttons
      console.log('\n🔍 RENT BUTTON CHECK:\n');
      
      const tableRent = page.locator('table').getByRole('link', { name: /^rent$/i });
      const tableCount = await tableRent.count();
      console.log(`1. Table rent links: ${tableCount}`);
      if (tableCount > 0) {
        const visible = await tableRent.first().isVisible().catch(() => false);
        const text = await tableRent.first().textContent().catch(() => '');
        console.log(`   First: visible=${visible}, text="${text.trim()}"`);
      }
      
      const siteLinkRent = page.locator('.listviewrows .blackBtnStoragely:has-text("RENT")');
      const siteLinkCount = await siteLinkRent.count();
      console.log(`\n2. SiteLink rent buttons: ${siteLinkCount}`);
      if (siteLinkCount > 0) {
        const visible = await siteLinkRent.first().isVisible().catch(() => false);
        const text = await siteLinkRent.first().textContent().catch(() => '');
        console.log(`   First: visible=${visible}, text="${text.trim()}"`);
      }
      
      // Try clicking
      console.log('\n🎯 ATTEMPTING CLICK:\n');
      let clicked = false;
      
      if (tableCount > 0) {
        try {
          console.log('Trying table strategy...');
          const btn = tableRent.first();
          const text = await btn.textContent({ timeout: 5000 });
          console.log(`Got text: "${text}"`);
          await btn.scrollIntoViewIfNeeded();
          await btn.click({ timeout: 5000 });
          clicked = true;
          console.log('✅ CLICKED!');
          await page.waitForTimeout(2000);
          console.log(`New URL: ${page.url()}`);
        } catch (e) {
          console.log(`❌ Failed: ${e.message}`);
        }
      } else if (siteLinkCount > 0) {
        try {
          console.log('Trying SiteLink strategy...');
          const btn = siteLinkRent.first();
          const text = await btn.textContent({ timeout: 5000 });
          console.log(`Got text: "${text}"`);
          await btn.scrollIntoViewIfNeeded();
          await btn.click({ timeout: 5000 });
          clicked = true;
          console.log('✅ CLICKED!');
          await page.waitForTimeout(2000);
          console.log(`New URL: ${page.url()}`);
        } catch (e) {
          console.log(`❌ Failed: ${e.message}`);
        }
      }
      
      if (!clicked) {
        console.log('❌ No rent button found or clicked');
      }
      
      console.log('\n✅ Inspection complete\n');
      await page.waitForTimeout(3000);
      
    } catch (error) {
      console.error(`\n❌ ERROR: ${error.message}\n`);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('🏁 INSPECTION COMPLETE');
  console.log('='.repeat(80));
  console.log('\nBrowser stays open for 30 seconds...');
  await page.waitForTimeout(30000);
  
  await browser.close();
})();
