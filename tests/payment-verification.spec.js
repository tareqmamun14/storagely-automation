import { test, expect } from '@playwright/test';

test('payment verification test', async ({ page }) => {
  // Set longer timeout for this specific test
  test.slow();
  
  try {
    // Initial page load
    await page.goto('https://legacy-test.storagely-api.com/10-federal-storage/storage-units/north-carolina/high-point/greensboro-road', {
      //waitUntil: 'networkidle',
      //timeout: 60000
    });

    // Handle cookie consent
    try {
      await page.getByText('We use essential cookies to').click();
      await page.getByRole('button', { name: 'Accept' }).click();
    } catch (error) {
      console.log('Cookie banner might not be present');
    }

    // Click Reserve button
    await page.locator('sh_reservefullsection_10-federal-storage_3d361ed0-d2aa-41fa-8b95-85edbeca124f_371')
      .filter({ hasText: 'RESERVE No credit card' })
      .locator('a')
      .click();

    await page.getByText('Reserve Your Unit').click();
    await page.getByRole('button', { name: 'Close', exact: true }).click();

    // Click RENT PAGE
    await page.locator('sh_rentfullsection_10-federal-storage_3d361ed0-d2aa-41fa-8b95-85edbeca124f_371')
      .getByRole('link', { name: 'RENT' })
      .click();

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
    await Promise.all([
      page.waitForNavigation({timeout: 60000 }),
      page.getByRole('button', { name: 'CONTINUE TO NEXT STEP' }).click()
    ]);

    // Wait for payment form to be loaded
    // Fill payment details
    await page.getByPlaceholder('Card Number').fill('5555 5555 5555 5555');
    await page.getByPlaceholder('MM / YY').fill('05 / 55');
    await page.getByPlaceholder('CVV').fill('5555');

    // Check agreement boxes
    await page.getByLabel('I agree to the lease terms').check();
    await page.getByLabel('I agree to the protection').check();
    await page.getByLabel('I agree to the auto pay terms').check();

    // CLICK RENT NOW - Step 5
    await page.getByRole('button', { name: 'RENT NOW' }).click();


    // Wait for error message and handle it
    //await page.getByText('Error!!').click();
    await page.getByText('Failed to process payment,').waitFor({ state: 'visible', timeout: 60000 });
    await page.getByText('Failed to process payment,').click();
    //await page.getByRole('button', { name: 'Close' }).click();

  } catch (error) {
    console.error('Test failed:', error);
    await page.screenshot({ path: `error-${Date.now()}.png`, fullPage: true });
    throw error;
  }
});