// pages/DataSyncPage.ts
// Data Sync page POM - handles sync actions, Working/Queue polling, and reading last update values

import { Page, expect } from '@playwright/test';

export class DataSyncPage {
  readonly page: Page;

  // Max time (ms) to wait for Working/Queue status to clear
  private readonly SYNC_POLL_TIMEOUT = 300000; // 5 minutes
  // Interval (ms) between page refreshes while polling
  private readonly SYNC_POLL_INTERVAL = 15000; // 15 seconds

  constructor(page: Page) {
    this.page = page;
  }

  // ─── Locators ──────────────────────────────────────────────────────
  private get dataSyncHeading() {
    return this.page.getByRole('heading', { name: 'Data Synchronization' });
  }

  private get dbSyncTable() {
    return this.page.locator('table').first();
  }

  // SweetAlert OK button
  private get sweetAlertOkButton() {
    return this.page.locator('.sa-confirm-button-container button.confirm');
  }

  // ─── Helpers ───────────────────────────────────────────────────────

  /**   * Wait for the #global-loader overlay to disappear before interacting
   */
  private async waitForGlobalLoader(): Promise<void> {
    try {
      await this.page.locator('#global-loader').waitFor({ state: 'hidden', timeout: 60_000 });
    } catch {
      // Loader not present or already hidden — fine
    }
  }

  /**   * Get the target table row by its description text
   */
  private getRowByDescription(description: string) {
    return this.dbSyncTable.locator('tbody tr', {
      has: this.page.locator(`text="${description}"`)
    }).first();
  }

  // ─── Actions ───────────────────────────────────────────────────────

