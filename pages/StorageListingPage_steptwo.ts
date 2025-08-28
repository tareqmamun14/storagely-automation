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

  // Banner locators - looking for any banner/offer images
  private get bannerImages() {
    return this.page.locator('img[alt*="Banner"], img[class*="banner"], img[class*="offer"]');
  }

  /**
   * Navigate to the storage listing page with cache busting
   * @param url The URL to navigate to
   */
  async navigateWithCacheBusting(url: string): Promise<void> {
    console.log(`Navigating to: ${url}`);
    
    const randomQueryParam = `cacheBust=${Date.now()}-${Math.random().toString(36).substring(2)}`;
    const urlWithQuery = url.includes('?')
      ? `${url}&${randomQueryParam}`
      : `${url}?${randomQueryParam}`;
    
    try {
      await this.goto(urlWithQuery);
      await this.handleCookieConsent();
      
      // Additional popup handling after page load for AllPurpose Storage
      await this.popupHandler.handleClientSpecificPopups();
      
      console.log('✓ Successfully navigated to storage listing page');
    } catch (error) {
      const errorMsg = `CRITICAL ERROR: Failed to navigate to ${url} - ${(error as Error).message}`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
  }

  /**
   * Click on the reserve button if available
   * Returns the text of the button clicked or null if no button was found
   */
  async clickReserveButtonIfAvailable(): Promise<string | null> {
    let buttonText: string | null = null;
    
    try {
      // Handle popup before looking for reserve button
      await this.popupHandler.handleClientSpecificPopups();
      
      // Wait longer for reserve button to appear
      await this.reserveButton.waitFor({ state: 'visible', timeout: 10000 });
      
      buttonText = await this.reserveButton.innerText();
      console.log(`Found a button with text: "${buttonText}"`);
      
      await this.reserveButton.click();
      console.log(`✓ Clicked "${buttonText}" button`);
      
      // Wait for a modal to appear (if any)
      await this.wait(2000);
      
      // Handle popup after clicking reserve button
      await this.popupHandler.handleClientSpecificPopups();
      
      // Try closing the modal (if it exists)
      try {
        if (await this.closeModalButton.isVisible({ timeout: 3000 })) {
          await this.closeModalButton.click();
          console.log('✓ Closed the modal');
        }
      } catch (error) {
        console.log('- Close button might not be present');
      }
    } catch (error) {
      console.log('- No RESERVE or Join Waitlist button found, proceeding with the rest of the test.');
    }
    
    return buttonText;
  }

  /**
   * Click on the rent button - CRITICAL STEP that must succeed
   * Returns the text of the button clicked
   */
  async clickRentButton(): Promise<string | null> {
    console.log('Attempting to click rent button - CRITICAL STEP');
    
    try {
      await this.wait(2000);
      
      // Wait for rent button to be visible with longer timeout
      await this.rentButton.waitFor({ state: 'visible', timeout: 15000 });
      
      const buttonText: string | null = await this.rentButton.textContent();
      console.log(`Found rent button with text: ${buttonText?.trim()}`);
      
      await this.rentButton.scrollIntoViewIfNeeded();
      await this.rentButton.click();
      
      console.log('✓ Rent button clicked successfully');
      
      // Handle Value Based Pricing if needed
      if (buttonText?.includes("Select Pricing Option")) {
        try {
          await this.vbpRentButton.waitFor({ state: 'visible', timeout: 10000 });
          await this.vbpRentButton.click();
          console.log('✓ VBP Rent button clicked successfully');
        } catch (error) {
          const errorMsg = `CRITICAL ERROR: Could not find or click VBP rent button - ${(error as Error).message}`;
          console.error(errorMsg);
          throw new Error(errorMsg);
        }
      }
      
      return buttonText;
      
    } catch (error) {
      const errorMsg = `CRITICAL ERROR: Could not find or click rent button - ${(error as Error).message}`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
  }

  /**
   * Check banner status on the page - verifies if banners are properly loaded and visible
   * Returns object with banner status
   */
  async checkBannerStatus(): Promise<{
    status: 'PASSED' | 'FAILED';
    message: string;
  }> {
    const result = {
      status: 'FAILED' as 'PASSED' | 'FAILED',
      message: ''
    };

    try {
      // Wait longer for page to load completely and banners to appear
      await this.wait(5000);

      // Get all banner images on the page
      const bannerCount = await this.bannerImages.count();
      
      if (bannerCount === 0) {
        result.status = 'FAILED';
        result.message = 'No banner images found on the page';
        return result;
      }

      console.log(`Found ${bannerCount} banner image(s) on the page`);
      
      // Check each banner image to see if it's properly loaded and visible
      const bannerDetails = [];
      let properlyLoadedBanners = 0;

      for (let i = 0; i < bannerCount; i++) {
        const banner = this.bannerImages.nth(i);
        
        try {
          // Wait for the banner to be visible
          await banner.waitFor({ state: 'visible', timeout: 10000 });
          
          // Get banner properties using evaluate
          const bannerInfo = await banner.evaluate((img: HTMLImageElement) => ({
            alt: img.alt,
            src: img.src,
            className: img.className,
            visible: img.offsetParent !== null,
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight,
            complete: img.complete
          }));

          bannerDetails.push(bannerInfo);

          // Check if banner is properly loaded
          const isProperlyLoaded = bannerInfo.visible && 
                                  bannerInfo.complete && 
                                  bannerInfo.naturalWidth > 0 && 
                                  bannerInfo.naturalHeight > 0;
          
          if (isProperlyLoaded) {
            properlyLoadedBanners++;
            console.log(`✓ Banner ${i + 1}: ${bannerInfo.alt} - Properly loaded (${bannerInfo.naturalWidth}x${bannerInfo.naturalHeight})`);
          } else {
            console.log(`✗ Banner ${i + 1}: ${bannerInfo.alt} - Failed to load properly`);
          }
          
        } catch (error) {
          console.log(`✗ Banner ${i + 1}: Error checking banner - ${(error as Error).message}`);
          bannerDetails.push({ 
            alt: 'Unknown', 
            visible: false, 
            complete: false, 
            error: (error as Error).message 
          });
        }
      }

      // Determine final status
      if (properlyLoadedBanners > 0) {
        result.status = 'PASSED';
        result.message = `Found ${properlyLoadedBanners} properly loaded banner(s) out of ${bannerCount} total banners`;
      } else {
        result.status = 'FAILED';
        result.message = `No properly loaded banners found. Found ${bannerCount} banner(s) but none were properly loaded and visible`;
      }

      return result;
    } catch (error) {
      result.status = 'FAILED';
      result.message = `Error checking banner status: ${(error as Error).message}`;
      return result;
    }
  }
}

