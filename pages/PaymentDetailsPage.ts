// pages/PaymentDetailsPage.ts

import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class PaymentDetailsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Locators
  private get leaseDetailsHeader() { return this.page.getByRole('heading', { name: /lease details/i }); }
  private get alternatePhoneInput() { return this.page.getByPlaceholder('Alternate Phone Number (must'); }
  private get alternateEmailInput() { return this.page.getByPlaceholder('Alternate Email Address (must'); }
  private get driversLicenseInput() { return this.page.getByPlaceholder('Driver License #'); }
  private get driversLicenseStateSelect() { return this.page.locator('#drivers_license_state'); }
  private get birthMonthSelect() { return this.page.locator('#drivers_birth_month'); }
  private get birthDateSelect() { return this.page.locator('#drivers_birth_date'); }
  private get birthYearInput() { return this.page.getByPlaceholder('Birth Year'); }

  private get cardNumberInput() { return this.page.getByPlaceholder('Card Number'); }
  private get cardExpiryInput() { return this.page.getByPlaceholder('MM / YY'); }
  private get cardCvvInput() { return this.page.getByPlaceholder('CVV'); }

  private get rentNowButton() { return this.page.getByRole('button', { name: 'RENT NOW' }); }
  private get toastContainer() { return this.page.locator('.toast-container'); }
  private get toastBody() { return this.toastContainer.locator('.toast-body'); }
  private get toastHeader() { return this.page.getByText('Error!!'); }
  private get detailedErrorContainer() { return this.page.locator('p.text-sm.text-white'); }

  /**
   * Helper method to safely fill a field if it exists and is visible
   */
  private async fillFieldIfExists(locator: any, value: string, fieldName: string): Promise<void> {
    try {
      if (await locator.isVisible({ timeout: 2000 })) {
        await locator.fill(value);
        console.log(`✓ Filled ${fieldName}: ${value}`);
      } else {
        console.log(`- ${fieldName} field not visible, skipping`);
      }
    } catch (error) {
      console.log(`- ${fieldName} field not found, skipping`);
    }
  }

  /**
   * Helper method to safely select an option if the select element exists and is visible
   */
  private async selectOptionIfExists(locator: any, value: string, fieldName: string): Promise<void> {
    try {
      if (await locator.isVisible({ timeout: 2000 })) {
        await locator.selectOption(value);
        console.log(`✓ Selected ${fieldName}: ${value}`);
      } else {
        console.log(`- ${fieldName} select not visible, skipping`);
      }
    } catch (error) {
      console.log(`- ${fieldName} select not found, skipping`);
    }
  }

  /**
   * Fill out the lease section if available
   */
  async fillLeaseDetailsIfAvailable(userData: {
    alternatePhone?: string,
    alternateEmail?: string,
    driversLicense?: string,
    driversLicenseState?: string,
    birthMonth?: string,
    birthDate?: string,
    birthYear?: string
  }): Promise<void> {
    try {
      if (await this.leaseDetailsHeader.isVisible({ timeout: 5000 })) {
        console.log('Lease Details section found, filling available fields...');
        await this.leaseDetailsHeader.click();
        
        // Wait a moment for the section to expand
        await this.page.waitForTimeout(1000);

        // Fill each field only if it exists and the data is provided
        if (userData.alternatePhone) {
          await this.fillFieldIfExists(this.alternatePhoneInput, userData.alternatePhone, 'Alternate Phone');
        }

        if (userData.alternateEmail) {
          await this.fillFieldIfExists(this.alternateEmailInput, userData.alternateEmail, 'Alternate Email');
        }

        if (userData.driversLicense) {
          await this.fillFieldIfExists(this.driversLicenseInput, userData.driversLicense, 'Driver License');
        }

        if (userData.driversLicenseState) {
          await this.selectOptionIfExists(this.driversLicenseStateSelect, userData.driversLicenseState, 'Driver License State');
        }

        if (userData.birthMonth) {
          await this.selectOptionIfExists(this.birthMonthSelect, userData.birthMonth, 'Birth Month');
        }

        if (userData.birthDate) {
          await this.selectOptionIfExists(this.birthDateSelect, userData.birthDate, 'Birth Date');
        }

        if (userData.birthYear) {
          await this.fillFieldIfExists(this.birthYearInput, userData.birthYear, 'Birth Year');
        }

        console.log('✓ Lease Details form filling completed');
      } else {
        console.log('Lease Details section not found, skipping');
      }
    } catch (error) {
      console.log('Error in lease details section, continuing with test:', error.message);
    }
  }

  /**
   * Fill out the payment details
   */
  async fillPaymentDetails(paymentData: {
    cardNumber: string,
    expiryDate: string,
    cvv: string
  }): Promise<void> {
    await this.cardNumberInput.type(paymentData.cardNumber, { delay: 400 });
    await this.wait(500);
    await this.page.keyboard.press('Tab');
    await this.cardExpiryInput.type(paymentData.expiryDate, { delay: 400 });
    await this.wait(500);
    await this.page.keyboard.press('Tab');
    await this.cardCvvInput.type(paymentData.cvv, { delay: 400 });
    await this.wait(500);
    await this.page.keyboard.press('Tab');
  }

  /**
   * Check agreement checkboxes if available
   */
  async checkAgreementCheckboxes(): Promise<void> {
    const checkboxes = [
      'I agree to the lease terms',
      'I agree to the protection',
      'I agree to the auto pay terms'
    ];

    for (const label of checkboxes) {
      try {
        const checkbox = this.page.getByLabel(label);
        if (await checkbox.isVisible()) {
          await checkbox.check();
        }
      } catch (error) {
        console.log(`${label} checkbox not found`);
      }
    }
  }

  /**
   * Submit the payment and check for errors
   * Returns the error message if any
   */
  async submitPaymentAndCheckError(): Promise<string> {
    await this.minimizeLiveChat();
    await this.rentNowButton.click({ timeout: 30000 });
    await this.wait(2000);

    let toastError = '';
    let detailedError = '';

    try {
      await this.toastHeader.waitFor({ state: 'visible', timeout: 10000 });
    } catch (e) {
      console.warn('Toast header not found, continuing...');
    }

    try {
      await this.toastContainer.waitFor({ state: 'visible', timeout: 5000 });
      await this.toastBody.waitFor({ state: 'visible', timeout: 5000 });
      toastError = await this.toastBody.innerText();
    } catch (e) {
      console.warn('Standard toast not found.');
    }

    try {
      const visibleDetailedError = this.detailedErrorContainer.filter({ hasText: 'Response Code' });
      if (await visibleDetailedError.isVisible()) {
        detailedError = await visibleDetailedError.innerText();
      }
    } catch (e) {
      console.warn('Detailed error message not found.');
    }

    const finalError = detailedError || toastError;
    console.log('Toast Message:', finalError);
    return finalError;
  }
}