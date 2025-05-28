import { test, expect, Page } from '@playwright/test';

const discountChecks = [
  {
    customer: 'Demo Account : StorEDGE',
    url: 'https://app.storagely.io/storagelyselfstorage/storage-units/north-carolina/winston-salem/west-3rd-street',
    expected: '50% OFF THE FIRST TWO MONTHS'
  },
  {
    customer: 'Smart Self Storage : SSM',
    url: 'https://app.storagely.io/smart-self-storage-ohio/storage-units/ohio/macedonia/bavaria-road',
    expected: 'Off 3 Months'
  },
  {
    customer: 'Mini Mall : SiteLink',
    url: 'https://app.storagely.io/mini-mall-storage/storage-units/alabama/courtland/highway-33',
    expected: 'First Month Free'
  }
];

test.describe.skip('Verify page discount from storage unit', () => {
  for (const { customer, url, expected } of discountChecks) {
    test.skip(`Verify offer content ${customer}`, async ({ page }) => {
      await page.goto(url);
      const discountElements = page.locator('.page_discount');
      const count = await discountElements.count();

      let matched = false;

      for (let i = 0; i < count; i++) {
        const text = await discountElements.nth(i).innerText();
        if (text.includes('Sale') && text.includes(expected)) {
          console.log(`✅ ${customer} | Found banner: ${text}`);
          matched = true;
          break;
        }
      }

      expect(matched).toBeTruthy();
    });
  }
});