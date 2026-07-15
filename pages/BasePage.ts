// pages/BasePage.ts

import { Page, expect, Locator } from '@playwright/test';
import { dismissMarketingModal } from '../utils/dismissMarketingModal';

export class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Dismiss the post-login "Manifesto" product-showcase marketing modal that
   * Storagely admin shows on the landing page. Call right after any admin login
   * so it can't overlay the dashboard and block subsequent clicks. No-op when
   * the modal is absent. See utils/dismissMarketingModal.ts.
   */
  async dismissPostLoginModal(timeoutMs = 5000): Promise<void> {
    await dismissMarketingModal(this.page, timeoutMs);
  }

  /**
   * Wait for a short period to allow elements to render (use sparingly)
   * @param ms Milliseconds to wait
   */
  async wait(ms: number = 1000): Promise<void> {
    await this.page.waitForTimeout(ms);
  }

  /**
   * Get the current page URL
   */
  async getCurrentUrl(): Promise<string> {
    return this.page.url();
  }

  /**
   * Navigate to a URL with better loading states and popup handling
   * @param url URL to navigate to
   */
  async goto(url: string): Promise<void> {
    await this.page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    // Brief wait for critical resources only
    await this.page.waitForTimeout(1000);
  }

  /**
   * Wait for element to be visible and actionable
   */
  async waitForElement(locator: Locator, timeout: number = 10000): Promise<void> {
    await expect(locator).toBeVisible({ timeout });
  }

  /**
   * Safe click with automatic waiting and popup handling
   */
  async safeClick(locator: Locator, timeout: number = 10000): Promise<void> {
    await expect(locator).toBeVisible({ timeout });
    await expect(locator).toBeEnabled({ timeout: 5000 });
    await locator.click();
  }

  /**
   * Safe fill with automatic waiting
   */
  async safeFill(locator: Locator, text: string, timeout: number = 10000): Promise<void> {
    await expect(locator).toBeVisible({ timeout });
    await expect(locator).toBeEnabled({ timeout: 5000 });
    await locator.fill(text);
  }

  /**
   * Handle cookie consent dialog if present
   * Attempts to dismiss cookie consent banners to prevent interference
   */
  async handleCookieConsent(url?: string): Promise<void> {
    try {
      // Only log if we're actually on a page that might have cookies
      const currentUrl = this.page.url();
      if (!currentUrl.includes('step') && !currentUrl.includes('checkout') && !currentUrl.includes('payment')) {
        console.log('🍪 Checking for cookie consent dialog...');
      }
      
      // First, do a quick check if ANY cookie dialog exists - REDUCED TIMEOUT
      const quickCheck = this.page.locator('button:has-text("Accept"), [data-termly-accept], [role="dialog"] button').first();
      const hasDialog = await quickCheck.isVisible({ timeout: 1000 }); // Reduced from 3000ms to 1000ms
      
      if (!hasDialog) {
        console.log('ℹ️ No cookie consent dialog found (this is normal)');
        return; // Exit early - no cookie dialog present
      }
      
      // Multiple selectors for cookie consent Accept buttons across different platforms
      const cookieSelectors = [
        // Termly cookie consent (common on storEDGE sites) - try first
        '[data-termly-accept]',
        // Generic cookie consent buttons
        'button:has-text("Accept")',
        'button:has-text("Accept All")',
        'button:has-text("I Accept")',
        'button:has-text("Agree")',
        // Specific cookie consent dialogs
        '[role="dialog"] button:has-text("Accept")',
        '.cookie-consent button:has-text("Accept")',
        '#cookie-banner button:has-text("Accept")',
        'button[id*="cookie-accept"]',
        'button[class*="cookie-accept"]'
      ];
      
      // Try each selector with a short timeout
      for (const selector of cookieSelectors) {
        try {
          const button = this.page.locator(selector).first();
          
          // Check if button is visible with very short timeout
          const isVisible = await button.isVisible({ timeout: 500 }); // Reduced from 1000ms to 500ms
          
          if (isVisible) {
            console.log(`✅ Found cookie consent button: ${selector}`);
            await button.click();
            console.log('✓ Cookie consent accepted');
            
            // Wait a moment for dialog to dismiss
            await this.wait(500);
            return;
          }
        } catch {
          // Continue to next selector
          continue;
        }
      }
      
      console.log('ℹ️ Cookie dialog detected but could not click (may have auto-dismissed)');
    } catch (error) {
      // Non-critical error - don't fail the test
      console.log('ℹ️ Cookie consent handling completed');
    }
  }

  /**
   * Handle LiveChat if it appears
   */
  async minimizeLiveChat(): Promise<void> {
    try {
      const chatIframeElement = await this.page.waitForSelector('iframe[title="LiveChat chat widget"]', { timeout: 2000 });
      
      if (chatIframeElement) {
        const chatIframe = await chatIframeElement.contentFrame();
        
        if (chatIframe) {
          const minimizeButton = await chatIframe.getByRole('button', { name: 'Minimize window' });
          
          if (await minimizeButton.isVisible()) {
            await minimizeButton.click();
            console.log("Minimized the chat window.");
          } else {
            console.log("Minimize button not visible, skipping.");
          }
        } else {
          console.log("Chat iframe is not accessible.");
        }
      } else {
        console.log("Chat iframe element not found.");
      }
    } catch (error) {
      console.log("Chat iframe not found or an error occurred, proceeding without minimizing.");
    }
  }
}