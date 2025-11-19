const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  console.log('Navigating to firststorage...');
  await page.goto('https://www.firststorage.com/storage-units/alabama/huntsville/memorial-parkway-sw/step-four?first-storage=&unit_id=4362014');
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  
  console.log('Filling form quickly...');
  
  // Fill minimal form data
  await page.fill('#first_name', 'Test');
  await page.fill('#last_name', 'Testing');
  await page.fill('#email', 'test@test.com');
  await page.fill('#phone', '5551234567');
  await page.fill('#address', '123 Test St');
  await page.fill('#city', 'Test City');
  await page.selectOption('#province', { label: 'Alabama' });
  await page.fill('#zip', '12345');
  
  // Fill invalid card
  await page.fill('#card_number', '4111111111111111');
  await page.fill('#expiry', '12/25');
  await page.fill('#cvv', '123');
  
  // Check disclaimer
  await page.click('label[for="lease_disclaimer"]');
  
  console.log('Clicking RENT NOW...');
  await page.getByRole('button', { name: /rent now/i }).click();
  
  console.log('Waiting for error...');
  await page.waitForTimeout(5000);
  
  console.log('\n=== TOAST CONTAINER STRUCTURE ===');
  const toastContainer = await page.locator('.toast-container').first();
  if (await toastContainer.isVisible()) {
    console.log('Toast container HTML:');
    const html = await toastContainer.innerHTML();
    console.log(html);
    
    console.log('\nToast container innerText:');
    const text = await toastContainer.innerText();
    console.log(text);
  } else {
    console.log('No .toast-container found');
  }
  
  console.log('\n=== TOAST BODY ===');
  const toastBody = await page.locator('.toast-container .toast-body');
  if (await toastBody.count() > 0) {
    console.log('Toast body count:', await toastBody.count());
    console.log('Toast body text:');
    const text = await toastBody.innerText();
    console.log(text);
  } else {
    console.log('No .toast-body found');
  }
  
  console.log('\n=== ALL TOAST ELEMENTS ===');
  const allToasts = await page.locator('.toast').all();
  console.log('Found', allToasts.length, 'toast elements');
  for (let i = 0; i < allToasts.length; i++) {
    const text = await allToasts[i].innerText();
    console.log(`Toast ${i+1}:`, text);
  }
  
  console.log('\nWaiting 30s for manual inspection...');
  await page.waitForTimeout(30000);
  
  await browser.close();
})();
