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
  private get zipCodeInput() { return this.page.getByPlaceholder(/Zip Code|Postal Code|ZIP/); }
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
    province: string | string[],
    zipCode: string
  }): Promise<void> {
    await this.summaryHeading.click();
    await this.wait(1000); // Ensure form is visible
    
    await this.firstNameInput.fill(userData.firstName, { timeout: 5000 });
    await this.lastNameInput.fill(userData.lastName, { timeout: 5000 });
    await this.emailInput.fill(userData.email);
    await this.phoneInput.fill(userData.phone);
    await this.addressInput.fill(userData.address);
    await this.cityInput.fill(userData.city);
    
    // Handle dynamic province selection
    await this.selectAvailableProvince(userData.province);
    
    await this.zipCodeInput.fill(userData.zipCode);
    
    await this.selectDateIfAvailable();
    await this.proceedToNextStep();
  }

  /**
   * Select the first available province from the provided options
   */
  private async selectAvailableProvince(province: string | string[]): Promise<void> {
    const provinces = Array.isArray(province) ? province : [province];

    for (const prov of provinces) {
      try {
        const selectDropdown = this.page.locator('#province');
        if (await selectDropdown.count() > 0 && await selectDropdown.locator(`option[value="${prov}"]`).count() > 0) {
          await selectDropdown.selectOption(prov);
          console.log(`Selected province via <select>: ${prov}`);
          return;
        }
      } catch (error) {
        console.warn(`Standard <select> dropdown not usable: ${error}`);
      }

      try {
        const placeholderDropdown = this.page.getByPlaceholder('Province');
        if (await placeholderDropdown.count() > 0) {
          await placeholderDropdown.click();
          const optionLocator = this.page.locator('p', { hasText: prov });
          await optionLocator.first().click();
          console.log(`Selected province via custom dropdown: ${prov}`);
          return;
        }
      } catch (clickError) {
        console.warn(`Clickable dropdown failed for province "${prov}": ${clickError}`);
      }
    }

    console.warn(`None of the provinces [${provinces.join(', ')}] were available to select.`);
  }

  /**
   * Try to select today's date if the datepicker is available
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
    await this.wait(2000); // Wait for payment step to load
  }
}
