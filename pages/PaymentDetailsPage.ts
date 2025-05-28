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

  /**
   * Fill out the lease section if available
   */
  async fillLeaseDetailsIfAvailable(userData: {
    alternatePhone: string,
    alternateEmail: string,
    driversLicense: string,
    driversLicenseState: string,
    birthMonth: string,
    birthDate: string,
    birthYear: string
  }): Promise<void> {
    try {
      if (await this.leaseDetailsHeader.isVisible()) {
        await this.leaseDetailsHeader.click();
        await this.alternatePhoneInput.fill(userData.alternatePhone);
        await this.alternateEmailInput.fill(userData.alternateEmail);
        await this.driversLicenseInput.fill(userData.driversLicense);
        await this.driversLicenseStateSelect.selectOption(userData.driversLicenseState);
        await this.birthMonthSelect.selectOption(userData.birthMonth);
        await this.birthDateSelect.selectOption(userData.birthDate);
        await this.birthYearInput.fill(userData.birthYear);
      }
    } catch (error) {
      console.log('Lease Details section not found. Skipping form fill.');
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
    await this.rentNowButton.click();
    await this.wait(2000);
    
    try {
      await this.toastHeader.waitFor({ state: 'visible', timeout: 10000 });
    } catch (e) {
      console.warn('Toast header not found, continuing...');
    }

    await this.toastContainer.waitFor({ state: 'visible', timeout: 5000 });
    await this.toastBody.waitFor({ state: 'visible', timeout: 5000 });

    const errorMessage = await this.toastBody.innerText();
    console.log('Toast Message:', errorMessage);
    return errorMessage;
  }
}