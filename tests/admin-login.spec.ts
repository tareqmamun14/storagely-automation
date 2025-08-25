// tests/admin-login.spec.ts

import { test, expect } from '@playwright/test';

test.describe.skip('Admin Login Tests', () => {
  test.skip('Should login successfully and verify dashboard elements', async ({ page }) => {
    console.log('\n=== Starting Admin Login Test ===');
    
    // Navigate to the staging login page
    await page.goto('https://test.staging.storagely-api.com/bluebirdstorage/login');
    
    // Verify we're on the login page
    const pageTitle = await page.title();
    console.log(`✓ Initial Page Title: ${pageTitle}`);
    await expect(page).toHaveTitle(/Login \| Bluebird Self Storage/);

    console.log('✓ Entering login credentials:');
    console.log('  - Email: admin@localhost.com');
    console.log('  - Password: [HIDDEN]');
    
    // Fill in login credentials
    await page.getByRole('textbox', { name: 'Email Address' }).fill('admin@localhost.com');
    await page.getByRole('textbox', { name: 'Password' }).fill('adminadmin');
  
      // Click login button and wait for navigation
    await Promise.all([
      page.waitForNavigation(),
      page.getByRole('button', { name: 'Login' }).click()
    ]);

    // Verify we've reached the admin dashboard
    const dashboardUrl = await page.url();
    const dashboardTitle = await page.title();
    console.log(`✓ Successfully navigated to dashboard:`);
    console.log(`  - URL: ${dashboardUrl}`);
    console.log(`  - Title: ${dashboardTitle}`);
    
    await expect(page).toHaveURL(/.*\/admin$/);
    await expect(page).toHaveTitle(/Dashboard.*Storagely/);

    // Handle Wingman popup
    try {
      // Wait for and handle Wingman popup if it appears
      const closeButton = page.getByRole('button', { name: '×' });
      await closeButton.waitFor({ timeout: 5000 });
      if (await closeButton.isVisible()) {
        await closeButton.click();
        console.log('✓ Wingman popup detected and closed');
        await page.waitForTimeout(1000); // Wait for popup animation
      }
    } catch (error: any) {
      console.log('ℹ Wingman popup did not appear or was already closed');
    }

    console.log('\n✓ Verifying Dashboard Elements:');
    const dashboardElements = [
      'Total Rentals',
      'Future Rentals',
      'Google My Business',
      'Google Organic Search'
    ];

    for (const element of dashboardElements) {
      const elementLocator = page.getByRole('heading', { name: element, exact: true });
      await expect(elementLocator).toBeVisible({ timeout: 10000 });
      console.log(`  - Found "${element}" heading`);
      
      // If this is a metric heading, also log its value
      if (element === 'Total Rentals' || element === 'Future Rentals') {
        const valueElement = elementLocator.locator('xpath=following-sibling::h3').first();
        const value = await valueElement.textContent();
        console.log(`    Value: ${value}`);
      }
    }

    console.log('\n✓ Verifying Navigation Menu Items:');
    const menuItems = [
      'Reporting Engine',
      'Rental System',
      'Marketing Tools',
      'Storage Website',
      'Settings'
    ];

    for (const item of menuItems) {
      await expect(page.getByRole('link', { name: item }))
        .toBeVisible({ timeout: 5000 });
      console.log(`  - Found "${item}" link`);
    }

    console.log('\n✓ Verifying Location Selector:');
    const locationSelect = page.locator('#location_select');
    await expect(locationSelect).toBeVisible();
    const selectValue = await locationSelect.inputValue();
    console.log(`  - Select value: ${selectValue}`);
    await expect(locationSelect).toHaveValue('46');
    
    // Verify the displayed text shows L001- Calgary - Dufferin
    const locationText = page.locator('.filter-option-inner-inner');
    const displayedLocation = await locationText.textContent();
    console.log(`  - Displayed text: ${displayedLocation}`);
    await expect(locationText).toHaveText('L001- Calgary - Dufferin');

    console.log('\n=== Admin Login Test Completed Successfully ===\n');
  });
});