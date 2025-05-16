// pages/BasePage.ts

import { Page } from '@playwright/test';

export class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Wait for a short period to allow elements to render
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
   * Navigate to a URL
   * @param url URL to navigate to
   */
  async goto(url: string): Promise<void> {
    await this.page.goto(url, { waitUntil: 'domcontentloaded' });
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