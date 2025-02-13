import { test, expect } from '@playwright/test';

test('payment verification test', async ({ page }) => {
  // Set longer timeout for this specific test
  test.slow();
  
  try {
    // Initial page load
      await page.goto('https://10federalstorage.com/storage-units/north-carolina/high-point/greensboro-road?Tareq123', {
      //await page.goto('https://www.bestboxstorage.com/storage-units/missouri/ofallon/highway-k?Tareq123', {
    });

    //  HANDLE cookie consent
    try {
      await page.getByText('We use essential cookies to').click();  //if cookie banner is not present in a page, it shall skip and move forward
      await page.getByRole('button', { name: 'Accept' }).click();
    } catch (error) {
      console.log('Cookie banner might not be present');
    }

    // Click Reserve button
    await page.locator('.listviewrows .whiteBtnStoragely:has-text("RESERVE")').first().click();
    await page.getByRole('button', { name: 'Close', exact: true }).click();

    // Click RENT PAGE 
    await page.locator('.listviewrows .blackBtnStoragely:has-text("RENT")').first().click();



    // Fill the form
    await page.getByRole('heading', { name: 'Summary of Rental' }).click();
    await page.getByPlaceholder('First name').fill('tareq');
    await page.getByPlaceholder('Last name').fill('mamun');
    await page.getByPlaceholder('Email address').fill('tareq@storagely.io');
    await page.getByPlaceholder('Phone number').fill('(555) 555-5555');
    await page.getByPlaceholder('Address', { exact: true }).fill('NYC');
    await page.getByPlaceholder('City').fill('NYC');
    await page.locator('#province').selectOption('Alaska');
    await page.getByPlaceholder(' Zip Code ').fill('99540');

    // Wait for navigation after clicking continue
    //await Promise.all([
      page.getByRole('button', { name: 'CONTINUE TO NEXT STEP' }).click()
    //]);

    // Fill payment details
    await page.getByPlaceholder('Card Number').type('5555 5555 5555 5555', { delay: 100 });
    await page.keyboard.press('Tab');  // Trigger blur
    await page.getByPlaceholder('MM / YY').type('05 / 55', { delay: 100 });
    await page.keyboard.press('Tab');  
    await page.getByPlaceholder('CVV').type('5555', { delay: 100 });
    await page.keyboard.press('Tab');  
  
    //Check Agreement checkboxes
    await page.getByLabel('I agree to the lease terms').check();
    await page.getByLabel('I agree to the protection').check();
    await page.getByLabel('I agree to the auto pay terms').check();
  
    // Click RENT NOW
    await page.getByRole('button', { name: 'RENT NOW' }).click();
  
    // Wait for and verify the error toast to appear
    await page.waitForSelector('text=Error!!', { timeout: 5000 });
    await expect(page.getByText('Error!!')).toBeVisible();

  } catch (error) {
    console.error('Test failed:', error);
    await page.screenshot({ path: `error-${Date.now()}.png`, fullPage: true });
    throw error;
  }
});