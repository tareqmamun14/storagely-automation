// import { test, expect } from '@playwright/test';

// test('test', async ({ page }) => {
//   await page.goto('https://www.bestboxstorage.com/storage-units/missouri/ofallon/highway-k?tareq123');
//   await page.locator('sh_reservefullsection_bestbox-storage_01c1ff07-2471-4ac8-953c-f20a1d438caa_20').filter({ hasText: 'RESERVE No credit card' }).locator('a').click();
//   await page.getByRole('button', { name: 'Close', exact: true }).click();
//   await page.locator('sh_rentfullsection_bestbox-storage_01c1ff07-2471-4ac8-953c-f20a1d438caa_20').getByRole('link', { name: 'RENT' }).click();
//   await page.getByPlaceholder('First name').click();
//   await page.getByPlaceholder('First name').fill('tareq');
//   await page.getByPlaceholder('Last name').click();
//   await page.getByPlaceholder('Last name').fill('mamun');
//   await page.getByPlaceholder('Email address').click();
//   await page.getByPlaceholder('Email address').fill('tareq@storagely.io');
//   await page.getByPlaceholder('(___) ___-____').click();
//   await page.getByPlaceholder('Address', { exact: true }).click();
//   await page.getByPlaceholder('Address', { exact: true }).fill('nyc');
//   await page.getByPlaceholder('City').click();
//   await page.getByPlaceholder('City').fill('nyc');
//   await page.locator('#province').selectOption('Alaska');
//   await page.getByPlaceholder(' Zip Code ').click();
//   await page.getByPlaceholder(' Zip Code ').click();
//   await page.getByPlaceholder(' Zip Code ').fill('99540');
//   await page.goto('https://www.bestboxstorage.com/storage-units/missouri/ofallon/highway-k/step_five?_token=chVyxIAzKJRMDJrXI2KsJDcbfrTxVGeDKHX4LVME&storagely_dEAmjwIoQdsxctHn=&storagely_from=eyJpdiI6InYxUmxRSFlOV0dNV1FTVFpEREZaeVE9PSIsInZhbHVlIjoiS2c0aWZCZ2VRSHEyUFkyT095SjloZz09IiwibWFjIjoiNDBjZTAzMDA5YzFhMGFkYTFiN2Q0MjQzNTdhOTY1YTBkODZiZTRkZTllYmM4NmFmOTgwYjZiMDJkZjE3ZWQ4ZCIsInRhZyI6IiJ9&location=01c1ff07-2471-4ac8-953c-f20a1d438caa&unit=4e101573-9d71-4a98-ab6b-13b34b4231eb&unit_id=3524936&unit_type=Drive+Up-Climate+Controlled&type=rent&con=9fdc4bb2-02c5-4eaf-899d-ceb0915a6fdd&is_sitelink=1&site_id=01c1ff07-2471-4ac8-953c-f20a1d438caa&site_locations_id=30544&tenant_id=&lead_id=&ins=5cf63f9c-0e4a-4872-a7c8-74dc614c0d2e&date=2025-02-12&cart_time=2025-02-12+11%3A52%3A53&country=USA&first_name=tareq&last_name=mamun&email=tareq%40storagely.io&phone=%28555%29+555-5555&address_1=nyc&city=nyc&state=Alaska&zip_code=99540&date=2025-02-12');
//   await page.getByPlaceholder('Card Number').click();
//   await page.getByPlaceholder('Card Number').fill('5555 5555 5555 5555');
//   await page.getByPlaceholder('MM / YY').click();
//   await page.getByPlaceholder('MM / YY').fill('05 / 55');
//   await page.getByPlaceholder('CVV').click();
//   await page.getByPlaceholder('CVV').fill('5555');
//   await page.goto('https://www.bestboxstorage.com/storage-units/missouri/ofallon/highway-k/step_five?_token=chVyxIAzKJRMDJrXI2KsJDcbfrTxVGeDKHX4LVME&storagely_dEAmjwIoQdsxctHn=&storagely_from=eyJpdiI6InYxUmxRSFlOV0dNV1FTVFpEREZaeVE9PSIsInZhbHVlIjoiS2c0aWZCZ2VRSHEyUFkyT095SjloZz09IiwibWFjIjoiNDBjZTAzMDA5YzFhMGFkYTFiN2Q0MjQzNTdhOTY1YTBkODZiZTRkZTllYmM4NmFmOTgwYjZiMDJkZjE3ZWQ4ZCIsInRhZyI6IiJ9&location=01c1ff07-2471-4ac8-953c-f20a1d438caa&unit=4e101573-9d71-4a98-ab6b-13b34b4231eb&unit_id=3524936&unit_type=Drive+Up-Climate+Controlled&type=rent&con=9fdc4bb2-02c5-4eaf-899d-ceb0915a6fdd&is_sitelink=1&site_id=01c1ff07-2471-4ac8-953c-f20a1d438caa&site_locations_id=30544&tenant_id=&lead_id=&ins=5cf63f9c-0e4a-4872-a7c8-74dc614c0d2e&date=2025-02-12&cart_time=2025-02-12+11%3A52%3A53&country=USA&first_name=tareq&last_name=mamun&email=tareq%40storagely.io&phone=%28555%29+555-5555&address_1=nyc&city=nyc&state=Alaska&zip_code=99540&date=2025-02-12');
 
//   await page.getByRole('alert').locator('div').filter({ hasText: 'Error!!' }).click();
//   await page.getByText('Error!!').click();
//   await page.getByText('Failed to process payment,').click();
//   await page.getByText('Undefined array key 2055').click();
// });
