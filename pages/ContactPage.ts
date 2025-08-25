import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

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
    
    // Handle specific site contact URL patterns
    if (cleanUrl.includes('sunbirdstorage.com')) {
      return `${cleanUrl}/contact-sunbird`;
    } else if (cleanUrl.includes('bluebirdstorage.ca')) {
      return `${cleanUrl}/contact-bluebird`;
    } else if (cleanUrl.includes('storagedepotla.com')) {
      return `${cleanUrl}/contact-storage`;
    } else {
      // Default pattern for most sites
      return `${cleanUrl}/pages/contact`;
    }
  }

  /**
   * Add cache busting parameters to URL
   */
  private addCacheBustingParam(url: string): string {
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
}
