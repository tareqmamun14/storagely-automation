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
  }): Promise<void> {
    console.log(`[${new Date().toISOString()}] 📝 Starting single-page rental form fill...`);
    
    try {
      // Wait for form to be ready using lightweight JS polling (avoids CDP congestion in headed mode)
      // CDP-based waitFor() can take 70-130s during heavy page loads due to message queueing
      let formReady = false;
      for (let i = 0; i < 30; i++) {
        try {
          formReady = await this.page.evaluate(() => {
            const el = document.querySelector('input[name="first_name"], input[name="firstName"]') 
                     || document.querySelector('[role="textbox"][name*="irst"]');
            return el !== null && (el as HTMLElement).offsetParent !== null;
          });
          if (formReady) break;
        } catch { /* page not ready yet */ }
        await new Promise(r => setTimeout(r, 500));
      }
      if (!formReady) {
        // Fallback: try the Playwright waitFor if JS polling didn't find it
        await this.firstNameField.waitFor({ state: 'visible', timeout: 10000 });
      }
      this.ensurePageAlive('form initialization');
      
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
    
    // First Name - fill() auto-focuses the field, no separate click needed
    await this.safeScroll(this.firstNameField);
    await this.firstNameField.fill(userData.firstName, { timeout: 5000 });
    console.log(`  ✓ Filled First Name: ${userData.firstName}`);
    
    // Last Name
    await this.safeScroll(this.lastNameField);
    await this.lastNameField.fill(userData.lastName, { timeout: 5000 });
    console.log(`  ✓ Filled Last Name: ${userData.lastName}`);
    
    // Email
    await this.safeScroll(this.emailField);
    await this.emailField.fill(userData.email, { timeout: 5000 });
    console.log(`  ✓ Filled Email: ${userData.email}`);
    
    // Phone
    await this.safeScroll(this.phoneField);
    await this.phoneField.fill(userData.phone, { timeout: 5000 });
    console.log(`  ✓ Filled Phone: ${userData.phone}`);
    
    // Address, City, State, Zip - optional fields in tenant section
    // NOTE: Many SSM platform sites (yourway, purely) don't have these here — only in Payment section
    try {
      const addressVisible = await this.addressField.isVisible({ timeout: 2000 }).catch(() => false);
      if (addressVisible) {
        await this.safeScroll(this.addressField);
        await this.addressField.fill(userData.address, { timeout: 5000 });
        console.log(`  ✓ Filled Address: ${userData.address}`);
        
        // Click elsewhere on the page to dismiss any autocomplete/suggestion overlays
        await this.wait(300);
        await this.page.locator('body').click({ position: { x: 0, y: 0 }, force: true });
        await this.wait(200);
        console.log('  ✓ Clicked away to dismiss address suggestions');
      } else {
        console.log('  - Address field not in tenant section, will fill in payment section');
      }
    } catch {
      console.log('  - Address field not found in tenant section, skipping');
    }
    
    try {
      const cityVisible = await this.cityField.isVisible({ timeout: 2000 }).catch(() => false);
      if (cityVisible) {
        await this.safeScroll(this.cityField);
        await this.cityField.fill(userData.city, { timeout: 5000 });
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
      } else if (currentUrl.includes('sunbirdstorage.com')) {
        stateValue = userData.province.northCarolina || 'North Carolina';
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
      await this.zipField.fill(userData.zipCode, { timeout: 5000 });
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
      
      // License Number - fill() auto-focuses the field
      await this.safeScroll(this.driversLicenseField);
      await this.driversLicenseField.fill('123456789', { timeout: 5000 });
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
   * OPTIMIZED: Uses JS evaluate to open dropdown (bypasses overlay interception),
   * then clicks data-id items directly. Keyboard fallback as last resort.
   */
  private async selectDropdownOption(
    field: any,
    optionText: string,
    fieldName: string,
    exactMatch: boolean = false
  ): Promise<void> {
    await this.safeScroll(field);
    
    // Strategy 1 (FAST): JS-click to open dropdown → click data-id item
    // evaluate .click() always reaches the element regardless of overlays
    try {
      await field.evaluate((el: HTMLElement) => { el.focus(); el.click(); });
      await this.wait(400);
      
      // Look for visible dropdown-list-item matching the text
      const dataIdOption = this.page.locator('[data-id="dropdown-list-item"]').filter({ hasText: optionText });
      if (await dataIdOption.first().isVisible({ timeout: 1200 }).catch(() => false)) {
        await dataIdOption.first().evaluate((el: HTMLElement) => el.click());
        console.log(`  ✓ Selected ${fieldName}: ${optionText}`);
        return;
      }
      
      // Items might not use data-id — try visible paragraph in dropdown
      const paragraphOption = this.page.getByRole('paragraph').filter({ hasText: optionText });
      if (await paragraphOption.first().isVisible({ timeout: 600 }).catch(() => false)) {
        await paragraphOption.first().evaluate((el: HTMLElement) => el.click());
        console.log(`  ✓ Selected ${fieldName}: ${optionText} (paragraph)`);
        return;
      }
    } catch (error) {
      // Continue to fallback
    }
    
    // Strategy 2: Type-to-filter → click filtered data-id item
    // Useful when there are many items (50 states) — typing narrows the list
    try {
      await field.evaluate((el: HTMLElement) => { el.focus(); el.click(); });
      // Use keyboard to clear and type (avoids fill() which can close dropdown)
      await this.page.keyboard.press('Control+A');
      await this.page.keyboard.press('Backspace');
      await this.wait(150);
      await field.pressSequentially(optionText.substring(0, 4), { delay: 30 });
      await this.wait(400);
      
      const dataIdOption = this.page.locator('[data-id="dropdown-list-item"]').filter({ hasText: optionText });
      if (await dataIdOption.first().isVisible({ timeout: 800 }).catch(() => false)) {
        await dataIdOption.first().evaluate((el: HTMLElement) => el.click());
        console.log(`  ✓ Selected ${fieldName}: ${optionText} (filtered)`);
        return;
      }
      
      // Try paragraph match on filtered list
      const paragraphOption = this.page.getByRole('paragraph').filter({ hasText: optionText });
      if (await paragraphOption.first().isVisible({ timeout: 500 }).catch(() => false)) {
        await paragraphOption.first().evaluate((el: HTMLElement) => el.click());
        console.log(`  ✓ Selected ${fieldName}: ${optionText} (filtered paragraph)`);
        return;
      }
    } catch (error) {
      // Continue to final fallback
    }
    
    // Strategy 3: role=option or direct text click (non-Storagely dropdowns)
    try {
      await field.click({ force: true, timeout: 2000 });
      await this.wait(300);
      
      const listboxOption = this.page.getByRole('option', { name: optionText });
      if (await listboxOption.first().isVisible({ timeout: 800 }).catch(() => false)) {
        await listboxOption.first().click({ force: true, timeout: 1500 });
        console.log(`  ✓ Selected ${fieldName}: ${optionText} (listbox)`);
        return;
      }
      
      const textOption = exactMatch
        ? this.page.getByText(optionText, { exact: true })
        : this.page.getByText(optionText);
      if (await textOption.first().isVisible({ timeout: 600 }).catch(() => false)) {
        await textOption.first().click({ force: true, timeout: 1500 });
        console.log(`  ✓ Selected ${fieldName}: ${optionText} (text)`);
        return;
      }
    } catch (error) {
      // Continue
    }
    
    console.log(`  ⚠ ${fieldName}: could not select "${optionText}"`);
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
      await field.fill(value, { timeout: 5000 });
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
    
    // Card Number - fill() auto-focuses
    await this.safeScroll(this.cardNumberField);
    await this.cardNumberField.fill(paymentData.cardNumber, { timeout: 5000 });
    console.log(`  ✓ Filled Card Number: ${paymentData.cardNumber}`);
    
    // Expiry
    await this.safeScroll(this.expiryField);
    await this.expiryField.fill(paymentData.expiryDate, { timeout: 5000 });
    console.log(`  ✓ Filled Expiry: ${paymentData.expiryDate}`);
    
    // CVV
    await this.safeScroll(this.cvvField);
    await this.cvvField.fill(paymentData.cvv, { timeout: 5000 });
    console.log(`  ✓ Filled CVV: ${paymentData.cvv}`);
    
    // Billing Address - type, then select first dropdown option
    try {
      await this.safeScroll(this.billingAddressField);
      await this.billingAddressField.fill(billingAddress, { timeout: 5000 });
      console.log(`  ✓ Typed Billing Address: ${billingAddress}`);
      
      // Wait for dropdown to appear and select first option
      await this.wait(700);
      await this.page.keyboard.press('ArrowDown');
      await this.wait(300);
      await this.page.keyboard.press('Enter');
      console.log('  ✓ Selected first address from dropdown');

      // Click elsewhere to dismiss any address autocomplete/suggestion overlays
      await this.wait(300);
      await this.page.locator('body').click({ position: { x: 0, y: 0 }, force: true });
      await this.wait(200);
      console.log('  ✓ Clicked away to dismiss address suggestions');
    } catch {
      console.log('  - Billing address not found, skipping');
    }
    
    // Billing City
    try {
      await this.safeScroll(this.billingCityField);
      await this.billingCityField.fill(billingCity, { timeout: 5000 });
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
      } else if (currentUrl.includes('sunbirdstorage.com')) {
        stateName = province.northCarolina || 'North Carolina';
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
      await this.billingZipField.fill(billingZip, { timeout: 5000 });
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
              await this.safeScroll(label);
              await label.click({ force: true, timeout: 3000 });
              console.log(`  ✓ Clicked label for checkbox "${id}"`);
              console.log('✅ Agreement toggle completed');
              return;
            } else {
              await checkbox.check({ force: true, timeout: 3000 });
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
      await this.safeScroll(this.agreementText);
      await this.agreementText.click({ force: true, timeout: 3000 });
      await this.wait(300);
      
      await this.safeScroll(this.agreementToggle);
      await this.agreementToggle.click({ force: true, timeout: 3000 });
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
          await this.safeScroll(checkbox);
          await checkbox.check({ force: true, timeout: 3000 });
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
          await this.safeScroll(cb);
          await cb.check({ force: true, timeout: 3000 });
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
      await this.safeScroll(this.rentNowButton);
      await this.rentNowButton.waitFor({ state: 'visible', timeout: 5000 });
      await this.wait(300);
      
      // Click the button
      console.log(`[${new Date().toISOString()}] 🖱️ Clicking RENT NOW...`);
      await this.rentNowButton.click({ force: true, timeout: 5000 });
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
      await this.rentNowButton.click({ force: true, timeout: 5000 });
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
    
    for (let i = 0; i < 20; i++) { // 20 attempts x 500ms = 10 seconds
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
