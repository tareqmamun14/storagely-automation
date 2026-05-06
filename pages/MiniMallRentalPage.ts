import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class MiniMallRentalPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // ============================================
  // SITELINK LOCATORS (Step 4 — tenant details)
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

  private get sitelinkPhoneField() {
    return this.page.getByRole('textbox', { name: 'Cell phone number' })
      .or(this.page.locator('input[name="phone"][type="tel"]'))
      .or(this.page.getByPlaceholder('Cell phone number'));
  }

  private get sitelinkAddressField() {
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

  private get provinceField() {
    return this.page.getByRole('textbox', { name: 'Province', exact: true })
      .or(this.page.getByRole('textbox', { name: 'State', exact: true }))
      .or(this.page.locator('input[name="state"]'))
      .or(this.page.locator('input[name="province"]'));
  }

  private get zipField() {
    return this.page.getByRole('textbox', { name: 'Zip' })
      .or(this.page.locator('input[name="zip"], input[name="zipcode"], input[name="postal_code"]'))
      .or(this.page.getByPlaceholder(/Zip|Postal/i));
  }

  // ============================================
  // YARDI LOCATORS (tenant details page)
  // ============================================
  private get yardiPhoneField() {
    return this.page.locator('#phone-input')
      .or(this.page.locator('input[name="phone"][placeholder*="Cell Phone"]'))
      .or(this.page.getByPlaceholder('Cell Phone number'));
  }

  private get yardiAddressField() {
    return this.page.locator('#address-input')
      .or(this.page.locator('input[name="address_1"]'))
      .or(this.page.getByPlaceholder('Address', { exact: true }));
  }

  // ============================================
  // SHARED LOCATORS
  // ============================================
  private get continueButton() {
    return this.page.locator('#continue-next-step')
      .or(this.page.getByRole('button', { name: 'CONTINUE TO NEXT STEP' }))
      .or(this.page.getByRole('button', { name: /continue to next step/i }));
  }

  // Payment section
  private get cardNumberField() {
    return this.page.getByRole('textbox', { name: 'Card Number' })
      .or(this.page.locator('input[name="card_number"], input[name="cardNumber"], input[name="cardnumber"]'))
      .or(this.page.getByPlaceholder('Card Number'))
      .or(this.page.getByPlaceholder('Card number'))
      .or(this.page.locator('input[autocomplete="cc-number"]'));
  }

  private get expiryField() {
    return this.page.getByRole('textbox', { name: 'MM / YY' })
      .or(this.page.locator('input[name="expiry"], input[name="card_expiry"], input[name="expiration"]'))
      .or(this.page.getByPlaceholder('MM / YY'));
  }

  private get cvvField() {
    return this.page.getByRole('textbox', { name: 'CVV' })
      .or(this.page.locator('input[name="cvv"], input[name="cvc"]'))
      .or(this.page.getByPlaceholder('CVV'));
  }

  private get rentNowButton() {
    return this.page.getByRole('button', { name: 'Rent Now' })
      .or(this.page.getByRole('button', { name: /rent now/i }));
  }

  // ============================================
  // UTILITY METHODS
  // ============================================
  private isPageAlive(): boolean {
    try { return !this.page.isClosed(); } catch { return false; }
  }

  private ensurePageAlive(context: string): void {
    if (!this.isPageAlive()) {
      throw new Error(`Page/browser closed during ${context}`);
    }
  }

  private async safeScroll(locator: any, timeout: number = 3000): Promise<void> {
    try { await locator.scrollIntoViewIfNeeded({ timeout }); } catch { /* non-critical */ }
  }

  private async dismissGoogleMapsModal(): Promise<void> {
    try {
      const dismissBtn = this.page.locator('button.dismissButton');
      await dismissBtn.waitFor({ state: 'visible', timeout: 3000 });
      await dismissBtn.click();
      await this.wait(300);
      console.log('  ✓ Dismissed Google Maps modal');
    } catch { /* no modal */ }
  }

  private async selectDropdownOption(field: any, optionText: string, fieldName: string): Promise<void> {
    await this.safeScroll(field);
    await field.click({ timeout: 5000 });

    // Strategy 1: data-id dropdown
    try {
      await this.page.locator('[data-id="dropdown-list-container"]').waitFor({ state: 'visible', timeout: 1500 });
      const option = this.page.locator('[data-id="dropdown-list-item"]').filter({ hasText: optionText });
      await option.first().click({ timeout: 1000 });
      console.log(`  ✓ Selected ${fieldName}: ${optionText}`);
      return;
    } catch { /* fallback */ }

    // Strategy 2: type-to-filter
    try {
      await field.fill('');
      await this.wait(200);
      await field.pressSequentially(optionText, { delay: 30 });
      await this.wait(600);

      const dataIdOption = this.page.locator('[data-id="dropdown-list-item"]').filter({ hasText: optionText });
      if (await dataIdOption.first().isVisible({ timeout: 1000 }).catch(() => false)) {
        await dataIdOption.first().click({ timeout: 1500 });
        console.log(`  ✓ Selected ${fieldName}: ${optionText} (type-to-filter)`);
        return;
      }

      const listboxOption = this.page.getByRole('option', { name: optionText });
      if (await listboxOption.first().isVisible({ timeout: 800 }).catch(() => false)) {
        await listboxOption.first().click({ timeout: 1500 });
        console.log(`  ✓ Selected ${fieldName}: ${optionText} (listbox)`);
        return;
      }

      const paragraphOption = this.page.getByRole('paragraph').filter({ hasText: optionText });
      if (await paragraphOption.first().isVisible({ timeout: 800 }).catch(() => false)) {
        await paragraphOption.first().click({ timeout: 1500 });
        console.log(`  ✓ Selected ${fieldName}: ${optionText} (paragraph)`);
        return;
      }
    } catch { /* fallback */ }

    // Strategy 3: keyboard
    try {
      await field.click({ timeout: 3000 });
      await field.fill('');
      await this.wait(200);
      await field.pressSequentially(optionText, { delay: 30 });
      await this.wait(500);
      await this.page.keyboard.press('ArrowDown');
      await this.wait(200);
      await this.page.keyboard.press('Enter');
      await this.wait(300);
      const fieldValue = await field.inputValue().catch(() => '');
      if (fieldValue.toLowerCase().includes(optionText.toLowerCase().substring(0, 4))) {
        console.log(`  ✓ Selected ${fieldName}: ${optionText} (keyboard)`);
        return;
      }
    } catch { /* fallback */ }

    // Strategy 4: direct text click
    try {
      const option = this.page.getByText(optionText, { exact: false });
      await option.first().click({ timeout: 2000 });
      console.log(`  ✓ Selected ${fieldName}: ${optionText} (text fallback)`);
    } catch {
      console.log(`  - ${fieldName} option not found, skipping`);
    }
  }

  private playAlert(): void {
    try {
      const child = require('child_process').exec(
        'powershell -NoProfile -Command "[System.Media.SystemSounds]::Exclamation.Play()"',
        { windowsHide: true }
      );
      child.unref();
    } catch { /* ignore */ }
  }

  // ============================================
  // CAPTCHA HANDLING (shared by both flows)
  // ============================================
  async waitForManualCaptcha(clientName: string): Promise<void> {
    const currentUrl = this.page.url();
    this.playAlert();

    console.log('\n🛑 ═══════════════════════════════════════════════════════════');
    console.log(`🛑  hCaptcha DETECTED — Manual step required!`);
    console.log(`🛑  CLIENT: ${clientName}`);
    console.log(`🛑  URL: ${currentUrl}`);
    console.log('🛑  1. Switch to the BROWSER WINDOW');
    console.log('🛑  2. Solve the hCaptcha checkbox / challenge');
    console.log('🛑  3. Automation continues AUTOMATICALLY once solved');
    console.log('🛑  (No time limit — take as long as you need)');
    console.log('🛑 ═══════════════════════════════════════════════════════════\n');

    const pollInterval = 500;
    let pollCount = 0;

    while (true) {
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
          console.log(`✅ hCaptcha solved! (detected via: ${solved}) Continuing...\n`);
          return;
        }
      } catch { /* page navigating */ }

      pollCount++;
      if (pollCount % 60 === 0) {
        this.playAlert();
        console.log(`⏳ Still waiting for hCaptcha solve... (${Math.round(pollCount * 0.5)}s elapsed)`);
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
  }

  // ============================================
  // SITELINK FLOW
  // ============================================
  async fillSiteLinkTenantDetails(userData: {
    firstName: string; lastName: string; email: string; phone: string;
    address: string; city: string; province: string; zipCode: string;
  }): Promise<void> {
    console.log('\n📍 SITELINK STEP 4: Filling Tenant Details...');

    await this.wait(2000);
    await this.handleCookieConsent();

    // First Name
    await this.safeScroll(this.firstNameField);
    try {
      await this.firstNameField.click({ timeout: 10000 });
    } catch {
      await this.handleCookieConsent();
      await this.wait(500);
      await this.firstNameField.click({ force: true, timeout: 10000 });
    }
    await this.firstNameField.fill(userData.firstName);
    console.log(`  ✓ First Name: ${userData.firstName}`);

    // Last Name
    await this.safeScroll(this.lastNameField);
    await this.lastNameField.click();
    await this.lastNameField.fill(userData.lastName);
    console.log(`  ✓ Last Name: ${userData.lastName}`);

    // Email
    await this.safeScroll(this.emailField);
    await this.emailField.click();
    await this.emailField.fill(userData.email);
    console.log(`  ✓ Email: ${userData.email}`);

    // Phone
    await this.safeScroll(this.sitelinkPhoneField);
    await this.sitelinkPhoneField.click();
    await this.sitelinkPhoneField.fill(userData.phone);
    console.log(`  ✓ Phone: ${userData.phone}`);

    await this.wait(500);

    // Street Address
    try {
      const addressVisible = await this.sitelinkAddressField.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false);
      if (addressVisible) {
        await this.safeScroll(this.sitelinkAddressField);
        await this.sitelinkAddressField.click();
        await this.sitelinkAddressField.fill(userData.address);
        console.log(`  ✓ Address: ${userData.address}`);

        await this.dismissGoogleMapsModal();

        // Dismiss autocomplete suggestions by clicking heading
        await this.wait(500);
        try {
          const heading = this.page.getByRole('heading', { name: 'Tenant Details' })
            .or(this.page.getByRole('heading', { name: 'Summary of Rental' }));
          await heading.first().click({ timeout: 2000 });
        } catch {
          await this.page.locator('body').click({ position: { x: 0, y: 0 }, force: true });
        }
        await this.wait(300);
      }
    } catch {
      console.log('  - Address field not found, skipping');
    }

    // City
    try {
      const cityVisible = await this.cityField.waitFor({ state: 'visible', timeout: 3000 }).then(() => true).catch(() => false);
      if (cityVisible) {
        await this.safeScroll(this.cityField);
        await this.cityField.click();
        await this.cityField.fill(userData.city);
        console.log(`  ✓ City: ${userData.city}`);
      }
    } catch {
      console.log('  - City field not found, skipping');
    }

    // Province dropdown
    try {
      const stdSelect = this.page.locator('#province, select[name="state"], select[name="province"]');
      const isStdSelect = await stdSelect.isVisible({ timeout: 3000 }).catch(() => false);
      if (isStdSelect) {
        await stdSelect.selectOption(userData.province);
        console.log(`  ✓ Province: ${userData.province} (standard select)`);
      } else {
        await this.selectDropdownOption(this.provinceField, userData.province, 'Province');
      }
    } catch {
      console.log('  - Province field not found, skipping');
    }

    // Zip/Postal Code
    try {
      await this.safeScroll(this.zipField);
      await this.zipField.click();
      await this.zipField.fill(userData.zipCode);
      console.log(`  ✓ Zip/Postal: ${userData.zipCode}`);
    } catch {
      console.log('  - Zip field not found, skipping');
    }

    console.log('✅ SiteLink tenant details completed');
  }

  async clickContinueToNextStep(clientName: string): Promise<void> {
    console.log(`\n📍 Waiting for "CONTINUE TO NEXT STEP" button to be enabled...`);

    // Wait for button to exist
    await this.continueButton.waitFor({ state: 'visible', timeout: 15000 });

    // Poll until button is enabled (captcha may take a moment to unlock it)
    for (let i = 0; i < 60; i++) {
      const isEnabled = await this.continueButton.isEnabled().catch(() => false);
      const disabledAttr = await this.continueButton.getAttribute('disabled').catch(() => null);
      const className = (await this.continueButton.getAttribute('class') || '');
      const isReallyDisabled = !isEnabled || disabledAttr !== null || className.includes('pointer-events-none') || className.includes('opacity');

      if (!isReallyDisabled) {
        await this.safeScroll(this.continueButton);
        // noWaitAfter prevents the click from blocking on Playwright's
        // auto-navigation-wait — Yardi's Continue redirects through several
        // hops to securecafenet.com which often runs past the click timeout.
        await this.continueButton.click({ timeout: 10000, noWaitAfter: true });
        console.log('✅ "CONTINUE TO NEXT STEP" clicked');
        await this.page.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => { /* swallow — handled by chrome-error retry below */ });
        await this.wait(3000);

        // Recover from transient chrome-error://chromewebdata/ on the redirect target.
        let landedUrl = this.page.url();
        for (let retry = 0; retry < 3 && (landedUrl.startsWith('chrome-error://') || landedUrl === 'about:blank'); retry++) {
          console.log(`⚠️ Post-Continue page is "${landedUrl}" — reloading (attempt ${retry + 1}/3)...`);
          await this.wait(2000);
          await this.page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => { /* swallow and retry */ });
          await this.wait(2000);
          landedUrl = this.page.url();
        }

        console.log(`✅ Next page loaded: ${landedUrl}`);
        return;
      }

      if (i % 10 === 0 && i > 0) {
        console.log(`  ⏳ Button still disabled... (${i}s elapsed)`);
      }
      await this.wait(1000);
    }

    throw new Error(`"CONTINUE TO NEXT STEP" button never became enabled for ${clientName}`);
  }

  async fillSiteLinkPaymentAndSubmit(paymentInfo: {
    cardNumber: string; expiryDate: string; cvv: string;
  }): Promise<string> {
    console.log('\n📍 SITELINK STEP 5: Filling Payment Details...');
    this.ensurePageAlive('payment page');

    // Wait for the payment form to be attached. After Continue, prod Mini Mall sites
    // redirect back to the listing URL and Vue swaps in the payment view — this can
    // lag a few seconds beyond domcontentloaded.
    try {
      await this.page.locator('input[name="card_number"]').first().waitFor({ state: 'attached', timeout: 20000 });
      console.log('  ✓ Payment form attached to DOM');
    } catch { /* fall through to existing visibility/iframe paths */ }

    // Scroll to payment section (Mini Mall production uses sectionid="payment-1")
    await this.page.evaluate(() => {
      const paymentSection = document.querySelector('[sectionid*="payment"], [class*="payment"], [id*="payment"], [data-section="payment"]');
      if (paymentSection) paymentSection.scrollIntoView({ block: 'center' });
      else window.scrollTo(0, document.body.scrollHeight * 0.7);
    });
    await this.wait(1500);

    // Card Number
    let cardVisible = await this.cardNumberField.isVisible({ timeout: 8000 }).catch(() => false);
    if (!cardVisible) {
      await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await this.wait(2000);
      cardVisible = await this.cardNumberField.isVisible({ timeout: 5000 }).catch(() => false);
    }

    if (!cardVisible) {
      const iframeFilled = await this.tryFillCardInIframe(paymentInfo);
      if (!iframeFilled) throw new Error('Card Number field not found on payment page');
    } else {
      await this.safeScroll(this.cardNumberField);
      await this.cardNumberField.click({ timeout: 10000 });
      await this.cardNumberField.fill(paymentInfo.cardNumber);
      console.log(`  ✓ Card Number: ${paymentInfo.cardNumber}`);

      await this.safeScroll(this.expiryField);
      await this.expiryField.click();
      await this.expiryField.fill(paymentInfo.expiryDate);
      console.log(`  ✓ Expiry: ${paymentInfo.expiryDate}`);

      await this.safeScroll(this.cvvField);
      await this.cvvField.click();
      await this.cvvField.fill(paymentInfo.cvv);
      console.log(`  ✓ CVV: ${paymentInfo.cvv}`);
    }

    console.log('✅ Payment details completed');

    // Click RENT NOW
    console.log('\n📍 Clicking RENT NOW...');
    await this.minimizeLiveChat();

    let apiErrorMessage = '';
    const responseHandler = async (response: any) => {
      try {
        const url = response.url();
        const status = response.status();
        if (status >= 400 || url.includes('/rent') || url.includes('/move-in') || url.includes('/payment') || url.includes('/checkout') || url.includes('/lease')) {
          const body = await response.text().catch(() => '');
          if (body && (body.includes('error') || body.includes('Error') || body.includes('message') || status >= 400)) {
            try {
              const json = JSON.parse(body);
              const msg = json.message || json.error || json.msg || json.errors || json.detail || '';
              const extracted = typeof msg === 'string' ? msg : JSON.stringify(msg);
              if (extracted && extracted.length > 5) {
                apiErrorMessage = extracted.replace(/\s+/g, ' ').trim();
                console.log(`🌐 API error captured: ${apiErrorMessage.substring(0, 200)}`);
              }
            } catch {
              const normalized = body.replace(/\s+/g, ' ').trim();
              const paymentKeywords = ['response code', 'payment failed', 'invalid card', 'could not save payment method', 'unit is not available', 'reason text'];
              if (paymentKeywords.some(kw => normalized.toLowerCase().includes(kw))) {
                apiErrorMessage = normalized.length > 500 ? normalized.substring(0, 500) : normalized;
              }
            }
          }
        }
      } catch { /* response disposed */ }
    };
    this.page.on('response', responseHandler);

    const clickableBtn = await this.getClickableRentNowButton();
    await this.safeScroll(clickableBtn);
    await clickableBtn.waitFor({ state: 'visible', timeout: 10000 });
    await this.wait(500);

    try {
      await clickableBtn.click({ timeout: 8000 });
    } catch {
      await clickableBtn.click({ timeout: 8000, force: true });
    }
    console.log('✓ RENT NOW clicked');

    // Detect error
    const errorMessage = await this.detectErrorMessage();

    if (errorMessage && !errorMessage.startsWith('FAILED to fetch')) {
      this.page.removeListener('response', responseHandler);
      return errorMessage;
    }

    if (apiErrorMessage) {
      this.page.removeListener('response', responseHandler);
      return `Error Occurred — ${apiErrorMessage}`;
    }

    const pageScan = await this.scanVisiblePageForPaymentError();
    if (pageScan) {
      this.page.removeListener('response', responseHandler);
      return pageScan;
    }

    this.page.removeListener('response', responseHandler);
    return 'FAILED to fetch Error Message @ Step-5 (Mini Mall SiteLink - After RENT NOW click)';
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

      if (className.includes('pointer-events-none') || ariaDisabled === 'true' || disabledAttr !== null) continue;

      return candidate;
    }

    return this.rentNowButton.first();
  }

  private async tryFillCardInIframe(paymentData: { cardNumber: string; expiryDate: string; cvv: string }): Promise<boolean> {
    try {
      const iframes = this.page.locator('iframe');
      const count = await iframes.count();

      for (let i = 0; i < count; i++) {
        const iframe = iframes.nth(i);
        const src = (await iframe.getAttribute('src') || '').toLowerCase();
        const title = (await iframe.getAttribute('title') || '').toLowerCase();
        const name = (await iframe.getAttribute('name') || '').toLowerCase();

        const isPaymentIframe = ['stripe', 'payment', 'card', 'spreedly', 'secure', 'checkout', 'braintree', 'paysafe']
          .some(kw => src.includes(kw) || title.includes(kw) || name.includes(kw));
        if (!isPaymentIframe) continue;

        const frame = this.page.frameLocator(`iframe >> nth=${i}`);
        const cardInput = frame.locator('input[name="cardnumber"], input[name="card_number"], input[placeholder*="card number" i], input[autocomplete="cc-number"]').first();
        if (await cardInput.isVisible({ timeout: 3000 }).catch(() => false)) {
          await cardInput.click();
          await cardInput.fill(paymentData.cardNumber);
          console.log(`  ✓ Card Number (iframe): ${paymentData.cardNumber}`);

          const expiryInput = frame.locator('input[name="exp-date"], input[name="expiry"], input[placeholder*="MM" i], input[autocomplete="cc-exp"]').first();
          if (await expiryInput.isVisible({ timeout: 2000 }).catch(() => false)) {
            await expiryInput.click();
            await expiryInput.fill(paymentData.expiryDate);
            console.log(`  ✓ Expiry (iframe): ${paymentData.expiryDate}`);
          }

          const cvvInput = frame.locator('input[name="cvc"], input[name="cvv"], input[placeholder*="CVV" i], input[autocomplete="cc-csc"]').first();
          if (await cvvInput.isVisible({ timeout: 2000 }).catch(() => false)) {
            await cvvInput.click();
            await cvvInput.fill(paymentData.cvv);
            console.log(`  ✓ CVV (iframe): ${paymentData.cvv}`);
          }
          return true;
        }
      }
    } catch { /* not found */ }
    return false;
  }

  // ============================================
  // YARDI FLOW
  // ============================================
  async fillYardiTenantDetails(userData: {
    firstName: string; lastName: string; email: string; phone: string; address: string;
  }): Promise<void> {
    console.log('\n📍 YARDI: Filling Tenant Details...');

    await this.wait(2000);
    await this.handleCookieConsent();

    // First Name
    await this.safeScroll(this.firstNameField);
    try {
      await this.firstNameField.click({ timeout: 10000 });
    } catch {
      await this.handleCookieConsent();
      await this.wait(500);
      await this.firstNameField.click({ force: true, timeout: 10000 });
    }
    await this.firstNameField.fill(userData.firstName);
    console.log(`  ✓ First Name: ${userData.firstName}`);

    // Last Name
    await this.safeScroll(this.lastNameField);
    await this.lastNameField.click();
    await this.lastNameField.fill(userData.lastName);
    console.log(`  ✓ Last Name: ${userData.lastName}`);

    // Email
    await this.safeScroll(this.emailField);
    await this.emailField.click();
    await this.emailField.fill(userData.email);
    console.log(`  ✓ Email: ${userData.email}`);

    // Phone (Yardi-specific selector)
    await this.safeScroll(this.yardiPhoneField);
    await this.yardiPhoneField.click();
    await this.yardiPhoneField.fill(userData.phone);
    console.log(`  ✓ Phone: ${userData.phone}`);

    await this.wait(500);

    // Address with Google Places autocomplete
    console.log(`  📍 Typing address for Google Places autocomplete...`);
    await this.safeScroll(this.yardiAddressField);
    await this.yardiAddressField.click();
    await this.yardiAddressField.fill('');
    await this.wait(300);

    // Type the address slowly so Google Places picks it up
    await this.yardiAddressField.pressSequentially(userData.address, { delay: 50 });
    console.log(`  ✓ Typed address: ${userData.address}`);

    // Wait for Google Places dropdown to appear
    await this.wait(2000);

    // Dismiss Google Maps modal if it appears
    await this.dismissGoogleMapsModal();

    // Select the first suggestion from the dropdown
    try {
      const pacItem = this.page.locator('.pac-container .pac-item').first();
      const pacVisible = await pacItem.isVisible({ timeout: 3000 }).catch(() => false);

      if (pacVisible) {
        await pacItem.click();
        console.log('  ✓ Selected address from Google Places dropdown');
      } else {
        // Fallback: ArrowDown + Enter
        await this.page.keyboard.press('ArrowDown');
        await this.wait(300);
        await this.page.keyboard.press('Enter');
        console.log('  ✓ Selected address via keyboard (ArrowDown + Enter)');
      }
    } catch {
      // Last resort: just press ArrowDown + Enter
      await this.page.keyboard.press('ArrowDown');
      await this.wait(300);
      await this.page.keyboard.press('Enter');
      console.log('  ✓ Selected address via keyboard fallback');
    }

    // Wait for City, State, Zip to auto-fill from Google Places
    console.log('  ⏳ Waiting for City/State/Zip to auto-fill from address selection...');
    await this.wait(2000);

    // Verify auto-fill happened
    try {
      const cityInput = this.page.locator('input[name="city"], #city-input').first();
      const cityValue = await cityInput.inputValue().catch(() => '');
      if (cityValue) {
        console.log(`  ✓ City auto-filled: ${cityValue}`);
      } else {
        console.log('  ⚠️ City may not have auto-filled — proceeding anyway');
      }
    } catch { /* non-critical */ }

    console.log('✅ Yardi tenant details completed');
  }

  async waitForYardiRedirect(): Promise<string> {
    console.log('\n📍 YARDI: Waiting for redirect to securecafenet.com...');

    // Poll for up to 30 seconds
    for (let i = 0; i < 60; i++) {
      const currentUrl = this.page.url();
      if (currentUrl.includes('securecafenet.com') || currentUrl.includes('avenueliving')) {
        console.log(`✅ Successfully redirected to: ${currentUrl}`);
        return `SUCCESS — Redirected to ${currentUrl}`;
      }

      if (i % 10 === 0 && i > 0) {
        console.log(`  ⏳ Waiting for redirect... (${i * 0.5}s) — Current: ${currentUrl}`);
      }

      await this.wait(500);
    }

    // Check one more time
    const finalUrl = this.page.url();
    if (finalUrl.includes('securecafenet.com') || finalUrl.includes('avenueliving')) {
      return `SUCCESS — Redirected to ${finalUrl}`;
    }

    // Check if there's an error on the page
    const pageError = await this.scanVisiblePageForPaymentError();
    if (pageError) {
      return `ERROR on page — ${pageError}`;
    }

    return `TIMEOUT — Never redirected to securecafenet.com (stayed at: ${finalUrl})`;
  }

  // ============================================
  // RUNTIME FMS DETECTION (for production URLs)
  // ============================================
  async detectFlowType(): Promise<'SiteLink' | 'Yardi'> {
    const url = this.page.url();
    if (url.includes('/yardi/')) return 'Yardi';
    if (url.includes('mini-mall-storage-yardi')) return 'Yardi';

    // Check for Yardi-specific form elements
    try {
      const yardiPhone = this.page.locator('#phone-input');
      if (await yardiPhone.isVisible({ timeout: 3000 }).catch(() => false)) return 'Yardi';
    } catch { /* not Yardi */ }

    // Check for SiteLink-specific "CONTINUE TO NEXT STEP"
    try {
      const continueBtn = this.page.getByRole('button', { name: 'CONTINUE TO NEXT STEP' });
      if (await continueBtn.isVisible({ timeout: 3000 }).catch(() => false)) return 'SiteLink';
    } catch { /* not SiteLink two-step */ }

    return 'SiteLink';
  }

  // ============================================
  // ERROR DETECTION (reused from SPC flow)
  // ============================================
  private async detectErrorMessage(): Promise<string> {
    // Immediate check
    let errorMessage = await this.quickErrorCheck();
    if (errorMessage) return errorMessage;

    // Active polling for 15 seconds
    for (let i = 0; i < 30; i++) {
      await this.wait(500);
      errorMessage = await this.quickErrorCheck();
      if (errorMessage) return errorMessage;
    }

    return '';
  }

  private async quickErrorCheck(): Promise<string> {
    // Toast body
    const toastBodyLocators = [
      this.page.locator('.toast-container .toast-body').first(),
      this.page.locator('[data-id*="toast-notification"] .toast-body').first(),
      this.page.locator('.toast-body').first(),
    ];
    for (const body of toastBodyLocators) {
      try {
        if (await body.isVisible({ timeout: 500 })) {
          const text = (await body.innerText()).trim();
          if (text && text.length > 0) return text;
        }
      } catch { /* not visible */ }
    }

    // Detailed error with Response Code
    try {
      const detailedError = this.page.locator('p.text-sm.text-white').filter({ hasText: 'Response Code' });
      if (await detailedError.isVisible({ timeout: 500 })) {
        const text = (await detailedError.innerText()).trim();
        if (text) return text;
      }
    } catch { /* not visible */ }

    // Full toast notification text
    const toastLocators = [
      this.page.locator('[data-id*="toast-notification"]').first(),
      this.page.locator('.toast-container').first(),
    ];
    for (const toast of toastLocators) {
      try {
        if (await toast.isVisible({ timeout: 500 })) {
          const fullText = (await toast.innerText()).trim();
          const lines = fullText.split('\n').map(l => l.trim()).filter(l => l.length > 0 && !['Close', '×', 'X', '✕'].includes(l));
          const cleaned = lines.join(' — ');
          const generic = ['error occurred', 'error occurred — dismiss', 'error occurred dismiss'];
          if (cleaned && !generic.includes(cleaned.toLowerCase().trim())) return cleaned;
        }
      } catch { /* not visible */ }
    }

    // alert-danger / role=alert
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

    // Page scan
    const pageScan = await this.scanVisiblePageForPaymentError();
    if (pageScan) return pageScan;

    return '';
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
          const text = (await locator.innerText()).replace(/\s+/g, ' ').trim();
          if (text && text.length >= 20 && meaningfulErrorPattern.test(text)) return text;
        }
      } catch { /* keep scanning */ }
    }

    return '';
  }
}
