import { Page, expect } from '@playwright/test';

export class HelixLocationPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(url: string) {
    await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await this.page.waitForTimeout(2000);
  }

  async verifyPageLoaded() {
    await expect(this.page).not.toHaveURL(/error|404|500/);
    const title = await this.page.title();
    console.log('📄 Helix location page loaded — Title:', title);
    expect(title.length).toBeGreaterThan(0);
  }

  async verifyHasStorageUnits() {
    const unitCards = this.page.locator('[class*="unit"], [class*="storage"], [data-unit], .listviewrows').first();
    await expect(unitCards).toBeVisible({ timeout: 15000 });
    console.log('✅ Storage units found on page');
  }

  async verifyHasRentButtons() {
    const rentBtn = this.page.locator('a:has-text("Rent"), button:has-text("Rent"), a:has-text("Reserve"), button:has-text("Reserve")').first();
    await expect(rentBtn).toBeVisible({ timeout: 15000 });
    console.log('✅ Rent/Reserve buttons found');
  }
}
