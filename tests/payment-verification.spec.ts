// tests/payment-verification.spec.ts
import { test, expect } from '@playwright/test';

const baseURLs = [
  //'https://10federalstorage.com/storage-units/north-carolina/high-point/greensboro-road',
  //'https://www.bestboxstorage.com/storage-units/missouri/ofallon/highway-k',
  //'https://radiantstorage.com/storage-units/texas/galveston/church-street',
  //'https://yourpremierstorage.com/storage-units/mississippi/laurel/ms-15',
  //'https://redrocksstorage.com/storage-units/colorado/aurora/east-14th-avenue',
  //'https://distinctstorage.com/storage-units/connecticut/new-milford/kent-road',
    'https://www.storagestar.com/storage-units/colorado/colorado-springs/aerotech-drive',
  // 'https://bluebirdstorage.ca/storage-units/alberta/calgary/blackfoot-trail',
  // 'https://sunbirdstorage.com/storage-units/nc/winston-salem/country-club-road',
  // 'https://rhino-storage.com/storage-units/louisiana/covington/philip-drive',
  // 'https://gatekeeperstoragega.com/storage-units/georgia/peachtree-city/senoia-road',
  // 'https://storagedepotla.com/storage-units/louisiana/ponchatoula/west-pine-street',
  // 'https://www.securitypublicstorage.com/locations/roseville'
];

test.describe('Payment Verification Tests', () => {
  for (const baseURL of baseURLs) {
    test(`Payment verification for ${baseURL}`, async ({ page }) => {
      // Optionally increase timeout for this test if needed
      test.setTimeout(120 * 1000); // 2 minutes

      // Append a random query parameter to bust cache
      const randomQueryParam = `cacheBust=${Date.now()}-${Math.random().toString(36).substring(2)}`;
      const urlWithQuery = baseURL.includes('?')
        ? `${baseURL}&${randomQueryParam}`
        : `${baseURL}?${randomQueryParam}`;

      try {
        // Navigate to the URL
        await page.goto(urlWithQuery);

        // ===== Handle cookie consent (if available) =====
        try {
          const cookieBanner = page.getByText('We use essential cookies to');
          if (await cookieBanner.isVisible()) {
            await cookieBanner.click();
            const acceptButton = page.getByRole('button', { name: 'Accept' });
            if (await acceptButton.isVisible()) {
              await acceptButton.click();
            }
          }
        } catch (error) {
          console.log('Cookie banner might not be present');
        }

        // ===== Click the Reserve button (if available) =====
        //await page.locator('.listviewrows .whiteBtnStoragely:has-text("RESERVE")').first().click();
        await page.locator('a.reserveBtnPop.whiteBtnStoragely:has-text("RESERVE")')
        .or(page.locator('.listviewrows .whiteBtnStoragely:has-text("RESERVE")')).first().click();

        // Try closing any modal that might pop up
        try {
          const closeButton = page.getByRole('button', { name: 'Close', exact: true });
          if (await closeButton.isVisible()) {
            await closeButton.click();
          }
        } catch (error) {
          console.log('Close button might not be present');
        }

        // ===== Click the RENT button =====
        await page.locator('.listviewrows .blackBtnStoragely:has-text("RENT")').first().click();

        // ===== Fill out the rental form =====
        await page.getByRole('heading', { name: 'Summary of Rental' }).click();
        await page.getByPlaceholder('First name').fill('tareq');
        await page.getByPlaceholder('Last name').fill('mamun');
        await page.getByPlaceholder('Email address').fill('tareq@storagely.io');
        await page.getByPlaceholder('Phone number').fill('(555) 555-5555');
        await page.getByPlaceholder('Address', { exact: true }).fill('NYC');
        await page.getByPlaceholder('City').fill('NYC');
        await page.locator('#province').selectOption('Alaska');
        await page.getByPlaceholder(' Zip Code ').fill('99540');

        // Continue to the payment step
        await page.getByRole('button', { name: 'CONTINUE TO NEXT STEP' }).click();

        // ===== Fill in payment details =====
        await page.getByPlaceholder('Card Number').type('5555 5555 5555 5555', { delay: 100 });
        await page.keyboard.press('Tab'); // trigger blur
        await page.getByPlaceholder('MM / YY').type('05 / 55', { delay: 100 });
        await page.keyboard.press('Tab');
        await page.getByPlaceholder('CVV').type('5555', { delay: 100 });
        await page.keyboard.press('Tab');

        // ===== Check Agreement checkboxes (if available) =====
        try {
          const leaseTermsCheckbox = page.getByLabel('I agree to the lease terms');
          if (await leaseTermsCheckbox.isVisible()) {
            await leaseTermsCheckbox.check();
          }
        } catch (error) {
          console.log('Lease terms checkbox not found');
        }
        try {
          const protectionCheckbox = page.getByLabel('I agree to the protection');
          if (await protectionCheckbox.isVisible()) {
            await protectionCheckbox.check();
          }
        } catch (error) {
          console.log('Protection checkbox not found');
        }
        try {
          const autoPayCheckbox = page.getByLabel('I agree to the auto pay terms');
          if (await autoPayCheckbox.isVisible()) {
            await autoPayCheckbox.check();
          }
        } catch (error) {
          console.log('Auto pay checkbox not found');
        }

        // ===== Click RENT NOW to attempt payment =====
        await page.getByRole('button', { name: 'RENT NOW' }).click();

        // ===== Wait for one of several error toast messages to appear =====
        const errorMessages = [
          'Failed to process payment',
          'Lead unit is not available',
          'Could not initialize transaction',
          'Payment method Could not save payment method (Sage Payments Solutions): Payment Error:  INVALID CARDNUMBER',
          'Undefined array key 2055'
        ];
        // Create a regex pattern matching any of the error messages
        const pattern = errorMessages
          .map(msg => msg.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'))
          .join('|');
        const errorRegex = new RegExp(pattern);

        const toastLocator = page.getByText(errorRegex);
        await toastLocator.waitFor({ timeout: 5000 });
        const toastText = await toastLocator.textContent();
        console.log(`Toast error text for ${baseURL}: ${toastText}`);
        await expect(toastLocator).toBeVisible();

      } catch (error) {
        console.error(`Test failed for ${baseURL}:`, error);
        // Only attempt a screenshot if the page is still open
        if (!page.isClosed()) {
          try {
            await page.screenshot({ path: `error-${Date.now()}.png`, fullPage: true });
          } catch (screenshotError) {
            console.error('Failed to take screenshot:', screenshotError);
          }
        }
        throw error;
      }
    });
  }
});
