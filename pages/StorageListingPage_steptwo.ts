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
    // PRIMARY: storEDGE platform (10 Federal, etc.) - simple link with "rent" text
    return this.page.getByRole('link', { name: /^rent$/i }).first()
      // SECONDARY: SiteLink platform - look for "RENT" button in list view rows
      .or(this.page.locator('.listviewrows .blackBtnStoragely:has-text("RENT")').first())
      // FALLBACK OPTIONS for other platforms
      .or(this.page.locator('a:has-text("Reserve Unit")').first())
      .or(this.page.locator('a.reserveBtnPop.whiteBtnStoragely:has-text("Select Pricing Option")').first())
      .or(this.page.locator('[id*="sh_rentfullsection"]').getByRole('link', { name: /RENT NOW/i }).first()) // For single-page layouts
      .or(this.page.locator('div[class*="unitcard"], div[class*="unit-card"], .unit-item, .storage-unit').getByRole('link', { name: /RENT NOW/i }).first()) // Unit cards
      .or(this.page.locator('.listviewrows').getByRole('link', { name: /RENT NOW/i }).first()); // List view rows
  }

  private get vbpRentButton() {
    return this.page.locator('a.vbp_btn:has-text("Rent")').first();
  }

  private get closeModalButton() {
    return this.page.getByRole('button', { name: 'Close', exact: true })
      .or(this.page.locator('.close').first());
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
    const startTime = Date.now();
    console.log(`[${new Date().toISOString()}] 🚀 Starting navigation to: ${url}`);
    
    // Cache busting enabled for ALL customer URLs to ensure fresh page loads
    const randomQueryParam = `cacheBust=${Date.now()}-${Math.random().toString(36).substring(2)}`;
    const urlWithQuery = url.includes('?') 
      ? `${url}&${randomQueryParam}` 
      : `${url}?${randomQueryParam}`;
    
    console.log(`💾 Cache busting ENABLED - URL: ${urlWithQuery}`);
    
    try {
      // Try with increased timeout and more lenient wait strategy for slow sites
      // First attempt with cache busting
      let navigationSuccess = false;
      const navStartTime = Date.now();
      
      try {
        console.log(`[${new Date().toISOString()}] 📡 Attempting page.goto()...`);
        await this.page.goto(urlWithQuery, { 
          waitUntil: 'domcontentloaded',
          timeout: 60000 // Increased to 60 seconds for slow-loading sites
        });
        navigationSuccess = true;
        const navDuration = Date.now() - navStartTime;
        console.log(`[${new Date().toISOString()}] ✅ Navigation completed in ${navDuration}ms`);
      } catch (firstError) {
        const navDuration = Date.now() - navStartTime;
        console.log(`[${new Date().toISOString()}] ⚠️ Navigation with cache-bust failed after ${navDuration}ms, trying without query params...`);
        // Retry without cache busting parameter in case it causes issues
        const retryStartTime = Date.now();
        await this.page.goto(url, { 
          waitUntil: 'domcontentloaded',
          timeout: 60000
        });
        navigationSuccess = true;
        const retryDuration = Date.now() - retryStartTime;
        console.log(`[${new Date().toISOString()}] ✅ Retry navigation completed in ${retryDuration}ms`);
      }
      
      if (navigationSuccess) {
        // Wait for network to be mostly idle - with fallback
        const loadStateStartTime = Date.now();
        console.log(`[${new Date().toISOString()}] ⏳ Waiting for page to stabilize...`);
        try {
          await this.page.waitForLoadState('networkidle', { timeout: 10000 });
          const loadStateDuration = Date.now() - loadStateStartTime;
          console.log(`[${new Date().toISOString()}] ✅ Network idle achieved in ${loadStateDuration}ms`);
        } catch (error) {
          const loadStateDuration = Date.now() - loadStateStartTime;
          console.log(`[${new Date().toISOString()}] ℹ️ Network still active after ${loadStateDuration}ms, proceeding with DOM ready state`);
          await this.page.waitForLoadState('domcontentloaded', { timeout: 5000 });
        }
        
        // Cookie consent handling REMOVED per user request - not needed for any sites
        // Even 10federal works without it according to user testing
        
        const totalDuration = Date.now() - startTime;
        console.log(`[${new Date().toISOString()}] ✓ Successfully navigated to storage listing page (Total: ${totalDuration}ms)`);
      }
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
      // Wait for reserve button to appear
      await this.reserveButton.waitFor({ state: 'visible', timeout: 8000 }); // Reduced from 10000ms
      
      buttonText = await this.reserveButton.innerText();
      console.log(`Found a button with text: "${buttonText}"`);
      
      await this.reserveButton.click();
      console.log(`✓ Clicked "${buttonText}" button`);
      
      // Wait for a modal to appear (if any) - reduced wait
      await this.wait(800); // Reduced from 1000ms
      
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
   * Click on the rent button - OPTIMIZED FOR SPEED
   */
  async clickRentButton(): Promise<string | null> {
    const startTime = Date.now();
    console.log(`[${new Date().toISOString()}] 🎯 Searching for rent button...`);

    try {
      // Minimal page load wait - just ensure DOM is ready
      await this.page.waitForLoadState('domcontentloaded');
      
      // Scroll down a bit to ensure rent buttons are in viewport (helps with 10federal)
      console.log(`[${new Date().toISOString()}] ⟳ Scrolling to ensure buttons are visible...`);
      await this.page.evaluate(() => window.scrollBy(0, 500)).catch(() => {});
      await this.wait(1000); // Wait for scroll to complete and content to render
      
      // CRITICAL: Handle cookie consent BEFORE clicking rent button (10federal has blocking cookie banner)
      console.log(`[${new Date().toISOString()}] 🍪 Handling cookie consent if present...`);
      await this.handleCookieConsent();
      
      let rentButtonLocator = null;
      let buttonText: string | null = null;
      
      // Strategy 1: Table-based rent links (works for both storEDGE and SiteLink)
      // This is the fastest and most reliable for bluebird, 10federal, etc.
      // INCREASED timeout to 180s (3 minutes) to handle very slow sites like 10federal
      try {
        rentButtonLocator = this.page.locator('table').getByRole('link', { name: /^rent$/i }).first();
        buttonText = await rentButtonLocator.textContent({ timeout: 180000 });
        console.log(`[${new Date().toISOString()}] ✅ Rent button found (table strategy)`);
      } catch {
        // Strategy 2: SiteLink specific selector
        try {
          rentButtonLocator = this.page.locator('.listviewrows .blackBtnStoragely:has-text("RENT")').first();
          buttonText = await rentButtonLocator.textContent({ timeout: 180000 });
          console.log(`[${new Date().toISOString()}] ✅ Rent button found (SiteLink strategy)`);
        } catch {
          // Strategy 3: Broader container search
          try {
            rentButtonLocator = this.page.locator('.unit-listing, .listing-row, [class*="listing"]')
              .getByRole('link', { name: /rent/i })
              .first();
            buttonText = await rentButtonLocator.textContent({ timeout: 180000 });
            console.log(`[${new Date().toISOString()}] ✅ Rent button found (container strategy)`);
          } catch {
            throw new Error('No rent button found with any strategy');
          }
        }
      }
      
      // OPTIMIZED: Check if button is already visible before scrolling
      const isVisible = await rentButtonLocator.isVisible({ timeout: 1000 }).catch(() => false);
      
      if (isVisible) {
        // FAST PATH: Button already visible, click directly (saves ~500-900ms)
        console.log(`[${new Date().toISOString()}] ⚡ Button visible - clicking directly (FAST PATH)`);
        await Promise.all([
          this.page.waitForLoadState('domcontentloaded', { timeout: 30000 }),
          rentButtonLocator.click({ timeout: 15000 })
        ]);
      } else {
        // SLOW PATH: Button not visible, scroll into view first
        console.log(`[${new Date().toISOString()}] ⟳ Button not visible - scrolling into view first`);
        await rentButtonLocator.scrollIntoViewIfNeeded();
        await Promise.all([
          this.page.waitForLoadState('domcontentloaded', { timeout: 30000 }),
          rentButtonLocator.click({ timeout: 15000 })
        ]);
      }
      
      console.log(`[${new Date().toISOString()}] ✅ Rent button clicked`);
      
      // Wait for page to stabilize after navigation
      await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
        console.log('⚠️ Network not idle after 10s, proceeding anyway...');
      });
      
      const currentUrl = this.page.url();
      console.log(`[${new Date().toISOString()}] 🌐 URL: ${currentUrl}`);
      
      // Validate we didn't click wrong button (navigation menu)
      if (currentUrl.includes('/storage-units-near-me') || currentUrl.includes('/find-storage')) {
        throw new Error(`Wrong button clicked - navigated to ${currentUrl}`);
      }
      
      // Handle VBP if needed
      if (buttonText?.includes("Select Pricing Option")) {
        console.log(`[${new Date().toISOString()}] 🔀 Handling VBP...`);
        await this.vbpRentButton.waitFor({ state: 'visible', timeout: 10000 });
        await this.vbpRentButton.click();
      }
      
      const totalDuration = Date.now() - startTime;
      console.log(`[${new Date().toISOString()}] ✅ Rent button completed (${totalDuration}ms)`);
      return buttonText;
      
    } catch (error) {
      console.error(`CRITICAL ERROR: ${(error as Error).message}`);
      throw new Error(`Could not find or click rent button - ${(error as Error).message}`);
    }
  }

  /**
   * Check for error toast/alert messages after clicking rent button
   * This captures immediate validation errors for ALL customers (e.g., unit not available)
   * Returns error message if found, null if no error
   * Works for all customers - simple and robust
   */
  async checkForImmediateError(): Promise<string | null> {
    try {
      console.log('🔍 Checking for immediate error messages...');
      
      // Wait 1.5 seconds - enough time for error messages to appear without slowing down too much
      await this.wait(1500);
      
      // Priority selectors - covers most common error patterns across all customers
      const errorSelectors = [
        '.toast',                    // Toast notifications (Bluebird, etc.)
        '[role="alert"]',            // ARIA alert elements (accessibility standard)
        '.alert',                    // Bootstrap/general alerts
        'div[class*="toast"]',       // Any div with "toast" in class name
        'div[class*="error"]',       // Any div with "error" in class name
        '.error-message',            // Common error message class
        '.notification-error',       // Error notifications
        '.message.error',            // Message with error class
        '[class*="alert"]'           // Any element with "alert" in class
      ];
      
      // Check each selector
      for (const selector of errorSelectors) {
        try {
          const errorElements = this.page.locator(selector);
          const count = await errorElements.count();
          
          if (count > 0) {
            // Check each matching element
            for (let i = 0; i < count; i++) {
              const element = errorElements.nth(i);
              
              try {
                // Check if element is visible (with very short timeout to not slow down)
                const isVisible = await element.isVisible({ timeout: 500 });
                
                if (isVisible) {
                  const errorText = await element.textContent();
                  
                  if (errorText) {
                    // Clean up the text
                    const cleanedText = errorText.trim().replace(/\s+/g, ' ');
                    
                    // Check if it's a meaningful error (at least 5 characters)
                    if (cleanedText.length >= 5) {
                      // Check if it contains error-related keywords
                      const errorKeywords = [
                        'error', 'not available', 'unavailable', 'failed', 
                        'invalid', 'sold out', 'cannot', 'unable', 'problem',
                        'issue', 'sorry', 'unfortunately'
                      ];
                      
                      const lowerText = cleanedText.toLowerCase();
                      const hasErrorKeyword = errorKeywords.some(keyword => lowerText.includes(keyword));
                      
                      if (hasErrorKeyword) {
                        console.log(`⚠️  Immediate error found (selector: ${selector})`);
                        console.log(`   Message: ${cleanedText}`);
                        return cleanedText;
                      }
                    }
                  }
                }
              } catch {
                // Skip this element and continue
                continue;
              }
            }
          }
        } catch {
          // Continue checking other selectors
          continue;
        }
      }
      
      // No error found - this is normal and good!
      console.log('✅ No immediate error detected - proceeding with test');
      return null;
      
    } catch (error) {
      // If anything fails in error detection, don't break the test
      console.log('ℹ️  Error detection completed (no errors found)');
      return null;
    }
  }

  /**
   * Check banner status on the page - verifies if banners are properly loaded and visible
   * CRITICAL: Banners must have TWO sources with specific media queries:
   * 1. Desktop: media="(min-width: 768px)"
   * 2. Mobile: media="(max-width: 767px)"
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
      // Wait for page to load completely and banners to appear
      await this.wait(1500); // Reduced from 3000ms

      // PRIMARY LOGIC: Look for picture elements that contain banner sources
      const pictureElements = this.page.locator('picture');
      const pictureCount = await pictureElements.count();
      
      if (pictureCount === 0) {
        console.log('❌ No picture elements found on the page');
        result.status = 'FAILED';
        result.message = 'No picture elements found on the page';
        return result;
      }

      console.log(`🔍 Found ${pictureCount} picture element(s) on the page`);
      
      // Check each picture element for the required dual sources
      for (let i = 0; i < pictureCount; i++) {
        const picture = pictureElements.nth(i);
        const sources = picture.locator('source');
        const sourceCount = await sources.count();
        
        console.log(`\n📸 Picture ${i + 1}: Found ${sourceCount} source(s)`);
        
        if (sourceCount < 2) {
          console.log(`⚠️ Picture ${i + 1}: Skipping - needs at least 2 sources`);
          continue; // Skip if doesn't have at least 2 sources
        }

        let hasDesktopSource = false;
        let hasMobileSource = false;
        let desktopSourceDetails = '';
        let mobileSourceDetails = '';
        const allFoundMediaQueries: string[] = [];
        
        // Check all sources in this picture element
        for (let j = 0; j < sourceCount; j++) {
          const source = sources.nth(j);
          const mediaAttr = await source.getAttribute('media');
          const srcsetAttr = await source.getAttribute('srcset');
          
          if (mediaAttr) {
            allFoundMediaQueries.push(mediaAttr);
            
            // Check for desktop source (min-width: 768px)
            if (mediaAttr.includes('min-width') && mediaAttr.includes('768px')) {
              hasDesktopSource = true;
              desktopSourceDetails = mediaAttr;
            }
            
            // Check for mobile source (max-width: 767px)
            if (mediaAttr.includes('max-width') && mediaAttr.includes('767px')) {
              hasMobileSource = true;
              mobileSourceDetails = mediaAttr;
            }
          }
        }
        
        // Print what we expected vs what we found
        console.log(`\n📋 EXPECTED SOURCES:`);
        console.log(`   1. Desktop: media="(min-width: 768px)" ${hasDesktopSource ? '✅ FOUND' : '❌ NOT FOUND'}`);
        console.log(`   2. Mobile:  media="(max-width: 767px)" ${hasMobileSource ? '✅ FOUND' : '❌ NOT FOUND'}`);
        
        console.log(`\n📋 ACTUAL SOURCES FOUND:`);
        if (allFoundMediaQueries.length > 0) {
          allFoundMediaQueries.forEach((mq, idx) => {
            console.log(`   ${idx + 1}. media="${mq}"`);
          });
        } else {
          console.log(`   ⚠️ No media attributes found in any source elements`);
        }
        
        // If both sources are found in this picture element, it's a PASS
        if (hasDesktopSource && hasMobileSource) {
          console.log(`\n✅ VALIDATION PASSED for Picture ${i + 1}`);
          console.log(`   ✓ Desktop source: ${desktopSourceDetails}`);
          console.log(`   ✓ Mobile source:  ${mobileSourceDetails}`);
          
          result.status = 'PASSED';
          result.message = `Banner loaded successfully with both desktop (min-width: 768px) and mobile (max-width: 767px) sources`;
          return result;
        } else {
          // Log which sources are missing
          const missingSources = [];
          if (!hasDesktopSource) missingSources.push('desktop (min-width: 768px)');
          if (!hasMobileSource) missingSources.push('mobile (max-width: 767px)');
          console.log(`\n❌ VALIDATION FAILED for Picture ${i + 1}`);
          console.log(`   Missing: ${missingSources.join(', ')}`);
        }
      }
      
      // If we've checked all picture elements and didn't find both sources
      console.log('❌ Banner validation failed: No picture element contains both required sources');
      result.status = 'FAILED';
      result.message = `Banner missing required sources: Need both (min-width: 768px) and (max-width: 767px) in same picture element`;
      return result;
      
    } catch (error) {
      const errorMessage = (error as Error).message || 'Unknown error occurred';
      console.log(`💥 Error checking banner status: ${errorMessage}`);
      result.status = 'FAILED';
      result.message = `Error checking banner status: ${errorMessage}`;
      return result;
    }
  }
}

