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
    console.log(`[${new Date().toISOString()}] 💳 Filling payment details...`);
    
    try {
      // Wait for payment form to be visible with longer timeout
      await this.cardNumberInput.waitFor({ state: 'visible', timeout: 10000 });
      await this.cardNumberInput.fill(paymentData.cardNumber);
      await this.page.keyboard.press('Tab');
      
      await this.cardExpiryInput.fill(paymentData.expiryDate);
      await this.page.keyboard.press('Tab');
      
      await this.cardCvvInput.fill(paymentData.cvv);
      await this.page.keyboard.press('Tab');
      
      console.log(`[${new Date().toISOString()}] ✅ Payment details filled`);
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
   * 
   * BULLETPROOF RETRY LOGIC:
   * 1. Click RENT NOW → Detect error (polls up to 15s)
   * 2. If error found → return immediately ✅
   * 3. If NO error → Refill payment form + checkboxes → Click RENT NOW again → Re-detect
   * 4. Return error or FAILED message
   */
  //==================
  async submitPaymentAndCheckError(paymentData?: {
    cardNumber: string,
    expiryDate: string,
    cvv: string
  }): Promise<string> {
    console.log(`[${new Date().toISOString()}] 🔘 Clicking RENT NOW button...`);
    
    try {
      await this.minimizeLiveChat();

      // Set up network response listener BEFORE clicking RENT NOW
      // This captures the API error even if the toast doesn't display it
      let apiErrorMessage = '';
      const responseHandler = async (response: any) => {
        try {
          const url = response.url();
          const status = response.status();
          if (status >= 400 || (url.includes('/rent') || url.includes('/move-in') || url.includes('/payment') || url.includes('/checkout') || url.includes('/lease'))) {
            const body = await response.text().catch(() => '');
            if (body && (body.includes('error') || body.includes('Error') || body.includes('message') || status >= 400)) {
              try {
                const json = JSON.parse(body);
                const msg = json.message || json.error || json.msg || json.errors || json.detail || '';
                const extracted = typeof msg === 'string' ? msg : JSON.stringify(msg);
                if (extracted && extracted.length > 5) {
                  apiErrorMessage = extracted;
                  console.log(`🌐 API error captured from ${url}: ${apiErrorMessage.substring(0, 200)}`);
                }
              } catch {
                if (body.length < 500 && body.length > 5) {
                  apiErrorMessage = body;
                }
              }
            }
          }
        } catch { /* response already disposed */ }
      };
      this.page.on('response', responseHandler);
      
      // Find and click RENT NOW button (attempt 1)
      const rentNowButton = this.page.getByRole('button', { name: 'RENT NOW' });
      await rentNowButton.waitFor({ state: 'visible', timeout: 15000 });
      await rentNowButton.click({ timeout: 30000 });
      
      console.log(`[${new Date().toISOString()}] ✅ RENT NOW clicked - detecting errors...`);
      
      // Detect error immediately (polls up to 15s internally)
      let errorMessage = await this.detectErrorMessage();
      
      // If error found and meaningful, return it immediately
      if (errorMessage && !errorMessage.includes('FAILED to fetch') && !errorMessage.includes('toast body not captured')) {
        console.log(`[${new Date().toISOString()}] ✅ Error detected on first attempt - returning immediately`);
        this.page.removeListener('response', responseHandler);
        return errorMessage;
      }

      // If only generic toast was found but we have an API error, use the API error
      if ((errorMessage.includes('toast body not captured') || errorMessage === '') && apiErrorMessage) {
        console.log(`[${new Date().toISOString()}] ✅ Error captured via API response: ${apiErrorMessage}`);
        this.page.removeListener('response', responseHandler);
        return `Error Occurred — ${apiErrorMessage}`;
      }
      
      // No error detected after 15s polling - RETRY LOGIC
      console.log(`[${new Date().toISOString()}] ⚠️ No error detected on first attempt`);
      
      // Only retry if paymentData is provided
      if (!paymentData) {
        console.log(`[${new Date().toISOString()}] ℹ️ No payment data provided - cannot retry`);
        this.page.removeListener('response', responseHandler);
        return 'FAILED to fetch Error Message @ Step-5 (Payment Details - After RENT NOW click)';
      }
      
      console.log(`[${new Date().toISOString()}] 🔄 RETRY: Refilling payment form...`);
      
      // Wait 2 seconds before retry
      await this.wait(2000);
      
      // Refill payment details
      await this.fillPaymentDetails(paymentData);
      
      // Re-check agreement checkboxes
      await this.checkAgreementCheckboxes();
      
      console.log(`[${new Date().toISOString()}] ✅ Payment form refilled - clicking RENT NOW again...`);
      
      // Click RENT NOW again (attempt 2)
      await rentNowButton.waitFor({ state: 'visible', timeout: 15000 });
      await rentNowButton.click({ timeout: 30000 });
      
      console.log(`[${new Date().toISOString()}] ✅ RENT NOW clicked (retry) - re-detecting errors...`);
      
      // Re-detect error
      errorMessage = await this.detectErrorMessage();
      
      // Clean up listener
      this.page.removeListener('response', responseHandler);

      if (errorMessage && !errorMessage.includes('FAILED to fetch') && !errorMessage.includes('toast body not captured')) {
        console.log(`[${new Date().toISOString()}] ✅ Error detected on retry attempt`);
        return errorMessage;
      }

      // Fallback to API error if toast still didn't show the body
      if (apiErrorMessage) {
        console.log(`[${new Date().toISOString()}] ✅ Using API error fallback: ${apiErrorMessage}`);
        return `Error Occurred — ${apiErrorMessage}`;
      }
      
      // Still no error after retry
      console.log(`[${new Date().toISOString()}] ❌ Still no error after retry - this is unexpected`);
      return 'FAILED to fetch Error Message @ Step-5 (Payment Details - After RENT NOW click + Retry)';
      
    } catch (error) {
      const errorMsg = `CRITICAL ERROR: Failed to submit payment or find rent now button - ${(error as Error).message}`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
  }
  /**
   * ROBUST ERROR DETECTION METHOD - OPTIMIZED
   * Starts immediately after button click, polls actively for errors
   */
  private async detectErrorMessage(): Promise<string> {
    console.log('🔍 Starting error detection (OPTIMIZED)...');
    
    // IMMEDIATE first check (0ms delay)
    let errorMessage = await this.quickErrorCheck();
    if (errorMessage) {
      console.log('✓ Error detected immediately');
      return errorMessage;
    }

    // Active polling for 15 seconds (errors usually appear within 10s)
    errorMessage = await this.activePollingCheck();
    if (errorMessage) {
      console.log('✓ Error detected via polling');
      return errorMessage;
    }

    // If we reach here after clicking RENT NOW, we FAILED to fetch the error
    console.error('❌ No error message found after RENT NOW click - detection failed');
    return 'FAILED to fetch Error Message @ Step-5 (Payment Details - After RENT NOW click)';
  }

  /**
   * Quick error check - IMMEDIATE check (no delay)
   */
  private async quickErrorCheck(): Promise<string> {
    // CHECK 1: Toast body specifically (most reliable for full error message)
    const toastBodyLocators = [
      this.page.locator('.toast-container .toast-body').first(),
      this.page.locator('.toast-body').first(),
    ];
    for (const body of toastBodyLocators) {
      try {
        if (await body.isVisible({ timeout: 500 })) {
          const text = (await body.innerText()).trim();
          if (text && text.length > 0) {
            console.log(`🔍 Found toast body: "${text}"`);
            return text;
          }
        }
      } catch { /* not visible yet */ }
    }

    // CHECK 2: Detailed error with Response Code
    try {
      const detailedError = this.page.locator('p.text-sm.text-white').filter({ hasText: 'Response Code' });
      if (await detailedError.isVisible({ timeout: 500 })) {
        const text = (await detailedError.innerText()).trim();
        if (text) return text;
      }
    } catch { /* not visible */ }

    // CHECK 3: Full toast container text (fallback)
    const toastContainer = this.page.locator('.toast-container').first();
    if (await toastContainer.isVisible({ timeout: 500 })) {
      const toastText = (await toastContainer.innerText()).trim();
      if (toastText && !this.isGenericToastHeader(toastText)) {
        return toastText;
      }
    }
    
    // CHECK 4: Error!! header → try to get body
    const toastHeader = this.page.getByText('Error!!');
    if (await toastHeader.isVisible({ timeout: 500 })) {
      const toastBody = this.page.locator('.toast-container .toast-body');
      if (await toastBody.isVisible({ timeout: 500 })) {
        const message = await toastBody.innerText();
        if (message.trim()) {
          return message.trim();
        }
      }
    }

    return '';
  }

  /**
   * Check if the captured text is just a generic toast header without real error detail.
   */
  private isGenericToastHeader(text: string): boolean {
    const cleaned = text.replace(/[\n\r]+/g, ' ').replace(/\s+/g, ' ').toLowerCase().trim();
    const generic = ['error occurred', 'error occurred dismiss', 'error occurred — dismiss'];
    return generic.includes(cleaned);
  }

  /**
   * Active polling - check every 500ms for up to 15 seconds
   * Prioritises toast-body over container text to get the full error message.
   */
  private async activePollingCheck(): Promise<string> {
    console.log('📡 Active polling for errors...');
    let sawGenericHeader = false;
    
    for (let i = 0; i < 30; i++) { // 30 attempts x 500ms = 15 seconds
      try {
        await this.wait(500);
        
        // CHECK 1: Toast body specifically (highest priority)
        const toastBodyLocators = [
          this.page.locator('.toast-container .toast-body').first(),
          this.page.locator('.toast-body').first(),
        ];
        for (const body of toastBodyLocators) {
          try {
            if (await body.isVisible({ timeout: 300 })) {
              const text = (await body.innerText()).trim();
              if (text && text.length > 0) {
                console.log(`✓ Toast body found at poll ${i + 1}`);
                return text;
              }
            }
          } catch { /* not visible yet */ }
        }

        // CHECK 2: Detailed error (with Response Code)
        const detailedError = this.page.locator('p.text-sm.text-white').filter({ hasText: 'Response Code' });
        if (await detailedError.isVisible({ timeout: 300 })) {
          const message = await detailedError.innerText();
          if (message.trim()) {
            console.log(`✓ Detailed error found at poll ${i + 1}`);
            return message.trim();
          }
        }

        // CHECK 3: Full toast container (fallback)
        const toastContainer = this.page.locator('.toast-container').first();
        if (await toastContainer.isVisible({ timeout: 300 })) {
          const toastText = (await toastContainer.innerText()).trim();
          if (toastText && !this.isGenericToastHeader(toastText)) {
            console.log(`✓ Error found at poll ${i + 1}`);
            return toastText;
          }
          if (toastText && this.isGenericToastHeader(toastText)) {
            sawGenericHeader = true;
            // Don't return — keep polling for the body to appear
          }
        }

        // CHECK 4: Common error selectors
        const errorLocators = [
          this.page.locator('.alert-danger').first(),
          this.page.locator('[role="alert"]').first(),
        ];
        
        for (const locator of errorLocators) {
          if (await locator.isVisible({ timeout: 300 })) {
            const message = await locator.innerText();
            if (message.trim() && message.length < 500) {
              console.log(`✓ Error found at poll ${i + 1}`);
              return message.trim();
            }
          }
        }

      } catch (error) {
        // Continue polling even if individual checks fail
        console.warn(`⚠️  Check failed at poll ${i + 1}, continuing...`);
        continue;
      }
    }

    // If we saw a generic header but never got the body, return it rather than nothing
    if (sawGenericHeader) {
      console.log('⚠️  Only generic toast header captured — body never appeared');
      return 'Error Occurred (toast body not captured — check site manually)';
    }

    // Polling completed - no error found
    console.log('⚠️  Polling completed - no error message detected');
    return '';
  }
}