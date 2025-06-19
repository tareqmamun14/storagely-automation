// pages/RentalDetailsPage.ts

import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class RentalDetailsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Locators
  private get summaryHeading() { return this.page.getByRole('heading', { name: 'Summary of Rental' }); }
  private get firstNameInput() { return this.page.getByPlaceholder('First name'); }
  private get lastNameInput() { return this.page.getByPlaceholder('Last name'); }
  private get emailInput() { return this.page.getByPlaceholder('Email address'); }
  private get phoneInput() { return this.page.getByPlaceholder('Phone number'); }
  private get addressInput() { 
    return this.page.getByPlaceholder('Address', { exact: true })
      .or(this.page.getByPlaceholder('Street address', { exact: true })); 
  }
  private get cityInput() { return this.page.getByPlaceholder('City'); }
  private get zipCodeInput() { 
    return this.page.getByRole('textbox', { name: 'Zip' })
      .or(this.page.getByRole('textbox', { name: 'Postal' }))
      .or(this.page.getByPlaceholder(/Zip Code|Postal Code|ZIP/)); 
  }
  private get datepicker() { return this.page.locator('.datepicker-days .today.active.day'); }
  private get continueButton() { return this.page.getByRole('button', { name: 'CONTINUE TO NEXT STEP' }); }

  /**
   * Fill out the rental details form
   */
  async fillRentalDetails(userData: {
    firstName: string,
    lastName: string,
    email: string,
    phone: string,
    address: string,
    city: string,
    province: {
      alberta?: string,
      alaska?: string,
      alabama?: string
    },
    zipCode: string
  }): Promise<void> {
    await this.summaryHeading.click();
    await this.wait(1000);

    await this.firstNameInput.fill(userData.firstName, { timeout: 5000 });
    await this.lastNameInput.fill(userData.lastName, { timeout: 5000 });
    await this.emailInput.fill(userData.email);
    await this.phoneInput.fill(userData.phone);
    await this.addressInput.fill(userData.address);
    await this.cityInput.fill(userData.city);

    await this.selectProvinceOrState(userData.province);

    await this.fillZipCode(userData.zipCode);

    await this.selectDateIfAvailable();
    await this.proceedToNextStep();
  }

  /**
   * Fill zip code with enhanced error handling
   */
  private async fillZipCode(zipCode: string): Promise<void> {
    try {
      // First try to click the zip code input to ensure it's focused
      await this.zipCodeInput.click({ timeout: 5000 });
      await this.wait(500);
      
      // Then fill the zip code
      await this.zipCodeInput.fill(zipCode, { timeout: 5000 });
      console.log(`Successfully filled zip code: ${zipCode}`);
    } catch (error) {
      console.warn(`Failed to fill zip code: ${error}`);
      // Try alternative approaches if the main one fails
      try {
        const zipByPlaceholder = this.page.getByPlaceholder(/Zip|Postal/i);
        if (await zipByPlaceholder.count() > 0) {
          await zipByPlaceholder.first().click();
          await zipByPlaceholder.first().fill(zipCode);
          console.log(`Successfully filled zip code using placeholder approach: ${zipCode}`);
        }
      } catch (fallbackError) {
        console.error(`All zip code filling attempts failed: ${fallbackError}`);
        throw new Error(`Unable to fill zip code field with value: ${zipCode}`);
      }
    }
  }

  /**
   * Select province or state based on what's available on the page
   */
  private async selectProvinceOrState(locationData: { alberta?: string, alaska?: string, alabama?: string }): Promise<void> {
    // FIRST: Try the custom dropdown approach (for dropdowns like in your screenshot)
    if (await this.selectFromCustomDropdown(locationData)) {
      return;
    }

    // SECOND: Try the direct #province selector approach (most reliable for select dropdowns)
    if (await this.selectUsingDirectSelector(locationData)) {
      return;
    }

    // FALLBACK 1: Try to select Alberta for Province field
    if (locationData.alberta) {
      const provinceSelected = await this.selectProvince(locationData.alberta);
      if (provinceSelected) return;
    }

    // FALLBACK 2: Try to select Alaska for State field  
    if (locationData.alaska) {
      const stateSelected = await this.selectState(locationData.alaska);
      if (stateSelected) return;
    }

    // FALLBACK 3: Try to select Alabama for State field  
    if (locationData.alabama) {
      const stateSelected = await this.selectState(locationData.alabama);
      if (stateSelected) return;
    }

    console.warn('Neither province nor state could be selected using any method');
  }

  /**
   * Handle custom dropdown selection (like the one in your screenshot)
   * This tries to click dropdown that shows "Select State" and then select from the list
   */
  private async selectFromCustomDropdown(locationData: { alberta?: string, alaska?: string, alabama?: string }): Promise<boolean> {
    try {
      // Look for the dropdown trigger that shows "Select State" or similar text
      const dropdownTriggers = [
        this.page.getByText('Select State'),
        this.page.getByText('Select Province'),
        this.page.locator('[class*="dropdown"][class*="select"]'),
        this.page.locator('div:has-text("Select State")'),
        this.page.locator('div:has-text("Select Province")'),
        // Also try to find by the placeholder or value
        this.page.locator('input[placeholder*="Select"]'),
        this.page.locator('div[class*="select"]:has-text("Select")')
      ];

      let dropdownOpened = false;
      
      // Try to open the dropdown
      for (const trigger of dropdownTriggers) {
        try {
          if (await trigger.count() > 0 && await trigger.isVisible()) {
            console.log('Found dropdown trigger, attempting to click');
            await trigger.click({ timeout: 3000 });
            await this.wait(1000); // Wait for dropdown to open
            dropdownOpened = true;
            break;
          }
        } catch (error) {
          console.warn(`Dropdown trigger failed: ${error}`);
        }
      }

      if (!dropdownOpened) {
        console.log('No custom dropdown trigger found');
        return false;
      }

      // Now try to select from the opened dropdown
      const locationsToTry = [
        { name: 'Alberta', provided: locationData.alberta },
        { name: 'Alabama', provided: locationData.alabama },
        { name: 'Alaska', provided: locationData.alaska }
      ];

      for (const location of locationsToTry) {
        if (location.provided) {
          // Try multiple ways to find and click the option in the dropdown
          const optionSelectors = [
            this.page.getByText(location.name, { exact: true }),
            this.page.locator(`text=${location.name}`),
            this.page.locator(`[role="option"]:has-text("${location.name}")`),
            this.page.locator(`li:has-text("${location.name}")`),
            this.page.locator(`div:has-text("${location.name}")`),
            this.page.locator(`a:has-text("${location.name}")`),
            // Try with class patterns common in dropdowns
            this.page.locator(`[class*="option"]:has-text("${location.name}")`)
          ];

          for (const selector of optionSelectors) {
            try {
              if (await selector.count() > 0) {
                // Wait a bit to ensure the dropdown is fully rendered
                await selector.waitFor({ state: 'visible', timeout: 2000 });
                await selector.click({ timeout: 3000 });
                console.log(`Successfully selected ${location.name} from custom dropdown`);
                await this.wait(500); // Wait for selection to register
                return true;
              }
            } catch (error) {
              console.warn(`Option selector failed for ${location.name}: ${error}`);
            }
          }
        }
      }

      console.warn('Custom dropdown was opened but no suitable option could be selected');
      return false;
      
    } catch (error) {
      console.warn(`Custom dropdown selection failed: ${error}`);
      return false;
    }
  }

  /**
   * Try to select using the direct #province selector (works for standard select dropdowns)
   * This handles both Province and State fields that use the #province ID
   */
  private async selectUsingDirectSelector(locationData: { alberta?: string, alaska?: string, alabama?: string }): Promise<boolean> {
    try {
      const dropdown = this.page.locator('#province');
      if (await dropdown.count() > 0) {
        console.log('Found #province dropdown, checking available options and attempting selection');
        
        // Get all available options to see what's actually available on this page
        const options = await dropdown.locator('option').allTextContents();
        console.log('Available options:', options);
        
        // Try all location values that are provided, in order of preference
        const locationsToTry = [
          { value: 'Alberta', provided: locationData.alberta },
          { value: 'Alabama', provided: locationData.alabama },
          { value: 'Alaska', provided: locationData.alaska }
        ];
        
        for (const location of locationsToTry) {
          if (location.provided) {
            try {
              // Check if this option exists in the dropdown
              const optionExists = options.some(option => 
                option.trim().toLowerCase() === location.value.toLowerCase()
              );
              
              if (optionExists) {
                await dropdown.selectOption(location.value);
                console.log(`Successfully selected ${location.value} using #province selector`);
                return true;
              } else {
                console.log(`Option ${location.value} not available in this dropdown`);
              }
            } catch (error) {
              console.warn(`Could not select ${location.value}: ${error}`);
            }
          }
        }
        
        console.warn('No suitable location option found in #province dropdown');
      }
    } catch (error) {
      console.warn(`Direct #province selector approach failed: ${error}`);
    }
    return false;
  }

  /**
   * Select province using role-based selector and paragraph filter
   */
  private async selectProvince(province: string): Promise<boolean> {
    try {
      const provinceDropdown = this.page.getByRole('textbox', { name: 'Province' });
      if (await provinceDropdown.count() > 0) {
        console.log(`Attempting to select province: ${province}`);
        await provinceDropdown.click();
        await this.wait(1000); // Wait for dropdown to open
        
        // Use the specific paragraph filter approach you provided
        const albertaOption = this.page.getByRole('paragraph').filter({ hasText: 'Alberta' });
        if (await albertaOption.count() > 0) {
          await albertaOption.click();
          console.log(`Successfully selected province: ${province}`);
          return true;
        } else {
          console.warn(`Province paragraph option not found: ${province}`);
        }
      }
    } catch (error) {
      console.warn(`Province selection failed: ${error}`);
    }
    return false;
  }

  /**
   * Select state using multiple approaches
   * This handles both Province and State fields with various UI implementations
   */
  private async selectState(state: string): Promise<boolean> {
    // All possible states/provinces to try based on what's in locationData
    const locationsToTry = ['Alberta', 'Alabama', 'Alaska'];
    
    // First try standard <select> dropdown with #province id (covers both Province and State fields)
    try {
      const selectDropdown = this.page.locator('#province');
      if (await selectDropdown.count() > 0) {
        console.log('Trying standard <select> dropdown with #province id');
        
        for (const locationOption of locationsToTry) {
          try {
            if (await selectDropdown.locator(`option[value="${locationOption}"]`).count() > 0) {
              await selectDropdown.selectOption(locationOption);
              console.log(`Successfully selected ${locationOption} via <select> dropdown`);
              return true;
            }
          } catch (error) {
            console.warn(`Could not select ${locationOption} via <select>: ${error}`);
          }
        }
      }
    } catch (error) {
      console.warn(`Standard <select> dropdown not available: ${error}`);
    }

    // Then try role-based textbox approach for "State" field
    try {
      const stateDropdown = this.page.getByRole('textbox', { name: 'State' });
      if (await stateDropdown.count() > 0) {
        console.log(`Attempting to select via role-based State textbox`);
        await stateDropdown.click();
        await this.wait(1000); // Wait for dropdown to open
        
        // Try to find any of our location options
        for (const locationOption of locationsToTry) {
          const optionLocators = [
            this.page.getByText(locationOption, { exact: true }),
            this.page.locator(`text=${locationOption}`),
            this.page.locator(`[role="option"]:has-text("${locationOption}")`),
            this.page.locator(`li:has-text("${locationOption}")`)
          ];

          for (const optionLocator of optionLocators) {
            try {
              if (await optionLocator.count() > 0) {
                await optionLocator.first().click();
                console.log(`Successfully selected ${locationOption} via role-based State field`);
                return true;
              }
            } catch (error) {
              console.warn(`Option locator failed for ${locationOption}: ${error}`);
            }
          }
        }
        
        console.warn(`State dropdown opened but could not find any suitable location option`);
      }
    } catch (error) {
      console.warn(`Role-based state selection failed: ${error}`);
    }
    
    return false;
  }

  /**
   * Click the next day in the datepicker
   */
  private async selectDateIfAvailable(): Promise<void> {
    try {
      await this.datepicker.waitFor({ state: 'visible', timeout: 5000 });

      if (await this.datepicker.isVisible()) {
        await this.datepicker.click();
        console.log('Clicked the datepicker element');
      } else {
        console.log('Datepicker is not visible, skipping this step.');
      }
    } catch (error) {
      console.log('Datepicker did not appear within the timeout, skipping this step.');
    }
  }

  /**
   * Click the continue button to proceed to the next step
   */
  private async proceedToNextStep(): Promise<void> {
    await this.continueButton.scrollIntoViewIfNeeded();
    await this.continueButton.click();
    await this.wait(2000);
  }
}