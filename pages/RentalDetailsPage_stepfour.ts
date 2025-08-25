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
   * Fill out the rental details form - CRITICAL STEP that must succeed
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
    console.log('Filling rental details form - CRITICAL STEP');
    
    try {
      // Wait for summary heading to be visible with longer timeout
      await this.summaryHeading.waitFor({ state: 'visible', timeout: 15000 });
      await this.summaryHeading.click();
      await this.wait(1000);

      console.log('✓ Summary heading found and clicked');

      // Fill required fields with proper error handling
      await this.fillCriticalField(this.firstNameInput, userData.firstName, 'First Name');
      await this.fillCriticalField(this.lastNameInput, userData.lastName, 'Last Name');
      await this.fillCriticalField(this.emailInput, userData.email, 'Email');
      await this.fillCriticalField(this.phoneInput, userData.phone, 'Phone');
      await this.fillCriticalField(this.addressInput, userData.address, 'Address');
      await this.fillCriticalField(this.cityInput, userData.city, 'City');

      await this.selectStateOptimized(userData.province);
      await this.fillZipCode(userData.zipCode);
      await this.selectDateIfAvailable();
      await this.proceedToNextStep();
      
      console.log('✓ Rental details form completed successfully');
    } catch (error) {
      const errorMsg = `CRITICAL ERROR: Failed to fill rental details form - ${(error as Error).message}`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
  }

  /**
   * Fill a critical field that must exist and be fillable
   */
  private async fillCriticalField(locator: any, value: string, fieldName: string): Promise<void> {
    try {
      await locator.waitFor({ state: 'visible', timeout: 10000 });
      await locator.fill(value);
      console.log(`✓ Filled ${fieldName}: ${value}`);
    } catch (error) {
      const errorMsg = `CRITICAL ERROR: Could not fill ${fieldName} field - ${(error as Error).message}`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
  }

  /**
   * Fill zip code with enhanced error handling - CRITICAL FIELD
   */
  private async fillZipCode(zipCode: string): Promise<void> {
    console.log(`Attempting to fill zip code: ${zipCode}`);
    
    try {
      // Wait for zip code input to be available
      await this.zipCodeInput.waitFor({ state: 'visible', timeout: 10000 });
      
      // First try to click the zip code input to ensure it's focused
      await this.zipCodeInput.click({ timeout: 5000 });
      await this.wait(500);
      
      // Then fill the zip code
      await this.zipCodeInput.fill(zipCode, { timeout: 5000 });
      console.log(`✓ Successfully filled zip code: ${zipCode}`);
    } catch (error) {
      console.warn(`Primary zip code method failed: ${error}`);
      
      // Try alternative approaches if the main one fails
      try {
        const zipByPlaceholder = this.page.getByPlaceholder(/Zip|Postal/i);
        await zipByPlaceholder.waitFor({ state: 'visible', timeout: 5000 });
        await zipByPlaceholder.first().click();
        await zipByPlaceholder.first().fill(zipCode);
        console.log(`✓ Successfully filled zip code using placeholder approach: ${zipCode}`);
      } catch (fallbackError) {
        const errorMsg = `CRITICAL ERROR: Unable to fill zip code field with value: ${zipCode} - ${(fallbackError as Error).message}`;
        console.error(errorMsg);
        throw new Error(errorMsg);
      }
    }
  }

  /**
   * OPTIMIZED State Selection - Fast and Simple with Fallback Priority
   * Handles both standard select dropdowns and mini-mall special case
   * Priority: Alabama → Alberta → Alaska
   */
  private async selectStateOptimized(locationData: { alberta?: string, alaska?: string, alabama?: string }): Promise<void> {
    console.log('Attempting to select state - OPTIMIZED APPROACH');
    
    // Define priority order for state selection
    const stateOptions = [
      { value: locationData.alabama, name: 'Alabama' },
      { value: locationData.alberta, name: 'Alberta' },  
      { value: locationData.alaska, name: 'Alaska' }
    ].filter(option => option.value); // Only include provided options

    if (stateOptions.length === 0) {
      throw new Error('No state value provided');
    }

    // FIRST: Try the fast standard approach (works for 99% of cases)
    try {
      const provinceSelect = this.page.locator('#province');
      if (await provinceSelect.isVisible({ timeout: 3000 })) {
        
        // Try each state option in priority order
        for (const option of stateOptions) {
          try {
            await provinceSelect.selectOption(option.value!);
            console.log(`✓ Successfully selected ${option.name} using standard select`);
            return;
          } catch (selectError) {
            console.log(`Could not select ${option.name}, trying next option...`);
            continue;
          }
        }
        
        console.log('Standard select dropdown found but no suitable option could be selected');
      }
    } catch (error) {
      console.log(`Standard select method not available: ${error}`);
    }

    // SECOND: Handle mini-mall special case (State textbox + paragraph click)
    try {
      const stateTextbox = this.page.getByRole('textbox', { name: 'State' });
      if (await stateTextbox.isVisible({ timeout: 3000 })) {
        await stateTextbox.click();
        await this.wait(1000); // Wait for dropdown to open
        
        // Try each state option in priority order
        for (const option of stateOptions) {
          try {
            const stateParagraph = this.page.getByRole('paragraph').filter({ hasText: option.name });
            await stateParagraph.waitFor({ state: 'visible', timeout: 3000 });
            await stateParagraph.click();
            console.log(`✓ Successfully selected ${option.name} using textbox + paragraph method`);
            return;
          } catch (selectError) {
            console.log(`Could not select ${option.name} via paragraph, trying next option...`);
            continue;
          }
        }
        
        console.log('Textbox dropdown found but no suitable option could be selected');
      }
    } catch (error) {
      console.log(`Textbox + paragraph method not available: ${error}`);
    }

    // If both methods fail with all options, throw error
    const attemptedStates = stateOptions.map(o => o.name).join(', ');
    throw new Error(`Could not select any state (${attemptedStates}) using any available method`);
  }

  /**
   * Click the next day in the datepicker
   */
  private async selectDateIfAvailable(): Promise<void> {
    try {
      await this.datepicker.waitFor({ state: 'visible', timeout: 5000 });

      if (await this.datepicker.isVisible()) {
        await this.datepicker.click();
        console.log('✓ Clicked the datepicker element');
      } else {
        console.log('- Datepicker is not visible, skipping this step.');
      }
    } catch (error) {
      console.log('- Datepicker did not appear within the timeout, skipping this step.');
    }
  }

  /**
   * Click the continue button to proceed to the next step - CRITICAL STEP
   */
  private async proceedToNextStep(): Promise<void> {
    console.log('Attempting to proceed to next step - CRITICAL STEP');
    
    try {
      await this.continueButton.waitFor({ state: 'visible', timeout: 10000 });
      await this.continueButton.scrollIntoViewIfNeeded();
      await this.continueButton.click();
      await this.wait(3000); // Wait longer for navigation
      console.log('✓ Successfully clicked continue button');
    } catch (error) {
      const errorMsg = `CRITICAL ERROR: Could not find or click continue button - ${(error as Error).message}`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
  }
}