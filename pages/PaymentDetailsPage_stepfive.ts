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
        console.log('Error in lease details section, continuing with test:', (error as Error).message);
    }
  }

  /**
   * Fill out the payment details - CRITICAL STEP that must succeed
   */
  async fillPaymentDetails(paymentData: {
    cardNumber: string,
    expiryDate: string,
    cvv: string
  }): Promise<void> {
    console.log('Filling payment details - CRITICAL STEP');
    
    try {
      // Wait for payment form to be visible with longer timeout
      await this.cardNumberInput.waitFor({ state: 'visible', timeout: 10000 });
      
      await this.cardNumberInput.type(paymentData.cardNumber, { delay: 400 });
      await this.wait(500);
      await this.page.keyboard.press('Tab');
      
      await this.cardExpiryInput.type(paymentData.expiryDate, { delay: 400 });
      await this.wait(500);
      await this.page.keyboard.press('Tab');
      
      await this.cardCvvInput.type(paymentData.cvv, { delay: 400 });
      await this.wait(500);
      await this.page.keyboard.press('Tab');
      
      console.log('✓ Payment details filled successfully');
    } catch (error) {
      const errorMsg = `CRITICAL ERROR: Failed to fill payment details - ${(error as Error).message}`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
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
        if (await checkbox.isVisible({ timeout: 3000 })) {
          await checkbox.check();
          console.log(`✓ Checked: ${label}`);
        } else {
          console.log(`- ${label} checkbox not visible, skipping`);
        }
      } catch (error) {
        console.log(`- ${label} checkbox not found, skipping`);
      }
    }
  }

  /**
   * ROBUST ERROR DETECTION - Submit payment and capture errors reliably
   * Returns the error message if any, with multiple fallback strategies
   */
  //==================
  async submitPaymentAndCheckError(): Promise<string> {
    console.log('Attempting to submit payment - CRITICAL STEP');
    
    try {
      await this.minimizeLiveChat();
      
      // Wait for rent now button to be visible and clickable
      await this.rentNowButton.waitFor({ state: 'visible', timeout: 10000 });
      await this.rentNowButton.click({ timeout: 30000 });
      
      console.log('✓ Rent Now button clicked successfully');
      
      // ROBUST ERROR DETECTION with multiple strategies
      return await this.detectErrorMessage();
      
    } catch (error) {
      const errorMsg = `CRITICAL ERROR: Failed to submit payment or find rent now button - ${(error as Error).message}`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
  }
  /**
   * ROBUST ERROR DETECTION METHOD
   * Uses multiple strategies to detect errors that might appear at different speeds
   */
  private async detectErrorMessage(): Promise<string> {
    console.log('Starting robust error detection...');
    
    // Strategy 1: Quick check first (for fast-appearing errors)
    let errorMessage = await this.quickErrorCheck();
    if (errorMessage) {
      console.log('✓ Error detected via quick check');
      return errorMessage;
    }

    // Strategy 2: Medium wait with polling (for normal speed errors)
    errorMessage = await this.pollingErrorCheck();
    if (errorMessage) {
      console.log('✓ Error detected via polling check');
      return errorMessage;
    }

    // Strategy 3: Extended wait (for slow-appearing errors)
    errorMessage = await this.extendedErrorCheck();
    if (errorMessage) {
      console.log('✓ Error detected via extended check');
      return errorMessage;
    }

    console.log('ℹ️  No error messages detected - payment may have succeeded');
    return 'No error - Payment may have succeeded';
  }

  /**
   * Quick error check - detects fast-appearing errors
   */
  private async quickErrorCheck(): Promise<string> {
    try {
      await this.wait(2000); // Wait 2 seconds

      // Check for toast header
      const toastHeader = this.page.getByText('Error!!');
      if (await toastHeader.isVisible({ timeout: 1000 })) {
        const toastBody = this.page.locator('.toast-container .toast-body');
        if (await toastBody.isVisible({ timeout: 2000 })) {
          const message = await toastBody.innerText();
          if (message.trim()) return message.trim();
        }
      }

      // Check for detailed error
      const detailedError = this.page.locator('p.text-sm.text-white').filter({ hasText: 'Response Code' });
      if (await detailedError.isVisible({ timeout: 1000 })) {
        const message = await detailedError.innerText();
        if (message.trim()) return message.trim();
      }

      return '';
    } catch (error) {
      return '';
    }
  }

  /**
   * Polling error check - checks every second for up to 8 seconds
   */
  private async pollingErrorCheck(): Promise<string> {
    console.log('Starting polling error detection...');
    
    for (let i = 0; i < 8; i++) {
      try {
        await this.wait(1000); // Wait 1 second between checks
        
        // Check toast container and body
        const toastContainer = this.page.locator('.toast-container');
        const toastBody = toastContainer.locator('.toast-body');
        
        if (await toastContainer.isVisible({ timeout: 500 }) && await toastBody.isVisible({ timeout: 500 })) {
          const message = await toastBody.innerText();
          if (message.trim()) {
            console.log(`Found toast error at polling attempt ${i + 1}`);
            return message.trim();
          }
        }

        // Check detailed error
        const detailedError = this.page.locator('p.text-sm.text-white').filter({ hasText: 'Response Code' });
        if (await detailedError.isVisible({ timeout: 500 })) {
          const message = await detailedError.innerText();
          if (message.trim()) {
            console.log(`Found detailed error at polling attempt ${i + 1}`);
            return message.trim();
          }
        }

        // Also check for any visible error text on the page
        const genericErrors = this.page.locator('text=/error|Error|ERROR|failed|Failed|FAILED/i').first();
        if (await genericErrors.isVisible({ timeout: 500 })) {
          const message = await genericErrors.innerText();
          if (message.trim() && message.length < 200) { // Avoid capturing too much text
            console.log(`Found generic error at polling attempt ${i + 1}`);
            return message.trim();
          }
        }

      } catch (error) {
        // Continue polling even if individual checks fail
        continue;
      }
    }
    
    return '';
  }

  /**
   * Extended error check - waits longer for slow-appearing errors
   */
  private async extendedErrorCheck(): Promise<string> {
    console.log('Starting extended error detection...');
    
    try {
      // Wait longer and then do a comprehensive check
      await this.wait(5000);

      // Try all possible error locations with longer timeouts
      const errorSelectors = [
        { selector: '.toast-container .toast-body', name: 'toast body' },
        { selector: 'p.text-sm.text-white', name: 'detailed error' },
        { selector: '.alert-danger', name: 'alert danger' },
        { selector: '.error-message', name: 'error message' },
        { selector: '[class*="error"]', name: 'error class' },
        { selector: 'text=/Response Code/i', name: 'response code' }
      ];

      for (const { selector, name } of errorSelectors) {
        try {
          const element = this.page.locator(selector).first();
          if (await element.isVisible({ timeout: 3000 })) {
            const message = await element.innerText();
            if (message.trim()) {
              console.log(`Found error via extended check (${name})`);
              return message.trim();
            }
          }
        } catch (error) {
          continue;
        }
      }

      return '';
    } catch (error) {
      return '';
    }
  }
}