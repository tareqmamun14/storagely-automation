const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const sites = [
    {
      name: '10 Federal Storage',
      url: 'https://10federalstorage.com/storage-units/georgia/dahlonega/highway-19-north',
      platform: 'storEDGE',
      issue: 'First attempt: timeout during RENT NOW (140+ seconds), Retry: No rent button found'
    },
    {
      name: 'Your Premier Storage',
      url: 'https://yourpremierstorage.com/storage-units/mississippi/magee/simpson-highway-149',
      platform: 'storEDGE',
      issue: 'First attempt: No rent button found, Retry: Page closed during payment fill'
    },
    {
      name: 'Gatekeeper Storage',
      url: 'https://gatekeeperstoragega.com/storage-units/georgia/peachtree-city/senoia-road',
      platform: 'SiteLink',
      issue: 'First attempt: No rent button found, Retry: Success but failed to detect error'
    }
  ];
  
  for (const site of sites) {
    console.log('\n' + '='.repeat(100));
    console.log(`🏢 ${site.name}`);
    console.log(`🌐 URL: ${site.url}`);
    console.log(`⚙️  Platform: ${site.platform}`);
    console.log(`⚠️  Issue: ${site.issue}`);
    console.log('='.repeat(100));
    
    try {
      console.log('\n📍 STEP 1: Navigating...');
      await page.goto(site.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      console.log('✅ Page loaded');
      
      await page.waitForTimeout(3000);
      
      // Check page state
      console.log('\n📊 PAGE STATE CHECK:');
      const pageTitle = await page.title();
      const currentUrl = page.url();
      console.log(`   Title: ${pageTitle}`);
      console.log(`   URL: ${currentUrl}`);
      console.log(`   URL Match: ${currentUrl === site.url}`);
      
      // Scroll down
      console.log('\n📜 Scrolling down...');
      await page.evaluate(() => window.scrollBy(0, 400));
      await page.waitForTimeout(1000);
      
      // Check for rent buttons with ALL strategies
      console.log('\n🔍 RENT BUTTON ANALYSIS:');
      console.log('-'.repeat(100));
      
      const strategies = [
        {
          name: 'Strategy 1: Table rent link',
          locator: page.locator('table').getByRole('link', { name: /^rent$/i })
        },
        {
          name: 'Strategy 2: SiteLink specific',
          locator: page.locator('.listviewrows .blackBtnStoragely:has-text("RENT")')
        },
        {
          name: 'Strategy 3: Container rent link',
          locator: page.locator('.unit-listing, .listing-row, [class*="listing"]').getByRole('link', { name: /rent/i })
        },
        {
          name: 'Fallback: Any table link',
          locator: page.locator('table a')
        },
        {
          name: 'Fallback: Any visible link with "rent"',
          locator: page.locator('a:has-text("rent"), a:has-text("RENT")')
        }
      ];
      
      for (const strategy of strategies) {
        const count = await strategy.locator.count();
        console.log(`\n${strategy.name}: ${count} found`);
        
        if (count > 0) {
          const limit = Math.min(count, 3);
          for (let i = 0; i < limit; i++) {
            const elem = strategy.locator.nth(i);
            try {
              const isVisible = await elem.isVisible({ timeout: 500 });
              const text = await elem.textContent().catch(() => 'N/A');
              const href = await elem.getAttribute('href').catch(() => 'N/A');
              console.log(`   [${i + 1}] Visible: ${isVisible} | Text: "${text.trim()}" | Href: ${href}`);
            } catch (e) {
              console.log(`   [${i + 1}] Error checking element: ${e.message}`);
            }
          }
        }
      }
      
      // Check if units are available
      console.log('\n\n📦 UNIT AVAILABILITY CHECK:');
      const unitRows = await page.locator('table tr, .unit-row, .listing-row').count();
      console.log(`   Found ${unitRows} unit rows`);
      
      // Check for "no units" or "sold out" messages
      const noUnitsText = await page.locator('body').textContent();
      const hasNoUnits = noUnitsText?.toLowerCase().includes('no units available') || 
                         noUnitsText?.toLowerCase().includes('sold out') ||
                         noUnitsText?.toLowerCase().includes('no availability');
      console.log(`   "No units" message present: ${hasNoUnits}`);
      
      // Try to click first available rent button
      console.log('\n\n🎯 ATTEMPTING TO CLICK RENT BUTTON:');
      let clicked = false;
      
      for (const strategy of strategies.slice(0, 3)) {
        if (!clicked) {
          try {
            const elem = strategy.locator.first();
            const count = await elem.count();
            if (count > 0) {
              await elem.waitFor({ state: 'visible', timeout: 2000 });
              console.log(`   Trying: ${strategy.name}`);
              await elem.click();
              clicked = true;
              console.log(`   ✅ Clicked successfully using: ${strategy.name}`);
              await page.waitForTimeout(2000);
              
              const newUrl = page.url();
              console.log(`   New URL: ${newUrl}`);
              console.log(`   Navigation successful: ${newUrl.includes('/step_four') || newUrl.includes('/step-four')}`);
              break;
            }
          } catch (e) {
            console.log(`   ❌ Failed with ${strategy.name}: ${e.message}`);
          }
        }
      }
      
      if (!clicked) {
        console.log('   ❌ Could not click any rent button');
      }
      
      console.log('\n✅ Inspection complete for this site');
      console.log('\nWaiting 5 seconds before next site...');
      await page.waitForTimeout(5000);
      
    } catch (error) {
      console.error(`\n❌ ERROR inspecting ${site.name}:`, error.message);
    }
  }
  
  console.log('\n\n' + '='.repeat(100));
  console.log('🏁 INSPECTION COMPLETE FOR ALL SITES');
  console.log('='.repeat(100));
  console.log('\nBrowser will stay open for 30 seconds for manual inspection...');
  await page.waitForTimeout(30000);
  
  await browser.close();
})();
