const { chromium } = require('playwright');

(async () => {
  console.log('Launching browser...\n');
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  const url = process.argv[2] || 'https://www.firststorage.com/storage-units/alabama/huntsville/memorial-parkway-sw';
  
  console.log(`Navigating to ${url}...`);
  await page.goto(url);
  await page.waitForLoadState('domcontentloaded');
  console.log('✓ Page loaded\n');

  // Wait for page to stabilize
  await page.waitForTimeout(5000);

  console.log('Current URL:', page.url());
  console.log('Page title:', await page.title());
  console.log('');

  // Check for rent buttons using all strategies
  console.log('=== STRATEGY 1: Table-based rent buttons ===');
  const tableRent = await page.locator('table').getByRole('link', { name: /^rent$/i }).all();
  console.log(`Found ${tableRent.length} table rent buttons`);
  for (let i = 0; i < Math.min(3, tableRent.length); i++) {
    const text = await tableRent[i].textContent();
    const visible = await tableRent[i].isVisible();
    console.log(`  ${i+1}. "${text?.trim()}" (visible: ${visible})`);
  }
  console.log('');

  console.log('=== STRATEGY 2: Generic rent/reserve buttons ===');
  const allButtons = await page.locator('a, button').filter({ hasText: /rent|reserve/i }).all();
  console.log(`Found ${allButtons.length} rent/reserve buttons`);
  for (let i = 0; i < Math.min(10, allButtons.length); i++) {
    const text = await allButtons[i].textContent();
    const visible = await allButtons[i].isVisible();
    const tag = await allButtons[i].evaluate(el => el.tagName);
    const href = tag === 'A' ? await allButtons[i].getAttribute('href') : 'N/A';
    console.log(`  ${i+1}. ${tag} - "${text?.trim()}" (visible: ${visible}) [href: ${href}]`);
  }
  console.log('');

  console.log('=== STRATEGY 3: Text-based "Rent" links ===');
  const textRent = await page.getByRole('link', { name: /rent/i }).all();
  console.log(`Found ${textRent.length} rent links`);
  for (let i = 0; i < Math.min(5, textRent.length); i++) {
    const text = await textRent[i].textContent();
    const visible = await textRent[i].isVisible();
    const href = await textRent[i].getAttribute('href');
    console.log(`  ${i+1}. "${text?.trim()}" (visible: ${visible}) [href: ${href}]`);
  }
  console.log('');

  console.log('=== CHECKING PAGE TYPE ===');
  const url_current = page.url();
  console.log('URL:', url_current);
  
  // Check if it's a single-page flow
  const hasRentNowButton = await page.getByRole('button', { name: /rent now/i }).count();
  console.log('Has "RENT NOW" button:', hasRentNowButton > 0 ? 'YES (Single-page flow)' : 'NO (Multi-step flow)');
  console.log('');

  console.log('Waiting 30 seconds for manual inspection...');
  await page.waitForTimeout(30000);

  await browser.close();
  console.log('\n✓ Done');
})();
