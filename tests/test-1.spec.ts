import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://test.staging.storagely-api.com/10-federal-storage/login');
  await page.getByRole('textbox', { name: 'Email Address' }).fill('admin@localhost.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('adminadmin');
  await page.getByRole('button', { name: 'Login' }).click();
  const heading = page.getByRole('heading', { name: 'Dashboard' });
  console.log("Admin Page Header :" + await heading.innerText());
  await expect(heading).toHaveText(/Dashboard/)
});