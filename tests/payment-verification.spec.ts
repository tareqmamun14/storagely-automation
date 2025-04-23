// tests/payment-verification.spec.ts
import { test, expect, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
const screenshotDir = './';

fs.readdir(screenshotDir, (err, files) => {
  if (err) {
    console.error('Failed to read directory:', err);
    return;
  }

  files.forEach((file) => {
    if (file.startsWith('error-') && file.endsWith('.png')) {
      fs.unlink(path.join(screenshotDir, file), (unlinkErr) => {
        if (unlinkErr) {
          console.error(`Failed to delete ${file}:`, unlinkErr);
        } else {
          console.log(`Deleted old screenshot: ${file}`);
        }
      });
    }
  });
});

const customerbaseURLs = [
  //  TEST URL
  // 'https://test.staging.storagely-api.com/10-federal-storage/storage-units/texas/burleson/south-burleson-blvd',
  // 'https://test.staging.storagely-api.com/bestbox-storage/storage-units/florida/pensacola/north-palafox',
  // 'https://test.staging.storagely-api.com/radiant-storage/storage-units/texas/galveston/church-street',
  // 'https://test.staging.storagely-api.com/premier-storage/storage-units/mississippi/laurel/ms-15',
  // 'https://test.staging.storagely-api.com/red-rocks-self-storage/storage-units/colorado/aurora/east-14th-avenue',
  // 'https://test.staging.storagely-api.com/distinct-storage/storage-units/connecticut/new-milford/kent-road',
  // 'https://test.staging.storagely-api.com/storage-star/storage-units/colorado/colorado-springs/aerotech-drive',
  // 'https://test.staging.storagely-api.com/bluebirdstorage/storage-units/alberta/calgary/mayland',
  // 'https://test.staging.storagely-api.com/sunbirdstorage/storage-units/nc/winston-salem/country-club',
  // 'https://test.staging.storagely-api.com/rhino-storage/storage-units/louisiana/covington/philip-drive',
  // 'https://test.staging.storagely-api.com/gatekeeper-self-storage/storage-units/georgia/peachtree-city/senoia-road',
  // 'https://test.staging.storagely-api.com/storage-boss/storage-units/louisiana/ponchatoula/west-pine-street',

  //  PROD URL 
  'https://10federalstorage.com/storage-units/texas/arlington/avenue-f',
  'https://www.bestboxstorage.com/storage-units/florida/pensacola/north-palafox',
  'https://radiantstorage.com/storage-units/texas/galveston/church-street',
  'https://yourpremierstorage.com/storage-units/mississippi/laurel/ms-15',
  'https://redrocksstorage.com/storage-units/colorado/aurora/east-14th-avenue',
  'https://distinctstorage.com/storage-units/connecticut/new-milford/kent-road',
  'https://www.storagestar.com/storage-units/colorado/colorado-springs/aerotech-drive',
  'https://bluebirdstorage.ca/storage-units/alberta/calgary/mayland',
  'https://sunbirdstorage.com/storage-units/nc/winston-salem/country-club',
  'https://rhino-storage.com/storage-units/louisiana/covington/philip-drive',
  'https://gatekeeperstoragega.com/storage-units/georgia/peachtree-city/senoia-road',
  'https://storagedepotla.com/storage-units/louisiana/ponchatoula/west-pine-street',
 ]; 

const FMSplatform : Record<string, string> = {
  'https://10federalstorage.com/storage-units/north-carolina/high-point/greensboro-road': 'Storedge',
  'https://www.bestboxstorage.com/storage-units/missouri/ofallon/highway-k': 'Storedge',
  'https://radiantstorage.com/storage-units/texas/galveston/church-street': 'Storedge',
  'https://yourpremierstorage.com/storage-units/mississippi/laurel/ms-15': 'Storedge',
  'https://redrocksstorage.com/storage-units/colorado/aurora/east-14th-avenue': 'Storedge',
  'https://distinctstorage.com/storage-units/connecticut/new-milford/kent-road': 'Storedge',
  'https://www.storagestar.com/storage-units/colorado/colorado-springs/aerotech-drive': 'SSM',
  'https://bluebirdstorage.ca/storage-units/alberta/calgary/blackfoot-trail': 'Sitelink',
  'https://sunbirdstorage.com/storage-units/nc/winston-salem/country-club-road': 'Sitelink',
  'https://rhino-storage.com/storage-units/louisiana/covington/philip-drive': 'Sitelink',
  'https://gatekeeperstoragega.com/storage-units/georgia/peachtree-city/senoia-road': 'Sitelink',
  'https://storagedepotla.com/storage-units/louisiana/ponchatoula/west-pine-street': 'Sitelink',
};

test('Admin Login Test', async ({ page }: { page: Page }) => {
  //await page.goto('https://10federalstorage.com/admin');
  await page.goto('https://test.staging.storagely-api.com/10-federal-storage/admin');
  await page.getByRole('textbox', { name: 'Email Address' }).fill('admin@localhost.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('adminadmin');
  await page.getByRole('button', { name: 'Login' }).click();
  
  const heading = page.getByRole('heading', { name: 'Dashboard' });
  console.log("Admin Page Header: " + await heading.innerText());
  await expect(heading).toHaveText(/Dashboard/);
  await page.close();
});

test.describe('Payment Verification Tests', () => {
  for (const baseURL of customerbaseURLs) {
    test(`Payment verification for ${baseURL}`, async ({ page }) => {
      test.setTimeout(120 * 1000); // 2 minutes

      // Append a random query parameter to bust cache
      const randomQueryParam = `cacheBust=${Date.now()}-${Math.random().toString(36).substring(2)}`;
      const urlWithQuery = baseURL.includes('?')
        ? `${baseURL}&${randomQueryParam}`
        : `${baseURL}?${randomQueryParam}`;

            // Print Storage Facility URL and Platform
            console.log(`Running test for Storage Facility: ${baseURL}`);
            console.log(`Platform: ${FMSplatform[baseURL] ?? 'Unknown'}`);

      try {
        // Navigate to the URL
        await page.goto(urlWithQuery, { waitUntil: 'domcontentloaded' });

        // ===== Handle cookie consent (if available) =====
        try {
          await page.waitForTimeout(2000); // Small delay for potential cookie banner
          const cookieBanner = page.getByText('We use essential cookies to');
          if (await cookieBanner.isVisible()) {
            await cookieBanner.click();
            await page.waitForTimeout(500);
            const acceptButton = page.getByRole('button', { name: 'Accept' });
            if (await acceptButton.isVisible()) {
              await acceptButton.click();
            } 
          }
        } catch (error) {
          console.log('Cookie banner might not be present');
        }

        // ===== Click the Reserve button (if available) =====
        const reserveButton = page.locator('a.reserveBtnPop.whiteBtnStoragely:has-text("RESERVE")')
        .or(page.locator('.listviewrows .whiteBtnStoragely:has-text("RESERVE")'))
        .or(page.locator('button:has-text("Join Waitlist")'))
        .first();

        let buttonText = null;
        try {
          // Attempt to get the text of the button to determine its type
          buttonText = await reserveButton.innerText();
          console.log(`Found a button with text: "${buttonText}"`);
        } catch (error) {
          console.log('No RESERVE or Join Waitlist button found, proceeding with the rest of the test.');
        }

        // If a button was found, handle it
        if (buttonText) {
          // Click the button
          await reserveButton.click();
          console.log(`Clicked "${buttonText}" button`);

          // Wait for a modal to appear (if any)
          await page.waitForTimeout(1500); // Allow modal to appear

        // Try closing the modal (if it exists)
        try {
          const closeButton = page.getByRole('button', { name: 'Close', exact: true });
          if (await closeButton.isVisible()) {
            await closeButton.click();
            console.log('Closed the modal');
          }
        } catch (error) {
          console.log('Close button might not be present');
        }

        // If the button was "Join Waitlist", finish the test run
        if (buttonText.trim() === 'Join Waitlist') {
          console.log('Test finished after handling "Join Waitlist"');
          return;
        }

        // If the button was "RESERVE", continue with the rest of the test
        console.log('Continuing with the rest of the test for "RESERVE" button');
      }

      // If no button was found, proceed with the rest of the test
      console.log('Continuing with the rest of the test as no RESERVE or Join Waitlist button was found.');

        // ===== Click the RENT button =====
        await page.waitForTimeout(1500);
        // await page.locator('.listviewrows .blackBtnStoragely:has-text("RENT")')
        // .or(page.locator('a:has-text("Reserve Unit")'))
        // .first().click();
        const button = await page.locator('.listviewrows .blackBtnStoragely:has-text("RENT")')
        .or(page.locator('a:has-text("Reserve Unit")'))
        .or(page.locator('a.reserveBtnPop.whiteBtnStoragely:has-text("Select Pricing Option")'))
        .first();
    
        const buttonTextVBP = await button.textContent(); // Get text in Value based pricing-VBP
        console.log(`Clicked button: ${buttonText?.trim()}`); //Print Clicked Button
        await button.scrollIntoViewIfNeeded();
        await button.click();
        
        if (buttonTextVBP?.includes("Select Pricing Option")) {
            // Wait for the new "RENT" button to appear after selecting pricing
            const rentButton = page.locator('a.vbp_btn:has-text("Rent")').first();
            await rentButton.waitFor();
            console.log('Clicked button: RENT-(Select Pricing Option)');
            await rentButton.click();
        }

        // ===== Fill out the rental form =====
        await page.getByRole('heading', { name: 'Summary of Rental' }).click();
        await page.waitForTimeout(1000); // Ensure form is visible
        await page.getByPlaceholder('First name').fill('tareq', { timeout: 5000 });
        await page.getByPlaceholder('Last name').fill('mamun', { timeout: 5000 });
        await page.getByPlaceholder('Email address').fill('tareq@storagely.io');
        await page.getByPlaceholder('Phone number').fill('(555) 555-5555');
        await page.getByPlaceholder('Address', { exact: true }).fill('NYC');
        await page.getByPlaceholder('City').fill('NYC');
        await page.locator('#province').selectOption(['Alaska', 'Alberta']);
        await page.getByPlaceholder(/Zip Code|Postal Code/).fill('99540');
        
        const datepicker = page.locator('.datepicker-days .today.active.day');

        try {
          // Wait for the datepicker element, but catch timeout errors
          await datepicker.waitFor({ state: 'visible', timeout: 5000 });
          
          if (await datepicker.isVisible()) {
            await datepicker.click();
            console.log('Clicked the datepicker element');
          } else {
            console.log('Datepicker is not visible, skipping this step.');
          }
        } catch (error) {
          console.log('Datepicker did not appear within the timeout, skipping this step.');
        }
        // Continue with the rest of the script
        console.log('Proceeding to the next step...');

        const continueButton = page.getByRole('button', { name: 'CONTINUE TO NEXT STEP' });
        await continueButton.scrollIntoViewIfNeeded(); // Scrolls to the button if it's not in view
        await continueButton.click();
        await page.waitForTimeout(2000); // Wait for payment step to load


        // LEASE SECTION
        try {
          const leaseHeader = await page.getByRole('heading', { name: /lease details/i });
        
          if (await leaseHeader.isVisible()) {
            await leaseHeader.click();
            await page.getByPlaceholder('Alternate Phone Number (must').fill('01674646008');
            await page.getByPlaceholder('Alternate Email Address (must').fill('tareqmamun14@gmail.com');
            await page.getByPlaceholder('Driver License #').fill('6244114');
            await page.locator('#drivers_license_state').selectOption('Alaska');
            await page.locator('#drivers_birth_month').selectOption('01');
            await page.locator('#drivers_birth_date').selectOption('1');
            await page.getByPlaceholder('Birth Year').fill('1990');
          }
        } catch (error) {
          // If heading not found or not visible, skip and continue
          console.log('Lease Details section not found. Skipping form fill.');
        }



        // ===== Fill in payment details (with extra delay for stability) =====
        await page.getByPlaceholder('Card Number').type('5555 5555 5555 5555', { delay: 400 });
        await page.waitForTimeout(500);
        await page.keyboard.press('Tab');
        await page.getByPlaceholder('MM / YY').type('05 / 55', { delay: 400 });
        await page.waitForTimeout(500);
        await page.keyboard.press('Tab');
        await page.getByPlaceholder('CVV').type('555', { delay: 400 });
        await page.waitForTimeout(500);
        await page.keyboard.press('Tab');

        // ===== Check Agreement checkboxes (if available) =====
        const checkboxes = [
          'I agree to the lease terms',
          'I agree to the protection',
          'I agree to the auto pay terms'
        ];
        
        for (const label of checkboxes) {
          try {
            const checkbox = page.getByLabel(label);
            if (await checkbox.isVisible()) {
              await checkbox.check();
            }
          } catch (error) {
            console.log(`${label} checkbox not found`);
          }
        }

        // ===== Minimize if chatbox pops up =====
        try {
          // Wait for the iframe, but with a timeout to prevent infinite waiting
          const chatIframeElement = await page.waitForSelector('iframe[title="LiveChat chat widget"]', { timeout: 5000 });
        
          if (chatIframeElement) {
            const chatIframe = await chatIframeElement.contentFrame();
        
            if (chatIframe) {
              const minimizeButton = await chatIframe.getByRole('button', { name: 'Minimize window' });
        
              // Check if the button is visible before clicking
              if (await minimizeButton.isVisible()) {
                await minimizeButton.click();
                console.log("Minimized the chat window.");
              } else {
                console.log("Minimize button not visible, skipping.");
              }
            } else {
              console.log("Chat iframe is not accessible.");
            }
          } else {
            console.log("Chat iframe element not found.");
          }
        } catch (error) {
          console.log("Chat iframe not found or an error occurred, proceeding without minimizing.", error);
        }
        
        // ===== Click RENT NOW to attempt payment =====
        await page.getByRole('button', { name: 'RENT NOW' }).click();
        await page.waitForTimeout(2000); // Give some time for response

        // ====- Verify toast container header =====
        await page.getByText('Error!!').waitFor({ state: 'visible', timeout: 10000 });
        const toastContainer = page.locator('.toast-container');
        await toastContainer.waitFor({ state: 'visible', timeout: 5000 });

        const toastBody = toastContainer.locator('.toast-body');
        await toastBody.waitFor({ state: 'visible', timeout: 5000 });

        // Retrieve and print the error message
        const errorMessage = await toastBody.innerText();
        console.log('Toast Message:', errorMessage);

      } catch (error) {
        console.error(`Test failed for ${baseURL}:`, error);
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
