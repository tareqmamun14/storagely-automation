// pages/DataSyncLoginPage.ts
// Login page for Data Sync tests - independent POM, no dependency on existing files

import { Page, expect } from '@playwright/test';
import { dismissMarketingModal } from '../utils/dismissMarketingModal';

const STAGE_GOTO_TIMEOUT = 120_000;     // 2 min — stage server can be very slow
const STAGE_REDIRECT_TIMEOUT = 120_000; // 2 min — login redirect can lag
const PROD_GOTO_TIMEOUT = 60_000;
const PROD_REDIRECT_TIMEOUT = 60_000;

export class DataSyncLoginPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // ─── Locators ──────────────────────────────────────────────────────
  private get emailInput() {
    return this.page.getByRole('textbox', { name: 'Email Address' });
  }

  private get passwordInput() {
    return this.page.getByRole('textbox', { name: 'Password' });
  }

  private get loginButton() {
    return this.page.getByRole('button', { name: 'Login' });
  }

  // ─── Actions ───────────────────────────────────────────────────────

  /**
   * Navigate to login page with retry — stage is notoriously slow
   */
  async goto(loginUrl: string, timeout = STAGE_GOTO_TIMEOUT): Promise<void> {
    // Try up to 2 times — if first load stalls, reload
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        await this.page.goto(loginUrl, { waitUntil: 'domcontentloaded', timeout });
        await this.waitForGlobalLoader();
        await expect(this.emailInput).toBeVisible({ timeout: 30_000 });
        return; // success
      } catch (err) {
        if (attempt === 2) throw err;
        console.log(`⚠️ Login page load attempt ${attempt} timed out — retrying...`);
      }
    }
  }

  /**
   * Wait for the global-loader overlay to disappear (stage shows a spinner overlay)
   */
  private async waitForGlobalLoader(): Promise<void> {
    const loader = this.page.locator('#global-loader');
    try {
      await loader.waitFor({ state: 'hidden', timeout: 120_000 });
      console.log('✅ Global loader dismissed');
    } catch {
      // If loader doesn't exist at all, that's fine
      const isVisible = await loader.isVisible().catch(() => false);
      if (!isVisible) return;
      console.log('⚠️ Global loader still present after 120s — attempting to continue');
    }
  }

  /**
   * Login with credentials (for stage - no captcha needed)
   */
  async loginStage(email: string, password: string): Promise<void> {
    await expect(this.emailInput).toBeVisible({ timeout: 30_000 });

    // Wait for global-loader overlay to disappear before interacting
    await this.waitForGlobalLoader();

    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click({ timeout: 120_000 });

    // Stage redirect can be extremely slow — wait up to 2 min
    // First try waitForURL, then fall back to checking URL manually
    try {
      await this.page.waitForURL('**/admin**', { timeout: STAGE_REDIRECT_TIMEOUT });
    } catch {
      // Fallback: if we're already on an admin page (URL changed but slowly), continue
      const currentUrl = this.page.url();
      if (!currentUrl.includes('/admin')) {
        throw new Error(`Stage login redirect failed. Current URL: ${currentUrl}`);
      }
      console.log('⚠️ waitForURL timed out but URL already contains /admin — continuing');
    }

    // Wait for page to settle — but don't block forever on slow stage loads
    try {
      await this.page.waitForLoadState('domcontentloaded', { timeout: 30_000 });
    } catch {
      console.log('⚠️ waitForLoadState timed out after login — continuing (URL is correct)');
    }
    // Close the post-login "Manifesto" marketing modal before the corp-code /
    // integrations steps run — it overlays the dashboard and blocks clicks.
    await dismissMarketingModal(this.page);
    console.log('✅ Stage login successful');
  }

  /**
   * Login with credentials (for prod - has hCaptcha "I am human" checkbox)
   */
  async loginProd(email: string, password: string): Promise<void> {
    await expect(this.emailInput).toBeVisible({ timeout: 30_000 });

    // Wait for global-loader overlay to disappear before interacting
    await this.waitForGlobalLoader();

    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);

    // ── hCaptcha: user solves captcha + clicks Login in the browser ──
    // No Playwright Inspector — just waits for the URL to change to /admin
    console.log('\n🛑 ═══════════════════════════════════════════════════════════');
    console.log('🛑  PROD LOGIN — Manual step required:');
    console.log('🛑  1. Solve the hCaptcha in the browser');
    console.log('🛑  2. Click the LOGIN button in the browser');
    console.log('🛑  3. Wait for admin dashboard to appear');
    console.log('🛑  (Automation will continue automatically once logged in)');
    console.log('🛑 ═══════════════════════════════════════════════════════════\n');

    // Poll until URL changes to /admin (user solved captcha + clicked Login)
    const maxWait = 180_000; // 3 minutes to solve captcha
    const start = Date.now();
    while (Date.now() - start < maxWait) {
      const url = this.page.url();
      if (url.includes('/admin')) break;
      await this.page.waitForTimeout(2000);
    }

    const currentUrl = this.page.url();
    if (!currentUrl.includes('/admin')) {
      throw new Error(`Prod login timed out after 3 min. Current URL: ${currentUrl}`);
    }
    await this.page.waitForLoadState('domcontentloaded', { timeout: 30_000 }).catch(() => {});
    await this.waitForGlobalLoader();
    // Close the post-login "Manifesto" marketing modal before any post-login steps.
    await dismissMarketingModal(this.page);
    console.log('✅ Prod login successful');
  }
}
