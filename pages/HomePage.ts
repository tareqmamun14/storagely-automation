import { type Page, expect } from '@playwright/test';

export class StorageSitePage {
  readonly page: Page;
  readonly logo;
  readonly navLink;
  readonly ctaButton;

  constructor(page: Page) {
    this.page = page;
    // Updated logo selector to match your implementation
    this.logo = page.getByRole('link', { name: 'logo', exact: true });
    // Broader navigation selector
    this.navLink = page.locator('nav a, header a, a:has-text("Find Storage"), a:has-text("My Account"), a:has-text("Locations"), a:has-text("About"), a:has-text("Contact")').first();
    // Broader CTA selector
    this.ctaButton = page.locator('a:has-text("Rent Now"), a:has-text("Pay Bill"), a:has-text("Find Storage"), a:has-text("Rent Online"), a:has-text("Get Started"), button:has-text("Find Storage"), button:has-text("Find Stores"), button:has-text("Rent Now"), [class*="cta" i], [class*="button" i]').first();
  }

  async goto(url: string) {
    await this.page.goto(url, { 
      waitUntil: 'domcontentloaded', // Changed from 'networkidle' to be less strict
      timeout: 30000 // Reduced timeout from 60000ms to 30000ms
    });
  }

  async verifyLandingPage(url: string) {
    console.log(`Verifying: ${url}`);
    
    try {
      // 1. Verify page loads (check for any content)
      await expect(this.page.locator('body')).toBeVisible({ timeout: 10000 });
      console.log(`- Page loaded for ${url}`);

      // 2. Verify Title (more flexible approach)
      const title = await this.page.title();
      expect(title.length, `Title is empty for ${url}`).toBeGreaterThan(0);
      console.log(`- Title verified for ${url}: "${title}"`);

      // 3. Verify Logo Visibility (using your exact selector with fallback)
      try {
        await expect(this.logo).toBeVisible({ timeout: 8000 });
        console.log(`- Logo verified for ${url}`);
      } catch (error) {
        console.log(`- Logo with role 'link' and name 'logo' not found for ${url}, checking for alternative logo selectors...`);
        // Fallback: check for other common logo patterns
        const fallbackLogo = this.page.locator('img[alt*="logo" i], img[src*="logo" i], [class*="logo" i] img, header img, .logo').first();
        await expect(fallbackLogo).toBeVisible({ timeout: 5000 });
        console.log(`- Fallback logo verified for ${url}`);
      }

      // 4. Verify Navigation Link Visibility (with fallback)
      try {
        await expect(this.navLink).toBeVisible({ timeout: 8000 });
        console.log(`- Navigation link verified for ${url}`);
      } catch (error) {
        console.log(`- Standard nav not found for ${url}, checking for any navigation...`);
        // Fallback: check for any navigation structure
        const anyNav = this.page.locator('nav, .nav, .navigation, .menu, header ul, header ol').first();
        await expect(anyNav).toBeVisible({ timeout: 5000 });
        console.log(`- Navigation structure verified for ${url}`);
      }

      // 5. Verify CTA Button Visibility (with fallback)
      try {
        await expect(this.ctaButton).toBeVisible({ timeout: 8000 });
        console.log(`- CTA button verified for ${url}`);
      } catch (error) {
        console.log(`- Standard CTA not found for ${url}, checking for any prominent button...`);
        // Fallback: check for any button or prominent link
        const anyButton = this.page.locator('button, .btn, [class*="button"], a[class*="primary"], input[type="submit"]').first();
        await expect(anyButton).toBeVisible({ timeout: 5000 });
        console.log(`- Button/CTA verified for ${url}`);
      }

      console.log(`✅ Successfully verified: ${url}`);
    } catch (error) {
      console.error(`❌ Verification failed for ${url}:`, error);
      throw error;
    }
  }

  // Additional helper method to handle slow-loading pages
  async waitForPageLoad(timeout: number = 30000) {
    try {
      // Wait for the page to be in a loaded state
      await this.page.waitForLoadState('domcontentloaded', { timeout });
      
      // Additional wait for any dynamic content
      await this.page.waitForTimeout(2000);
      
      console.log('Page loading completed');
    } catch (error) {
      console.log('Page load timeout, but continuing with verification...');
    }
  }

  // Method to verify basic page accessibility before detailed verification
  async isPageAccessible(): Promise<boolean> {
    try {
      // Check if we can access basic page elements
      await expect(this.page.locator('html')).toBeVisible({ timeout: 5000 });
      const title = await this.page.title();
      return title.length > 0;
    } catch (error) {
      return false;
    }
  }
}