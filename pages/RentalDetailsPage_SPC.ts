import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';
import { CURRENT_ENVIRONMENT, Environment } from '../configs/urls';

/** Escape regex metacharacters for safe insertion into a dynamic RegExp source. */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

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
  // NOTE: tenant fields use .first() because some platforms (e.g. storsafe-self-storage)
  // render duplicate name="first_name"/"last_name"/etc inputs on the same page — likely
  // a hidden/secondary section. Billing equivalents below use .last() to pick the payment copy.
  private get firstNameField() {
    return this.page.getByRole('textbox', { name: 'First name' }).first()
      .or(this.page.locator('input[name="first_name"], input[name="firstName"]').first())
      .or(this.page.getByPlaceholder('First name').first());
  }

  private get lastNameField() {
    return this.page.getByRole('textbox', { name: 'Last name' }).first()
      .or(this.page.locator('input[name="last_name"], input[name="lastName"]').first())
      .or(this.page.getByPlaceholder('Last name').first());
  }

  private get emailField() {
    return this.page.getByRole('textbox', { name: 'Email address' }).first()
      .or(this.page.locator('input[name="email"]').first())
      .or(this.page.getByPlaceholder('Email address').first());
  }

  private get phoneField() {
    return this.page.getByRole('textbox', { name: 'Cell phone number' }).first()
      .or(this.page.locator('input[name="phone"], input[name="cell_phone"]').first())
      .or(this.page.getByPlaceholder(/phone/i).first());
  }

  private get addressField() {
    // IMPORTANT: Do NOT use getByPlaceholder('Address') without exact:true —
    // it matches "Email address" too, causing a strict mode violation that
    // silently fails the whole .or() chain.
    return this.page.locator('#tenant-address-input').first()
      .or(this.page.getByPlaceholder('Street address', { exact: true }).first())
      .or(this.page.getByRole('textbox', { name: 'Street address' }).first())
      .or(this.page.locator('input[name="address"]').first())
      .or(this.page.getByPlaceholder('Address', { exact: true }).first());
  }

  private get cityField() {
    return this.page.getByRole('textbox', { name: 'City' }).first()
      .or(this.page.locator('input[name="city"]').first())
      .or(this.page.getByPlaceholder('City').first());
  }

  private get stateField() {
    return this.page.getByRole('textbox', { name: 'State', exact: true }).first()
      .or(this.page.getByRole('textbox', { name: 'Province', exact: true }).first())
      .or(this.page.locator('input[name="state"]').first())
      .or(this.page.locator('input[name="province"]').first());
  }

  private get zipField() {
    return this.page.getByRole('textbox', { name: 'Zip' }).first()
      .or(this.page.locator('input[name="zip"], input[name="zipcode"], input[name="postal_code"]').first())
      .or(this.page.getByPlaceholder(/Zip|Postal/i).first());
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
      .or(this.page.locator('input[name="card_number"], input[name="cardNumber"], input[name="cardnumber"]'))
      .or(this.page.getByPlaceholder('Card Number'))
      .or(this.page.getByPlaceholder('Card number'))
      .or(this.page.getByLabel(/card number/i))
      .or(this.page.locator('input[autocomplete="cc-number"]'));
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
    // Payment section uses id="address-input" specifically. Some pages (e.g. storsafe)
    // also render #tenant-address-input and #alternate-contact-address-input-rounded —
    // matching the bare id is the only reliable way to hit payment without ambiguity.
    return this.page.locator('#address-input').first()
      .or(this.page.getByRole('textbox', { name: 'Street address' }).last())
      .or(this.page.locator('input[name="billing_address"]').first());
  }

  // ============================================
  // ALTERNATE / ADDITIONAL CONTACT SECTION - LOCATORS
  // ============================================
  // Some platforms (e.g. storsafe-self-storage) render an "Additional Contact" / "Alternate Contact"
  // section that is toggled ON by default. Its inputs reuse generic name="first_name"/"last_name"
  // (clashing with tenant inputs) so we scope by parent: alternate_address container,
  // alternate__phone/email wrappers, or the additional-contact section heading.
  private get alternateContactHeading() {
    return this.page.getByRole('heading', { name: /additional contact|alternate contact/i }).first();
  }

  // Scope to the input wrapper class — the input itself is a child of <div class="...alternate__phone">.
  private get alternatePhoneField() {
    return this.page.locator('.alternate__phone input').first();
  }

  private get alternateEmailField() {
    return this.page.locator('.alternate__email input').first();
  }

  // For first/last name we anchor via the alternate address input's ancestor, since the
  // alternate section is the only place with id="alternate-contact-address-input-rounded".
  // Using xpath ancestor to find the section root, then descendant input[name="first_name"].
  private get alternateFirstNameField() {
    return this.page.locator(
      'xpath=//input[@id="alternate-contact-address-input-rounded"]/ancestor::div[contains(@class,"flex-col") and .//h3][1]//input[@name="first_name"]'
    ).first();
  }

  private get alternateLastNameField() {
    return this.page.locator(
      'xpath=//input[@id="alternate-contact-address-input-rounded"]/ancestor::div[contains(@class,"flex-col") and .//h3][1]//input[@name="last_name"]'
    ).first();
  }

  private get alternateAddressField() {
    return this.page.locator('#alternate-contact-address-input-rounded').first();
  }

  private get alternateCityField() {
    return this.page.locator(
      'xpath=//input[@id="alternate-contact-address-input-rounded"]/ancestor::div[contains(@class,"flex-col") and .//h3][1]//input[@name="city"]'
    ).first();
  }

  private get alternateZipField() {
    return this.page.locator(
      'xpath=//input[@id="alternate-contact-address-input-rounded"]/ancestor::div[contains(@class,"flex-col") and .//h3][1]//input[@name="zip"]'
    ).first();
  }
  
  private get billingCityField() {
    return this.page.getByRole('textbox', { name: 'City' }).last()
      .or(this.page.locator('input[name="billing_city"]'));
  }
  
  private get billingStateField() {
    return this.page.getByRole('textbox', { name: 'State', exact: true }).last()
      .or(this.page.getByRole('textbox', { name: 'Province', exact: true }).last())
      .or(this.page.locator('input[name="billing_state"]'))
      .or(this.page.locator('input[name="state"]').last());
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

  private async getClickableRentNowButton() {
    const candidates = this.page.locator('button#rent-now, button:has-text("Rent Now"), button:has-text("RENT NOW")');
    const count = await candidates.count();

    for (let i = 0; i < count; i++) {
      const candidate = candidates.nth(i);
      const isVisible = await candidate.isVisible().catch(() => false);
      const isEnabled = await candidate.isEnabled().catch(() => false);
      if (!isVisible || !isEnabled) continue;

      const className = (await candidate.getAttribute('class')) || '';
      const ariaDisabled = (await candidate.getAttribute('aria-disabled')) || 'false';
      const disabledAttr = await candidate.getAttribute('disabled');

      if (className.includes('pointer-events-none') || ariaDisabled === 'true' || disabledAttr !== null) {
        continue;
      }

      return candidate;
    }

    return this.rentNowButton.first();
  }

  private normalizeCapturedError(text: string): string {
    return text.replace(/\s+/g, ' ').trim();
  }

  private extractErrorFromRawBody(body: string): string {
    const normalized = this.normalizeCapturedError(body);
    if (!normalized) return '';

    const paymentKeywords = [
      'response code',
      'payment failed',
      'invalid card',
      'card number',
      'invalid account data',
      'could not save payment method',
      'could not initialize transaction',
      'unit is not available',
      'reason text',
      'reason code'
    ];

    const lower = normalized.toLowerCase();
    if (paymentKeywords.some(keyword => lower.includes(keyword))) {
      return normalized.length > 500 ? normalized.substring(0, 500) : normalized;
    }

    return '';
  }

  private async deepExtractToastText(): Promise<string> {
    try {
      const text = await this.page.evaluate(() => {
        const containers = document.querySelectorAll(
          '[data-id*="toast-notification"], .toast-container, .toast, [role="alert"], .Toastify__toast'
        );
        for (const container of containers) {
          if (!(container as HTMLElement).offsetParent && !(container as HTMLElement).getBoundingClientRect().height) continue;
          const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
          const parts: string[] = [];
          let node: Node | null;
          while ((node = walker.nextNode())) {
            const t = (node.textContent || '').trim();
            if (t && !['Close', '×', 'X', '✕'].includes(t)) parts.push(t);
          }
          const joined = parts.join(' ').replace(/\s+/g, ' ').trim();
          if (joined && joined.length > 5) return joined;
        }
        return '';
      });
      if (text) {
        console.log(`🔍 Deep toast extraction found: "${text}"`);
      }
      return text;
    } catch {
      return '';
    }
  }

  private async scanVisiblePageForPaymentError(): Promise<string> {
    const meaningfulErrorPattern = /response code|payment failed|not a valid credit card number|invalid account data|invalid card number|could not save payment method|could not initialize transaction|unit is not available|reason text|reason code|your card number is incorrect/i;

    const keywordLocators = [
      this.page.locator('text=/Response Code|Payment failed|not a valid credit card number|Invalid Account Data|Invalid Card Number|Reason Text|Reason Code|Your card number is incorrect|Could not save payment method|Unit is not available/i').first(),
      this.page.locator('p, div, span').filter({ hasText: meaningfulErrorPattern }).first(),
      this.page.locator('.text-white, .text-red-500, .toast-body, [role="alert"]').filter({ hasText: meaningfulErrorPattern }).first(),
    ];

    for (const locator of keywordLocators) {
      try {
        if (await locator.isVisible({ timeout: 300 })) {
          const text = this.normalizeCapturedError(await locator.innerText());
          if (text && text.length >= 20 && meaningfulErrorPattern.test(text)) {
            return text;
          }
        }
      } catch {
        // keep scanning
      }
    }

    return '';
  }

  // ============================================
  // DISCOUNT TIMING & BREAKDOWN
  // ============================================

  // Flex renders a custom <select>-style "When to Apply Discount" control —
  // NOT a native <select> and NOT label-associated. Verified live on Safeguard:
  //   <div class="relative flex flex-col gap-px" options="…" modelvalue="…">
  //     <label for="select-XXXX">Select When to Apply Discount</label>   ← no element has id=select-XXXX,
  //     <div tabindex="0"><span>{current value}</span> …chevron… </div>  ←   so getByLabel() never resolves
  //     <div class="…z-50…">                       ← options panel; ONLY in the DOM while OPEN
  //        <div class="…cursor-pointer…"><p>Select When to Apply Discount</p></div>  ← option 0 = placeholder echo
  //        <div class="…cursor-pointer…"><p>This Month</p></div>                      ← option 1 = first real option
  //        <div class="…cursor-pointer…"><p>Next Month</p></div>
  //     </div>
  //   </div>
  // Leaving it unset keeps the Rent Now button pointer-events-none. Anchored on
  // the label TEXT (not ids / CSS classes) so it tolerates markup churn and
  // applies unchanged to future Flex clients.

  /** Wrapper <div> of the discount-timing control (0 matches when not present). */
  private get discountTimingWrapper(): Locator {
    return this.page
      .locator('xpath=//label[contains(normalize-space(.),"Apply Discount")]/parent::div')
      .first();
  }

  /**
   * Select the "When to Apply Discount" option IF the dropdown is on the page.
   *
   * @param preferred exact option label to pick (e.g. "This Month"). When omitted
   *   or not found, the FIRST real option (after the placeholder) is chosen — so
   *   new Flex clients work with no extra config.
   * @returns the option text actually selected, or null when no dropdown present.
   */
  async selectDiscountTimingIfPresent(preferred?: string): Promise<string | null> {
    return this.applyDiscountTiming(preferred, false);
  }

  /**
   * Strict variant: selects `option` and throws if the dropdown isn't present.
   * Used by the discount-timing verification spec, which asserts the breakdown
   * for each specific option.
   */
  async selectDiscountTiming(option: string): Promise<void> {
    await this.applyDiscountTiming(option, true);
  }

  private async applyDiscountTiming(preferred: string | undefined, required: boolean): Promise<string | null> {
    const wrapper = this.discountTimingWrapper;
    if ((await wrapper.count()) === 0) {
      if (required) throw new Error('Discount-timing dropdown ("…Apply Discount") not found on page');
      console.log('  - No discount-timing dropdown on this page — skipping (not required for this client)');
      return null;
    }

    console.log(`\n📍 Selecting discount timing${preferred ? `: "${preferred}"` : ' (first available option)'}...`);
    await this.safeScroll(wrapper);
    await this.wait(300);

    const trigger = wrapper.locator('[tabindex="0"]').first();
    const placeholder = (await wrapper.locator('label').first().innerText().catch(() => '')).trim();

    // Open the panel. Options (<p>) render only while open; clicking an already
    // open panel closes it — so retry once and re-check for options.
    let optionTexts: string[] = [];
    for (let attempt = 0; attempt < 2 && optionTexts.length === 0; attempt++) {
      await trigger.click({ timeout: 5000 }).catch(() => {});
      await this.wait(400);
      optionTexts = (await wrapper.locator('p').allInnerTexts().catch(() => []))
        .map(t => t.trim())
        .filter(Boolean);
    }
    if (optionTexts.length === 0) {
      if (required) throw new Error('Discount-timing dropdown did not open / exposed no options');
      console.log('  ⚠️ Discount-timing dropdown did not open — skipping');
      return null;
    }

    // Real options = everything except the placeholder echo (same text as label).
    const real = optionTexts.filter(t => t.toLowerCase() !== placeholder.toLowerCase());
    let target = real[0];
    if (preferred) {
      const match = optionTexts.find(t => t.toLowerCase() === preferred.toLowerCase());
      if (match) target = match;
      else console.log(`  ⚠️ Preferred "${preferred}" not in [${optionTexts.join(', ')}] — using "${target}"`);
    }
    if (!target) {
      if (required) throw new Error(`No selectable discount option in [${optionTexts.join(', ')}]`);
      console.log('  ⚠️ No real discount option to select — skipping');
      return null;
    }

    // Click the option <p> (the trigger value lives in a <span>, so targeting <p>
    // can never accidentally hit the trigger).
    await wrapper
      .locator('p')
      .filter({ hasText: new RegExp(`^\\s*${escapeRegex(target)}\\s*$`, 'i') })
      .first()
      .click({ timeout: 5000 });
    await this.wait(800);

    // Confirm the trigger now reflects the choice (panel closed, value committed).
    const after = (await trigger.innerText().catch(() => '')).trim();
    if (after.toLowerCase().includes(target.toLowerCase())) {
      console.log(`  ✓ Discount timing set to "${target}"`);
    } else {
      console.log(`  ⚠️ Selected "${target}" but trigger shows "${after}" — continuing`);
    }
    return target;
  }

  async captureBreakdownLineItems(): Promise<{ items: Array<{label: string, amount: string}>, total: string }> {
    console.log('\n📍 Capturing breakdown line items...');

    const items: Array<{label: string, amount: string}> = [];
    let total = '';

    // The breakdown sits inside a border-t container with flex justify-between rows
    const breakdownContainer = this.page.locator('.border-t.border-primary-300').first();
    await this.safeScroll(breakdownContainer);
    await this.wait(500);

    const rows = breakdownContainer.locator('.flex.justify-between.items-center');
    const count = await rows.count();

    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);
      const rowText = (await row.innerText()).trim();
      if (!rowText) continue;

      // Extract all spans — the label is the first non-$ text, the amount is the $ text
      const spans = row.locator('span');
      const spanCount = await spans.count();
      const texts: string[] = [];
      for (let j = 0; j < spanCount; j++) {
        const t = (await spans.nth(j).innerText()).trim();
        if (t) texts.push(t);
      }

      const amountText = texts.find(s => /^\$/.test(s));
      const labelText = texts.find(s => !/^\$/.test(s) && s.length > 1);

      if (labelText && amountText) {
        if (/total due today/i.test(labelText)) {
          total = amountText;
        } else {
          items.push({ label: labelText, amount: amountText });
        }
      }
    }

    console.log('  ┌─ Breakdown ─────────────────────────────');
    for (const item of items) {
      console.log(`  │ ${item.label.padEnd(35)} ${item.amount}`);
    }
    console.log(`  │ ${'Total Due Today'.padEnd(35)} ${total}`);
    console.log('  └──────────────────────────────────────────');

    return { items, total };
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
   * Dismiss Google Maps "This page can't load Google Maps correctly" modal if present.
   * Common in staging where API keys may not be configured. Clicks the .dismissButton to close.
   */
  private async dismissGoogleMapsModal(): Promise<void> {
    try {
      const dismissBtn = this.page.locator('button.dismissButton');
      await dismissBtn.waitFor({ state: 'visible', timeout: 3000 });
      await dismissBtn.click();
      await this.wait(300);
      console.log('  ✓ Dismissed Google Maps modal (clicked OK)');
    } catch {
      // No modal appeared — normal in production
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
   * @param clientName - optional client name to display in captcha prompt
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
      colorado?: string,
      quebec?: string
    },
    zipCode: string,
    alternateFirstName?: string,
    alternateLastName?: string,
    alternatePhone?: string,
    alternateEmail?: string,
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
  }, hasStepFourCaptcha: boolean = false, clientName?: string, recommendedAddons: string[] = []): Promise<void> {
    console.log(`[${new Date().toISOString()}] 📝 Starting single-page rental form fill...`);

    try {
      // Wait for form to be ready
      await this.wait(2000);
      this.ensurePageAlive('form initialization');

      // Dismiss any cookie consent banners or overlays that might intercept clicks
      await this.handleCookieConsent();

      // Toggle on any recommended add-ons BEFORE filling tenant details. The
      // add-on section sits at the top of the SPC page (above tenant) for
      // single-page layouts, and on Step 4 for two-step layouts. Affects the
      // unit total, so it must be flipped before payment is computed.
      if (recommendedAddons.length > 0) {
        await this.selectRecommendedAddons(recommendedAddons);
        this.ensurePageAlive('after recommended add-ons');
      }

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

        // STEP 4: Additional Contact (if visible — toggled ON by default on some platforms)
        console.log(`[${new Date().toISOString()}] 👥 [Step 4] Checking for additional/alternate contact...`);
        await this.fillAlternateContactIfVisible({
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          phone: userData.phone,
          address: userData.address,
          city: userData.city,
          zipCode: userData.zipCode,
          alternateFirstName: userData.alternateFirstName,
          alternateLastName: userData.alternateLastName,
          alternatePhone: userData.alternatePhone,
          alternateEmail: userData.alternateEmail,
        });
        this.ensurePageAlive('after alternate contact (step 4)');

        // STEP 4: hCaptcha — wait for manual solve before continuing
        if (hasStepFourCaptcha) {
          console.log(`[${new Date().toISOString()}] 🛑 [Step 4] hCaptcha detected — waiting for manual solve...`);
          await this.waitForManualCaptcha(clientName);
          this.ensurePageAlive('after captcha solve (step 4)');
        }

        // Dismiss any cookie consent/overlay before CONTINUE click
        await this.handleCookieConsent();

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

        console.log(`[${new Date().toISOString()}] 👥 Checking for additional/alternate contact...`);
        await this.fillAlternateContactIfVisible({
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          phone: userData.phone,
          address: userData.address,
          city: userData.city,
          zipCode: userData.zipCode,
          alternateFirstName: userData.alternateFirstName,
          alternateLastName: userData.alternateLastName,
          alternatePhone: userData.alternatePhone,
          alternateEmail: userData.alternateEmail,
        });
        this.ensurePageAlive('after alternate contact');

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
   * Toggle ON one or more named "Recommended Add-ons" in the SPC checkout
   * (e.g. "24 Hour Access" for Safeguard).
   *
   * Strategy mirrors enableAgreementToggle() — try the cleanest selector first,
   * fall back to broader ones. The add-on row layout:
   *   <h4>24 Hour Access</h4>  +  <input type="checkbox" name="toggle-XXXXX">
   * The checkbox is visually hidden (1×1 px) behind a styled toggle; .check()
   * with { force: true } flips it the same way a click on the visible UI does.
   *
   * @param addonNames array of add-on display names to enable
   */
  async selectRecommendedAddons(addonNames: string[]): Promise<void> {
    if (!addonNames || addonNames.length === 0) return;

    console.log(`\n📍 SECTION 0: Selecting Recommended Add-ons: ${addonNames.join(', ')}...`);

    for (const name of addonNames) {
      const heading = this.page.locator('h4, h5, h6, label, [role="heading"]')
        .filter({ hasText: new RegExp(`^\\s*${escapeRegex(name)}\\s*$`, 'i') })
        .first();
      const found = await heading.count() > 0;
      if (!found) {
        // Fallback: any element containing the add-on name as a short label.
        const looser = this.page.locator(`text=/^\\s*${escapeRegex(name)}\\s*$/i`).first();
        if (await looser.count() === 0) {
          console.log(`  ⚠️ Add-on "${name}" not found on page — skipping`);
          continue;
        }
        await looser.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {});
      } else {
        await heading.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {});
      }
      await this.wait(300);

      // Climb to the smallest ancestor that contains a checkbox/switch — that's
      // the add-on row. Then toggle the input. If it's already on, leave it.
      const container = (found ? heading : this.page.locator(`text=/^\\s*${escapeRegex(name)}\\s*$/i`).first())
        .locator('xpath=ancestor::*[descendant::input[@type="checkbox"] or descendant::*[@role="switch"]][1]');
      const checkbox = container.locator('input[type="checkbox"], [role="switch"]').first();

      const cbxCount = await checkbox.count().catch(() => 0);
      if (cbxCount === 0) {
        console.log(`  ⚠️ No checkbox found inside the "${name}" add-on row — skipping`);
        continue;
      }

      const wasChecked = await checkbox.isChecked().catch(() => false);
      if (wasChecked) {
        console.log(`  ✓ "${name}" — already enabled`);
        continue;
      }

      // Strategy 1: native .check() with force (works for hidden styled inputs).
      try {
        await checkbox.check({ force: true, timeout: 3000 });
        console.log(`  ✓ "${name}" — enabled via check()`);
        continue;
      } catch { /* fall through */ }

      // Strategy 2: click the wrapping label or the row container (toggles the input).
      try {
        await container.click({ force: true, timeout: 3000 });
        const after = await checkbox.isChecked().catch(() => false);
        if (after) {
          console.log(`  ✓ "${name}" — enabled via container click`);
          continue;
        }
      } catch { /* fall through */ }

      // Strategy 3: dispatch a synthetic click event directly on the input.
      try {
        await checkbox.dispatchEvent('click');
        const after = await checkbox.isChecked().catch(() => false);
        if (after) {
          console.log(`  ✓ "${name}" — enabled via dispatchEvent`);
          continue;
        }
      } catch { /* fall through */ }

      console.log(`  ⚠️ Could not enable add-on "${name}" — all strategies exhausted`);
    }
    console.log('✅ Recommended add-ons step completed');
  }

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
    
    // First Name - click then fill (with force fallback for overlay-blocked clicks)
    await this.safeScroll(this.firstNameField);
    try {
      await this.firstNameField.click({ timeout: 10000 });
    } catch {
      console.log('  ⚠️ First Name click blocked (likely overlay), dismissing and retrying...');
      await this.handleCookieConsent();
      await this.wait(500);
      await this.firstNameField.click({ force: true, timeout: 10000 });
    }
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
        
        // Dismiss Google Maps "can't load correctly" modal if it appears (common in staging)
        await this.dismissGoogleMapsModal();

        // Blank click on a heading to dismiss Google Places autocomplete suggestions
        // Same pattern as RentalDetailsPage_V1 summaryHeading.click()
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
      if (currentUrl.includes('bluebirdstorage')) {
        // Bluebird has both CA and US locations — detect from URL path
        if (currentUrl.includes('/alberta/') || currentUrl.includes('bluebirdstorage.ca')) {
          stateValue = userData.province.alberta || 'Alberta';
          fieldLabel = 'Province';
        } else {
          stateValue = userData.province.alabama || 'Alabama';
        }
      } else if (currentUrl.includes('columbiaselfstorage.com')) {
        stateValue = userData.province.newJersey || 'New Jersey';
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
      } else if (currentUrl.includes('fr-ca.minimallstorage.com') || currentUrl.includes('/quebec/')) {
        stateValue = userData.province.quebec || 'Quebec';
        fieldLabel = 'Province';
      } else if (currentUrl.includes('minimallstorage.com') || currentUrl.includes('mini-mall-storage')) {
        stateValue = userData.province.alabama || 'Alabama';
      } else if (userData.province.alabama) {
        stateValue = userData.province.alabama;
      }
      
      // Try standard HTML <select> first (SSM / V1-style sites use #province)
      const stdSelect = this.page.locator('#province, select[name="state"], select[name="province"]');
      const isStdSelect = await stdSelect.isVisible({ timeout: 3000 }).catch(() => false);
      if (isStdSelect) {
        await stdSelect.selectOption(stateValue);
        console.log(`  ✓ Selected ${fieldLabel}: ${stateValue} (standard select)`);
      } else {
        // Custom dropdown (Vue/React components)
        await this.selectDropdownOption(
          this.stateField,
          stateValue,
          fieldLabel
        );
      }
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
   * Fill Additional Contact / Alternate Contact section if visible.
   *
   * Some platforms (e.g. storsafe-self-storage) render an "Additional Contact" section
   * that is toggled ON by default. When present, its first_name/last_name/phone/email/address
   * fields are required and submission fails ("Alternate contact must have a first name…")
   * unless populated. Re-uses the tenant user data so we don't need additional fixtures.
   */
  private async fillAlternateContactIfVisible(userData: {
    firstName: string,
    lastName: string,
    email: string,
    phone: string,
    address: string,
    city: string,
    zipCode: string,
    alternateFirstName?: string,
    alternateLastName?: string,
    alternatePhone?: string,
    alternateEmail?: string
  }): Promise<void> {
    console.log('\n📍 SECTION 1B: Checking for Additional Contact section...');

    const headingVisible = await this.alternateContactHeading.isVisible({ timeout: 2000 }).catch(() => false);
    if (!headingVisible) {
      console.log('  - Additional Contact section not present, skipping');
      return;
    }

    // Heading is present — confirm the section is actually expanded (toggle ON) by checking
    // that the alternate address input is visible. If the toggle is off, no inputs render.
    const addressVisible = await this.alternateAddressField.isVisible({ timeout: 2000 }).catch(() => false);
    if (!addressVisible) {
      console.log('  - Additional Contact section heading found but inputs hidden (toggle off), skipping');
      return;
    }

    console.log('  ⚙️  Additional Contact toggle is ON — filling alternate contact fields');

    const altFirstName = userData.alternateFirstName || 'Alt' + userData.firstName;
    const altLastName = userData.alternateLastName || userData.lastName + 'Alt';
    const altPhone = userData.alternatePhone || '555' + userData.phone.slice(3);
    const altEmail = userData.alternateEmail || userData.email.replace('@', '+alt@');

    try {
      await this.safeScroll(this.alternateFirstNameField);
      await this.alternateFirstNameField.fill(altFirstName);
      console.log(`  ✓ Filled Alt First Name: ${altFirstName}`);
    } catch {
      console.log('  - Alt First Name not found, skipping');
    }

    try {
      await this.alternateLastNameField.fill(altLastName);
      console.log(`  ✓ Filled Alt Last Name: ${altLastName}`);
    } catch {
      console.log('  - Alt Last Name not found, skipping');
    }

    try {
      await this.alternatePhoneField.fill(altPhone);
      console.log(`  ✓ Filled Alt Phone: ${altPhone}`);
    } catch {
      console.log('  - Alt Phone not found, skipping');
    }

    try {
      await this.alternateEmailField.fill(altEmail);
      console.log(`  ✓ Filled Alt Email: ${altEmail}`);
    } catch {
      console.log('  - Alt Email not found, skipping');
    }

    // Address fields — only fill if the inputs render. Some Additional Contact configs
    // only collect name+phone+email and omit address.
    try {
      await this.safeScroll(this.alternateAddressField);
      await this.alternateAddressField.click();
      await this.alternateAddressField.fill(userData.address);
      console.log(`  ✓ Filled Alt Address: ${userData.address}`);

      // Dismiss Google Places autocomplete same way the tenant section does
      await this.dismissGoogleMapsModal();
      await this.wait(500);
      try {
        await this.alternateContactHeading.click({ timeout: 2000 });
      } catch {
        await this.page.locator('body').click({ position: { x: 0, y: 0 }, force: true });
      }
      await this.wait(300);
    } catch {
      console.log('  - Alt Address not found, skipping');
    }

    try {
      const cityVisible = await this.alternateCityField.isVisible({ timeout: 2000 }).catch(() => false);
      if (cityVisible) {
        await this.alternateCityField.fill(userData.city);
        console.log(`  ✓ Filled Alt City: ${userData.city}`);
      }
    } catch {
      console.log('  - Alt City not found, skipping');
    }

    try {
      const zipVisible = await this.alternateZipField.isVisible({ timeout: 2000 }).catch(() => false);
      if (zipVisible) {
        await this.alternateZipField.fill(userData.zipCode);
        console.log(`  ✓ Filled Alt Zip: ${userData.zipCode}`);
      }
    } catch {
      console.log('  - Alt Zip not found, skipping');
    }

    console.log('✅ Additional Contact section completed');
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
    console.log('\n📍 Filling Card Details Only (two-step step=2)...');

    // Scroll down to ensure payment section is visible / lazy-loaded
    await this.page.evaluate(() => {
      const paymentSection = document.querySelector('[class*="payment"], [id*="payment"], [data-section="payment"]');
      if (paymentSection) paymentSection.scrollIntoView({ block: 'center' });
      else window.scrollTo(0, document.body.scrollHeight * 0.7);
    });
    await this.wait(1500);

    // Card Number — try main page, then iframe fallback
    let cardVisible = await this.cardNumberField.isVisible({ timeout: 8000 }).catch(() => false);

    if (!cardVisible) {
      console.log('  ⚠️ Card Number not found, scrolling fully down...');
      await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await this.wait(2000);
      cardVisible = await this.cardNumberField.isVisible({ timeout: 5000 }).catch(() => false);
    }

    if (!cardVisible) {
      console.log('  ⚠️ Still not found, checking for payment iframes...');
      const iframeFilled = await this.tryFillCardInIframe(paymentData);
      if (iframeFilled) {
        console.log('  ✓ Card details filled via payment iframe');
        console.log('✅ Card details completed (via iframe)');
        return;
      }
      throw new Error('Card Number field not found on step 5 — payment form may not have loaded');
    }

    // Card Number
    await this.safeScroll(this.cardNumberField);
    await this.cardNumberField.click({ timeout: 10000 });
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
   * Try to fill card details inside a payment iframe (Stripe, Spreedly, etc.)
   * Returns true if card fields were found and filled inside an iframe.
   */
  private async tryFillCardInIframe(paymentData: {
    cardNumber: string,
    expiryDate: string,
    cvv: string
  }): Promise<boolean> {
    try {
      const iframes = this.page.locator('iframe');
      const count = await iframes.count();

      for (let i = 0; i < count; i++) {
        const iframe = iframes.nth(i);
        const src = (await iframe.getAttribute('src') || '').toLowerCase();
        const title = (await iframe.getAttribute('title') || '').toLowerCase();
        const name = (await iframe.getAttribute('name') || '').toLowerCase();

        const isPaymentIframe = ['stripe', 'payment', 'card', 'spreedly', 'secure', 'checkout', 'braintree', 'paysafe']
          .some(keyword => src.includes(keyword) || title.includes(keyword) || name.includes(keyword));

        if (!isPaymentIframe) continue;

        console.log(`  🔍 Found payment iframe: src="${src.substring(0, 80)}" title="${title}"`);
        const frame = this.page.frameLocator(`iframe >> nth=${i}`);

        const cardInput = frame.locator('input[name="cardnumber"], input[name="card_number"], input[placeholder*="card number" i], input[autocomplete="cc-number"]').first();
        const cardExists = await cardInput.isVisible({ timeout: 3000 }).catch(() => false);

        if (cardExists) {
          await cardInput.click();
          await cardInput.fill(paymentData.cardNumber);
          console.log(`  ✓ Filled Card Number (iframe): ${paymentData.cardNumber}`);

          const expiryInput = frame.locator('input[name="exp-date"], input[name="expiry"], input[placeholder*="MM" i], input[autocomplete="cc-exp"]').first();
          if (await expiryInput.isVisible({ timeout: 2000 }).catch(() => false)) {
            await expiryInput.click();
            await expiryInput.fill(paymentData.expiryDate);
            console.log(`  ✓ Filled Expiry (iframe): ${paymentData.expiryDate}`);
          }

          const cvvInput = frame.locator('input[name="cvc"], input[name="cvv"], input[placeholder*="CVV" i], input[placeholder*="CVC" i], input[autocomplete="cc-csc"]').first();
          if (await cvvInput.isVisible({ timeout: 2000 }).catch(() => false)) {
            await cvvInput.click();
            await cvvInput.fill(paymentData.cvv);
            console.log(`  ✓ Filled CVV (iframe): ${paymentData.cvv}`);
          }

          return true;
        }
      }
    } catch (error) {
      console.log(`  ⚠️ Iframe card fill attempt failed: ${(error as Error).message}`);
    }

    return false;
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

    // Scroll down to ensure payment section is visible / lazy-loaded
    await this.page.evaluate(() => {
      const paymentSection = document.querySelector('[class*="payment"], [id*="payment"], [data-section="payment"]');
      if (paymentSection) paymentSection.scrollIntoView({ block: 'center' });
      else window.scrollTo(0, document.body.scrollHeight * 0.7);
    });
    await this.wait(1500);

    // Card Number — try main page, then iframe fallback
    let cardFilledViaIframe = false;
    let cardVisible = await this.cardNumberField.isVisible({ timeout: 8000 }).catch(() => false);

    if (!cardVisible) {
      console.log('  ⚠️ Card Number not found in main page, scrolling fully down...');
      await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await this.wait(2000);
      cardVisible = await this.cardNumberField.isVisible({ timeout: 5000 }).catch(() => false);
    }

    if (!cardVisible) {
      console.log('  ⚠️ Still not found, checking for payment iframes...');
      cardFilledViaIframe = await this.tryFillCardInIframe(paymentData);
      if (cardFilledViaIframe) {
        console.log('  ✓ Card details filled via payment iframe');
      } else {
        throw new Error('Card Number field not found — payment form may not have loaded or uses an unsupported iframe/widget');
      }
    }

    if (!cardFilledViaIframe) {
      // Fill card fields on main page
      await this.safeScroll(this.cardNumberField);
      await this.cardNumberField.click({ timeout: 10000 });
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
    }
    
    // Billing Address - click, type, then select first dropdown option
    try {
      await this.safeScroll(this.billingAddressField);
      await this.billingAddressField.click();
      await this.billingAddressField.fill(billingAddress);
      console.log(`  ✓ Typed Billing Address: ${billingAddress}`);
      
      // Wait for pac-container / dropdown to appear
      await this.wait(1500);

      // STAGING ONLY: Check for "This page can't load Google Maps correctly." error
      // Must happen BEFORE ArrowDown/Enter — those keys scroll the page when the
      // pac-container shows an error dialog instead of address suggestions.
      let googleMapsErrorDismissed = false;
      if (CURRENT_ENVIRONMENT === Environment.STAGING) {
        try {
          const dismissBtn = this.page.locator('.pac-container button.dismissButton');
          const btnVisible = await dismissBtn.isVisible({ timeout: 2000 }).catch(() => false);
          if (btnVisible) {
            await dismissBtn.click({ force: true, timeout: 5000 });
            googleMapsErrorDismissed = true;
            console.log('  ✓ Dismissed Google Maps error dialog (staging)');
            await this.wait(500);
          }
        } catch {
          // No Google Maps error dialog — nothing to dismiss
        }
      }

      // Only do ArrowDown+Enter if we did NOT just dismiss the Maps error
      if (!googleMapsErrorDismissed) {
        await this.page.keyboard.press('ArrowDown');
        await this.wait(500);
        await this.page.keyboard.press('Enter');
        console.log('  ✓ Selected first address from dropdown');
      }
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
      
      if (currentUrl.includes('bluebirdstorage')) {
        // Bluebird has both CA and US locations — detect from URL path
        if (currentUrl.includes('/alberta/') || currentUrl.includes('bluebirdstorage.ca')) {
          stateName = province.alberta || 'Alberta';
          fieldLabel = 'Billing Province';
        } else {
          stateName = province.alabama || 'Alabama';
          fieldLabel = 'Billing State';
        }
      } else if (currentUrl.includes('columbiaselfstorage.com')) {
        stateName = province.newJersey || 'New Jersey';
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
      } else if (currentUrl.includes('fr-ca.minimallstorage.com') || currentUrl.includes('/quebec/')) {
        stateName = province.quebec || 'Quebec';
        fieldLabel = 'Billing Province';
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
   * - SiteLink/SSM: Checkbox whose disclaimer STARTS WITH "I understand…"
   *
   * Match on the "I understand" PREFIX only — not the full sentence. The
   * disclaimer body after it (e.g. "…failure to complete all required
   * agreements…", "…A 3% convenience fee…") varies per client and changes over
   * time; matching the whole sentence would silently miss the toggle when the
   * wording changes. The "Be advised" (storEDGE) path is kept as well.
   */
  private async enableAgreementToggle(): Promise<void> {
    console.log('\n📍 SECTION 4: Enabling Agreement Toggle...');

    // Strategy 1: SiteLink/SSM format - Fast path for any "I understand…" disclaimer
    try {
      const checkbox = this.page.locator('input[type="checkbox"]').filter({
        has: this.page.locator('text=/I understand/i')
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
      const agreementText = this.page.locator('text=/I understand/i').first();
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
   * Scroll the hCaptcha widget toward the TOP of the viewport so its challenge
   * popup (opened when the user clicks the checkbox) has vertical room and its
   * "Verify" button is not cropped below the fold. Fixes the Safeguard SPC case
   * where the Rent-Now captcha sits at the bottom of a long single-page form.
   * Best-effort — swallows all errors and never blocks the manual solve.
   */
  private async scrollCaptchaIntoRoom(): Promise<void> {
    try {
      await this.page.evaluate(() => {
        const measure = (el: Element) => {
          const r = el.getBoundingClientRect();
          return { el: el as HTMLElement, absTop: r.top + window.scrollY, h: r.height };
        };
        const real = (sel: string) => Array.from(document.querySelectorAll(sel))
          .map(measure).filter(c => c.h > 20 && c.absTop > 0);
        // Anchor on the hCaptcha WIDGET itself (there are usually several iframes,
        // incl. a zero-size one — filter to real ones). Prefer the TOPMOST real
        // captcha widget (the checkbox); fall back to the Rent-Now button.
        const captcha = real('.h-captcha, [data-hcaptcha-widget-id], iframe[src*="hcaptcha.com"], iframe[title*="hcaptcha" i], iframe[title*="captcha" i]')
          .sort((a, b) => a.absTop - b.absTop);
        const target = captcha[0] || real('#rent-now, button#rent-now').sort((a, b) => a.absTop - b.absTop)[0];
        if (!target) return;

        // The V2 SPC checkout renders the captcha inside a `md:sticky` sidebar, so
        // a plain window scroll can't lift it — it stays pinned near the bottom of
        // the viewport and the challenge popup opens cropped. Neutralise any
        // sticky/fixed ancestor first so the widget scrolls normally, THEN lift it
        // to ~120px from the top, giving the challenge the full viewport below.
        for (let cur: HTMLElement | null = target.el.parentElement; cur && cur !== document.body; cur = cur.parentElement) {
          const pos = getComputedStyle(cur).position;
          if (pos === 'sticky' || pos === 'fixed') cur.style.setProperty('position', 'static', 'important');
        }
        const absTop = target.el.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({ top: Math.max(0, absTop - 120), left: 0, behavior: 'instant' as ScrollBehavior });
      });
      await this.page.waitForTimeout(400); // let layout settle before the user clicks
    } catch { /* non-critical */ }
  }

  /**
   * Wait for the user to manually solve hCaptcha.
   *
   * 1. Tries to click the captcha checkbox programmatically first.
   * 2. Polls every 500ms for a solved token AND watches for the challenge
   *    popup (the large image-grid iframe hCaptcha opens).
   * 3. If 30 seconds pass with NO challenge popup and NO solve, the widget
   *    is presumed stuck (rendered but non-functional, like the Storage Star
   *    case where the checkbox was unclickable). Throws an error so the
   *    spec-level retry loop can refresh the page and re-run the full flow.
   * 4. Once a challenge IS visible, waits indefinitely — the user is solving.
   */
  async waitForManualCaptcha(clientName?: string): Promise<void> {
    const currentUrl = this.page.url();
    const displayName = clientName || currentUrl;
    // Play audible alert — fire-and-forget so it never blocks Node exit
    try {
      const child = require('child_process').exec(
        'powershell -NoProfile -Command "[System.Media.SystemSounds]::Exclamation.Play()"',
        { windowsHide: true }
      );
      child.unref();
    } catch { /* ignore if beep fails */ }
    console.log('\n🛑 ═══════════════════════════════════════════════════════════');
    console.log(`🛑  hCaptcha DETECTED — Manual step required!`);
    console.log(`🛑  CLIENT: ${displayName}`);
    console.log(`🛑  URL: ${currentUrl}`);
    console.log('🛑  1. Switch to the BROWSER WINDOW for the URL above');
    console.log('🛑  2. Solve the hCaptcha checkbox / challenge');
    console.log('🛑  3. Automation will continue AUTOMATICALLY once solved');
    console.log('🛑  (If the widget is stuck, automation will auto-refresh + retry)');
    console.log('🛑 ═══════════════════════════════════════════════════════════\n');

    await this.scrollCaptchaIntoRoom();

    // Try to click the hCaptcha checkbox programmatically (like the reserve
    // flow does). If the widget is healthy this triggers the challenge or
    // auto-solves; if stuck, the click either throws or has no effect —
    // the stuck-timeout below catches it either way.
    try {
      await this.page.frameLocator('iframe[src*="hcaptcha"]').first()
        .locator('#checkbox, [role="checkbox"]').first()
        .click({ timeout: 8000 });
      console.log('  ✓ Clicked hCaptcha checkbox programmatically');
    } catch {
      console.log('  ⚠️ Could not auto-click hCaptcha checkbox — waiting for manual interaction');
    }

    const pollInterval = 500;
    let pollCount = 0;
    let challengeDetected = false;
    const STUCK_TIMEOUT_POLLS = 60; // 30s (60 × 500ms) — enough for a working widget to respond

    while (true) {
      // ── Check: solved? ──
      try {
        const solved = await this.page.evaluate(() => {
          const hTa = document.querySelector('textarea[name="h-captcha-response"]') as HTMLTextAreaElement | null;
          if (hTa && hTa.value && hTa.value.length > 0) return 'h-captcha-response textarea';
          const gTa = document.querySelector('textarea[name="g-recaptcha-response"]') as HTMLTextAreaElement | null;
          if (gTa && gTa.value && gTa.value.length > 0) return 'g-recaptcha-response textarea';
          const wrapper = document.querySelector('[data-hcaptcha-response]') as HTMLElement | null;
          if (wrapper) {
            const resp = wrapper.getAttribute('data-hcaptcha-response');
            if (resp && resp.length > 0) return 'data-hcaptcha-response attribute';
          }
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

      // ── Check: challenge popup visible? ──
      // hCaptcha opens a large (>200×200) iframe overlay for the image grid.
      // Once it appears, the user is actively solving — disable the stuck timer.
      if (!challengeDetected) {
        try {
          challengeDetected = await this.page.evaluate(() => {
            const frames = document.querySelectorAll('iframe');
            for (const f of frames) {
              const r = f.getBoundingClientRect();
              if (r.width > 200 && r.height > 200 &&
                  (f.src.includes('hcaptcha') || (f.title || '').toLowerCase().includes('captcha'))) {
                return true;
              }
            }
            return false;
          });
          if (challengeDetected) {
            console.log('  🧩 hCaptcha challenge appeared — waiting for manual solve (no time limit)...');
          }
        } catch { /* ignore */ }
      }

      pollCount++;

      // ── Stuck detection ──
      // 30 seconds with no challenge and no solve = widget is broken (checkbox
      // rendered but non-functional). Throw to trigger the spec's outer retry
      // loop, which refreshes the page and re-runs the entire flow.
      if (!challengeDetected && pollCount >= STUCK_TIMEOUT_POLLS) {
        const elapsed = Math.round(pollCount * pollInterval / 1000);
        console.log(`\n⚠️ hCaptcha widget appears STUCK — no challenge and no solve after ${elapsed}s`);
        console.log('   Throwing to trigger full-flow retry (page will be refreshed)...\n');
        throw new Error(
          `hCaptcha widget unresponsive — no challenge or solve after ${elapsed}s. Retrying full flow.`
        );
      }

      // Reminder beep every 30s (only once the challenge is up — before that
      // the stuck timer is running and will throw if nothing happens).
      if (challengeDetected && pollCount % 60 === 0) {
        try {
          const reminder = require('child_process').exec(
            'powershell -NoProfile -Command "[System.Media.SystemSounds]::Exclamation.Play()"',
            { windowsHide: true }
          );
          reminder.unref();
        } catch { /* ignore if beep fails */ }
        console.log(`⏳ Still waiting for hCaptcha solve for ${displayName}... (${Math.round(pollCount * 0.5)}s elapsed)`);
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
  }

  /**
   * Detect an error toast that appears RIGHT AFTER landing on the step-four page,
   * BEFORE any form interaction (e.g. "Could not find facility for ID …" in the
   * screenshot). This catches backend/handoff failures that surface the instant
   * the next page loads, independent of anything the test types.
   *
   * IMPORTANT: this reuses the EXACT same toast-detection elements as
   * clickRentNowAndCaptureError (quickErrorCheck → toast body / toast container /
   * alert-danger / role=alert / visible-page scan, plus the deep extractor), so a
   * landing error reads identically to a post-submit error in the report.
   *
   * @returns the error string when a real (non-generic) error toast is present on
   *          landing, or '' when the page landed clean.
   */
  async captureLandingError(maxWaitMs: number = 6000): Promise<string> {
    console.log(`[${new Date().toISOString()}] 🔎 Checking for an error toast right after landing on step-four...`);
    // Don't let the live-chat widget cover the toast region.
    await this.minimizeLiveChat().catch(() => {});

    const deadline = Date.now() + maxWaitMs;
    let captured = '';
    while (Date.now() < deadline) {
      if (this.page.isClosed()) return '';
      const msg = await this.quickErrorCheck().catch(() => '');
      if (msg && !this.isGenericToastHeader(msg)) { captured = msg; break; }
      if (msg && this.isGenericToastHeader(msg)) {
        // Only the generic "Error Occurred" header rendered so far — try the deep
        // text walk to pull the real body, exactly like the submit-time path does.
        const deep = await this.deepExtractToastText().catch(() => '');
        if (deep && !this.isGenericToastHeader(deep)) { captured = deep; break; }
        captured = msg; // keep the generic header in case nothing richer appears
      }
      await this.wait(500).catch(() => {});
    }

    if (captured && !this.isGenericToastHeader(captured)) {
      console.log(`[${new Date().toISOString()}] 🚩 Landing error detected: ${captured}`);
      return captured;
    }
    if (captured) {
      console.log(`[${new Date().toISOString()}] 🚩 Landing error detected (generic toast header only).`);
      return 'Error Occurred (toast appeared on landing but details not rendered by client)';
    }
    console.log(`[${new Date().toISOString()}] ✅ No error toast on landing — page is clean.`);
    return '';
  }

  /**
   * Remove stale "provided email is invalid" toasts thrown by the background
   * abandoned-cart capture (POST /user/cart) while the form was being filled.
   * Prod runs server-side email verification on that LEAD CAPTURE only — the
   * actual checkout (/user/checkout) accepts the same address, so these toasts
   * are known noise, not a rent blocker (verified live 2026-08-07: cart 422s
   * for both fill() and manual typing; checkout proceeds to card decline).
   */
  private async dismissCartCaptureEmailToast(): Promise<void> {
    try {
      const removed = await this.page.evaluate(() => {
        const containers = document.querySelectorAll(
          '[data-id*="toast-notification"], .toast-container, .toast, [role="alert"], .Toastify__toast'
        );
        let n = 0;
        containers.forEach(el => {
          if (/provided email is invalid/i.test(el.textContent || '')) { el.remove(); n++; }
        });
        return n;
      });
      if (removed > 0) {
        console.log(`  ℹ️ Dismissed ${removed} stale "email invalid" toast(s) from the background cart capture (known prod noise — not a rent blocker)`);
      }
    } catch { /* page context busy — toasts will age out on their own */ }
  }

  /**
   * Click RENT NOW button and capture error message
   */
  async clickRentNowAndCaptureError(hasCaptcha: boolean = false, clientName?: string): Promise<string> {
    console.log(`[${new Date().toISOString()}] 📍 FINAL STEP: Clicking RENT NOW button...`);
    
    try {
      // If this customer has hCaptcha, wait for user to solve it first
      if (hasCaptcha) {
        await this.waitForManualCaptcha(clientName);
      }

      // Minimize live chat if present
      await this.minimizeLiveChat();

      // Clear stale "email invalid" toasts thrown by the background cart capture
      // during form fill — otherwise the post-click toast scan reports them
      // instead of the real checkout result.
      await this.dismissCartCaptureEmailToast();

      // Set up network response listener BEFORE clicking RENT NOW
      // This captures the API error even if the toast doesn't display it
      let apiErrorMessage = '';
      const responseHandler = async (response: any) => {
        try {
          const url = response.url();
          // Background abandoned-cart capture (POST /user/cart) — prod rejects the QA
          // email with 422 "The provided email is invalid", but /user/checkout accepts
          // the same address, so a cart 422 must never be reported as the rent result.
          if (url.includes('/user/cart')) return;
          const status = response.status();
          // Capture error responses from rent/payment/move-in API calls
          if (status >= 400 || (url.includes('/rent') || url.includes('/move-in') || url.includes('/payment') || url.includes('/checkout') || url.includes('/lease') || url.includes('/order') || url.includes('/transaction') || url.includes('/process') || url.includes('/reserve') || url.includes('/submit') || url.includes('/user/checkout'))) {
            const body = await response.text().catch(() => '');
            if (body && (body.includes('error') || body.includes('Error') || body.includes('message') || status >= 400)) {
              try {
                const json = JSON.parse(body);
                const msg = json.message || json.error || json.msg || json.errors || json.detail || '';
                const extracted = typeof msg === 'string' ? msg : JSON.stringify(msg);
                if (extracted && extracted.length > 5) {
                  apiErrorMessage = this.normalizeCapturedError(extracted);
                  console.log(`🌐 API error captured from ${url}: ${apiErrorMessage.substring(0, 200)}`);
                }
              } catch {
                // Not JSON — check if body itself is an error message
                const extracted = this.extractErrorFromRawBody(body);
                if (extracted) {
                  apiErrorMessage = extracted;
                }
              }
            } else if (body) {
              const extracted = this.extractErrorFromRawBody(body);
              if (extracted) {
                apiErrorMessage = extracted;
              }
            }
          }
        } catch { /* response already disposed */ }
      };
      this.page.on('response', responseHandler);
      
      // Wait for a clickable RENT NOW button
      const clickableRentNowButton = await this.getClickableRentNowButton();
      await this.safeScroll(clickableRentNowButton);
      await clickableRentNowButton.waitFor({ state: 'visible', timeout: 10000 });
      await this.wait(500);
      
      // Click the button
      console.log(`[${new Date().toISOString()}] 🖱️ Clicking RENT NOW...`);
      try {
        await clickableRentNowButton.click({ timeout: 8000 });
      } catch (clickError) {
        const clickMessage = (clickError as Error).message || '';
        console.log(`[${new Date().toISOString()}] ⚠️ Standard click failed, trying fallback click...`);

        if (clickMessage.includes('intercepts pointer events') || clickMessage.includes('pointer-events')) {
          await clickableRentNowButton.click({ timeout: 8000, force: true });
        } else {
          await clickableRentNowButton.evaluate((button: HTMLButtonElement) => button.click());
        }
      }
      console.log(`[${new Date().toISOString()}] ✓ RENT NOW button clicked`);
      
      // Detect error message (polls up to 15s internally)
      console.log(`[${new Date().toISOString()}] 🔍 Detecting error...`);
      let errorMessage = await this.detectErrorMessage();
      
      // If error found and it's not just a generic header, return it immediately
      if (errorMessage && !errorMessage.startsWith('FAILED to fetch') && !errorMessage.includes('toast body not captured')) {
        console.log(`[${new Date().toISOString()}] ✅ Error detected: ${errorMessage}`);
        this.page.removeListener('response', responseHandler);
        return errorMessage;
      }

      // If only generic toast was found but we have an API error, use the API error
      if ((errorMessage.includes('toast body not captured') || errorMessage === '') && apiErrorMessage) {
        console.log(`[${new Date().toISOString()}] ✅ Error captured via API response: ${apiErrorMessage}`);
        this.page.removeListener('response', responseHandler);
        return `Error Occurred — ${apiErrorMessage}`;
      }

      // Deep toast extraction — walks all text nodes in toast containers
      const deepText = await this.deepExtractToastText();
      if (deepText && !this.isGenericToastHeader(deepText)) {
        console.log(`[${new Date().toISOString()}] ✅ Error captured via deep toast extraction: ${deepText}`);
        this.page.removeListener('response', responseHandler);
        return deepText;
      }

      // Last DOM-based fallback for clients whose toast renders outside the current selectors
      const pageErrorMessage = await this.scanVisiblePageForPaymentError();
      if (pageErrorMessage) {
        console.log(`[${new Date().toISOString()}] ✅ Error captured via visible page scan: ${pageErrorMessage}`);
        this.page.removeListener('response', responseHandler);
        return pageErrorMessage;
      }

      // Page-closed check — if page is gone, the first click navigated successfully (no error to capture)
      if (this.page.isClosed()) {
        console.log(`[${new Date().toISOString()}] ℹ️ Page closed — first click navigated, no error toast to capture`);
        this.page.removeListener('response', responseHandler);
        return apiErrorMessage ? `Error Occurred — ${apiErrorMessage}` : 'No error - flow completed (page navigated)';
      }

      // No error detected - retry once (only if RENT NOW button is still available)
      console.log(`[${new Date().toISOString()}] ⚠️ No error detected on first attempt, retrying...`);
      try {
        await this.wait(1000);
      } catch {
        console.log(`[${new Date().toISOString()}] ℹ️ Wait failed — page likely closed/navigated. Skipping retry.`);
        this.page.removeListener('response', responseHandler);
        return apiErrorMessage ? `Error Occurred — ${apiErrorMessage}` : 'No error - flow completed (page navigated)';
      }

      // Check if page navigated away or button is gone — if so, the first click worked
      let retryClickSucceeded = false;
      try {
        if (this.page.isClosed()) {
          console.log(`[${new Date().toISOString()}] ℹ️ Page closed after wait — skipping retry`);
          this.page.removeListener('response', responseHandler);
          return apiErrorMessage ? `Error Occurred — ${apiErrorMessage}` : 'No error - flow completed (page navigated)';
        }
        const buttonStillVisible = await this.rentNowButton.isVisible({ timeout: 3000 }).catch(() => false);
        if (!buttonStillVisible) {
          console.log(`[${new Date().toISOString()}] ℹ️ RENT NOW button no longer visible — first click likely succeeded, skipping retry`);
        } else {
          const retryButton = await this.getClickableRentNowButton();
          console.log(`[${new Date().toISOString()}] 🖱️ Clicking RENT NOW again (retry)...`);
          await retryButton.click({ timeout: 8000, force: true });
          console.log(`[${new Date().toISOString()}] ✓ RENT NOW button clicked (retry)`);
          retryClickSucceeded = true;
        }
      } catch (retryClickError) {
        console.log(`[${new Date().toISOString()}] ℹ️ Retry click failed (button may be gone after first submit) — continuing`);
      }
      
      // Re-detect error only if retry click succeeded
      if (retryClickSucceeded) {
        console.log(`[${new Date().toISOString()}] 🔍 Re-detecting error...`);
        errorMessage = await this.detectErrorMessage();
      }
      
      // Clean up listener
      this.page.removeListener('response', responseHandler);

      if (errorMessage && !errorMessage.startsWith('FAILED to fetch') && !errorMessage.includes('toast body not captured')) {
        console.log(`[${new Date().toISOString()}] ✅ Error detected on retry: ${errorMessage}`);
        return errorMessage;
      }

      // Fallback to API error if toast still didn't show the body
      if (apiErrorMessage) {
        console.log(`[${new Date().toISOString()}] ✅ Using API error fallback: ${apiErrorMessage}`);
        return `Error Occurred — ${apiErrorMessage}`;
      }

      const pageErrorOnRetry = await this.scanVisiblePageForPaymentError();
      if (pageErrorOnRetry) {
        console.log(`[${new Date().toISOString()}] ✅ Using visible page fallback after retry: ${pageErrorOnRetry}`);
        return pageErrorOnRetry;
      }

      // Last resort: deep toast extraction
      const deepFallback = await this.deepExtractToastText();
      if (deepFallback && !this.isGenericToastHeader(deepFallback)) {
        console.log(`[${new Date().toISOString()}] ✅ Using deep toast extraction fallback: ${deepFallback}`);
        return deepFallback;
      }

      // If we saw a generic toast header, the flow DID complete — return it instead of "FAILED"
      if (errorMessage && errorMessage.includes('toast body not captured')) {
        console.log(`[${new Date().toISOString()}] ⚠️ Returning generic toast — body was never rendered`);
        return 'Error Occurred (toast appeared but details not rendered by client)';
      }

      console.log(`[${new Date().toISOString()}] ❌ Still no error after retry`);
      return 'FAILED to fetch Error Message @ Step-5 (Single-Page - After RENT NOW click)';
      
    } catch (error) {
      const rawMsg = (error as Error).message || '';
      // Page-closed / context-destroyed during error detection usually means the
      // click succeeded and the page navigated. Return gracefully so the test
      // doesn't fail on what is really a SUCCESS path.
      if (rawMsg.includes('Target page, context or browser has been closed') ||
          rawMsg.includes('Execution context was destroyed') ||
          rawMsg.includes('frame was detached')) {
        console.log(`[${new Date().toISOString()}] ℹ️ Page closed mid-detection — treating as navigation success.`);
        return 'No error - flow completed (page navigated)';
      }
      const errorMsg = `❌ Failed to click RENT NOW button - ${rawMsg}`;
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
    // CHECK 1: Toast body specifically (most reliable for full error message)
    const toastBodyLocators = [
      this.page.locator('.toast-container .toast-body').first(),
      this.page.locator('[data-id*="toast-notification"] .toast-body').first(),
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

    // CHECK 2: Detailed error with Response Code (p.text-sm.text-white)
    try {
      const detailedError = this.page.locator('p.text-sm.text-white').filter({ hasText: 'Response Code' });
      if (await detailedError.isVisible({ timeout: 500 })) {
        const text = (await detailedError.innerText()).trim();
        if (text) {
          console.log(`🔍 Found detailed error: "${text}"`);
          return text;
        }
      }
    } catch { /* not visible */ }

    // CHECK 3: Full toast notification text (title + body, everything visible)
    const toastLocators = [
      this.page.locator('[data-id*="toast-notification"]').first(),
      this.page.locator('.toast-container').first(),
    ];

    for (const toast of toastLocators) {
      try {
        if (await toast.isVisible({ timeout: 500 })) {
          const fullText = (await toast.innerText()).trim();
          const cleaned = this.cleanToastText(fullText);
          if (cleaned && !this.isGenericToastHeader(cleaned)) {
            console.log(`🔍 Found toast text: "${cleaned}"`);
            return cleaned;
          }
          // If only generic header found, try deep text extraction
          if (cleaned && this.isGenericToastHeader(cleaned)) {
            console.log(`🔍 Generic toast header detected ("${cleaned}"), trying deep extraction...`);
            const deepText = await this.deepExtractToastText();
            if (deepText && !this.isGenericToastHeader(deepText)) {
              return deepText;
            }
          }
        }
      } catch { /* not visible yet */ }
    }

    // CHECK 4: alert-danger or role=alert
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

    // CHECK 5: broader visible text scan for payment errors (SiteLink variants)
    const pageScan = await this.scanVisiblePageForPaymentError();
    if (pageScan) {
      console.log(`🔍 Found payment error via page scan: "${pageScan}"`);
      return pageScan;
    }

    return '';
  }

  /**
   * Check if the captured text is just a generic toast header without real error detail.
   */
  private isGenericToastHeader(text: string): boolean {
    const generic = ['error occurred', 'error occurred — dismiss', 'error occurred dismiss'];
    return generic.includes(text.toLowerCase().trim());
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
   * Prioritises toast-body (the real error message) over the full container text.
   */
  private async pollingErrorCheck(): Promise<string> {
    console.log('📡 Active polling for errors...');
    let sawGenericHeader = false;
    
    for (let i = 0; i < 30; i++) { // 30 attempts × 500ms = 15 seconds
      try {
        await this.wait(500);

        // CHECK 1: Toast body specifically (highest priority)
        const toastBodyLocators = [
          this.page.locator('.toast-container .toast-body').first(),
          this.page.locator('[data-id*="toast-notification"] .toast-body').first(),
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

        // CHECK 2: Detailed error with Response Code
        try {
          const detailedError = this.page.locator('p.text-sm.text-white').filter({ hasText: 'Response Code' });
          if (await detailedError.isVisible({ timeout: 300 })) {
            const text = (await detailedError.innerText()).trim();
            if (text) {
              console.log(`✓ Detailed error found at poll ${i + 1}`);
              return text;
            }
          }
        } catch { /* not visible */ }

        // CHECK 3: Full toast text (fallback)
        const toastLocators = [
          this.page.locator('[data-id*="toast-notification"]').first(),
          this.page.locator('.toast-container').first(),
        ];
        for (const toast of toastLocators) {
          try {
            if (await toast.isVisible({ timeout: 300 })) {
              const fullText = (await toast.innerText()).trim();
              const cleaned = this.cleanToastText(fullText);
              if (cleaned && !this.isGenericToastHeader(cleaned)) {
                console.log(`✓ Error found at poll ${i + 1}`);
                return cleaned;
              }
              if (cleaned && this.isGenericToastHeader(cleaned)) {
                sawGenericHeader = true;
                const deepText = await this.deepExtractToastText();
                if (deepText && !this.isGenericToastHeader(deepText)) {
                  console.log(`✓ Error found via deep extraction at poll ${i + 1}`);
                  return deepText;
                }
              }
            }
          } catch { /* not visible yet */ }
        }

        // CHECK 4: alert-danger / role=alert
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

        const pageScan = await this.scanVisiblePageForPaymentError();
        if (pageScan) {
          console.log(`✓ Payment error found via page scan at poll ${i + 1}`);
          return pageScan;
        }

      } catch (error) {
        console.warn(`⚠️  Check failed at poll ${i + 1}, continuing...`);
        continue;
      }
    }

    // If we saw a generic header but never got the body, return it rather than nothing
    if (sawGenericHeader) {
      console.log('⚠️  Only generic toast header captured — body never appeared');
      return 'Error Occurred (toast body not captured — check site manually)';
    }
    
    console.log('⚠️  Polling completed - no error message detected');
    return '';
  }
}
