// tests/admin-login.spec.ts

import { test } from '@playwright/test';
import { getCurrentUrls } from '../configs/urls';
import { ADMIN_CREDENTIALS } from '../configs/credentials';
import { CURRENT_ENVIRONMENT } from '../configs/urls';

test.skip('Admin Login Test', async ({ page }) => {
  const urls = getCurrentUrls();
  const credentials = ADMIN_CREDENTIALS[CURRENT_ENVIRONMENT];
  
  // Go to admin page
  await page.goto(urls.admin);
  
  // Fill login form
  await page.getByRole('textbox', { name: 'Email Address' }).fill(credentials.email);
  await page.getByRole('textbox', { name: 'Password' }).fill(credentials.password);
  await page.getByRole('button', { name: 'Login' }).click();
  
  // Check if login was successful
  const heading = page.getByRole('heading', { name: 'Dashboard' });
  console.log("Admin Page Header: " + await heading.innerText());
  await heading.waitFor({ state: 'visible' });
  
  await page.close();
});