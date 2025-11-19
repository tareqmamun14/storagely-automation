import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * RentalDetailsPage_singlepage - Single Page Layout
 * 
 * This page object handles the single-page rent flow where 
 * Step 4 (Rental Details) and Step 5 (Payment Details) are combined.
 * 
 * Uses EXACT selectors from Playwright codegen recording.
 * Maintains Page Object Model pattern with separate locators and actions.
 */
export class RentalDetailsPageSinglePage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // ============================================
  // TENANT DETAILS SECTION - LOCATORS
  // ============================================
  private get firstNameField() {
    return this.page.getByRole('textbox', { name: 'First name' })
      .or(this.page.locator('input[name="first_name"], input[name="firstName"]'))
      .or(this.page.getByPlaceholder('First name'));
  }
  
  private get lastNameField() {
    return this.page.getByRole('textbox', { name: 'Last name' })
      .or(this.page.locator('input[name="last_name"], input[name="lastName"]'))
      .or(this.page.getByPlaceholder('Last name'));
  }
  
  private get emailField() {
    return this.page.getByRole('textbox', { name: 'Email address' })
      .or(this.page.locator('input[name="email"]'))
      .or(this.page.getByPlaceholder('Email address'));
  }
  
  private get phoneField() {
    return this.page.getByRole('textbox', { name: 'Cell phone number' })
      .or(this.page.locator('input[name="phone"], input[name="cell_phone"]'))
      .or(this.page.getByPlaceholder(/phone/i));
  }
  
  private get addressField() {
    return this.page.getByRole('textbox', { name: 'Street address' })
      .or(this.page.locator('input[name="address"]'))
      .or(this.page.getByPlaceholder('Address'));
  }
  
  private get cityField() {
    return this.page.getByRole('textbox', { name: 'City' })
      .or(this.page.locator('input[name="city"]'))
      .or(this.page.getByPlaceholder('City'));
  }
  
  private get stateField() {
    return this.page.getByRole('textbox', { name: 'State', exact: true })
      .or(this.page.locator('input[name="state"]'));
  }
  
  private get zipField() {
    return this.page.getByRole('textbox', { name: 'Zip' })
      .or(this.page.locator('input[name="zip"], input[name="zipcode"], input[name="postal_code"]'))
      .or(this.page.getByPlaceholder(/Zip|Postal/i));
  }

  // ============================================
  // DRIVER'S LICENSE SECTION - LOCATORS
  // ============================================
  private get driversLicenseField() {
    return this.page.getByRole('textbox', { name: 'Driver\'s License Number' })
      .or(this.page.getByRole('textbox', { name: /license/i }))
      .or(this.page.getByPlaceholder('Driver License #'));
  }
  
  private get issuingStateField() {
    return this.page.getByRole('textbox', { name: 'Issuing State' })
      .or(this.page.locator('#drivers_license_state'));
  }
  
  private get birthMonthField() {
    return this.page.getByRole('textbox', { name: 'Month' })
      .or(this.page.locator('#drivers_birth_month'));
  }
  
  private get birthDayField() {
    return this.page.getByRole('textbox', { name: 'Day' })
      .or(this.page.locator('#drivers_birth_date'));
  }
  
  private get birthYearField() {
    return this.page.getByRole('textbox', { name: 'Year' })
      .or(this.page.getByPlaceholder('Birth Year'));
  }

  // ============================================
  // PAYMENT DETAILS SECTION - LOCATORS
  // ============================================
  private get cardNumberField() {
    return this.page.getByRole('textbox', { name: 'Card Number' })
      .or(this.page.locator('input[name="card_number"], input[name="cardNumber"]'))
      .or(this.page.getByPlaceholder('Card Number'));
  }
  
  private get expiryField() {
    return this.page.getByRole('textbox', { name: 'MM / YY' })
      .or(this.page.locator('input[name="expiry"], input[name="card_expiry"]'))
      .or(this.page.getByPlaceholder('MM / YY'));
  }
  
  private get cvvField() {
    return this.page.getByRole('textbox', { name: 'CVV' })
      .or(this.page.locator('input[name="cvv"], input[name="cvc"]'))
      .or(this.page.getByPlaceholder('CVV'));
  }
  
  private get billingAddressField() {
    return this.page.getByRole('textbox', { name: 'Street address' })
      .or(this.page.locator('input[name="billing_address"]'));
  }
  
  private get billingCityField() {
    return this.page.getByRole('textbox', { name: 'City' }).last()
      .or(this.page.locator('input[name="billing_city"]'));
  }
  
  private get billingStateField() {
    return this.page.getByRole('textbox', { name: 'State', exact: true }).last()
      .or(this.page.locator('input[name="billing_state"]'));
  }
  
  private get billingZipField() {
    return this.page.getByRole('textbox', { name: 'Zip' }).last()
      .or(this.page.locator('input[name="billing_zip"]'));
  }

  // ============================================
  // AGREEMENT SECTION - LOCATORS
  // ============================================
  private get agreementText() {
    return this.page.getByText('Be advised: Failure to')
      .or(this.page.getByText(/Be advised.*Failure to complete/i));
  }
  
  private get agreementToggle() {
    return this.page.locator('.flex.items-start > .flex.flex-col > .flex > .inline-flex > .w-11')
      .or(this.page.locator('input[type="checkbox"]').filter({
        has: this.page.locator('text=/Be advised|I understand/i')
      }).first());
  }

  // ============================================
  // ACTION BUTTONS - LOCATORS
  // ============================================
  private get rentNowButton() { 
    return this.page.getByRole('button', { name: 'Rent Now' })
      .or(this.page.getByRole('button', { name: /rent now/i })); 
  }

  // ============================================
  // MAIN METHODS
  // ============================================

  /**
   * Fill complete single-page rental form using exact Playwright codegen selectors
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
    console.log(`[${new Date().toISOString()}] 📝 Starting single-page rental form fill...`);
    
    try {
      // Wait for form to be ready
      await this.wait(2000);
      
      // Fill all sections
      console.log(`[${new Date().toISOString()}] 📋 Filling tenant details...`);
      await this.fillTenantDetails(userData);
      
      console.log(`[${new Date().toISOString()}] 🪪 Filling driver's license details...`);
      await this.fillDriversLicenseDetails();
      
      console.log(`[${new Date().toISOString()}] 💳 Filling payment details...`);
      await this.fillPaymentDetails(userData.paymentInfo, userData.address, userData.city, userData.zipCode, userData.province);
      
      console.log(`[${new Date().toISOString()}] ✅ Enabling agreement toggle...`);
      await this.enableAgreementToggle();
      
      console.log(`[${new Date().toISOString()}] ✅ Single-page rental form completed`);
      
    } catch (error) {
      const errorMsg = `❌ CRITICAL ERROR: Failed to fill single-page rental form - ${(error as Error).message}`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
  }

  // ============================================
  // SECTION-SPECIFIC METHODS
  // ============================================

  /**
   * Fill Tenant Details Section
   * Uses exact sequence from Playwright recording
   */
  private async fillTenantDetails(userData: {
    firstName: string,
    lastName: string,
    email: string,
    phone: string,
    address: string,
    city: string,
    province: any,
    zipCode: string
  }): Promise<void> {
    console.log('\n📍 SECTION 1: Filling Tenant Details...');
    
    // First Name - click then fill
    await this.firstNameField.scrollIntoViewIfNeeded();
    await this.firstNameField.click();
    await this.firstNameField.fill(userData.firstName);
    console.log(`  ✓ Filled First Name: ${userData.firstName}`);
    
    // Last Name - click then fill
    await this.lastNameField.scrollIntoViewIfNeeded();
    await this.lastNameField.click();
    await this.lastNameField.fill(userData.lastName);
    console.log(`  ✓ Filled Last Name: ${userData.lastName}`);
    
    // Email - click then fill
    await this.emailField.scrollIntoViewIfNeeded();
    await this.emailField.click();
    await this.emailField.fill(userData.email);
    console.log(`  ✓ Filled Email: ${userData.email}`);
    
    // Phone - click then fill
    await this.phoneField.scrollIntoViewIfNeeded();
    await this.phoneField.click();
    await this.phoneField.fill(userData.phone);
    console.log(`  ✓ Filled Phone: ${userData.phone}`);
    
    // Address, City, State, Zip - optional fields, skip if not present
    try {
      await this.addressField.scrollIntoViewIfNeeded();
      await this.addressField.click();
      await this.addressField.fill(userData.address);
      console.log(`  ✓ Filled Address: ${userData.address}`);
    } catch {
      console.log('  - Address field not found, skipping');
    }
    
    try {
      await this.cityField.scrollIntoViewIfNeeded();
      await this.cityField.click();
      await this.cityField.fill(userData.city);
      console.log(`  ✓ Filled City: ${userData.city}`);
    } catch {
      console.log('  - City field not found, skipping');
    }
    
    // State dropdown - click field, then click Alabama option
    try {
      await this.selectDropdownOption(
        this.stateField,
        'Alabama',
        'State'
      );
    } catch {
      console.log('  - State field not found, skipping');
    }
    
    try {
      await this.zipField.scrollIntoViewIfNeeded();
      await this.zipField.click();
      await this.zipField.fill(userData.zipCode);
      console.log(`  ✓ Filled Zip: ${userData.zipCode}`);
    } catch {
      console.log('  - Zip field not found, skipping');
    }
    
    console.log('✅ Tenant details section completed');
  }

  /**
   * Fill Driver's License Details Section
   * First checks if the section exists by looking for "Driver's License Number" field
   * If not found, skips the entire section (some platforms don't require it)
   */
  private async fillDriversLicenseDetails(): Promise<void> {
    console.log('\n📍 SECTION 2: Checking for Driver\'s License Details section...');
    
    try {
      // Check if Driver's License Number field exists
      const licenseFieldExists = await this.driversLicenseField.isVisible({ timeout: 2000 });
      
      if (!licenseFieldExists) {
        console.log('  ⚠️  Driver\'s License Number field not found - section not enabled for this platform');
        console.log('  ✓ Skipping driver\'s license section');
        return;
      }
      
      console.log('  ✓ Driver\'s License section is enabled, proceeding to fill...');
      
      // License Number - click then fill
      await this.driversLicenseField.scrollIntoViewIfNeeded();
      await this.driversLicenseField.click();
      await this.driversLicenseField.fill('123456789');
      console.log('  ✓ Filled Driver\'s License Number: 123456789');
      
      // Issuing State - click field, then click Alabama option
      await this.selectDropdownOption(
        this.issuingStateField,
        'Alabama',
        'Issuing State'
      );
      
      // Birth Month - click field, then click January
      await this.selectDropdownOption(
        this.birthMonthField,
        'January',
        'Birth Month'
      );
      
      // Birth Day - click field, then click 1
      await this.selectDropdownOption(
        this.birthDayField,
        '1',
        'Birth Day',
        true // exact match
      );
      
      // Birth Year - click field, then click 2025
      await this.selectDropdownOption(
        this.birthYearField,
        '2025',
        'Birth Year',
        true // exact match
      );
      
      console.log('✅ Driver\'s license details completed');
      
    } catch (error) {
      console.log('  ⚠️  Driver\'s license section error or not found, skipping');
    }
  }

  /**
   * Helper method to select dropdown options
   * Handles both text-based and exact matching
   */
  private async selectDropdownOption(
    field: any,
    optionText: string,
    fieldName: string,
    exactMatch: boolean = false
  ): Promise<void> {
    await field.scrollIntoViewIfNeeded();
    await field.click();
    await this.wait(1000);
    
    // Try paragraph filter first (most common pattern)
    try {
      const option = exactMatch
        ? this.page.getByText(optionText, { exact: true })
        : this.page.getByRole('paragraph').filter({ hasText: optionText });
      
      await option.click();
      console.log(`  ✓ Selected ${fieldName}: ${optionText}`);
    } catch (error) {
      // Fallback: try direct text match
      try {
        const option = this.page.getByText(optionText, { exact: exactMatch });
        await option.click();
        console.log(`  ✓ Selected ${fieldName}: ${optionText} (fallback)`);
      } catch (fallbackError) {
        console.log(`  - ${fieldName} option not found, skipping`);
      }
    }
  }

  /**
   * Helper method to fill a field with proper error handling
   * Includes scrolling, clicking, and filling with retry logic
   */
  private async fillFieldSafely(
    field: any,
    value: string,
    fieldName: string,
    required: boolean = false
  ): Promise<void> {
    try {
      await field.scrollIntoViewIfNeeded();
      await field.click();
      await field.fill(value);
      console.log(`  ✓ Filled ${fieldName}: ${value}`);
    } catch (error) {
      if (required) {
        const errorMsg = `❌ Required field '${fieldName}' could not be filled - ${(error as Error).message}`;
        console.error(errorMsg);
        throw new Error(errorMsg);
      } else {
        console.log(`  - ${fieldName} field not found, skipping`);
      }
    }
  }

  /**
   * Fill Payment Details Section
   * Uses exact sequence from Playwright recording
   */
  private async fillPaymentDetails(
    paymentData: {
      cardNumber: string,
      expiryDate: string,
      cvv: string
    },
    billingAddress: string,
    billingCity: string,
    billingZip: string,
    province: any
  ): Promise<void> {
    console.log('\n📍 SECTION 3: Filling Payment Details...');
    
    // Card Number - click only (recording shows click without fill)
    await this.cardNumberField.scrollIntoViewIfNeeded();
    await this.cardNumberField.click();
    await this.cardNumberField.fill(paymentData.cardNumber);
    console.log(`  ✓ Filled Card Number: ${paymentData.cardNumber}`);
    
    // Expiry - click only
    await this.expiryField.scrollIntoViewIfNeeded();
    await this.expiryField.click();
    await this.expiryField.fill(paymentData.expiryDate);
    console.log(`  ✓ Filled Expiry: ${paymentData.expiryDate}`);
    
    // CVV - click only
    await this.cvvField.scrollIntoViewIfNeeded();
    await this.cvvField.click();
    await this.cvvField.fill(paymentData.cvv);
    console.log(`  ✓ Filled CVV: ${paymentData.cvv}`);
    
    // Billing Address - click, type, then select first dropdown option
    try {
      await this.billingAddressField.scrollIntoViewIfNeeded();
      await this.billingAddressField.click();
      await this.billingAddressField.fill(billingAddress);
      console.log(`  ✓ Typed Billing Address: ${billingAddress}`);
      
      // Wait for dropdown to appear and select first option
      await this.wait(1000);
      await this.page.keyboard.press('ArrowDown');
      await this.wait(500);
      await this.page.keyboard.press('Enter');
      console.log('  ✓ Selected first address from dropdown');
    } catch {
      console.log('  - Billing address not found, skipping');
    }
    
    // Billing City - click only
    try {
      await this.billingCityField.scrollIntoViewIfNeeded();
      await this.billingCityField.click();
      await this.billingCityField.fill(billingCity);
      console.log(`  ✓ Filled Billing City: ${billingCity}`);
    } catch {
      console.log('  - Billing city not found, skipping');
    }
    
    // Billing State - click field, then select appropriate state
    try {
      // Determine which state to use based on province object
      let stateName = 'North Carolina'; // Default for Clemmons address
      if (province.northCarolina) stateName = province.northCarolina;
      else if (province.alabama) stateName = province.alabama;
      else if (province.southCarolina) stateName = province.southCarolina;
      
      await this.selectDropdownOption(
        this.billingStateField,
        stateName,
        'Billing State'
      );
    } catch {
      console.log('  - Billing state not found, skipping');
    }
    
    // Billing Zip - click only
    try {
      await this.billingZipField.scrollIntoViewIfNeeded();
      await this.billingZipField.click();
      await this.billingZipField.fill(billingZip);
      console.log(`  ✓ Filled Billing Zip: ${billingZip}`);
    } catch {
      console.log('  - Billing zip not found, skipping');
    }
    
    console.log('✅ Payment details completed');
  }

  /**
   * Enable Agreement Toggle
   * Handles different platforms:
   * - storEDGE: Toggle switch with "Be advised" text
   * - SiteLink: Checkbox with "I understand that failure to complete" text
   */
  private async enableAgreementToggle(): Promise<void> {
    console.log('\n📍 SECTION 4: Enabling Agreement Toggle...');
    
    // Strategy 1: Fast check for common checkbox IDs (most common in single-page)
    try {
      const commonIds = ['lease_disclaimer', 'agreement', 'terms_checkbox', 'lease_agreement'];
      
      for (const id of commonIds) {
        const checkbox = this.page.locator(`#${id}`);
        if (await checkbox.count() > 0) {
          const isChecked = await checkbox.isChecked();
          if (!isChecked) {
            const label = this.page.locator(`label[for="${id}"]`);
            if (await label.count() > 0) {
              await label.scrollIntoViewIfNeeded();
              await label.click();
              console.log(`  ✓ Clicked label for checkbox "${id}"`);
              console.log('✅ Agreement toggle completed');
              return;
            } else {
              await checkbox.check({ force: true });
              console.log(`  ✓ Checked checkbox "${id}"`);
              console.log('✅ Agreement toggle completed');
              return;
            }
          } else {
            console.log(`  ✓ Checkbox "${id}" already checked`);
            console.log('✅ Agreement toggle completed');
            return;
          }
        }
      }
    } catch (error) {
      // Continue to next strategy
    }
    
    // Strategy 2: SiteLink format - Find checkbox near "I understand" text
    try {
      const agreementText = this.page.locator('text=/I understand.*failure to complete.*required agreements/i');
      
      if (await agreementText.count() > 0) {
        const container = agreementText.locator('xpath=ancestor::div[.//input[@type="checkbox"]][1]').first()
          .or(agreementText.locator('xpath=..'));
        
        const checkbox = container.locator('input[type="checkbox"]').first();
        
        if (await checkbox.count() > 0) {
          const isChecked = await checkbox.isChecked();
          const checkboxId = await checkbox.getAttribute('id').catch(() => null);
          
          if (!isChecked) {
            if (checkboxId) {
              const label = this.page.locator(`label[for="${checkboxId}"]`);
              if (await label.count() > 0) {
                await label.scrollIntoViewIfNeeded();
                await label.click();
                console.log(`  ✓ Clicked label for checkbox "${checkboxId}"`);
                console.log('✅ Agreement toggle completed');
                return;
              }
            }
            
            await checkbox.scrollIntoViewIfNeeded();
            await checkbox.check({ force: true });
            console.log('  ✓ Checked agreement checkbox');
          } else {
            console.log('  ✓ Agreement checkbox already checked');
          }
          console.log('✅ Agreement toggle completed');
          return;
        }
      }
    } catch (error) {
      // Continue to next strategy
    }
    
    // Strategy 3: Original toggle method (storEDGE format)
    try {
      await this.agreementText.scrollIntoViewIfNeeded();
      await this.agreementText.click();
      await this.wait(500);
      
      await this.agreementToggle.scrollIntoViewIfNeeded();
      await this.agreementToggle.click();
      console.log('  ✓ Enabled Agreement Toggle (storEDGE format)');
      console.log('✅ Agreement toggle completed');
      return;
      
    } catch (error) {
      // Continue to next strategy
    }
    
    // Strategy 4: storEDGE format - Find checkbox near "Be advised" text
    try {
      const agreementText = this.page.locator('text=/Be advised.*Failure to complete/i');
      
      if (await agreementText.count() > 0) {
        const container = agreementText.locator('xpath=..');
        const checkbox = container.locator('input[type="checkbox"]').first();
        
        if (await checkbox.count() > 0) {
          await checkbox.scrollIntoViewIfNeeded();
          await checkbox.check();
          console.log('  ✓ Checked agreement checkbox (storEDGE)');
          console.log('✅ Agreement toggle completed');
          return;
        }
      }
    } catch (error) {
      // Continue to next strategy
    }
    
    // Strategy 5: Find ANY unchecked checkbox as last resort
    try {
      const checkboxes = this.page.locator('input[type="checkbox"]');
      const count = await checkboxes.count();
      
      for (let i = 0; i < count; i++) {
        const cb = checkboxes.nth(i);
        const isChecked = await cb.isChecked();
        
        if (!isChecked) {
          await cb.scrollIntoViewIfNeeded();
          await cb.check();
          console.log(`  ✓ Checked checkbox ${i + 1} (generic fallback)`);
          console.log('✅ Agreement toggle completed');
          return;
        }
      }
    } catch (error) {
      console.log('  ⚠️  All checkbox methods failed');
    }
  }

  /**
   * Click RENT NOW button and capture error message
   */
  async clickRentNowAndCaptureError(): Promise<string> {
    console.log(`[${new Date().toISOString()}] 📍 FINAL STEP: Clicking RENT NOW button...`);
    
    try {
      // Minimize live chat if present
      await this.minimizeLiveChat();
      
      // Wait for rent now button
      await this.rentNowButton.scrollIntoViewIfNeeded();
      await this.rentNowButton.waitFor({ state: 'visible', timeout: 10000 });
      await this.wait(500);
      
      // Click the button
      console.log(`[${new Date().toISOString()}] 🖱️ Clicking RENT NOW...`);
      await this.rentNowButton.click({ timeout: 30000 });
      console.log(`[${new Date().toISOString()}] ✓ RENT NOW button clicked`);
      
      // Detect error message (polls up to 15s internally)
      console.log(`[${new Date().toISOString()}] 🔍 Detecting error...`);
      let errorMessage = await this.detectErrorMessage();
      
      // If error found, return it immediately
      if (errorMessage && !errorMessage.startsWith('FAILED to fetch')) {
        console.log(`[${new Date().toISOString()}] ✅ Error detected: ${errorMessage}`);
        return errorMessage;
      }
      
      // No error detected - retry once
      console.log(`[${new Date().toISOString()}] ⚠️ No error detected on first attempt, retrying...`);
      await this.wait(2000);
      
      // Click RENT NOW again
      console.log(`[${new Date().toISOString()}] 🖱️ Clicking RENT NOW again (retry)...`);
      await this.rentNowButton.click({ timeout: 30000 });
      console.log(`[${new Date().toISOString()}] ✓ RENT NOW button clicked (retry)`);
      
      // Re-detect error
      console.log(`[${new Date().toISOString()}] 🔍 Re-detecting error...`);
      errorMessage = await this.detectErrorMessage();
      
      if (errorMessage && !errorMessage.startsWith('FAILED to fetch')) {
        console.log(`[${new Date().toISOString()}] ✅ Error detected on retry: ${errorMessage}`);
        return errorMessage;
      }
      
      // Still no error after retry
      console.log(`[${new Date().toISOString()}] ❌ Still no error after retry`);
      return 'FAILED to fetch Error Message @ Step-5 (Single-Page - After RENT NOW click)';
      
    } catch (error) {
      const errorMsg = `❌ Failed to click RENT NOW button - ${(error as Error).message}`;
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
    errorMessage = await this.pollingErrorCheck();
    if (errorMessage) {
      console.log('✓ Error detected via polling');
      return errorMessage;
    }

    // If we reach here after clicking RENT NOW, we FAILED to fetch the error
    console.error('❌ No error message found after RENT NOW click - detection failed');
    return 'FAILED to fetch Error Message @ Step-5 (Single-Page - After RENT NOW click)';
  }

  /**
   * Quick error check - IMMEDIATE check (no delay)
   */
  private async quickErrorCheck(): Promise<string> {
    // Check immediately - no waiting
    
    // PRIORITY CHECK 1: Look for error details paragraph INSIDE toast notification
    // This is the specific error message (not the title)
    const errorDetailsParagraphs = this.page.locator('[data-id*="toast-notification"], .toast-container').locator('p');
    const count = await errorDetailsParagraphs.count().catch(() => 0);
    
    if (count > 0) {
      // Get all paragraphs and filter to find the details (skip single-word titles)
      for (let i = 0; i < count; i++) {
        const paragraph = errorDetailsParagraphs.nth(i);
        try {
          if (await paragraph.isVisible({ timeout: 500 })) {
            const text = await paragraph.innerText();
            const cleanText = text.trim();
            
            // Skip title-like text (single words or very short)
            // Keep error details (longer descriptions)
            if (cleanText.length > 15 && !cleanText.match(/^(Error|Warning|Success|Info|occurred)$/i)) {
              console.log(`🔍 Found error details: "${cleanText}"`);
              return cleanText;
            }
          }
        } catch (e) {
          // Skip if not visible
        }
      }
    }
    
    // PRIORITY CHECK 2: Look for response/error code patterns
    const detailedError = this.page.locator('p').filter({ hasText: /Response Code|error|invalid|declined/i }).first();
    if (await detailedError.isVisible({ timeout: 500 })) {
      const text = await detailedError.innerText();
      if (text.trim() && text.length > 15) {
        return text.trim();
      }
    }
    
    // CHECK 3: Toast body (get paragraph content, not just heading)
    const toastBody = this.page.locator('.toast-container .toast-body, [data-id*="toast-notification"]');
    if (await toastBody.isVisible({ timeout: 500 })) {
      const message = await toastBody.innerText();
      const cleanedMsg = this.extractErrorDetailsFromToast(message);
      if (cleanedMsg) {
        return cleanedMsg;
      }
    }

    return '';
  }

  /**
   * Extract error details from toast text
   * Removes titles like "Error occurred" and keeps the actual error message
   */
  private extractErrorDetailsFromToast(fullText: string): string {
    if (!fullText) return '';
    
    const lines = fullText.split('\n').map(l => l.trim()).filter(l => l);
    
    // Remove common titles
    const titles = ['Error', 'Error occurred', 'Warning', 'Success', 'Info', 'Close'];
    
    // Find the longest meaningful line (usually the error details)
    const details = lines.filter(line => {
      return line.length > 15 && !titles.includes(line);
    });
    
    if (details.length > 0) {
      return details.join(' - '); // Join multiple details with separator
    }
    
    // If no details found, return the first non-title line
    const nonTitleLines = lines.filter(line => !titles.includes(line));
    if (nonTitleLines.length > 0) {
      return nonTitleLines.join(' - ');
    }
    
    return '';
  }

  /**
   * Active polling - check every 500ms for up to 15 seconds
   */
  private async pollingErrorCheck(): Promise<string> {
    console.log('📡 Active polling for errors...');
    
    for (let i = 0; i < 30; i++) { // 30 attempts x 500ms = 15 seconds
      try {
        await this.wait(500);
        
        // PRIORITY CHECK 1: Look for error details paragraph INSIDE toast notification
        // This is the specific error message (not the title)
        const errorDetailsParagraphs = this.page.locator('[data-id*="toast-notification"], .toast-container').locator('p');
        const count = await errorDetailsParagraphs.count().catch(() => 0);
        
        if (count > 0) {
          // Get all paragraphs and filter to find the details (skip single-word titles)
          for (let j = 0; j < count; j++) {
            const paragraph = errorDetailsParagraphs.nth(j);
            try {
              if (await paragraph.isVisible({ timeout: 300 })) {
                const text = await paragraph.innerText();
                const cleanText = text.trim();
                
                // Skip title-like text (single words or very short)
                // Keep error details (longer descriptions)
                if (cleanText.length > 15 && !cleanText.match(/^(Error|Warning|Success|Info|occurred)$/i)) {
                  console.log(`✓ Error found at poll ${i + 1}`);
                  return cleanText;
                }
              }
            } catch (e) {
              // Skip if not visible
            }
          }
        }
        
        // PRIORITY CHECK 2: Look for response/error code patterns
        const detailedError = this.page.locator('p').filter({ hasText: /Response Code|error|invalid|declined/i }).first();
        if (await detailedError.isVisible({ timeout: 300 })) {
          const text = await detailedError.innerText();
          if (text.trim() && text.length > 15) {
            console.log(`✓ Error found at poll ${i + 1}`);
            return text.trim();
          }
        }
        
        // CHECK 3: Toast body first (get paragraph content, not just heading)
        const toastBody = this.page.locator('.toast-container .toast-body, [data-id*="toast-notification"]');
        if (await toastBody.isVisible({ timeout: 300 })) {
          const message = await toastBody.innerText();
          const cleanedMsg = this.extractErrorDetailsFromToast(message);
          if (cleanedMsg) {
            console.log(`✓ Error found at poll ${i + 1}`);
            return cleanedMsg;
          }
        }
        
        // CHECK 4: Toast container (fallback)
        const toastContainer = this.page.locator('.toast-container').first();
        if (await toastContainer.isVisible({ timeout: 300 })) {
          const toastText = await toastContainer.innerText();
          if (toastText && toastText.trim()) {
            console.log(`✓ Error found at poll ${i + 1}`);
            return toastText.trim();
          }
        }

        // CHECK 5: Common error selectors
        const errorLocators = [
          this.page.locator('.alert-danger').first(),
          this.page.locator('[role="alert"]').first(),
          this.page.locator('text=/error|Error|invalid|Invalid|declined|Declined/i').first()
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
    
    // Polling completed - no error found
    console.log('⚠️  Polling completed - no error message detected');
    return '';
  }
}
