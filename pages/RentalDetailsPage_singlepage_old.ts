import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * RentalDetailsPage_singlepage - Single Page Layout
 * 
 * This page object handles the single-page rent flow where 
 * Step 4 (Rental Details) and Step 5 (Payment Details) are combined.
 * 
 * Used for specific clients with single-page checkout layouts.
 */
export class RentalDetailsPageSinglePage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // ============================================
  // RENTAL DETAILS SECTION (Step 4) - LOCATORS
  // ============================================
  private get summaryHeading() { 
    return this.page.getByRole('heading', { name: 'Summary of Rental' })
      .or(this.page.getByRole('heading', { name: /tenant details/i })); 
  }
  
  // Updated locators to work with both placeholder and textbox role
  private get firstNameInput() { 
    return this.page.locator('input[name="first_name"], input[name="firstName"]')
      .or(this.page.getByRole('textbox', { name: 'First name' }))
      .or(this.page.getByPlaceholder('First name')); 
  }
  private get lastNameInput() { 
    return this.page.locator('input[name="last_name"], input[name="lastName"]')
      .or(this.page.getByRole('textbox', { name: 'Last name' }))
      .or(this.page.getByPlaceholder('Last name')); 
  }
  private get emailInput() { 
    return this.page.locator('input[name="email"]')
      .or(this.page.getByRole('textbox', { name: 'Email address' }))
      .or(this.page.getByPlaceholder('Email address')); 
  }
  private get phoneInput() { 
    return this.page.locator('input[name="phone"], input[name="cell_phone"]')
      .or(this.page.getByRole('textbox', { name: /phone/i }))
      .or(this.page.getByPlaceholder(/phone/i)); 
  }
  private get addressInput() { 
    return this.page.locator('input[name="address"]')
      .or(this.page.locator('#address-input'))
      .or(this.page.getByPlaceholder('Address', { exact: true })); 
  }
  private get cityInput() { 
    return this.page.locator('input[name="city"]')
      .or(this.page.getByRole('textbox', { name: 'City' }))
      .or(this.page.getByPlaceholder('City')); 
  }
  private get zipCodeInput() { 
    return this.page.locator('input[name="zip"], input[name="zipcode"], input[name="postal_code"]')
      .or(this.page.getByRole('textbox', { name: 'Zip' }))
      .or(this.page.getByRole('textbox', { name: 'Postal' }))
      .or(this.page.getByPlaceholder(/Zip Code|Postal Code|ZIP/i)); 
  }
  
  // State/Province selector (Tenant Details section)
  private get provinceSelect() { return this.page.locator('#province'); }
  private get stateTextbox() { 
    return this.page.locator('input[name="state"]')
      .or(this.page.getByRole('textbox', { name: 'State', exact: true })); 
  }

  // ============================================
  // DRIVER'S LICENSE SECTION - LOCATORS
  // ============================================
  private get driversLicenseInput() { 
    return this.page.getByRole('textbox', { name: /license/i })
      .or(this.page.getByPlaceholder('Driver License #')); 
  }
  private get driversLicenseStateSelect() { 
    return this.page.locator('input[name=""]').filter({ hasText: /issuing state/i })
      .or(this.page.getByRole('textbox', { name: 'Issuing State', exact: true }))
      .or(this.page.locator('#drivers_license_state')); 
  }
  private get birthMonthSelect() { 
    return this.page.getByRole('textbox', { name: 'Month', exact: true })
      .or(this.page.locator('#drivers_birth_month')); 
  }
  private get birthDateSelect() { 
    return this.page.getByRole('textbox', { name: 'Day' })
      .or(this.page.locator('#drivers_birth_date')); 
  }
  private get birthYearInput() { 
    return this.page.getByRole('textbox', { name: 'Year' })
      .or(this.page.getByPlaceholder('Birth Year')); 
  }

  // ============================================
  // PAYMENT DETAILS SECTION (Step 5) - LOCATORS
  // ============================================
  private get cardNumberInput() { 
    return this.page.locator('input[name="card_number"], input[name="cardNumber"]')
      .or(this.page.getByRole('textbox', { name: 'Card Number' }))
      .or(this.page.getByPlaceholder('Card Number')); 
  }
  private get cardExpiryInput() { 
    return this.page.locator('input[name="expiry"], input[name="card_expiry"]')
      .or(this.page.getByRole('textbox', { name: 'MM / YY' }))
      .or(this.page.getByPlaceholder('MM / YY')); 
  }
  private get cardCvvInput() { 
    return this.page.locator('input[name="cvv"], input[name="cvc"]')
      .or(this.page.getByRole('textbox', { name: 'CVV' }))
      .or(this.page.getByPlaceholder('CVV')); 
  }
  private get paymentStateSelect() {
    return this.page.getByRole('textbox', { name: 'State' }).last()
      .or(this.page.locator('input[name="billing_state"]'));
  }

  // ============================================
  // AGREEMENT TOGGLES/CHECKBOXES - LOCATORS
  // ============================================
  private get beAdvisedToggle() {
    return this.page.locator('input[type="checkbox"]').filter({ 
      has: this.page.locator('text=/Be advised|I understand/i') 
    });
  }

  // ============================================
  // ACTION BUTTONS - LOCATORS
  // ============================================
  private get rentNowButton() { 
    return this.page.getByRole('button', { name: 'RENT NOW' })
      .or(this.page.getByRole('button', { name: /rent now/i })); 
  }

  // ============================================
  // MAIN METHODS
  // ============================================

  /**
   * Fill complete single-page rental form including all sections:
   * - Tenant Details
   * - Driver's License Details (if available)
   * - Payment Details
   * - Agreement Toggles
   */
  async fillCompleteSinglePageForm(userData: {
    firstName: string,
    lastName: string,
    email: string,
    phone: string,
    address: string,
    city: string,
    province: {
      southCarolina?: string,
      newJersey?: string,
      alberta?: string,
      alaska?: string,
      alabama?: string
    },
    zipCode: string,
    driversLicense?: string,
    driversLicenseState?: string,
    birthMonth?: string,
    birthDate?: string,
    birthYear?: string,
    paymentInfo: {
      cardNumber: string,
      expiryDate: string,
      cvv: string
    }
  }): Promise<void> {
    console.log('📝 Starting to fill single-page rental form...');
    
    try {
      // STEP 1: Fill Tenant Details
      console.log('\n📍 SECTION 1: Filling Tenant Details...');
      await this.fillTenantDetails({
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        phone: userData.phone,
        address: userData.address,
        city: userData.city,
        province: userData.province,
        zipCode: userData.zipCode
      });
      
      // STEP 2: Fill Driver's License Details (if available)
      console.log('\n📍 SECTION 2: Filling Driver\'s License Details...');
      await this.fillDriversLicenseDetailsIfAvailable({
        driversLicense: userData.driversLicense,
        driversLicenseState: userData.driversLicenseState,
        birthMonth: userData.birthMonth,
        birthDate: userData.birthDate,
        birthYear: userData.birthYear
      });
      
      // STEP 3: Fill Payment Details
      console.log('\n📍 SECTION 3: Filling Payment Details...');
      await this.fillPaymentDetails(userData.paymentInfo);
      
      // STEP 4: Enable Agreement Toggles
      console.log('\n📍 SECTION 4: Enabling Agreement Toggles...');
      await this.enableAgreementToggles();
      
      console.log('\n✅ Single-page rental form completed successfully');
      
    } catch (error) {
      const errorMsg = `❌ CRITICAL ERROR: Failed to fill single-page rental form - ${(error as Error).message}`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
  }

  /**
   * Fill Tenant Details Section
   */
  private async fillTenantDetails(userData: {
    firstName: string,
    lastName: string,
    email: string,
    phone: string,
    address: string,
    city: string,
    province: {
      southCarolina?: string,
      newJersey?: string,
      alberta?: string,
      alaska?: string,
      alabama?: string
    },
    zipCode: string
  }): Promise<void> {
    try {
      // Wait for summary heading or first input to be visible
      await this.wait(2000);
      
      try {
        if (await this.summaryHeading.isVisible({ timeout: 5000 })) {
          await this.summaryHeading.click();
          await this.wait(1000);
          console.log('✓ Summary heading found and clicked');
        }
      } catch (error) {
        console.log('- Summary heading not found, proceeding with form fill');
      }

      // Fill required fields
      await this.fillCriticalField(this.firstNameInput, userData.firstName, 'First Name');
      await this.fillCriticalField(this.lastNameInput, userData.lastName, 'Last Name');
      await this.fillCriticalField(this.emailInput, userData.email, 'Email');
      await this.fillCriticalField(this.phoneInput, userData.phone, 'Phone');
      
      // Fill remaining fields WITHOUT clicking after each field
      // This prevents accidentally clicking navbar elements
      await this.addressInput.waitFor({ state: 'visible', timeout: 10000 });
      await this.addressInput.fill(userData.address);
      console.log(`  ✓ Filled Address: ${userData.address}`);
      
      await this.cityInput.fill(userData.city);
      console.log(`  ✓ Filled City: ${userData.city}`);

      await this.selectStateOptimized(userData.province);
      await this.fillZipCode(userData.zipCode);
      
      console.log('✅ Tenant details section completed');
      
    } catch (error) {
      const errorMsg = `❌ Failed to fill tenant details - ${(error as Error).message}`;
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
      console.log(`  ✓ Filled ${fieldName}: ${value}`);
    } catch (error) {
      const errorMsg = `❌ Could not fill ${fieldName} field - ${(error as Error).message}`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
  }

  /**
   * Fill zip code with enhanced error handling
   */
  private async fillZipCode(zipCode: string): Promise<void> {
    try {
      await this.zipCodeInput.waitFor({ state: 'visible', timeout: 10000 });
      await this.wait(500);
      
      await this.zipCodeInput.click({ timeout: 5000 });
      await this.wait(500);
      
      await this.zipCodeInput.fill(zipCode, { timeout: 5000 });
      console.log(`  ✓ Successfully filled zip code: ${zipCode}`);
    } catch (error) {
      console.warn(`Primary zip code method failed, trying alternative...`);
      
      try {
        const zipByPlaceholder = this.page.getByPlaceholder(/Zip|Postal/i);
        await zipByPlaceholder.waitFor({ state: 'visible', timeout: 5000 });
        
        await zipByPlaceholder.first().click();
        await zipByPlaceholder.first().fill(zipCode);
        console.log(`  ✓ Successfully filled zip code (alternative method): ${zipCode}`);
      } catch (fallbackError) {
        const errorMsg = `❌ Unable to fill zip code field - ${(fallbackError as Error).message}`;
        console.error(errorMsg);
        throw new Error(errorMsg);
      }
    }
  }

  /**
   * State Selection - Optimized with Fallback Priority
   * Priority: South Carolina → New Jersey → Alberta → Alaska → Alabama
   */
  private async selectStateOptimized(locationData: { 
    southCarolina?: string, 
    newJersey?: string,
    alberta?: string, 
    alaska?: string, 
    alabama?: string 
  }): Promise<void> {
    console.log('  Attempting to select state...');
    
    const stateOptions = [
      { value: locationData.southCarolina, name: 'South Carolina' },
      { value: locationData.newJersey, name: 'New Jersey' },
      { value: locationData.alabama, name: 'Alabama' },
      { value: locationData.alberta, name: 'Alberta' },  
      { value: locationData.alaska, name: 'Alaska' }
    ].filter(option => option.value);

    if (stateOptions.length === 0) {
      throw new Error('No state value provided');
    }

    // Try to select first available state
    for (const option of stateOptions) {
      // STRATEGY 1: Try using exact name="state" locator
      try {
        const stateInput = this.page.locator('input[name="state"]');
        if (await stateInput.isVisible({ timeout: 2000 })) {
          await stateInput.click();
          await this.wait(1000);
          
          // Click first option from dropdown
          const firstOption = this.page.locator('li, div[role="option"]').first();
          if (await firstOption.isVisible({ timeout: 2000 })) {
            await firstOption.click();
            console.log(`  ✓ Selected first state from dropdown`);
            return;
          }
        }
      } catch (error) {
        console.log(`  - Strategy 1 (name="state") failed: ${error}`);
      }

      // STRATEGY 2: Try textbox with exact name
      try {
        const stateTextbox = this.page.getByRole('textbox', { name: 'State', exact: true });
        if (await stateTextbox.isVisible({ timeout: 2000 })) {
          await stateTextbox.click();
          await this.wait(1000);
          
          // Click first option
          const firstOption = this.page.locator('li, div[role="option"]').first();
          if (await firstOption.isVisible({ timeout: 2000 })) {
            await firstOption.click();
            console.log(`  ✓ Selected first state (exact textbox)`);
            return;
          }
        }
      } catch (error) {
        console.log(`  - Strategy 2 (exact textbox) failed`);
      }

      // STRATEGY 3: Try standard select
      try {
        const provinceSelect = this.page.locator('#province');
        if (await provinceSelect.isVisible({ timeout: 2000 })) {
          await provinceSelect.selectOption({ index: 1 }); // Select first non-placeholder option
          console.log(`  ✓ Selected state (select element)`);
          return;
        }
      } catch (error) {
        console.log(`  - Strategy 3 (select) failed`);
      }
    }

    console.log(`  ⚠️ Could not select state, continuing without it`);
  }

  /**
   * Fill Driver's License Details if available on the page
   */
  private async fillDriversLicenseDetailsIfAvailable(userData: {
    driversLicense?: string,
    driversLicenseState?: string,
    birthMonth?: string,
    birthDate?: string,
    birthYear?: string
  }): Promise<void> {
    try {
      // Scroll driver's license section into view
      console.log('  📜 Scrolling to driver\'s license section...');
      const dlHeading = this.page.getByRole('heading', { name: /driver's license details/i });
      
      try {
        await dlHeading.scrollIntoViewIfNeeded({ timeout: 5000 });
        await this.wait(1000);
      } catch (error) {
        console.log('  - Could not scroll to driver\'s license heading, trying input field...');
      }
      
      // Check if driver's license section exists
      const dlSectionExists = await this.driversLicenseInput.isVisible({ timeout: 3000 });
      
      if (!dlSectionExists) {
        console.log('  - Driver\'s license section not found, skipping');
        return;
      }

      console.log('  Driver\'s license section found, filling available fields...');

      // Fill license number with simple value
      await this.fillFieldIfExists(this.driversLicenseInput, '123456789', 'Driver License');

      // Select FIRST option from Issuing State dropdown
      await this.selectOptionIfExists(this.driversLicenseStateSelect, '', 'Driver License State', true);

      // Select FIRST option from Month dropdown
      await this.selectOptionIfExists(this.birthMonthSelect, '', 'Birth Month', true);

      // Select FIRST option from Day dropdown
      await this.selectOptionIfExists(this.birthDateSelect, '', 'Birth Day', true);

      // Select FIRST option from Year dropdown
      const yearSelect = this.page.getByRole('textbox', { name: 'Year', exact: true });
      await this.selectOptionIfExists(yearSelect, '', 'Birth Year', true);

      console.log('✅ Driver\'s license details completed');
      
    } catch (error) {
      console.log('  ⚠️  Error in driver\'s license section, continuing:', (error as Error).message);
    }
  }

  /**
   * Helper: Fill field if it exists
   */
  private async fillFieldIfExists(locator: any, value: string, fieldName: string): Promise<void> {
    try {
      if (await locator.isVisible({ timeout: 2000 })) {
        await locator.fill(value);
        console.log(`  ✓ Filled ${fieldName}: ${value}`);
      } else {
        console.log(`  - ${fieldName} field not visible, skipping`);
      }
    } catch (error) {
      console.log(`  - ${fieldName} field not found, skipping`);
    }
  }

  /**
   * Helper: Select option if select exists
   * Now handles both traditional selects and textbox dropdowns
   * Selects FIRST option from dropdown for fields like Month and Issuing State
   */
  private async selectOptionIfExists(locator: any, value: string, fieldName: string, selectFirst: boolean = false): Promise<void> {
    try {
      if (await locator.isVisible({ timeout: 2000 })) {
        // First try to check if it's a textbox (dropdown-style)
        const tagName = await locator.evaluate((el: any) => el.tagName.toLowerCase());
        
        if (tagName === 'input') {
          // It's a textbox dropdown - click it and select from list
          await locator.click();
          await this.wait(1000); // Wait for dropdown to appear
          
          if (selectFirst) {
            // Select first option from dropdown
            const firstOption = this.page.locator('li, div[role="option"]').first();
            if (await firstOption.isVisible({ timeout: 2000 })) {
              await firstOption.click();
              console.log(`  ✓ Selected ${fieldName}: first option (dropdown)`);
              return;
            }
          } else {
            // Try to find and click the specific value
            const option = this.page.locator(`text="${value}"`).first();
            if (await option.isVisible({ timeout: 2000 })) {
              await option.click();
              console.log(`  ✓ Selected ${fieldName}: ${value} (dropdown)`);
              return;
            }
          }
        } else {
          // It's a traditional select element
          if (selectFirst) {
            await locator.selectOption({ index: 1 }); // First non-placeholder
            console.log(`  ✓ Selected ${fieldName}: first option`);
          } else {
            await locator.selectOption(value);
            console.log(`  ✓ Selected ${fieldName}: ${value}`);
          }
          return;
        }
      } else {
        console.log(`  - ${fieldName} select not visible, skipping`);
      }
    } catch (error) {
      console.log(`  - ${fieldName} select not found or couldn't be filled, skipping`);
    }
  }

  /**
   * Fill Payment Details Section
   */
  private async fillPaymentDetails(paymentData: {
    cardNumber: string,
    expiryDate: string,
    cvv: string
  }): Promise<void> {
    try {
      // Scroll payment section into view
      console.log('  📜 Scrolling to payment section...');
      const paymentHeading = this.page.getByRole('heading', { name: /payment details/i });
      
      try {
        await paymentHeading.scrollIntoViewIfNeeded({ timeout: 5000 });
        await this.wait(1500);
      } catch (error) {
        console.log('  - Could not scroll to payment heading, trying card input...');
        await this.cardNumberInput.scrollIntoViewIfNeeded({ timeout: 5000 });
        await this.wait(1500);
      }
      
      // Wait for card number field to be visible
      await this.cardNumberInput.waitFor({ state: 'visible', timeout: 15000 });
      console.log('  ✓ Payment section found');
      
      await this.cardNumberInput.fill(paymentData.cardNumber);
      console.log('  ✓ Filled Card Number');
      await this.wait(500);
      
      await this.cardExpiryInput.fill(paymentData.expiryDate);
      console.log('  ✓ Filled Expiry Date');
      await this.wait(500);
      
      await this.cardCvvInput.fill(paymentData.cvv);
      console.log('  ✓ Filled CVV');
      await this.wait(500);
      
      // Fill billing address fields - use same data from tenant details
      const streetInput = this.page.getByRole('textbox', { name: /street address/i });
      const billingCityInput = this.page.getByRole('textbox', { name: 'City' }).last();
      const billingZipInput = this.page.getByRole('textbox', { name: 'Zip' }).last();
      
      try {
        await streetInput.fill('123 Main St');
        console.log('  ✓ Filled Street Address');
      } catch (error) {
        console.log('  - Street address field not found, skipping');
      }
      
      try {
        await billingCityInput.fill('Test City');
        console.log('  ✓ Filled Billing City');
      } catch (error) {
        console.log('  - Billing city field not found, skipping');
      }
      
      // Select first state from payment state dropdown if it exists
      try {
        await this.selectOptionIfExists(this.paymentStateSelect, '', 'Payment State', true);
      } catch (error) {
        console.log('  - Payment state field not found, skipping');
      }
      
      try {
        await billingZipInput.fill('12345');
        console.log('  ✓ Filled Billing Zip');
      } catch (error) {
        console.log('  - Billing zip field not found, skipping');
      }
      
      console.log('✅ Payment details filled successfully');
      
    } catch (error) {
      const errorMsg = `❌ Failed to fill payment details - ${(error as Error).message}`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
  }

  /**
   * Enable all agreement toggles/checkboxes
   * Handles different variations across different clients
   */
  private async enableAgreementToggles(): Promise<void> {
    console.log('  📜 Looking for agreement checkboxes...');
    
    // Look specifically for the "Be advised" checkbox
    try {
      const beAdvisedCheckbox = this.page.locator('input[type="checkbox"]').filter({
        has: this.page.locator('text=/Be advised.*Failure to complete and sign/i')
      }).first();
      
      // Scroll it into view
      await beAdvisedCheckbox.scrollIntoViewIfNeeded({ timeout: 5000 });
      await this.wait(1000);
      
      if (await beAdvisedCheckbox.isVisible({ timeout: 3000 })) {
        const isChecked = await beAdvisedCheckbox.isChecked();
        
        if (!isChecked) {
          await beAdvisedCheckbox.check();
          console.log('  ✓ Enabled: Be advised agreement checkbox');
        } else {
          console.log('  - Already checked: Be advised agreement');
        }
      }
    } catch (error) {
      console.log('  - "Be advised" checkbox not found, trying alternatives...');
    }
    
    // Try other common agreement texts
    const agreementTexts = [
      'I understand that failure to complete all required agreements',
      'I agree to the lease terms',
      'I agree to the protection',
      'I agree to the auto pay terms',
      'I understand'
    ];

    let togglesFound = 0;

    for (const text of agreementTexts) {
      try {
        let checkbox = this.page.locator(`input[type="checkbox"]`).filter({ 
          has: this.page.locator(`text=/${text}/i`)
        }).first();
        
        if (await checkbox.isVisible({ timeout: 2000 })) {
          await checkbox.scrollIntoViewIfNeeded();
          await this.wait(500);
          
          const isChecked = await checkbox.isChecked();
          
          if (!isChecked) {
            await checkbox.check();
            console.log(`  ✓ Enabled: ${text.substring(0, 50)}...`);
            togglesFound++;
          } else {
            console.log(`  - Already checked: ${text.substring(0, 50)}...`);
            togglesFound++;
          }
        }
      } catch (error) {
        console.log(`  - "${text.substring(0, 30)}..." not found, skipping`);
      }
    }

    if (togglesFound > 0) {
      console.log(`✅ Processed ${togglesFound} agreement toggle(s)`);
    } else {
      console.log('  ⚠️  No additional agreement toggles found');
    }
  }

  /**
   * Click RENT NOW button and capture error message
   * Returns the error message if found, or success message if no error
   */
  async clickRentNowAndCaptureError(): Promise<string> {
    console.log('\n📍 FINAL STEP: Clicking RENT NOW button...');
    
    try {
      // Minimize live chat if present
      await this.minimizeLiveChat();
      
      // Wait for rent now button
      await this.rentNowButton.waitFor({ state: 'visible', timeout: 10000 });
      await this.rentNowButton.scrollIntoViewIfNeeded();
      await this.wait(500);
      
      // Click the button
      await this.rentNowButton.click({ timeout: 30000 });
      console.log('✓ RENT NOW button clicked successfully');
      
      // Wait longer for error to appear (increased from 2s to 5s initial wait)
      console.log('⏳ Waiting for error message to appear...');
      await this.wait(5000);
      
      // Detect error message
      const errorMessage = await this.detectErrorMessage();
      
      if (errorMessage && errorMessage !== 'No error - Payment may have succeeded') {
        console.log(`\n⚠️  ERROR DETECTED: ${errorMessage}`);
        return errorMessage;
      } else {
        console.log('\n✅ No error detected - test completed successfully');
        return errorMessage;
      }
      
    } catch (error) {
      const errorMsg = `❌ Failed to click RENT NOW button - ${(error as Error).message}`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
  }

  /**
   * Robust error detection with multiple strategies
   */
  private async detectErrorMessage(): Promise<string> {
    console.log('🔍 Starting error detection...');
    
    // Strategy 1: Quick check
    let errorMessage = await this.quickErrorCheck();
    if (errorMessage) {
      console.log('  ✓ Error detected via quick check');
      return errorMessage;
    }

    // Strategy 2: Polling check (increased attempts from 8 to 15)
    errorMessage = await this.pollingErrorCheck();
    if (errorMessage) {
      console.log('  ✓ Error detected via polling check');
      return errorMessage;
    }

    // Strategy 3: Extended check
    errorMessage = await this.extendedErrorCheck();
    if (errorMessage) {
      console.log('  ✓ Error detected via extended check');
      return errorMessage;
    }

    console.log('  ℹ️  No error messages detected');
    return 'No error - Payment may have succeeded';
  }

  /**
   * Quick error check (2 seconds)
   */
  private async quickErrorCheck(): Promise<string> {
    try {
      await this.wait(1000);

      const toastHeader = this.page.getByText('Error!!');
      if (await toastHeader.isVisible({ timeout: 1000 })) {
        const toastBody = this.page.locator('.toast-container .toast-body');
        if (await toastBody.isVisible({ timeout: 2000 })) {
          const message = await toastBody.innerText();
          if (message.trim()) return message.trim();
        }
      }

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
   * Polling error check (15 attempts, 1 second each = 15 seconds total)
   */
  private async pollingErrorCheck(): Promise<string> {
    for (let i = 0; i < 15; i++) {
      try {
        await this.wait(1000);
        
        const toastContainer = this.page.locator('.toast-container');
        const toastBody = toastContainer.locator('.toast-body');
        
        if (await toastContainer.isVisible({ timeout: 500 }) && await toastBody.isVisible({ timeout: 500 })) {
          const message = await toastBody.innerText();
          if (message.trim()) return message.trim();
        }

        const detailedError = this.page.locator('p.text-sm.text-white').filter({ hasText: 'Response Code' });
        if (await detailedError.isVisible({ timeout: 500 })) {
          const message = await detailedError.innerText();
          if (message.trim()) return message.trim();
        }

        const genericErrors = this.page.locator('text=/error|Error|ERROR|failed|Failed|FAILED/i').first();
        if (await genericErrors.isVisible({ timeout: 500 })) {
          const message = await genericErrors.innerText();
          if (message.trim() && message.length < 200) {
            return message.trim();
          }
        }

      } catch (error) {
        continue;
      }
    }
    
    return '';
  }

  /**
   * Extended error check (5 second wait + comprehensive search)
   */
  private async extendedErrorCheck(): Promise<string> {
    try {
      await this.wait(5000);

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
              console.log(`  Found error via ${name}`);
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
