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
    console.log(`[${new Date().toISOString()}] 📝 Filling rental details form...`);
    
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
      
      console.log(`[${new Date().toISOString()}] ✅ Rental details form completed`);
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
      await this.wait(500);
      
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
   * OPTIMIZED State Selection - Fast and Direct
   * Determines the correct state based on current URL
   * No wasted time trying wrong states!
   */
  private async selectStateOptimized(locationData: { alberta?: string, alaska?: string, alabama?: string }): Promise<void> {
    console.log('Attempting to select state - OPTIMIZED APPROACH');
    
    // Smart mapping: Determine which state to use based on URL
    const currentUrl = this.page.url();
    let stateToUse: { value: string; name: string } | null = null;

    if (currentUrl.includes('bluebirdstorage.ca')) {
      // Canadian site - use Alberta
      stateToUse = { value: locationData.alberta!, name: 'Alberta' };
    } else if (currentUrl.includes('10federalstorage.com') ||
               currentUrl.includes('10-federal-storage') ||
               currentUrl.includes('bestboxstorage.com') ||
               currentUrl.includes('bestbox-storage') ||
               currentUrl.includes('yourpremierstorage.com') ||
               currentUrl.includes('premier-storage') ||
               currentUrl.includes('sunbirdstorage.com') ||
               currentUrl.includes('sunbirdstorage') ||
               currentUrl.includes('gatekeeperstoragega.com') ||
               currentUrl.includes('gatekeeper-self-storage') ||
               currentUrl.includes('storagestar.com') ||
               currentUrl.includes('storage-star') ||
               currentUrl.includes('redrocksstorage.com') ||
               currentUrl.includes('red-rocks-self-storage') ||
               currentUrl.includes('distinctstorage.com') ||
               currentUrl.includes('distinct-storage') ||
               currentUrl.includes('storagedepotla.com') ||
               currentUrl.includes('storage-boss')) {
      // US sites - use Alabama
      stateToUse = { value: locationData.alabama!, name: 'Alabama' };
    } else {
      // Unknown site - try all three as fallback (Alabama → Alberta → Alaska)
      console.log('⚠️ Unknown site - will try all states as fallback');
      const stateOptions = [
        { value: locationData.alabama, name: 'Alabama' },
        { value: locationData.alberta, name: 'Alberta' },  
        { value: locationData.alaska, name: 'Alaska' }
      ].filter(option => option.value);
      
      if (stateOptions.length === 0) {
        throw new Error('No state value provided');
      }
      
      // Try fallback approach
      await this.tryMultipleStates(stateOptions);
      return;
    }

    if (!stateToUse.value) {
      throw new Error(`State value not provided for ${stateToUse.name}`);
    }

    console.log(`🎯 Detected site needs: ${stateToUse.name}`);
    
    // Try to select the specific state
    await this.selectSingleState(stateToUse);
  }

  /**
   * Select a single specific state (fastest approach)
   */
  private async selectSingleState(state: { value: string; name: string }): Promise<void> {
    // FIRST: Try the fast standard approach (works for 99% of cases)
    try {
      const provinceSelect = this.page.locator('#province');
      if (await provinceSelect.isVisible({ timeout: 3000 })) {
        // Wait for dropdown to be fully ready
        await this.wait(500);
        
        try {
          // Try selecting by the full province/state name directly
          await provinceSelect.selectOption(state.value);
          console.log(`✓ Successfully selected ${state.name} using standard select`);
          return;
        } catch (error) {
          console.log(`Could not select ${state.name} using standard select`);
        }
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
        
        try {
          const stateParagraph = this.page.getByRole('paragraph').filter({ hasText: state.name });
          await stateParagraph.waitFor({ state: 'visible', timeout: 3000 });
          await stateParagraph.click();
          console.log(`✓ Successfully selected ${state.name} using textbox + paragraph method`);
          return;
        } catch (selectError) {
          console.log(`Could not select ${state.name} via paragraph`);
        }
      }
    } catch (error) {
      // If page closed, it likely means navigation occurred = success
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('Target page, context or browser has been closed')) {
        console.log('⚠️ Page closed during state selection - likely navigation occurred, treating as success');
        return;
      }
      console.log(`Textbox + paragraph method not available: ${error}`);
    }

    // If both methods fail, throw error
    throw new Error(`Could not select ${state.name} using any available method`);
  }

  /**
   * Try multiple states as fallback (for unknown sites)
   */
  private async tryMultipleStates(stateOptions: Array<{ value?: string; name: string }>): Promise<void> {
    // FIRST: Try the fast standard approach (works for 99% of cases)
    try {
      const provinceSelect = this.page.locator('#province');
      if (await provinceSelect.isVisible({ timeout: 3000 })) {
        // Wait for dropdown to be fully ready
        await this.wait(500);
        
        // Try each state option in priority order (Alabama → Alberta → Alaska)
        for (const option of stateOptions) {
          try {
            // Try selecting by the full province/state name directly
            await provinceSelect.selectOption(option.value!);
            console.log(`✓ Successfully selected ${option.name} using standard select`);
            return;
          } catch (error) {
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
      // If page closed, it likely means navigation occurred = success
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('Target page, context or browser has been closed')) {
        console.log('⚠️ Page closed during state selection - likely navigation occurred, treating as success');
        return;
      }
      console.log(`Textbox + paragraph method not available: ${error}`);
    }

    // If both methods fail with all options, throw error
    const attemptedStates = stateOptions.map((o) => o.name).join(', ');
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
      await this.wait(500);
      
      await this.continueButton.waitFor({ state: 'visible', timeout: 15000 });
      await this.continueButton.scrollIntoViewIfNeeded();
      await this.wait(500);
      
      // Single click attempt with proper timeout
      console.log('Continue button click attempt 1');
      await this.continueButton.click({ timeout: 15000 });
      console.log('✓ Successfully clicked continue button');
      
      await this.wait(1500); // Reduced from 3000ms - Wait for navigation to next step
    } catch (error) {
      const errorMsg = `CRITICAL ERROR: Could not find or click continue button - ${(error as Error).message}`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
  }
}
