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
  private get addressInput() { return this.page.getByPlaceholder('Address', { exact: true }); }
  private get cityInput() { return this.page.getByPlaceholder('City'); }
  private get provinceSelect() { return this.page.locator('#province'); }
  private get zipCodeInput() { return this.page.getByPlaceholder(/Zip Code|Postal Code/); }
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
    province: string,
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
    await this.provinceSelect.selectOption([userData.province, 'Alberta']);
    await this.zipCodeInput.fill(userData.zipCode);
    
    await this.selectDateIfAvailable();
    await this.proceedToNextStep();
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