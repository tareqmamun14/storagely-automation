import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://www.firststorage.com/storage-units/alabama/huntsville/memorial-parkway-sw');
  await page.locator('sh_rentfullsection_first-storage_e75007a4-c082-411c-b534-b51d4da1c724_1400').getByRole('link', { name: 'RENT NOW' }).click();
  await page.getByRole('textbox', { name: 'First name' }).click();
  
  await page.getByRole('textbox', { name: 'First name' }).click();
  await page.getByRole('textbox', { name: 'First name' }).fill('TEST');
  await page.locator('.grid.grid-cols-2 > div:nth-child(2) > .flex.items-center').first().click();
  await page.getByRole('textbox', { name: 'Last name' }).click();
  await page.getByRole('textbox', { name: 'Last name' }).fill('TESTING');
  await page.getByRole('textbox', { name: 'Email address' }).click();
  await page.getByRole('textbox', { name: 'Cell phone number' }).click();
  await page.getByRole('textbox', { name: 'Driver\'s License Number' }).click();
  await page.getByRole('textbox', { name: 'Issuing State' }).click();
  await page.getByRole('paragraph').filter({ hasText: 'Alabama' }).click();
  await page.getByRole('textbox', { name: 'Month' }).click();
  await page.getByText('January').click();
  await page.getByRole('textbox', { name: 'Day' }).click();
  await page.getByText('1', { exact: true }).click();
  await page.getByRole('textbox', { name: 'Year' }).click();
  await page.getByText('2025', { exact: true }).click();
  await page.getByRole('textbox', { name: 'Card Number' }).click();
  await page.getByRole('textbox', { name: 'MM / YY' }).click();
  await page.getByRole('textbox', { name: 'CVV' }).click();
  await page.getByRole('textbox', { name: 'Street address' }).click();
  await page.getByRole('textbox', { name: 'City' }).click();
  await page.getByRole('textbox', { name: 'State', exact: true }).click();
  await page.getByRole('paragraph').filter({ hasText: 'Alabama' }).click();
  await page.getByRole('textbox', { name: 'Zip' }).click();
  await page.getByText('Be advised: Failure to').click();
  await page.locator('.flex.items-start > .flex.flex-col > .flex > .inline-flex > .w-11').click();
  await page.goto('https://www.firststorage.com/storage-units/alabama/huntsville/memorial-parkway-sw/step-four?first-storage=&unit_id=4362014');
  await page.getByRole('button', { name: 'Rent Now' }).click();
});