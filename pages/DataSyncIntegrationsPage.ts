// pages/DataSyncIntegrationsPage.ts
// Integrations page - ONLY used for SiteLink stage exception (setting corp password)

import { Page, expect } from '@playwright/test';

export class DataSyncIntegrationsPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // ─── Locators ──────────────────────────────────────────────────────
  private get siteLinkCorpPasswordInput() {
    return this.page.locator('input[name="sitelink_corp_pass"]');
  }

  private get saveChangesButton() {
    return this.page.getByRole('button', { name: 'Save Changes' });
  }

  // ─── Actions ───────────────────────────────────────────────────────

  /**
   * Navigate to integrations page
   */
  async goto(integrationsUrl: string): Promise<void> {
    await this.page.goto(integrationsUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await this.page.waitForLoadState('domcontentloaded', { timeout: 30_000 }).catch(() => {});
    // Wait for global-loader overlay to disappear
    await this.page.locator('#global-loader').waitFor({ state: 'hidden', timeout: 60_000 }).catch(() => {});
    await this.page.waitForTimeout(3000); // Allow page elements to settle
    // Dismiss wingman popup if it appears
    await this.dismissWingmanPopup();
  }

  /**
   * Set SiteLink Corp Password and save
   */
  async setSiteLinkCorpPassword(password: string): Promise<void> {
    // Wait for the password field to be visible
    await expect(this.siteLinkCorpPasswordInput).toBeVisible({ timeout: 15000 });
    
    // Clear and fill the password
    await this.siteLinkCorpPasswordInput.clear();
    await this.siteLinkCorpPasswordInput.fill(password);
    console.log(`✅ SiteLink Corp Password set to: ${password}`);

    // Click Save Changes
    await expect(this.saveChangesButton).toBeVisible({ timeout: 10000 });
    await this.saveChangesButton.click();
    console.log('✅ Save Changes clicked');

    // Wait for the page to process the save
    await this.page.waitForLoadState('domcontentloaded', { timeout: 30_000 }).catch(() => {});
    await this.page.waitForTimeout(3000);
    console.log('✅ Integrations settings saved successfully');
  }

  /**
   * Dismiss Wingman popup if it appears
   */
  async dismissWingmanPopup(): Promise<void> {
    try {
      // The wingman popup has a "×" close button inside a div with id starting with "popup-"
      const popupCloseButton = this.page.locator('[id^="popup-"] button:has-text("×")');
      const isVisible = await popupCloseButton.isVisible({ timeout: 5000 });
      if (isVisible) {
        await popupCloseButton.click();
        console.log('✅ Wingman popup dismissed');
        await this.page.waitForTimeout(1000);
      }
    } catch {
      // Popup not present - that's fine
    }
  }
}
