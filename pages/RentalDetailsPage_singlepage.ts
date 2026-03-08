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
    // IMPORTANT: Do NOT use getByPlaceholder('Address') without exact:true —
    // it matches "Email address" too, causing a strict mode violation that
    // silently fails the whole .or() chain.
    return this.page.locator('#tenant-address-input')
      .or(this.page.getByPlaceholder('Street address', { exact: true }))
      .or(this.page.getByRole('textbox', { name: 'Street address' }))
      .or(this.page.locator('input[name="address"]'))
      .or(this.page.getByPlaceholder('Address', { exact: true }));
  }
  
  private get cityField() {
    return this.page.getByRole('textbox', { name: 'City' })
      .or(this.page.locator('input[name="city"]'))
      .or(this.page.getByPlaceholder('City'));
  }
  
  private get stateField() {
    return this.page.getByRole('textbox', { name: 'State', exact: true })
      .or(this.page.getByRole('textbox', { name: 'Province', exact: true }))
      .or(this.page.locator('input[name="state"]'))
      .or(this.page.locator('input[name="province"]'));
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
      .or(this.page.getByRole('textbox', { name: 'Province', exact: true }).last())
      .or(this.page.locator('input[name="billing_state"]'));
  }
  
  private get billingZipField() {
    return this.page.getByRole('textbox', { name: 'Zip' }).last()
      .or(this.page.getByRole('textbox', { name: 'Postal Code' }).last())
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
   * Check if the page/browser is still alive and responsive
   */
  private isPageAlive(): boolean {
    try {
      return !this.page.isClosed();
    } catch {
      return false;
    }
  }

  /**
   * Guard that throws if page is closed — prevents cascading errors
   */
  private ensurePageAlive(context: string): void {
    if (!this.isPageAlive()) {
      throw new Error(`Page/browser closed during ${context} — likely caused by a site crash or third-party script`);
    }
  }

  /**
   * Safe scrollIntoViewIfNeeded with short timeout
   */
  private async safeScroll(locator: any, timeout: number = 3000): Promise<void> {
    try {
      await locator.scrollIntoViewIfNeeded({ timeout });
    } catch {
      // Scroll failure is non-critical — element might already be in view
    }
  }

  // ============================================
  // TWO-STEP LAYOUT DETECTION & HELPERS
  // ============================================

  /**
   * Detect if the current page is a two-step layout (e.g. Minimall Storage).
   * Step 4 has tenant details + captcha + "CONTINUE TO NEXT STEP";
   * Step 5 (step=2) has payment details + "Rent Now".
   */
  private async isTwoStepLayout(): Promise<boolean> {
    try {
      // Same button element used in rentReservation step-four flow
      const continueBtn = this.page.getByRole('button', { name: 'CONTINUE TO NEXT STEP' });
      return await continueBtn.isVisible({ timeout: 3000 });
    } catch {
      return false;
    }
  }

  /**
   * Click "CONTINUE TO NEXT STEP" button (same element as rentReservation step-four).
   * Used in two-step layouts like Minimall Storage.
   */
  private async clickContinueToNextStep(): Promise<void> {
    console.log(`[${new Date().toISOString()}] 📍 Clicking "CONTINUE TO NEXT STEP"...`);
    const continueBtn = this.page.getByRole('button', { name: 'CONTINUE TO NEXT STEP' });
    await this.safeScroll(continueBtn);
    await continueBtn.waitFor({ state: 'visible', timeout: 10000 });
    await continueBtn.click({ timeout: 10000 });
    console.log(`[${new Date().toISOString()}] ✅ "CONTINUE TO NEXT STEP" clicked`);
    // Wait for step=2 page to load
    await this.page.waitForLoadState('domcontentloaded', { timeout: 30000 });
    await this.wait(3000);
    console.log(`[${new Date().toISOString()}] ✅ Step 5 (step=2) page loaded: ${this.page.url()}`);
  }

  /**
   * Fill complete single-page rental form using exact Playwright codegen selectors.
   * Supports both true single-page layouts AND two-step layouts (like Minimall Storage).
   *
   * @param userData - user/test data for all form fields
   * @param hasStepFourCaptcha - true if hCaptcha appears on Step 4 (before "Continue to next step")
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
      alabama?: string,
      northCarolina?: string,
      georgia?: string,
      arizona?: string,
      colorado?: string
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
  }, hasStepFourCaptcha: boolean = false): Promise<void> {
    console.log(`[${new Date().toISOString()}] 📝 Starting single-page rental form fill...`);
    
    try {
      // Wait for form to be ready
      await this.wait(2000);
      this.ensurePageAlive('form initialization');

      // Detect two-step layout (e.g. Minimall Storage)
      const twoStep = await this.isTwoStepLayout();

      if (twoStep) {
        // ══════════════════════════════════════════════
        // TWO-STEP FLOW (Step 4 → Step 5)
        // e.g. Minimall Storage: Tenant + Captcha → Payment + RENT NOW
        // Step 4: Tenant details + hCaptcha + "Continue to next step"
        // Step 5 (step=2): Payment details only → "Rent Now"
        // ══════════════════════════════════════════════
        console.log(`[${new Date().toISOString()}] 🔀 Two-step layout detected — Step 4 → Step 5 flow`);

        // STEP 4: Tenant Details
        console.log(`[${new Date().toISOString()}] 📋 [Step 4] Filling tenant details...`);
        await this.fillTenantDetails(userData);
        this.ensurePageAlive('after tenant details (step 4)');

        // STEP 4: hCaptcha — wait for manual solve before continuing
        if (hasStepFourCaptcha) {
          console.log(`[${new Date().toISOString()}] 🛑 [Step 4] hCaptcha detected — waiting for manual solve...`);
          await this.waitForManualCaptcha();
          this.ensurePageAlive('after captcha solve (step 4)');
        }

        // STEP 4 → STEP 5: Click "CONTINUE TO NEXT STEP"
        // Same button element used in rentReservation step-four flow
        await this.clickContinueToNextStep();
        this.ensurePageAlive('after continue to step 5');

        // STEP 5 (step=2): Card details ONLY — billing address/city/state/zip already carried over from step 4
        console.log(`[${new Date().toISOString()}] 💳 [Step 5] Filling card details only (billing fields pre-filled from step 4)...`);
        await this.fillCardDetailsOnly(userData.paymentInfo);
        this.ensurePageAlive('after card details (step 5)');

        console.log(`[${new Date().toISOString()}] ✅ Two-step rental form completed (Step 4 + Step 5)`);

      } else {
        // ══════════════════════════════════════════════
        // SINGLE-PAGE FLOW (original — all on one page)
        // ══════════════════════════════════════════════
        console.log(`[${new Date().toISOString()}] 📄 Single-page layout — filling all sections on one page`);

        // Fill all sections with page-alive guards between each
        console.log(`[${new Date().toISOString()}] 📋 Filling tenant details...`);
        await this.fillTenantDetails(userData);
        this.ensurePageAlive('after tenant details');

        console.log(`[${new Date().toISOString()}] 🪪 Filling driver's license details...`);
        await this.fillDriversLicenseDetails();
        this.ensurePageAlive('after driver\'s license');

        console.log(`[${new Date().toISOString()}] 💳 Filling payment details...`);
        await this.fillPaymentDetails(userData.paymentInfo, userData.address, userData.city, userData.zipCode, userData.province);
        this.ensurePageAlive('after payment details');

        console.log(`[${new Date().toISOString()}] ✅ Enabling agreement toggle...`);
        await this.enableAgreementToggle();

        console.log(`[${new Date().toISOString()}] ✅ Single-page rental form completed`);
      }
      
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
    await this.safeScroll(this.firstNameField);
    await this.firstNameField.click();
    await this.firstNameField.fill(userData.firstName);
    console.log(`  ✓ Filled First Name: ${userData.firstName}`);
    
    // Last Name - click then fill
    await this.safeScroll(this.lastNameField);
    await this.lastNameField.click();
    await this.lastNameField.fill(userData.lastName);
    console.log(`  ✓ Filled Last Name: ${userData.lastName}`);
    
    // Email - click then fill
    await this.safeScroll(this.emailField);
    await this.emailField.click();
    await this.emailField.fill(userData.email);
    console.log(`  ✓ Filled Email: ${userData.email}`);
    
    // Phone - click then fill
    await this.safeScroll(this.phoneField);
    await this.phoneField.click();
    await this.phoneField.fill(userData.phone);
    console.log(`  ✓ Filled Phone: ${userData.phone}`);
    
    // Small wait to let the page settle after phone fill (Vue.js reactivity / Google Places init)
    await this.wait(500);

    // Address, City, State, Zip - optional fields in tenant section
    // NOTE: Many SSM platform sites (yourway, purely) don't have these here — only in Payment section
    try {
      const addressVisible = await this.addressField.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false);
      if (addressVisible) {
        await this.safeScroll(this.addressField);
        await this.addressField.click();
        await this.addressField.fill(userData.address);
        console.log(`  ✓ Filled Address: ${userData.address}`);
        
        // Blank click on a heading to dismiss Google Places autocomplete suggestions
        // Same pattern as RentalDetailsPage_stepfour summaryHeading.click()
        await this.wait(500);
        try {
          const heading = this.page.getByRole('heading', { name: 'Tenant Details' })
            .or(this.page.getByRole('heading', { name: 'Summary of Rental' }));
          await heading.first().click({ timeout: 2000 });
        } catch {
          // Fallback: click body if no heading found
          await this.page.locator('body').click({ position: { x: 0, y: 0 }, force: true });
        }
        await this.wait(300);
        console.log('  ✓ Clicked heading to dismiss address suggestions');
      } else {
        console.log('  - Address field not in tenant section, will fill in payment section');
      }
    } catch {
      console.log('  - Address field not found in tenant section, skipping');
    }
    
    try {
      const cityVisible = await this.cityField.waitFor({ state: 'visible', timeout: 3000 }).then(() => true).catch(() => false);
      if (cityVisible) {
        await this.safeScroll(this.cityField);
        await this.cityField.click();
        await this.cityField.fill(userData.city);
        console.log(`  ✓ Filled City: ${userData.city}`);
      } else {
        console.log('  - City field not in tenant section, will fill in payment section');
      }
    } catch {
      console.log('  - City field not found in tenant section, skipping');
    }
    
    // State/Province dropdown - select appropriate value based on location
    try {
      let stateValue = 'Alabama'; // Default
      let fieldLabel = 'State';
      
      // Determine which province/state to use based on current URL
      const currentUrl = this.page.url();
      if (currentUrl.includes('bluebirdstorage.ca')) {
        stateValue = userData.province.alberta || 'Alberta';
        fieldLabel = 'Province';
      } else if (currentUrl.includes('columbiaselfstorage.com')) {
        stateValue = userData.province.newJersey || 'New Jersey';
      } else if (currentUrl.includes('firststorage.com')) {
        stateValue = userData.province.alabama || 'Alabama';
      } else if (currentUrl.includes('yourwaystorage.com')) {
        stateValue = userData.province.georgia || 'Georgia';
      } else if (currentUrl.includes('purelystorage.com')) {
        stateValue = userData.province.arizona || 'Arizona';
      } else if (currentUrl.includes('redrocksstorage.com')) {
        stateValue = userData.province.colorado || 'Colorado';
      } else if (currentUrl.includes('storagestar.com')) {
        stateValue = userData.province.colorado || 'Colorado';
      } else if (currentUrl.includes('sunbirdstorage.com')) {
        stateValue = userData.province.northCarolina || 'North Carolina';
      } else if (currentUrl.includes('minimallstorage.com') || currentUrl.includes('mini-mall-storage')) {
        stateValue = userData.province.alabama || 'Alabama';
      } else if (userData.province.alabama) {
        stateValue = userData.province.alabama;
      }
      
      await this.selectDropdownOption(
        this.stateField,
        stateValue,
        fieldLabel
      );
    } catch {
      console.log('  - State/Province field not found, skipping');
    }
    
    try {
      await this.safeScroll(this.zipField);
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
      await this.safeScroll(this.driversLicenseField);
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
    await this.safeScroll(field);
    await field.click({ timeout: 5000 });
    
    // Strategy 1: Use data-id attribute (most reliable and fast)
    try {
      await this.page.locator('[data-id="dropdown-list-container"]').waitFor({ state: 'visible', timeout: 1500 });
      const option = this.page.locator('[data-id="dropdown-list-item"]').filter({ hasText: optionText });
      await option.first().click({ timeout: 1000 });
      console.log(`  ✓ Selected ${fieldName}: ${optionText}`);
      return;
    } catch (error) {
      // Fallback to type-to-filter approach
    }
    
    // Strategy 2: Type-to-filter — clear field, type the value, then pick from filtered dropdown
    // This is more reliable for multi-word states like "North Carolina"
    try {
      // Clear any existing value and type the option text to filter the dropdown
      await field.fill('');
      await this.wait(200);
      await field.pressSequentially(optionText, { delay: 30 });
      await this.wait(600);
      
      // Try data-id dropdown items first (filtered list)
      const dataIdOption = this.page.locator('[data-id="dropdown-list-item"]').filter({ hasText: optionText });
      if (await dataIdOption.first().isVisible({ timeout: 1000 }).catch(() => false)) {
        await dataIdOption.first().click({ timeout: 1500 });
        console.log(`  ✓ Selected ${fieldName}: ${optionText} (type-to-filter)`);
        return;
      }
      
      // Try clicking the matching option from any visible dropdown/listbox
      const listboxOption = this.page.getByRole('option', { name: optionText });
      if (await listboxOption.first().isVisible({ timeout: 800 }).catch(() => false)) {
        await listboxOption.first().click({ timeout: 1500 });
        console.log(`  ✓ Selected ${fieldName}: ${optionText} (listbox option)`);
        return;
      }
      
      // Try paragraph filter on the visible dropdown
      const paragraphOption = exactMatch
        ? this.page.getByText(optionText, { exact: true })
        : this.page.getByRole('paragraph').filter({ hasText: optionText });
      
      if (await paragraphOption.first().isVisible({ timeout: 800 }).catch(() => false)) {
        await paragraphOption.first().click({ timeout: 1500 });
        console.log(`  ✓ Selected ${fieldName}: ${optionText} (paragraph match)`);
        return;
      }
    } catch (error) {
      // Continue to keyboard fallback
    }
    
    // Strategy 3: Keyboard-based selection — ArrowDown + Enter
    try {
      // Re-click field to ensure dropdown is open
      await field.click({ timeout: 3000 });
      await field.fill('');
      await this.wait(200);
      await field.pressSequentially(optionText, { delay: 30 });
      await this.wait(500);
      
      // Use keyboard to select the first matching item
      await this.page.keyboard.press('ArrowDown');
      await this.wait(200);
      await this.page.keyboard.press('Enter');
      await this.wait(300);
      
      // Verify the field has the expected value
      const fieldValue = await field.inputValue().catch(() => '');
      if (fieldValue.toLowerCase().includes(optionText.toLowerCase().substring(0, 4))) {
        console.log(`  ✓ Selected ${fieldName}: ${optionText} (keyboard)`);
        return;
      }
    } catch (error) {
      // Continue to final fallback
    }
    
    // Strategy 4: Direct text click fallback
    try {
      const option = this.page.getByText(optionText, { exact: exactMatch });
      await option.first().click({ timeout: 2000 });
      console.log(`  ✓ Selected ${fieldName}: ${optionText} (text fallback)`);
    } catch (fallbackError) {
      console.log(`  - ${fieldName} option not found, skipping`);
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
      await this.safeScroll(field);
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
   * Fill ONLY card details (Card Number, Expiry, CVV).
   * Used exclusively for Minimall Storage's step=2 page where billing
   * address/city/state/zip are already pre-filled from step 4.
   * Does NOT touch billing fields — Minimall only.
   */
  private async fillCardDetailsOnly(paymentData: {
    cardNumber: string,
    expiryDate: string,
    cvv: string
  }): Promise<void> {
    console.log('\n📍 Filling Card Details Only (Minimall step=2)...');

    // Card Number
    await this.safeScroll(this.cardNumberField);
    await this.cardNumberField.click();
    await this.cardNumberField.fill(paymentData.cardNumber);
    console.log(`  ✓ Filled Card Number: ${paymentData.cardNumber}`);

    // Expiry
    await this.safeScroll(this.expiryField);
    await this.expiryField.click();
    await this.expiryField.fill(paymentData.expiryDate);
    console.log(`  ✓ Filled Expiry: ${paymentData.expiryDate}`);

    // CVV
    await this.safeScroll(this.cvvField);
    await this.cvvField.click();
    await this.cvvField.fill(paymentData.cvv);
    console.log(`  ✓ Filled CVV: ${paymentData.cvv}`);

    console.log('✅ Card details completed (billing fields skipped — pre-filled from step 4)');
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
    
    // Card Number
    await this.safeScroll(this.cardNumberField);
    await this.cardNumberField.click();
    await this.cardNumberField.fill(paymentData.cardNumber);
    console.log(`  ✓ Filled Card Number: ${paymentData.cardNumber}`);
    
    // Expiry
    await this.safeScroll(this.expiryField);
    await this.expiryField.click();
    await this.expiryField.fill(paymentData.expiryDate);
    console.log(`  ✓ Filled Expiry: ${paymentData.expiryDate}`);
    
    // CVV
    await this.safeScroll(this.cvvField);
    await this.cvvField.click();
    await this.cvvField.fill(paymentData.cvv);
    console.log(`  ✓ Filled CVV: ${paymentData.cvv}`);
    
    // Billing Address - click, type, then select first dropdown option
    try {
      await this.safeScroll(this.billingAddressField);
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
      await this.safeScroll(this.billingCityField);
      await this.billingCityField.click();
      await this.billingCityField.fill(billingCity);
      console.log(`  ✓ Filled Billing City: ${billingCity}`);
    } catch {
      console.log('  - Billing city not found, skipping');
    }
    
    // Billing State - click field, then select appropriate state
    // Guard: check visibility first to avoid 60s actionTimeout on missing fields
    const billingStateVisible = await this.billingStateField.isVisible({ timeout: 3000 }).catch(() => false);
    if (!billingStateVisible) {
      console.log('  - Billing State/Province field not visible, skipping');
    } else try {
      // Determine which state to use based on current URL
      let stateName = 'North Carolina'; // Default for Clemmons address
      let fieldLabel = 'Billing State';
      const currentUrl = this.page.url();
      
      if (currentUrl.includes('bluebirdstorage.ca')) {
        stateName = province.alberta || 'Alberta';
        fieldLabel = 'Billing Province';
      } else if (currentUrl.includes('columbiaselfstorage.com')) {
        stateName = province.newJersey || 'New Jersey';
      } else if (currentUrl.includes('firststorage.com')) {
        stateName = province.alabama || 'Alabama';
      } else if (currentUrl.includes('yourwaystorage.com')) {
        stateName = province.georgia || 'Georgia';
      } else if (currentUrl.includes('purelystorage.com')) {
        stateName = province.arizona || 'Arizona';
      } else if (currentUrl.includes('redrocksstorage.com')) {
        stateName = province.colorado || 'Colorado';
      } else if (currentUrl.includes('storagestar.com')) {
        stateName = province.colorado || 'Colorado';
      } else if (currentUrl.includes('sunbirdstorage.com')) {
        stateName = province.northCarolina || 'North Carolina';
      } else if (currentUrl.includes('minimallstorage.com') || currentUrl.includes('mini-mall-storage')) {
        stateName = province.alabama || 'Alabama';
      }
      
      await this.selectDropdownOption(
        this.billingStateField,
        stateName,
        fieldLabel
      );
    } catch {
      console.log('  - Billing state not found, skipping');
    }
    
    // Billing Zip/Postal Code
    // Guard: check visibility first to avoid 60s actionTimeout on missing fields
    const billingZipVisible = await this.billingZipField.isVisible({ timeout: 3000 }).catch(() => false);
    if (!billingZipVisible) {
      console.log('  - Billing Zip/Postal Code field not visible, skipping');
    } else try {
      await this.safeScroll(this.billingZipField);
      await this.billingZipField.click({ timeout: 5000 });
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
    
    // Strategy 1: SiteLink format (Bluebird) - Fast path for "I understand" text
    try {
      const checkbox = this.page.locator('input[type="checkbox"]').filter({
        has: this.page.locator('text=/I understand.*failure to complete.*required agreements/i')
      }).first();
      
      const checkboxCount = await checkbox.count().catch(() => 0);
      if (checkboxCount > 0) {
        const isChecked = await checkbox.isChecked().catch(() => false);
        if (!isChecked) {
          await checkbox.check({ force: true, timeout: 1000 });
          console.log('  ✓ Checked agreement checkbox (SiteLink)');
          console.log('✅ Agreement toggle completed');
          return;
        } else {
          console.log('  ✓ Agreement checkbox already checked');
          console.log('✅ Agreement toggle completed');
          return;
        }
      }
    } catch (error) {
      // Continue to next strategy
    }
    
    // Strategy 2: Fast check for common checkbox IDs (storEDGE and others)
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
      const agreementText = this.page.locator('text=/I understand.*failure to complete.*required agreements/i').first();
      const textCount = await agreementText.count().catch(() => 0);
      
      if (textCount > 0) {
        const container = agreementText.locator('xpath=ancestor::div[.//input[@type="checkbox"]][1]').first();
        const checkbox = container.locator('input[type="checkbox"]').first();
        
        // Wait for checkbox to be available
        await checkbox.waitFor({ state: 'attached', timeout: 1000 }).catch(() => {});
        const checkboxCount = await checkbox.count().catch(() => 0);
        
        if (checkboxCount > 0) {
          const isChecked = await checkbox.isChecked().catch(() => false);
          
          if (!isChecked) {
            const checkboxId = await checkbox.getAttribute('id').catch(() => null);
            
            if (checkboxId) {
              const label = this.page.locator(`label[for="${checkboxId}"]`).first();
              await label.waitFor({ state: 'visible', timeout: 1000 }).catch(() => {});
              const labelCount = await label.count().catch(() => 0);
              if (labelCount > 0) {
                await label.scrollIntoViewIfNeeded();
                await label.click({ timeout: 2000 });
                console.log(`  ✓ Clicked label for checkbox "${checkboxId}"`);
                console.log('✅ Agreement toggle completed');
                return;
              }
            }
            
            await checkbox.scrollIntoViewIfNeeded();
            await checkbox.check({ force: true, timeout: 2000 });
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
   * Wait for the user to manually solve hCaptcha.
   * Prints a visible prompt in the terminal, then polls every 2 s until
   * a solved-captcha signal is detected. Checks multiple indicators:
   *   1. textarea[name="h-captcha-response"] has a token value
   *   2. textarea[name="g-recaptcha-response"] has a token value
   *   3. Any element with a non-empty [data-hcaptcha-response] attribute
   * There is NO time limit — it waits as long as you need.
   */
  async waitForManualCaptcha(): Promise<void> {
    const currentUrl = this.page.url();
    // Play audible alert — fire-and-forget so it never blocks Node exit
    try {
      const child = require('child_process').spawn(
        'powershell', ['-NoProfile', '-Command', '[Console]::Beep(1000,600); [Console]::Beep(1500,400)'],
        { stdio: 'ignore', detached: true }
      );
      child.unref();
    } catch { /* ignore if beep fails */ }
    console.log('\n🛑 ═══════════════════════════════════════════════════════════');
    console.log('🛑  hCaptcha DETECTED — Manual step required!');
    console.log(`🛑  URL: ${currentUrl}`);
    console.log('🛑  1. Switch to the BROWSER WINDOW for the URL above');
    console.log('🛑  2. Solve the hCaptcha checkbox / challenge');
    console.log('🛑  3. Automation will continue AUTOMATICALLY once solved');
    console.log('🛑  (No time limit — take as long as you need)');
    console.log('🛑 ═══════════════════════════════════════════════════════════\n');

    const pollInterval = 500; // Check every 500ms for fast detection
    let pollCount = 0;

    // Poll indefinitely until hCaptcha solved signal is found
    while (true) {
      try {
        const solved = await this.page.evaluate(() => {
          // Check 1: textarea[name="h-captcha-response"]
          const hTa = document.querySelector('textarea[name="h-captcha-response"]') as HTMLTextAreaElement | null;
          if (hTa && hTa.value && hTa.value.length > 0) return 'h-captcha-response textarea';

          // Check 2: textarea[name="g-recaptcha-response"] (hCaptcha backwards-compat)
          const gTa = document.querySelector('textarea[name="g-recaptcha-response"]') as HTMLTextAreaElement | null;
          if (gTa && gTa.value && gTa.value.length > 0) return 'g-recaptcha-response textarea';

          // Check 3: [data-hcaptcha-response] attribute on any wrapper element
          const wrapper = document.querySelector('[data-hcaptcha-response]') as HTMLElement | null;
          if (wrapper) {
            const resp = wrapper.getAttribute('data-hcaptcha-response');
            if (resp && resp.length > 0) return 'data-hcaptcha-response attribute';
          }

          // Check 4: iframe with title containing "hCaptcha" that has data-hcaptcha-response
          const iframes = document.querySelectorAll('iframe');
          for (const iframe of iframes) {
            const resp = iframe.getAttribute('data-hcaptcha-response');
            if (resp && resp.length > 0) return 'iframe data-hcaptcha-response';
          }

          return '';
        });

        if (solved) {
          console.log(`✅ hCaptcha solved! (detected via: ${solved}) Continuing automation...\n`);
          return;
        }
      } catch {
        // page might be navigating — ignore
      }

      pollCount++;
      // Log a reminder every 30 seconds (60 polls × 500ms)
      if (pollCount % 60 === 0) {
        console.log(`⏳ Still waiting for hCaptcha solve... (${Math.round(pollCount * 0.5)}s elapsed)`);
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
  }

  /**
   * Click RENT NOW button and capture error message
   */
  async clickRentNowAndCaptureError(hasCaptcha: boolean = false): Promise<string> {
    console.log(`[${new Date().toISOString()}] 📍 FINAL STEP: Clicking RENT NOW button...`);
    
    try {
      // If this customer has hCaptcha, wait for user to solve it first
      if (hasCaptcha) {
        await this.waitForManualCaptcha();
      }

      // Minimize live chat if present
      await this.minimizeLiveChat();
      
      // Wait for rent now button
      await this.safeScroll(this.rentNowButton);
      await this.rentNowButton.waitFor({ state: 'visible', timeout: 5000 });
      await this.wait(500);
      
      // Click the button
      console.log(`[${new Date().toISOString()}] 🖱️ Clicking RENT NOW...`);
      await this.rentNowButton.click({ timeout: 10000 });
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
      await this.wait(1000);
      
      // Click RENT NOW again
      console.log(`[${new Date().toISOString()}] 🖱️ Clicking RENT NOW again (retry)...`);
      await this.rentNowButton.click({ timeout: 10000 });
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
   * Grabs the FULL visible text from any toast/alert — never filters out parts.
   */
  private async quickErrorCheck(): Promise<string> {
    // CHECK 1: Full toast notification text (title + body, everything visible)
    const toastLocators = [
      this.page.locator('[data-id*="toast-notification"]').first(),
      this.page.locator('.toast-container').first(),
    ];

    for (const toast of toastLocators) {
      try {
        if (await toast.isVisible({ timeout: 500 })) {
          const fullText = (await toast.innerText()).trim();
          const cleaned = this.cleanToastText(fullText);
          if (cleaned) {
            console.log(`🔍 Found toast text: "${cleaned}"`);
            return cleaned;
          }
        }
      } catch { /* not visible yet */ }
    }

    // CHECK 2: alert-danger or role=alert
    const alertLocators = [
      this.page.locator('.alert-danger').first(),
      this.page.locator('[role="alert"]').first(),
    ];
    for (const alert of alertLocators) {
      try {
        if (await alert.isVisible({ timeout: 500 })) {
          const text = (await alert.innerText()).trim();
          if (text && text.length < 500) return text;
        }
      } catch { /* not visible */ }
    }

    return '';
  }

  /**
   * Clean toast text: strip only the "Close" / "×" button text, keep everything else.
   */
  private cleanToastText(fullText: string): string {
    if (!fullText) return '';
    const lines = fullText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    // Remove only close-button artefacts
    const meaningful = lines.filter(l => !['Close', '×', 'X', '✕'].includes(l));
    return meaningful.join(' — ');
  }

  /**
   * Active polling - check every 500ms for up to 15 seconds.
   * Uses the same full-text approach as quickErrorCheck.
   */
  private async pollingErrorCheck(): Promise<string> {
    console.log('📡 Active polling for errors...');
    
    for (let i = 0; i < 30; i++) { // 30 attempts × 500ms = 15 seconds
      try {
        await this.wait(500);

        // CHECK 1: Full toast text
        const toastLocators = [
          this.page.locator('[data-id*="toast-notification"]').first(),
          this.page.locator('.toast-container').first(),
        ];
        for (const toast of toastLocators) {
          try {
            if (await toast.isVisible({ timeout: 300 })) {
              const fullText = (await toast.innerText()).trim();
              const cleaned = this.cleanToastText(fullText);
              if (cleaned) {
                console.log(`✓ Error found at poll ${i + 1}`);
                return cleaned;
              }
            }
          } catch { /* not visible yet */ }
        }

        // CHECK 2: alert-danger / role=alert
        const alertLocators = [
          this.page.locator('.alert-danger').first(),
          this.page.locator('[role="alert"]').first(),
        ];
        for (const alert of alertLocators) {
          try {
            if (await alert.isVisible({ timeout: 300 })) {
              const text = (await alert.innerText()).trim();
              if (text && text.length < 500) {
                console.log(`✓ Error found at poll ${i + 1}`);
                return text;
              }
            }
          } catch { /* not visible */ }
        }

      } catch (error) {
        console.warn(`⚠️  Check failed at poll ${i + 1}, continuing...`);
        continue;
      }
    }
    
    console.log('⚠️  Polling completed - no error message detected');
    return '';
  }
}
