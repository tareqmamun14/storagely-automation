// pages/AdminRentalSystemPage.ts

import { Page, expect, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class AdminRentalSystemPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // More robust locator strategies using Playwright best practices
  private get selectAllLocationsDropdown(): Locator { 
    return this.page.getByRole('button', { name: /select.*locations/i })
      .or(this.page.locator('.bootstrap-select .dropdown-toggle'))
      .or(this.page.locator('[data-toggle="dropdown"]'));
  }
  
  private get locationDropdownBootstrap(): Locator {
    return this.page.locator('.bootstrap-select .dropdown-toggle, .dropdown-toggle').first();
  }

  private get locationDropdownOptions(): Locator {
    return this.page.locator('.bootstrap-select .dropdown-menu li a, .dropdown-menu li a');
  }

  private get rentalSystemSettingsLink(): Locator {
    return this.page.getByRole('link', { name: /rental.*system.*settings/i })
      .or(this.page.locator('a[href*="rental"]'))
      .or(this.page.locator('text=Rental System Settings'));
  }

  private get rentalSystemSubmenu(): Locator {
    return this.page.locator('.nav-item .nav-link').filter({ hasText: /rental.*system/i });
  }

  // Aggressive popup handling methods for Wingman and other interference
  private async forceClosePopups(): Promise<void> {
    const popupSelectors = [
      '.wingman-popup',
      '.wingman-container', 
      '.modal',
      '.popup',
      '[data-bs-dismiss="modal"]',
      '.close',
      '.btn-close',
      '[aria-label="Close"]',
      '.modal-backdrop'
    ];

    for (const selector of popupSelectors) {
      try {
        const elements = this.page.locator(selector);
        const count = await elements.count();
        
        for (let i = 0; i < count; i++) {
          const element = elements.nth(i);
          if (await element.isVisible()) {
            await element.click({ force: true, timeout: 1000 });
            console.log(`✅ Closed popup using selector: ${selector}`);
          }
        }
      } catch (error) {
        // Continue to next selector
      }
    }

    // Also try pressing Escape key multiple times
    try {
      await this.page.keyboard.press('Escape');
      await this.page.keyboard.press('Escape');
      await this.wait(500);
    } catch (error) {
      // Ignore escape key errors
    }
  }

  // Enhanced navigation to rental system settings with aggressive popup handling
  async navigateToRentalSystemSettings(): Promise<void> {
    console.log('🔄 Navigating to rental system settings...');
    
    // Force close any popups before navigation
    await this.forceClosePopups();
    
    try {
      // Wait for the page to be ready
      await this.page.waitForLoadState('networkidle', { timeout: 10000 });
      
      // Try multiple approaches to find and click the rental system link
      const navigationAttempts = [
        // Approach 1: Direct link click
        async () => {
          const link = this.rentalSystemSettingsLink;
          await link.waitFor({ state: 'visible', timeout: 5000 });
          await link.click();
        },
        
        // Approach 2: Navigation through menu structure
        async () => {
          const adminMenu = this.page.locator('a[href*="admin"], .nav-link').filter({ hasText: /admin/i });
          if (await adminMenu.count() > 0) {
            await adminMenu.first().click();
            await this.wait(1000);
          }
          
          const rentalLink = this.page.locator('a[href*="rental"]').first();
          await rentalLink.click();
        },
        
        // Approach 3: Direct URL navigation
        async () => {
          const currentUrl = this.page.url();
          const baseUrl = currentUrl.split('/admin')[0];
          const rentalUrl = `${baseUrl}/admin/rental-reservation-settings`;
          await this.page.goto(rentalUrl);
        }
      ];

      let navigationSuccessful = false;
      
      for (let i = 0; i < navigationAttempts.length; i++) {
        try {
          console.log(`   → Attempt ${i + 1}: Trying navigation approach`);
          
          // Close popups before each attempt
          await this.forceClosePopups();
          
          await navigationAttempts[i]();
          
          // Wait for navigation to complete
          await this.page.waitForURL('**/rental-reservation-settings**', { timeout: 10000 });
          
          navigationSuccessful = true;
          console.log(`   ✅ Navigation successful using approach ${i + 1}`);
          break;
          
        } catch (error) {
          console.log(`   ⚠️ Approach ${i + 1} failed: ${error}`);
          await this.wait(1000);
        }
      }

      if (!navigationSuccessful) {
        throw new Error('Failed to navigate to rental system settings page using all approaches');
      }

    } catch (error) {
      console.log(`❌ Navigation failed: ${error}`);
      throw error;
    }
  }

  // Get current page information
  async getPageInfo(): Promise<{ title: string; url: string }> {
    const title = await this.page.title();
    const url = this.page.url();
    return { title, url };
  }

  // Verify submenus are initially hidden
  async verifySubmenusInitiallyHidden(): Promise<{ allHidden: boolean; details: string[] }> {
    const details: string[] = [];
    let allHidden = true;

    const submenuSelectors = [
      { name: 'Location Settings', selector: 'a[href*="location"], .nav-link:has-text("Location")' },
      { name: 'Storage Unit Settings', selector: 'a[href*="storage"], .nav-link:has-text("Storage")' },
      { name: 'Keyword Setup', selector: 'a[href*="keyword"], .nav-link:has-text("Keyword")' }
    ];

    for (const submenu of submenuSelectors) {
      try {
        const element = this.page.locator(submenu.selector).first();
        const isVisible = await element.isVisible();
        
        if (isVisible) {
          details.push(`❌ ${submenu.name}: Visible (unexpected)`);
          allHidden = false;
        } else {
          details.push(`✅ ${submenu.name}: Hidden (expected)`);
        }
      } catch (error) {
        details.push(`⚠️ ${submenu.name}: Not found or error checking visibility`);
      }
    }

    return { allHidden, details };
  }

  // Enhanced location selection with aggressive popup handling
  async selectLocation(): Promise<{ success: boolean; details: string[] }> {
    const details: string[] = [];
    
    try {
      console.log('🔄 Selecting location from dropdown...');
      
      // Aggressive popup closure before dropdown interaction
      await this.forceClosePopups();
      details.push('Closed any interfering popups before dropdown interaction');
      
      // Wait for page to be stable
      await this.page.waitForLoadState('networkidle', { timeout: 8000 });
      
      // Try multiple strategies to open the dropdown
      const dropdownStrategies = [
        // Strategy 1: Click the bootstrap dropdown
        async () => {
          const dropdown = this.locationDropdownBootstrap;
          await dropdown.waitFor({ state: 'visible', timeout: 5000 });
          await dropdown.click({ force: true });
          details.push('Clicked bootstrap dropdown toggle');
        },
        
        // Strategy 2: Use the select all locations dropdown
        async () => {
          const dropdown = this.selectAllLocationsDropdown;
          await dropdown.waitFor({ state: 'visible', timeout: 5000 });
          await dropdown.click({ force: true });
          details.push('Clicked select all locations dropdown');
        },
        
        // Strategy 3: Find any dropdown button
        async () => {
          const anyDropdown = this.page.locator('.dropdown-toggle, [data-toggle="dropdown"]').first();
          await anyDropdown.click({ force: true });
          details.push('Clicked any available dropdown toggle');
        }
      ];

      let dropdownOpened = false;
      
      for (let i = 0; i < dropdownStrategies.length; i++) {
        try {
          // Close popups before each strategy attempt
          await this.forceClosePopups();
          
          await dropdownStrategies[i]();
          
          // Wait for dropdown menu to appear
          await this.page.waitForSelector('.dropdown-menu:visible, .bootstrap-select.open .dropdown-menu', { timeout: 3000 });
          dropdownOpened = true;
          details.push(`✅ Dropdown opened using strategy ${i + 1}`);
          break;
          
        } catch (error) {
          details.push(`Strategy ${i + 1} failed: ${error}`);
          await this.wait(1000);
        }
      }

      if (!dropdownOpened) {
        throw new Error('Failed to open dropdown menu');
      }

      // Close popups again after opening dropdown (in case Wingman interfered)
      await this.forceClosePopups();
      
      // Select a location option
      const options = this.locationDropdownOptions;
      const optionCount = await options.count();
      details.push(`Found ${optionCount} location options`);
      
      if (optionCount > 0) {
        // Select the first available option (skip "Select All" if present)
        let selectedOption = false;
        
        for (let i = 0; i < Math.min(optionCount, 5); i++) {
          const option = options.nth(i);
          const optionText = await option.textContent();
          
          // Skip "Select All" or empty options
          if (optionText && !optionText.toLowerCase().includes('select all') && optionText.trim() !== '') {
            try {
              // Force close popups right before clicking the option
              await this.forceClosePopups();
              
              await option.click({ force: true });
              details.push(`✅ Selected location: ${optionText.trim()}`);
              selectedOption = true;
              break;
            } catch (clickError) {
              details.push(`Failed to click option ${i}: ${clickError}`);
            }
          }
        }
        
        if (!selectedOption) {
          throw new Error('Could not select any valid location option');
        }
        
      } else {
        throw new Error('No location options found in dropdown');
      }

      // Wait for any page updates after selection
      await this.wait(2000);
      
      // Final popup cleanup
      await this.forceClosePopups();
      
      details.push('✅ Location selection completed successfully');
      return { success: true, details };
      
    } catch (error) {
      details.push(`❌ Location selection failed: ${error}`);
      return { success: false, details };
    }
  }

  // Verify submenus become visible after location selection
  async verifySubmenusVisibleAfterSelection(): Promise<{ allVisible: boolean; details: string[] }> {
    const details: string[] = [];
    let allVisible = true;

    // Wait a moment for the page to update after selection
    await this.wait(2000);

    const submenuSelectors = [
      { name: 'Location Settings', selector: 'a[href*="location"], .nav-link:has-text("Location")' },
      { name: 'Storage Unit Settings', selector: 'a[href*="storage"], .nav-link:has-text("Storage")' },
      { name: 'Keyword Setup', selector: 'a[href*="keyword"], .nav-link:has-text("Keyword")' }
    ];

    for (const submenu of submenuSelectors) {
      try {
        const element = this.page.locator(submenu.selector).first();
        const isVisible = await element.isVisible();
        
        if (isVisible) {
          details.push(`✅ ${submenu.name}: Visible (expected after selection)`);
        } else {
          details.push(`❌ ${submenu.name}: Still hidden (unexpected)`);
          allVisible = false;
        }
      } catch (error) {
        details.push(`⚠️ ${submenu.name}: Error checking visibility after selection`);
        allVisible = false;
      }
    }

    return { allVisible, details };
  }

  // Get current URL for verification
  async getCurrentUrl(): Promise<string> {
    return this.page.url();
  }

  // Take debug screenshot
  async takeDebugScreenshot(filename: string): Promise<void> {
    try {
      await this.page.screenshot({ 
        path: `test-results/${filename}`, 
        fullPage: true 
      });
      console.log(`📸 Debug screenshot saved: ${filename}`);
    } catch (error) {
      console.log(`Failed to take debug screenshot: ${error}`);
    }
  }

  // Enhanced wait method with logging
  async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
