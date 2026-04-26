import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { CURRENT_ENVIRONMENT, Environment } from '../configs/urls';

export class ContactPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Primary contact page indicators
  private get contactHeading() {
    return this.page.getByRole('heading', { name: /contact/i });
  }

  private get getInTouchHeading() {
    return this.page.getByRole('heading', { name: /get in touch/i });
  }

  private get letsTalkHeading() {
    return this.page.getByRole('heading', { name: /let's talk/i });
  }

  private get needAssistanceHeading() {
    return this.page.getByRole('heading', { name: /need assistance/i });
  }

  // Contact form elements
  private get emailInput() {
    return this.page.getByRole('textbox', { name: /email/i });
  }

  private get messageTextarea() {
    return this.page.getByRole('textbox', { name: /message/i });
  }

  private get submitButton() {
    return this.page.getByRole('button', { name: /send|submit/i });
  }

  private get contactForm() {
    return this.page.locator('form');
  }

  // Contact information elements
  private get phoneLink() {
    return this.page.getByRole('link', { name: /phone|\(\d{3}\)|\d{3}-\d{3}-\d{4}|\d{3}-\d{3}-\d{4}/i });
  }

  private get emailLink() {
    return this.page.getByRole('link', { name: /@|email/i });
  }

  private get phoneHeading() {
    return this.page.getByRole('heading', { name: /phone/i });
  }

  private get emailHeading() {
    return this.page.getByRole('heading', { name: /email/i });
  }

  private get socialLinksHeading() {
    return this.page.getByRole('heading', { name: /social/i });
  }

  private get corporateAddressHeading() {
    return this.page.getByRole('heading', { name: /corporate address|address/i });
  }

  // Contact-related text
  private get phoneText() {
    return this.page.getByText(/phone/i);
  }

  private get addressText() {
    return this.page.getByText(/address/i);
  }

  private get hoursText() {
    return this.page.getByText(/hours|access hours/i);
  }

  private get officeText() {
    return this.page.getByText(/office/i);
  }

  // Maps and embedded content
  private get mapFrame() {
    return this.page.frameLocator('iframe');
  }

  private get mapElement() {
    return this.page.locator('iframe');
  }

  /**
   * Navigate to contact page with cache busting
   */
  async navigateToContactPage(baseUrl: string): Promise<void> {
    const contactUrl = this.constructContactPageUrl(baseUrl);
    const contactUrlWithCacheBust = this.addCacheBustingParam(contactUrl);
    
    console.log(`📞 Navigating to contact page: ${contactUrlWithCacheBust}`);
    
    try {
      await this.page.goto(contactUrlWithCacheBust, { 
        waitUntil: 'domcontentloaded',
        timeout: 60000 
      });

      // Wait for page to be ready
      await this.page.waitForLoadState('domcontentloaded');
      await this.wait(3000); // Allow dynamic content to load
      
      // Check if we got a 404 or error page
      const pageTitle = await this.page.title();
      if (pageTitle.toLowerCase().includes('404') || pageTitle.toLowerCase().includes('not found')) {
        throw new Error(`Contact page not found at ${contactUrl} - may need different URL pattern`);
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`⚠️  Failed to load ${contactUrl}, error: ${errorMessage}`);
      throw new Error(`Could not navigate to contact page: ${errorMessage}`);
    }
  }

  /**
   * Find the correct contact page URL by trying common patterns
   */
  private async findContactPageUrl(baseUrl: string): Promise<string> {
    const cleanUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    
    // Common contact page patterns to try
    const contactPatterns = [
      '/pages/contact',  // Most common for Storagely sites
      '/contact',        // Standard pattern
      '/contact-us',     // Alternative pattern
      '/contact.html'    // Static sites
    ];

    // For now, start with the most common pattern based on investigation
    // If we encounter failures, we can enhance this to actually test URLs
    return `${cleanUrl}${contactPatterns[0]}`;
  }

  /**
   * Verify contact page content and elements
   */
  async verifyContactPageContent(baseUrl: string): Promise<{ 
    found: boolean; 
    foundElements: string[]; 
    elementCounts: { [key: string]: number } 
  }> {
    console.log(`🔍 Verifying contact page elements for: ${baseUrl}`);
    
    // Wait for body to be visible
    await expect(this.page.locator('body')).toBeVisible({ timeout: 15000 });
    console.log(`   ✓ Contact page loaded successfully`);

    // Verify page title
    const title = await this.page.title();
    expect(title.length, `Title is empty for contact page of ${baseUrl}`).toBeGreaterThan(0);
    console.log(`   ✓ Title verified: "${title}"`);

    const foundElements: string[] = [];
    const elementCounts: { [key: string]: number } = {};

    // Check for contact page indicators
    const indicators = [
      { name: 'Contact Heading', locator: this.contactHeading },
      { name: 'Get In Touch Heading', locator: this.getInTouchHeading },
      { name: 'Lets Talk Heading', locator: this.letsTalkHeading },
      { name: 'Need Assistance Heading', locator: this.needAssistanceHeading },
      { name: 'Email Input', locator: this.emailInput },
      { name: 'Message Textarea', locator: this.messageTextarea },
      { name: 'Submit Button', locator: this.submitButton },
      { name: 'Contact Form', locator: this.contactForm },
      { name: 'Phone Link', locator: this.phoneLink },
      { name: 'Email Link', locator: this.emailLink },
      { name: 'Phone Heading', locator: this.phoneHeading },
      { name: 'Email Heading', locator: this.emailHeading },
      { name: 'Social Links Heading', locator: this.socialLinksHeading },
      { name: 'Corporate Address Heading', locator: this.corporateAddressHeading },
      { name: 'Phone Text', locator: this.phoneText },
      { name: 'Address Text', locator: this.addressText },
      { name: 'Hours Text', locator: this.hoursText },
      { name: 'Office Text', locator: this.officeText },
      { name: 'Map Element', locator: this.mapElement }
    ];

    for (const indicator of indicators) {
      try {
        const count = await indicator.locator.count();
        elementCounts[indicator.name] = count;
        
        if (count > 0) {
          foundElements.push(indicator.name);
          console.log(`   ✓ Found ${indicator.name}: ${count} instances`);
        }
      } catch (error) {
        elementCounts[indicator.name] = 0;
        // Continue checking other elements
      }
    }

    // Additional checks for generic contact content
    try {
      const contactText = await this.page.getByText(/contact/i).count();
      if (contactText > 0) {
        foundElements.push('Contact Text');
        elementCounts['Contact Text'] = contactText;
        console.log(`   ✓ Found Contact Text: ${contactText} instances`);
      }
    } catch (error) {
      // Continue
    }

    const hasContactElements = foundElements.length > 0;
    
    if (hasContactElements) {
      console.log(`   ✓ Contact page verification complete - found ${foundElements.length} contact element types`);
      console.log(`   📋 Elements found: ${foundElements.join(', ')}`);
    } else {
      console.log(`   ❌ No contact elements found on the page`);
    }

    return {
      found: hasContactElements,
      foundElements,
      elementCounts
    };
  }

  /**
   * Construct contact page URL
   */
  private constructContactPageUrl(baseUrl: string): string {
    // Remove trailing slash if present
    const cleanUrl = baseUrl.replace(/\/+$/, ''); // Remove one or more trailing slashes

    // Sites with custom contact paths (production)
    if (cleanUrl.includes('storagedepotla.com')) return `${cleanUrl}/contact-storage`;

    // Sites that use /pages/contact in production
    const pagesContactSites = ['gatekeeperstoragega.com', 'redrocksstorage.com', 'rhino-storage.com'];
    const usesPagesContact = pagesContactSites.some(s => cleanUrl.includes(s));

    // Staging always uses /pages/contact; production defaults to /contact unless overridden
    if (CURRENT_ENVIRONMENT === Environment.STAGING || usesPagesContact) {
      return `${cleanUrl}/pages/contact`;
    }
    return `${cleanUrl}/contact`;
  }

  /**
   * Add cache busting parameters to URL
   */
  private addCacheBustingParam(url: string): string {
    const skipCacheBust = ['minimallstorage.com', 'mini-mall-storage', '10federal', 'bluebird'];
    if (skipCacheBust.some(site => url.toLowerCase().includes(site))) {
      return url;
    }
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2);
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}_cache_bust=${timestamp}_${randomString}`;
  }

  /**
   * Quick verification if page looks like a contact page
   */
  async isContactPage(): Promise<boolean> {
    try {
      // Check for any contact-related indicators
      const hasContactHeading = await this.contactHeading.count() > 0;
      const hasGetInTouchHeading = await this.getInTouchHeading.count() > 0;
      const hasLetsTalkHeading = await this.letsTalkHeading.count() > 0;
      const hasNeedAssistanceHeading = await this.needAssistanceHeading.count() > 0;
      const hasContactForm = await this.contactForm.count() > 0;
      const hasContactText = await this.page.getByText(/contact/i).count() > 0;
      
      return hasContactHeading || hasGetInTouchHeading || hasLetsTalkHeading || 
             hasNeedAssistanceHeading || hasContactForm || hasContactText;
    } catch (error) {
      return false;
    }
  }

  // ============================================================
  // CONTACT FORM SUBMISSION (prod-only full verification)
  // ============================================================

  /** Test data used for form submission */
  static readonly TEST_DATA = {
    firstName: 'Test',
    lastName: 'Testing',
    name: 'Test Testing',
    email: 'tareq@storagely.io',
    phone: '5551234567',
    subject: 'Testing',
    address: '123 Test Street',
    message: 'This is an automated test submission from Storagely QA. Please disregard.',
  };

  /**
   * Detects whether this is a Brizy form (→ lead.formsender.site)
   * or a Storagely native form (→ save-contact-form).
   */
  private async detectFormType(): Promise<'brizy' | 'native' | 'unknown'> {
    const formAction = await this.page.locator('form').first().getAttribute('action').catch(() => '') || '';
    if (formAction.includes('formsender.site') || formAction.includes('lead.')) return 'brizy';
    if (formAction.includes('save-contact-form')) return 'native';
    return 'unknown';
  }

  /**
   * Full contact page verification: checks all elements, fills form if present, submits, and reports.
   * Returns a structured result with everything that happened.
   */
  async verifyAndSubmitContactForm(baseUrl: string, waitForCaptcha: boolean = false): Promise<ContactFormResult> {
    const result: ContactFormResult = {
      url: this.page.url(),
      hasForm: false,
      fieldsFound: [],
      fieldsFilled: [],
      fieldsWithIssues: [],
      submittedData: {},
      submitOutcome: 'NO_FORM',
      successMessage: '',
      errorMessage: '',
    };

    // --- Detect form ---
    const formCount = await this.contactForm.count();
    if (formCount === 0) {
      console.log('   ℹ️  No contact form found on this page (info-only contact page)');
      result.submitOutcome = 'NO_FORM';
      return result;
    }
    result.hasForm = true;
    const formType = await this.detectFormType();
    console.log(`   ✅ Contact form detected (${formCount} form(s), type: ${formType})`);

    // --- Discover and fill fields ---

    // FIRST NAME
    const firstNameInput = this.page.locator([
      'input[name="first_name"]',
      'input[placeholder*="first name" i]',
      'input[data-brz-label*="First Name" i]',
    ].join(', ')).first();
    if (await this.isFieldVisible(firstNameInput)) {
      result.fieldsFound.push('First Name');
      await this.fillField(firstNameInput, ContactPage.TEST_DATA.firstName, 'First Name', result);
    }

    // LAST NAME
    const lastNameInput = this.page.locator([
      'input[name="last_name"]',
      'input[placeholder*="last name" i]',
      'input[data-brz-label*="Last Name" i]',
    ].join(', ')).first();
    if (await this.isFieldVisible(lastNameInput)) {
      result.fieldsFound.push('Last Name');
      await this.fillField(lastNameInput, ContactPage.TEST_DATA.lastName, 'Last Name', result);
    }

    // NAME (single name field — only if first/last not found)
    if (!result.fieldsFilled.includes('First Name') && !result.fieldsFilled.includes('Last Name')) {
      const nameInput = this.page.locator([
        'input[data-brz-label="Name" i]',
        'input[data-brz-label*="Full Name" i]',
        'input[name*="name" i]:not([name*="last"]):not([name*="first"]):not([type="hidden"]):not([name*="email"]):not([name*="user"]):not([name*="enable"])',
        'input[placeholder*="name" i]:not([placeholder*="last"]):not([placeholder*="first"]):not([placeholder*="email"])',
      ].join(', ')).first();
      if (await this.isFieldVisible(nameInput)) {
        result.fieldsFound.push('Name');
        await this.fillField(nameInput, ContactPage.TEST_DATA.name, 'Name', result);
      }
    }

    // EMAIL
    const emailInput = this.page.locator([
      'input[type="email"]',
      'input[name="email"]',
      'input[placeholder*="email" i]',
      'input[data-brz-label*="email" i]',
    ].join(', ')).first();
    if (await this.isFieldVisible(emailInput)) {
      result.fieldsFound.push('Email');
      await this.fillField(emailInput, ContactPage.TEST_DATA.email, 'Email', result);
    }

    // PHONE — some sites use type="tel", others use type="text" with name="phone"
    const phoneInput = this.page.locator([
      'input[type="tel"]',
      'input[name="phone"]',
      'input[placeholder*="phone" i]',
      'input[data-brz-label*="phone" i]',
      'input[type="number"][data-brz-label*="phone" i]',
    ].join(', ')).first();
    if (await this.isFieldVisible(phoneInput)) {
      result.fieldsFound.push('Phone');
      await this.fillField(phoneInput, ContactPage.TEST_DATA.phone, 'Phone', result);
    }

    // SUBJECT (text input for subject — Brizy sites like StorageStar/Sunbird/Bluebird/MiniMall)
    const subjectInput = this.page.locator([
      'input[data-brz-label*="Subject" i]',
      'input[placeholder*="subject" i]',
    ].join(', ')).first();
    if (await this.isFieldVisible(subjectInput)) {
      result.fieldsFound.push('Subject');
      await this.fillField(subjectInput, ContactPage.TEST_DATA.subject, 'Subject', result);
    }

    // ADDRESS (some forms have it, e.g. Storsafe)
    const addressInput = this.page.locator('input[name*="address" i]:not([name*="email"]), input[placeholder*="address" i]:not([placeholder*="email"]), input[id*="address" i]:not([id*="email"])').first();
    if (await this.isFieldVisible(addressInput)) {
      result.fieldsFound.push('Address');
      await this.fillField(addressInput, ContactPage.TEST_DATA.address, 'Address', result);
    }

    // --- DROPDOWNS ---
    await this.handleDropdowns(formType, result);

    // --- CHECKBOX (enable_message for native forms) ---
    const enableMsgCheckbox = this.page.locator('input[name="enable_message"]');
    if (await this.isFieldVisible(enableMsgCheckbox)) {
      try {
        const isChecked = await enableMsgCheckbox.isChecked();
        if (!isChecked) {
          await enableMsgCheckbox.check({ timeout: 3000 });
          console.log('   ✅ Checked "enable_message" checkbox');
        }
        result.fieldsFound.push('Enable Message Checkbox');
        result.fieldsFilled.push('Enable Message Checkbox');
      } catch (e) {
        console.log(`   ⚠️  Could not check enable_message: ${(e as Error).message}`);
      }
    }

    // MESSAGE / TEXTAREA (pick only visible ones, skip captcha textareas)
    const messageArea = this.page.locator([
      'textarea[name*="message" i]:not([name*="captcha"]):not([name*="recaptcha"])',
      'textarea[placeholder*="message" i]',
      'textarea[data-brz-label*="message" i]',
    ].join(', ')).first();
    if (await this.isFieldVisible(messageArea)) {
      result.fieldsFound.push('Message');
      await this.fillField(messageArea, ContactPage.TEST_DATA.message, 'Message', result);
    }

    // --- Summary of what we found vs filled ---
    if (result.fieldsFound.length === 0) {
      console.log('   ⚠️  Form element exists but no fillable fields detected');
      result.submitOutcome = 'NO_FIELDS';
      return result;
    }

    console.log(`   📋 Fields found: ${result.fieldsFound.join(', ')}`);
    console.log(`   ✏️  Fields filled: ${result.fieldsFilled.join(', ')}`);
    if (result.fieldsWithIssues.length > 0) {
      console.log(`   ⚠️  Issues: ${result.fieldsWithIssues.join('; ')}`);
    }

    // --- Click Send/Submit ---
    const submitBtn = this.page.locator('form button[type="submit"], form input[type="submit"]').first()
      .or(this.page.getByRole('button', { name: /send|submit/i }).first());

    if (!(await this.isFieldVisible(submitBtn))) {
      console.log('   ⚠️  No visible Send/Submit button found');
      result.submitOutcome = 'NO_SUBMIT_BUTTON';
      result.fieldsWithIssues.push('Send/Submit button not visible');
      return result;
    }

    result.fieldsFound.push('Send/Submit Button');

    // --- CAPTCHA check: wait for user to solve if site is in CONTACT_CAPTCHA_SITES ---
    if (waitForCaptcha) {
      const hasCaptcha = await this.detectCaptchaOnPage();
      if (hasCaptcha) {
        result.fieldsFound.push('CAPTCHA (manual)');
        console.log('   🛑 CAPTCHA detected on contact form — waiting for manual solve...');
        await this.waitForContactCaptcha(baseUrl);
        console.log('   ✅ CAPTCHA solved — proceeding to click Send/Submit');
      } else {
        console.log('   ℹ️  Site is in CONTACT_CAPTCHA_SITES but no visible CAPTCHA found — proceeding');
      }
    }

    console.log('   🖱️  Clicking Send/Submit...');

    // Listen for network response to capture success/error from API
    let apiResponse = '';
    let apiStatus = 0;
    let apiBody = '';
    const responseHandler = async (response: any) => {
      try {
        const url = response.url();
        if (url.includes('contact') || url.includes('form') || url.includes('message') || url.includes('inquiry') || url.includes('lead') || url.includes('save-contact')) {
          const status = response.status();
          apiStatus = status;
          if (status >= 200 && status < 300) {
            apiBody = await response.text().catch(() => '');
            apiResponse = `API OK (${status})`;
          } else {
            apiBody = await response.text().catch(() => '');
            apiResponse = `${status} ${response.statusText()}`;
          }
          console.log(`   📡 API Response: ${status} ${response.statusText()} — URL: ${url.substring(0, 80)}`);
          if (apiBody && apiBody.length < 300) console.log(`   📡 API Body: ${apiBody}`);
        }
      } catch { /* response disposed */ }
    };
    this.page.on('response', responseHandler);

    try {
      await submitBtn.click({ timeout: 10000 });
      console.log('   ✅ Send/Submit clicked');
    } catch (clickError) {
      try {
        await submitBtn.click({ timeout: 5000, force: true });
        console.log('   ✅ Send/Submit clicked (force)');
      } catch (forceError) {
        result.submitOutcome = 'CLICK_FAILED';
        result.errorMessage = (forceError as Error).message;
        result.fieldsWithIssues.push(`Send/Submit button click failed: ${result.errorMessage}`);
        this.page.removeListener('response', responseHandler);
        return result;
      }
    }

    // Wait for response / toast / confirmation
    await this.wait(5000);
    this.page.removeListener('response', responseHandler);

    // --- Detect outcome ---
    // Check for success indicators on page
    const successPatterns = [
      this.page.locator('.toast-body, .toast-container, [role="alert"]').filter({ hasText: /thank|success|sent|received|submitted/i }),
      this.page.getByText(/thank you|message sent|successfully|we will|we'll get back|received your|your email was sent/i),
      // .brz-forms2__alert can show success OR error — only treat as success when the text confirms it
      this.page.locator('.brz-forms2__alert').filter({ hasText: /thank|success|sent|received|submitted/i }),
    ];
    for (const loc of successPatterns) {
      try {
        if (await loc.first().isVisible({ timeout: 2000 })) {
          result.successMessage = (await loc.first().textContent())?.trim() || 'Success indicator visible';
          break;
        }
      } catch { /* not visible */ }
    }

    // Check for error indicators on page (only if no success found yet)
    if (!result.successMessage) {
      const errorPatterns = [
        this.page.locator('.toast-body, .toast-container, [role="alert"]').filter({ hasText: /error|fail|invalid|required|wrong/i }),
        // Only treat .brz-forms2__alert as an error when the text is clearly an error (not a success message)
        this.page.locator('.brz-forms2__alert').filter({ hasText: /error|fail|invalid|required|wrong|oops/i }),
        this.page.locator('.error, .field-error, .form-error, .invalid-feedback').filter({ hasText: /.+/ }),
      ];
      for (const loc of errorPatterns) {
        try {
          if (await loc.first().isVisible({ timeout: 1000 })) {
            const errText = (await loc.first().textContent())?.trim() || '';
            if (errText && errText.length > 2 && errText.length < 500) {
              result.errorMessage = errText;
              break;
            }
          }
        } catch { /* not visible */ }
      }

      // Also check for page-level error via toast with generic "Error" for native forms
      if (!result.errorMessage) {
        try {
          const toastError = this.page.locator('#toast-container .toast-error, .toast-error').first();
          if (await toastError.isVisible({ timeout: 1000 })) {
            result.errorMessage = (await toastError.textContent())?.trim() || 'Toast error visible';
          }
        } catch { /* not visible */ }
      }
    } // end if (!result.successMessage)

    // Determine outcome
    if (result.successMessage) {
      result.submitOutcome = 'SUCCESS';
      console.log(`   ✅ Submission confirmed: ${result.successMessage}`);
    } else if (apiResponse.startsWith('API OK') || (apiStatus >= 200 && apiStatus < 300 && apiStatus > 0)) {
      // API returned 2xx — likely success even if no visible toast
      result.submitOutcome = 'SUCCESS';
      result.successMessage = apiResponse || `API ${apiStatus}`;
      // Check if body has an error message despite 2xx
      if (apiBody && /error|fail|invalid/i.test(apiBody) && !/success/i.test(apiBody)) {
        result.submitOutcome = 'ERROR';
        result.errorMessage = `API 2xx but body has error: ${apiBody.substring(0, 120)}`;
        result.successMessage = '';
      } else {
        console.log(`   ✅ Submission likely succeeded (${apiResponse})`);
      }
    } else if (result.errorMessage) {
      result.submitOutcome = 'ERROR';
      console.log(`   ❌ Submission error: ${result.errorMessage}`);
    } else if (apiResponse) {
      result.submitOutcome = 'ERROR';
      result.errorMessage = apiResponse;
      console.log(`   ❌ API error: ${apiResponse}`);
    } else {
      result.submitOutcome = 'UNKNOWN';
      console.log('   ⚠️  No clear success/error indicator detected after submit');
    }

    return result;
  }

  // --- Dropdown handling ---

  private async handleDropdowns(formType: string, result: ContactFormResult): Promise<void> {
    const selects = this.page.locator('form select');
    const selectCount = await selects.count();

    for (let i = 0; i < selectCount; i++) {
      const sel = selects.nth(i);
      const selName = await sel.getAttribute('name').catch(() => '') || '';
      const selClass = await sel.getAttribute('class').catch(() => '') || '';
      const ariaHidden = await sel.getAttribute('aria-hidden').catch(() => '') || '';
      const isVisible = await this.isFieldVisible(sel);
      const isSelect2 = selClass.includes('select2') || ariaHidden === 'true';

      // Skip hidden dropdowns that aren't Select2 (e.g. subject_metter which is conditionally shown)
      if (!isVisible && !isSelect2) continue;
      // Skip the hidden subject_metter dropdown on native forms
      if (selName === 'subject_metter') continue;

      const selectLabel = await sel.getAttribute('data-brz-label')
        || await sel.getAttribute('name')
        || await sel.getAttribute('id')
        || `Select #${i + 1}`;
      result.fieldsFound.push(`Dropdown: ${selectLabel}`);

      try {
        // Collect options
        const options = sel.locator('option');
        const optCount = await options.count();
        let targetVal = '';
        let targetText = '';
        for (let j = 0; j < optCount; j++) {
          const val = await options.nth(j).getAttribute('value');
          const text = (await options.nth(j).textContent())?.trim() || '';
          if (val && val !== '' && !text.toLowerCase().includes('select') && !text.toLowerCase().includes('choose')) {
            targetVal = val;
            targetText = text;
            break;
          }
        }
        if (!targetVal) {
          result.fieldsWithIssues.push(`Dropdown: ${selectLabel} — no selectable options`);
          console.log(`   ⚠️  Dropdown ${selectLabel} — no selectable options`);
          continue;
        }

        if (isSelect2 && !isVisible) {
          // Select2 — use jQuery trigger if available, otherwise vanilla JS
          await sel.evaluate((el: HTMLSelectElement, val: string) => {
            el.value = val;
            // Try jQuery/Select2 trigger first
            if (typeof (window as any).jQuery !== 'undefined') {
              (window as any).jQuery(el).val(val).trigger('change');
            } else {
              el.dispatchEvent(new Event('change', { bubbles: true }));
            }
          }, targetVal);
          console.log(`   ✅ Selected "${targetText}" for ${selectLabel} (Select2/JS)`);
        } else {
          // Standard visible <select>
          await sel.selectOption({ value: targetVal });
          console.log(`   ✅ Selected "${targetText}" for ${selectLabel}`);
        }
        result.fieldsFilled.push(`Dropdown: ${selectLabel}`);
        result.submittedData[`Dropdown: ${selectLabel}`] = targetText;
      } catch (e) {
        const errMsg = (e as Error).message.split('\n')[0].substring(0, 100);
        result.fieldsWithIssues.push(`Dropdown: ${selectLabel} — ${errMsg}`);
        console.log(`   ⚠️  Could not select dropdown ${selectLabel}: ${errMsg}`);
      }
    }
  }

  // --- CAPTCHA handling ---

  /**
   * Check if there's a visible CAPTCHA (hCaptcha / reCAPTCHA) on the page.
   * Returns true only if a CAPTCHA widget is actually visible to the user.
   */
  private async detectCaptchaOnPage(): Promise<boolean> {
    try {
      // hCaptcha visible checkbox iframe
      const hCaptchaFrame = this.page.locator('iframe[src*="hcaptcha"][title*="checkbox"], iframe[src*="hcaptcha"][title*="Widget"]');
      for (let i = 0; i < await hCaptchaFrame.count(); i++) {
        if (await hCaptchaFrame.nth(i).isVisible().catch(() => false)) return true;
      }

      // reCAPTCHA visible iframe
      const reCaptchaFrame = this.page.locator('iframe[src*="recaptcha"][title*="reCAPTCHA"]');
      for (let i = 0; i < await reCaptchaFrame.count(); i++) {
        if (await reCaptchaFrame.nth(i).isVisible().catch(() => false)) return true;
      }

      // hCaptcha / reCAPTCHA container divs — only if visible and has a sitekey
      const captchaDiv = this.page.locator('.h-captcha[data-sitekey], .g-recaptcha[data-sitekey]');
      for (let i = 0; i < await captchaDiv.count(); i++) {
        const el = captchaDiv.nth(i);
        const sitekey = await el.getAttribute('data-sitekey').catch(() => '') || '';
        if (sitekey && await el.isVisible().catch(() => false)) return true;
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Wait for user to manually solve CAPTCHA on the contact form.
   * Polls every 500ms for a token in the CAPTCHA response textarea.
   * Plays a system sound to alert the user.
   */
  private async waitForContactCaptcha(baseUrl: string): Promise<void> {
    const displayName = baseUrl;
    // Play audible alert
    try {
      const child = require('child_process').exec(
        'powershell -NoProfile -Command "[System.Media.SystemSounds]::Exclamation.Play()"',
        { windowsHide: true }
      );
      child.unref();
    } catch { /* ignore */ }

    console.log('\n🛑 ═══════════════════════════════════════════════════════════');
    console.log(`🛑  CAPTCHA DETECTED on Contact Form — Manual step required!`);
    console.log(`🛑  CLIENT: ${displayName}`);
    console.log(`🛑  URL: ${this.page.url()}`);
    console.log('🛑  1. Switch to the BROWSER WINDOW');
    console.log('🛑  2. Solve the CAPTCHA checkbox / challenge');
    console.log('🛑  3. Automation will continue AUTOMATICALLY once solved');
    console.log('🛑  (No time limit — take as long as you need)');
    console.log('🛑 ═══════════════════════════════════════════════════════════\n');

    const pollInterval = 500;
    let pollCount = 0;

    while (true) {
      try {
        const solved = await this.page.evaluate(() => {
          // hCaptcha response
          const hTa = document.querySelector('textarea[name="h-captcha-response"]') as HTMLTextAreaElement | null;
          if (hTa && hTa.value && hTa.value.length > 0) return 'h-captcha-response';

          // reCAPTCHA response
          const gTa = document.querySelector('textarea[name="g-recaptcha-response"]') as HTMLTextAreaElement | null;
          if (gTa && gTa.value && gTa.value.length > 0) return 'g-recaptcha-response';

          // data-hcaptcha-response attribute
          const wrapper = document.querySelector('[data-hcaptcha-response]') as HTMLElement | null;
          if (wrapper) {
            const resp = wrapper.getAttribute('data-hcaptcha-response');
            if (resp && resp.length > 0) return 'data-hcaptcha-response';
          }

          return '';
        });

        if (solved) {
          console.log(`   ✅ CAPTCHA solved! (via: ${solved}) Continuing...\n`);
          return;
        }
      } catch { /* page navigating */ }

      pollCount++;
      if (pollCount % 60 === 0) {
        try {
          const reminder = require('child_process').exec(
            'powershell -NoProfile -Command "[System.Media.SystemSounds]::Exclamation.Play()"',
            { windowsHide: true }
          );
          reminder.unref();
        } catch { /* ignore */ }
        console.log(`   ⏳ Still waiting for CAPTCHA solve for ${displayName}... (${Math.round(pollCount * 0.5)}s elapsed)`);
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
  }

  // --- Private helpers ---

  private async isFieldVisible(locator: any): Promise<boolean> {
    try {
      return await locator.isVisible({ timeout: 2000 });
    } catch {
      return false;
    }
  }

  private async fillField(locator: any, value: string, label: string, result: ContactFormResult): Promise<void> {
    try {
      await locator.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {});
      try {
        await locator.click({ timeout: 3000 });
      } catch {
        await locator.click({ timeout: 3000, force: true });
      }
      await locator.fill(value, { timeout: 5000 });
      const actual = await locator.inputValue({ timeout: 2000 }).catch(() => '');
      if (actual === value || actual.includes(value.substring(0, 5))) {
        result.fieldsFilled.push(label);
        result.submittedData[label] = value;
        console.log(`   ✅ Filled ${label}: "${value}"`);
      } else {
        result.fieldsWithIssues.push(`${label} — value not retained (got "${actual}")`);
        console.log(`   ⚠️  ${label} — value not retained (expected "${value}", got "${actual}")`);
      }
    } catch (e) {
      const errMsg = (e as Error).message.split('\n')[0].substring(0, 100);
      result.fieldsWithIssues.push(`${label} — ${errMsg}`);
      console.log(`   ⚠️  Could not fill ${label}: ${errMsg}`);
    }
  }
}

// --- Types ---
export interface ContactFormResult {
  url: string;
  hasForm: boolean;
  fieldsFound: string[];
  fieldsFilled: string[];
  fieldsWithIssues: string[];
  submittedData: Record<string, string>;
  submitOutcome: 'SUCCESS' | 'ERROR' | 'NO_FORM' | 'NO_FIELDS' | 'NO_SUBMIT_BUTTON' | 'CLICK_FAILED' | 'UNKNOWN';
  successMessage: string;
  errorMessage: string;
}
