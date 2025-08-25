// pages/AdminDashboardPage.ts

import { Page, expect, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class AdminDashboardPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // More robust locator strategies using Playwright's recommended patterns
  private get settingsMenuItem(): Locator { 
    return this.page.getByRole('link', { name: /settings/i });
  }
  
  private get integrationsMenuItem(): Locator { 
    return this.page.getByRole('link', { name: /integrations/i })
      .or(this.page.locator('a[href*="integrations"]'));
  }
  
  private get brandingMenuItem(): Locator { 
    return this.page.getByRole('link', { name: /branding/i })
      .or(this.page.locator('a[href*="branding"]'));
  }
  
  private get locationSetupMenuItem(): Locator { 
    return this.page.getByRole('link', { name: /location/i })
      .or(this.page.locator('a[href*="location"]'));
  }
  
  private get rentalSystemMenuItem(): Locator { 
    return this.page.getByRole('link', { name: /rental.?system/i });
  }
  
  // Page elements with fallback selectors
  private get saveChangesButton(): Locator { 
    return this.page.getByRole('button', { name: /save.?changes/i })
      .or(this.page.getByRole('button', { name: /save/i }));
  }
  
  private get tenantLogo(): Locator { 
    return this.page.locator('img[class*="logo"], .tenant-logo img, .logo img').first();
  }
  
  private get companyName(): Locator { 
    return this.page.locator('.company-name, .tenant-name, [data-testid*="company"]').first();
  }

  /**
   * Enhanced popup handling with Playwright's built-in waiting
   */
  async handleWingmanPopup(): Promise<void> {
    const popupSelectors = [
      'button:has-text("×")',
      '[data-dismiss="modal"]',
      '.modal-close',
      'button[aria-label="Close"]',
      '.close',
      '[class*="close"]',
      'button[class*="close"]',
      '.popup-close',
      '.wingman-close',
      '[onclick*="close"]',
      '.modal .close',
      '.popup .close'
    ];
    
    // Try multiple times to catch persistent popups
    for (let attempt = 0; attempt < 3; attempt++) {
      let popupClosed = false;
      
      for (const selector of popupSelectors) {
        try {
          const closeButton = this.page.locator(selector).first();
          await expect(closeButton).toBeVisible({ timeout: 1000 });
          await this.safeClick(closeButton);
          console.log(`✓ Popup detected and closed (attempt ${attempt + 1})`);
          
          // Wait for popup to actually disappear
          await expect(closeButton).toBeHidden({ timeout: 2000 });
          popupClosed = true;
          break;
        } catch (error) {
          // Continue to next selector
          continue;
        }
      }
      
      if (popupClosed) {
        // Wait a bit more to ensure popup is fully gone
        await this.wait(500);
        break;
      }
      
      // If no popup found in this attempt, wait briefly before next attempt
      if (attempt < 2) {
        await this.wait(1000);
      }
    }
    
    console.log('ℹ No popup detected or all popups handled');
  }

  /**
   * Navigate to integrations with better error handling
   */
  async navigateToIntegrations(): Promise<void> {
    await this.handleWingmanPopup();
    
    try {
      // Try clicking the menu item first
      await expect(this.integrationsMenuItem).toBeVisible({ timeout: 5000 });
      await this.safeClick(this.integrationsMenuItem);
      await this.page.waitForURL('**/integrations**', { timeout: 10000 });
    } catch (error) {
      // Fallback to direct navigation
      console.log('Menu navigation failed, using direct URL');
      await this.goto('https://test.staging.storagely-api.com/10-federal-storage/admin/integrations');
    }
    
    await this.handleWingmanPopup();
  }

  /**
   * Navigate to branding with robust error handling
   */
  async navigateToBranding(): Promise<void> {
    await this.handleWingmanPopup();
    
    try {
      await expect(this.brandingMenuItem).toBeVisible({ timeout: 10000 });
      await this.safeClick(this.brandingMenuItem);
      await this.page.waitForURL('**/branding**', { timeout: 10000 });
    } catch (error) {
      console.log('Branding menu navigation failed, using direct URL');
      await this.goto('https://test.staging.storagely-api.com/10-federal-storage/admin/branding');
    }
    
    await this.handleWingmanPopup();
  }

  /**
   * Navigate to location setup with better waiting
   */
  async navigateToLocationSetup(): Promise<void> {
    await this.handleWingmanPopup();
    
    try {
      await expect(this.locationSetupMenuItem).toBeVisible({ timeout: 10000 });
      await this.safeClick(this.locationSetupMenuItem);
      await this.page.waitForURL('**/location**', { timeout: 10000 });
    } catch (error) {
      console.log('Location setup menu navigation failed, using direct URL');
      await this.goto('https://test.staging.storagely-api.com/10-federal-storage/admin/location-setup');
    }
    
    await this.handleWingmanPopup();
  }

  /**
   * Navigate to rental system page
   */
  async navigateToRentalSystem(): Promise<void> {
    await this.handleWingmanPopup();
    
    try {
      await expect(this.rentalSystemMenuItem).toBeVisible({ timeout: 10000 });
      await this.safeClick(this.rentalSystemMenuItem);
      await this.page.waitForURL('**/rental**', { timeout: 10000 });
    } catch (error) {
      console.log('Rental system menu navigation failed, using direct URL');
      await this.goto('https://test.staging.storagely-api.com/10-federal-storage/admin/rental-reservation-settings');
    }
    
    await this.handleWingmanPopup();
  }

  /**
   * Enhanced save operation with better feedback
   */
  async clickSaveChanges(): Promise<void> {
    await this.handleWingmanPopup();
    
    // Wait for save button to be available
    await expect(this.saveChangesButton).toBeVisible({ timeout: 10000 });
    await expect(this.saveChangesButton).toBeEnabled({ timeout: 5000 });
    
    // Click and wait for navigation or success indicator
    await this.safeClick(this.saveChangesButton);
    
    // Wait for either page reload or success message
    try {
      await this.page.waitForLoadState('networkidle', { timeout: 10000 });
    } catch (error) {
      // If no network activity, wait for DOM to be ready
      await this.page.waitForLoadState('domcontentloaded', { timeout: 5000 });
    }
    
    await this.handleWingmanPopup();
  }

  /**
   * Verify tenant context with proper assertions
   */
  async verifyTenantContextInUrl(expectedTenant: string): Promise<boolean> {
    // Use Playwright's URL assertion
    try {
      await expect(this.page).toHaveURL(new RegExp(expectedTenant), { timeout: 5000 });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get tenant information with better error handling
   */
  async getTenantInfo(): Promise<{ url: string; logoSrc?: string; companyText?: string }> {
    const url = await this.getCurrentUrl();
    let logoSrc: string | undefined;
    let companyText: string | undefined;

    try {
      await expect(this.tenantLogo).toBeVisible({ timeout: 3000 });
      logoSrc = await this.tenantLogo.getAttribute('src') || undefined;
    } catch (error) {
      console.log('Logo not found or not accessible');
    }

    try {
      await expect(this.companyName).toBeVisible({ timeout: 3000 });
      companyText = await this.companyName.textContent() || undefined;
    } catch (error) {
      console.log('Company name not found or not accessible');
    }

    return { url, logoSrc, companyText };
  }

  /**
   * Verify page navigation with assertions
   */
  async verifyPageNavigation(expectedUrlPart: string, expectedTitle?: string): Promise<boolean> {
    try {
      await expect(this.page).toHaveURL(new RegExp(expectedUrlPart), { timeout: 10000 });
      
      if (expectedTitle) {
        await expect(this.page).toHaveTitle(new RegExp(expectedTitle, 'i'), { timeout: 5000 });
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if page loads successfully using response status
   */
  async verifyPageLoadsSuccessfully(): Promise<boolean> {
    try {
      // Check if we're not on an error page
      await expect(this.page.locator('body')).not.toContainText(/404|not found|page not found/i, { timeout: 5000 });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Verify user authentication status
   */
  async verifyStillLoggedIn(): Promise<boolean> {
    try {
      await expect(this.page).not.toHaveURL(/\/(login|auth)/, { timeout: 5000 });
      return true;
    } catch (error) {
      return false;
    }
  }
}
