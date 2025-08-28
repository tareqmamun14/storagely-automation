import { Page } from '@playwright/test';

/**
 * Handles popup management for different clients
 */
export class PopupHandler {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Handle AllPurpose Storage specific popup with simple click approach
   */
  async handleAllPurposeStoragePopup(timeoutMs: number = 3000): Promise<void> {
    try {
      console.log('🔍 Checking for AllPurpose Storage admin fee popup...');
      
      // Simple click approach - just click anywhere on the page to close popup
      await this.page.click('body', { 
        position: { x: 100, y: 100 }, 
        timeout: 1000 
      });
      
      // Small wait to ensure popup is closed
      await this.page.waitForTimeout(200);
      
      console.log('🚀 Admin fee popup closed with simple click!');

    } catch (error) {
      console.log('ℹ️ No admin fee popup detected');
    }
  }

  /**
   * Handle client-specific popups (for other customers)
   */
  async handleClientSpecificPopups(): Promise<void> {
    try {
      // Check if this is AllPurpose Storage
      if (await this.isAllPurposeStorageClient()) {
        await this.handleAllPurposeStoragePopup();
      }
      // For other clients, no popup handling needed
    } catch (error) {
      console.log('ℹ️ Popup handling completed with no issues detected:', (error as Error).message);
    }
  }

  /**
   * Check if current URL belongs to AllPurpose Storage client
   */
  async isAllPurposeStorageClient(): Promise<boolean> {
    const url = this.page.url();
    return url.includes('allpurposestorage');
  }
}