  /**
   * Navigate to data sync page and wait for it to fully load
   */
  async goto(dataSyncUrl: string): Promise<void> {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        if (attempt === 1) {
          await this.page.goto(dataSyncUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });
        } else {
          console.log(`🔄 Attempt ${attempt} — refreshing page...`);
          await this.page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 });
        }
        await this.page.waitForLoadState('domcontentloaded', { timeout: 30_000 }).catch(() => {});
        await this.waitForGlobalLoader();
        await this.page.waitForTimeout(3000);
        await this.dismissWingmanPopup();
        await expect(this.dataSyncHeading).toBeVisible({ timeout: 20000 });
        console.log('✅ Data Sync page loaded');
        return;
      } catch (err) {
        if (attempt === 3) throw err;
        console.log(`⚠️ Data Sync page load attempt ${attempt} failed — will retry...`);
      }
    }
  }

  /**
   * Click the Synchronization button for the given row description
   */
  async clickSyncButton(description: string): Promise<void> {
    const targetRow = this.getRowByDescription(description);
    await expect(targetRow).toBeVisible({ timeout: 15000 });
    console.log(`✅ Found row: "${description}"`);

    const syncButton = targetRow.getByRole('button', { name: 'Synchronization' });
    await expect(syncButton).toBeVisible({ timeout: 10000 });
    // Ensure global-loader overlay is gone before clicking
    await this.waitForGlobalLoader();
    await syncButton.click();
    console.log(`✅ Clicked Synchronization button for "${description}"`);
  }

  /**
   * Handle the SweetAlert confirmation popup - click OK
   */
  async confirmSyncPopup(): Promise<void> {
    await expect(this.sweetAlertOkButton).toBeVisible({ timeout: 15000 });
    console.log('✅ SweetAlert popup appeared');
    await this.sweetAlertOkButton.click();
    console.log('✅ Clicked OK on SweetAlert popup');
  }

  /**
   * Wait for page to fully load after a refresh and dismiss any popups
   */
  async waitForPageReady(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded', { timeout: 30_000 }).catch(() => {});
    await this.waitForGlobalLoader();
    await this.page.waitForTimeout(3000);
    await expect(this.dataSyncHeading).toBeVisible({ timeout: 30000 });
    await expect(this.dbSyncTable).toBeVisible({ timeout: 15000 });
    await this.dismissWingmanPopup();
  }

  /**
   * Read the Status column text for a specific sync row
   * Status column is the 4th cell (index 3)
   */
  async getStatusValue(description: string): Promise<string> {
    const targetRow = this.getRowByDescription(description);
    await expect(targetRow).toBeVisible({ timeout: 15000 });
    const statusCell = targetRow.locator('td').nth(3);
    const statusText = await statusCell.innerText();
    return statusText.trim();
  }

  /**
   * Read the Last Update column text for a specific sync row
   * Last Update column is the 3rd cell (index 2)
   */
  async getLastUpdateValue(description: string): Promise<string> {
    const targetRow = this.getRowByDescription(description);
    await expect(targetRow).toBeVisible({ timeout: 15000 });
    const lastUpdateCell = targetRow.locator('td').nth(2);
    await expect(lastUpdateCell).toBeVisible({ timeout: 10000 });
    const lastUpdateText = await lastUpdateCell.innerText();
    return lastUpdateText.trim();
  }

  /**
   * Poll by refreshing the page until BOTH:
   *   a) Status column is clear (no "Working" / "Queue")
   *   b) Last Update value has CHANGED from the pre-sync snapshot
   *
   * This guarantees we read the fresh value, not the stale one.
   */
  async waitUntilSyncCompletes(
    description: string,
    oldLastUpdate: string
  ): Promise<void> {
    const startTime = Date.now();
    let attempt = 0;

    while (Date.now() - startTime < this.SYNC_POLL_TIMEOUT) {
      attempt++;
      const status = await this.getStatusValue(description);
      const currentLastUpdate = await this.getLastUpdateValue(description);
      const statusBusy =
        status.toLowerCase().includes('working') ||
        status.toLowerCase().includes('queue');

      // ── Still busy (Working / Queued) → keep waiting ──
      if (statusBusy) {
        console.log(
          `⏳ [Attempt ${attempt}] Status: "${status}" | Last Update: "${currentLastUpdate}" — sync in progress, refreshing in ${this.SYNC_POLL_INTERVAL / 1000}s...`
        );
        await this.page.waitForTimeout(this.SYNC_POLL_INTERVAL);
        await this.page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 });
        await this.waitForPageReady();
        continue;
      }

      // ── Status is clear — check if Last Update actually changed ──
      if (currentLastUpdate !== oldLastUpdate) {
        console.log(
          `✅ [Attempt ${attempt}] Sync completed! Status clear, Last Update changed from "${oldLastUpdate}" → "${currentLastUpdate}"`
        );
        return;
      }

      // Status is clear BUT Last Update hasn't changed yet (server still processing)
      console.log(
        `⏳ [Attempt ${attempt}] Status clear but Last Update unchanged ("${currentLastUpdate}") — server still processing, refreshing in ${this.SYNC_POLL_INTERVAL / 1000}s...`
      );
      await this.page.waitForTimeout(this.SYNC_POLL_INTERVAL);
      await this.page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 });
      await this.waitForPageReady();
    }

    // Timeout reached
    const finalStatus = await this.getStatusValue(description);
    const finalUpdate = await this.getLastUpdateValue(description);
    console.log(
      `⚠️ Polling timed out after ${this.SYNC_POLL_TIMEOUT / 1000}s. Status: "${finalStatus}" | Last Update: "${finalUpdate}"`
    );
  }

  /**
   * Full sync workflow:
   *   1. Snapshot the current Last Update value (before sync)
   *   2. Click Synchronization button
   *   3. Confirm the SweetAlert popup (OK)
   *   4. Wait for the server to register the sync, then refresh
   *   5. Poll until Status clears AND Last Update actually changes
   *   6. Read and return the fresh Last Update value
   */
  async performSyncAndGetLastUpdate(description: string): Promise<string> {
    // Step 1: Capture old Last Update BEFORE clicking sync
    const oldLastUpdate = await this.getLastUpdateValue(description);
    console.log(`📸 Pre-sync Last Update snapshot: "${oldLastUpdate}"`);

    // Step 2: Click Synchronization button
    await this.clickSyncButton(description);

    // Step 3: Confirm SweetAlert popup
    await this.confirmSyncPopup();

    // Step 4: Give the server time to register the sync, then refresh the page
    console.log('⏳ Waiting 10s for server to register the sync job...');
    await this.page.waitForTimeout(10000);
    await this.page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 });
    await this.waitForPageReady();

    // Step 5: Poll until Working/Queue clears AND Last Update changes
    await this.waitUntilSyncCompletes(description, oldLastUpdate);

    // Step 6: Read the fresh Last Update value
    const lastUpdate = await this.getLastUpdateValue(description);
    console.log(`📊 Last Update for "${description}": ${lastUpdate}`);
    return lastUpdate;
  }

  /**
   * Dismiss Wingman popup if it appears (can appear on page load or after refresh)
   */
  async dismissWingmanPopup(): Promise<void> {
    try {
      const popupCloseButton = this.page.locator('[id^="popup-"] button:has-text("×")');
      const isVisible = await popupCloseButton.isVisible({ timeout: 5000 });
      if (isVisible) {
        await popupCloseButton.click();
        console.log('✅ Wingman popup dismissed');
        await this.page.waitForTimeout(1000);
      }
    } catch {
      // Popup not present — that's fine
    }
  }
}
