import { Page, expect } from '@playwright/test';

export class HelixLoginPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(url: string) {
    let lastErr: unknown;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
        await this.page.waitForTimeout(1000);
        return;
      } catch (e) {
        lastErr = e;
        const msg = (e as Error).message || '';
        if (!msg.includes('ERR_NAME_NOT_RESOLVED') && !msg.includes('ERR_CONNECTION')) throw e;
        console.log(`[login.goto] attempt ${attempt} hit ${msg.split('\n')[0]} — retrying in 4s`);
        await this.page.waitForTimeout(4000);
      }
    }
    throw lastErr;
  }

  async login(email: string, password: string) {
    const emailInput = this.page.locator('input[type="email"]');
    const passwordInput = this.page.locator('input[type="password"]');
    await expect(emailInput).toBeVisible({ timeout: 15_000 });
    await emailInput.fill(email);
    await passwordInput.fill(password);
    await this.page.getByRole('button', { name: /sign\s*in/i }).click();
  }

  async expectLoggedIn() {
    await this.page.waitForURL(/editor|dashboard|websites/i, { timeout: 30_000 });
  }
}
