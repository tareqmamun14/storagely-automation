// pages/StorageListingPage.ts

import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class StorageListingPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Locators
  private get reserveButton() {
    return this.page.locator('a.reserveBtnPop.whiteBtnStoragely:has-text("RESERVE")')
      .or(this.page.locator('.listviewrows .whiteBtnStoragely:has-text("RESERVE")'))
      .or(this.page.locator('button:has-text("Join Waitlist")'))
      .first();
  }

  private get rentButton() {
    return this.page.locator('.listviewrows .blackBtnStoragely:has-text("RENT")')
      .or(this.page.locator('a:has-text("Reserve Unit")'))
      .or(this.page.locator('a.reserveBtnPop.whiteBtnStoragely:has-text("Select Pricing Option")'))
      .first();
  }

  private get vbpRentButton() {
    return this.page.locator('a.vbp_btn:has-text("Rent")').first();
  }

  private get closeModalButton() {
    return this.page.getByRole('button', { name: 'Close', exact: true });
  }

  /**
   * Navigate to the storage listing page with cache busting
   * @param url The URL to navigate to
   */
  async navigateWithCacheBusting(url: string): Promise<void> {
    const randomQueryParam = `cacheBust=${Date.now()}-${Math.random().toString(36).substring(2)}`;
    const urlWithQuery = url.includes('?')
      ? `${url}&${randomQueryParam}`
      : `${url}?${randomQueryParam}`;
    
    await this.goto(urlWithQuery);
    await this.handleCookieConsent();
  }

  /**
   * Click on the reserve button if available
   * Returns the text of the button clicked or null if no button was found
   */
  async clickReserveButtonIfAvailable(): Promise<string | null> {
    let buttonText = null;
    
    try {
      buttonText = await this.reserveButton.innerText();
      console.log(`Found a button with text: "${buttonText}"`);
      
      await this.reserveButton.click();
      console.log(`Clicked "${buttonText}" button`);
      
      // Wait for a modal to appear (if any)
      await this.wait(1500);
      
      // Try closing the modal (if it exists)
      try {
        if (await this.closeModalButton.isVisible()) {
          await this.closeModalButton.click();
          console.log('Closed the modal');
        }
      } catch (error) {
        console.log('Close button might not be present');
      }
    } catch (error) {
      console.log('No RESERVE or Join Waitlist button found, proceeding with the rest of the test.');
    }
    
    return buttonText;
  }

  /**
   * Click on the rent button
   * Returns the text of the button clicked
   */
  async clickRentButton(): Promise<string | null> {
    await this.wait(1500);
    
    const buttonText = await this.rentButton.textContent();
    console.log(`Clicking button: ${buttonText?.trim()}`);
    
    await this.rentButton.scrollIntoViewIfNeeded();
    await this.rentButton.click();
    
    // Handle Value Based Pricing if needed
    if (buttonText?.includes("Select Pricing Option")) {
      await this.vbpRentButton.waitFor();
      console.log('Clicked button: RENT-(Select Pricing Option)');
      await this.vbpRentButton.click();
    }
    
    return buttonText;
  }
}