// pages/BasePage.ts

import { Page, expect, Locator } from '@playwright/test';
import { PopupHandler } from '../utils/popup-handler';

export class BasePage {
  readonly page: Page;
  protected popupHandler: PopupHandler;

  constructor(page: Page) {
    this.page = page;
    this.popupHandler = new PopupHandler(page);
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
    // Wait for network to be mostly idle - with fallback
    try {
      await this.page.waitForLoadState('networkidle', { timeout: 5000 });
    } catch (error) {
      // If networkidle times out, just ensure DOM is ready
      console.log('ℹ️ Network still active, proceeding with DOM ready state');
      await this.page.waitForLoadState('domcontentloaded', { timeout: 5000 });
    }
    
    // Handle client-specific popups after navigation
    await this.popupHandler.handleClientSpecificPopups();
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
    // Handle popup before clicking
    await this.popupHandler.handleClientSpecificPopups();
    
    await expect(locator).toBeVisible({ timeout });
    await expect(locator).toBeEnabled({ timeout: 5000 });
    await locator.click();
    
    // Handle popup after clicking (in case clicking triggers a popup)
    await this.page.waitForTimeout(1000);
    await this.popupHandler.handleClientSpecificPopups();
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
   * Handle cookie consent if present
   */
  async handleCookieConsent(): Promise<void> {
    try {
      await this.wait(2000); // Small delay for potential cookie banner
      const cookieBanner = this.page.getByText('We use essential cookies to');
      if (await cookieBanner.isVisible()) {
        await cookieBanner.click();
        await this.wait(500);
        const acceptButton = this.page.getByRole('button', { name: 'Accept' });
        if (await acceptButton.isVisible()) {
          await acceptButton.click();
        }
      }
    } catch (error) {
      console.log('Cookie banner might not be present');
    }
  }

  /**
   * Handle LiveChat if it appears
   */
  async minimizeLiveChat(): Promise<void> {
    try {
      const chatIframeElement = await this.page.waitForSelector('iframe[title="LiveChat chat widget"]', { timeout: 5000 });
      
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