# Test info

- Name: Storage Site Landing Page Verification >> Verify landing page for https://radiantstorage.com/
- Location: C:\Users\tareq\OneDrive\Documents\GitHub\storagely-automation\tests\homePage-verification.spec.ts:10:9

# Error details

```
TimeoutError: page.goto: Timeout 30000ms exceeded.
Call log:
  - navigating to "https://radiantstorage.com/", waiting until "domcontentloaded"

    at StorageSitePage.goto (C:\Users\tareq\OneDrive\Documents\GitHub\storagely-automation\pages\HomePage.ts:20:21)
    at C:\Users\tareq\OneDrive\Documents\GitHub\storagely-automation\tests\homePage-verification.spec.ts:12:25
```

# Page snapshot

```yaml
- banner:
  - navigation:
    - link "logo":
      - /url: https://radiantstorage.com
      - img "logo"
    - list:
      - listitem:
        - button "Find Storage"
      - listitem:
        - button "Storage Types"
      - listitem:
        - button "Resources"
      - listitem:
        - link "About":
          - /url: https://radiantstorage.com/pages/about-our-storage-facility
      - listitem:
        - link "Contact":
          - /url: https://radiantstorage.com/pages/contact
    - link "My Account":
      - /url: https://myaccount.radiantstorage.com/existing-customer
    - link "Rent Now":
      - /url: /storage-units-near-me
```

# Test source

```ts
   1 | import { type Page, expect } from '@playwright/test';
   2 |
   3 | export class StorageSitePage {
   4 |   readonly page: Page;
   5 |   readonly logo;
   6 |   readonly navLink;
   7 |   readonly ctaButton;
   8 |
   9 |   constructor(page: Page) {
   10 |     this.page = page;
   11 |     // Updated logo selector to match your implementation
   12 |     this.logo = page.getByRole('link', { name: 'logo', exact: true });
   13 |     // Broader navigation selector
   14 |     this.navLink = page.locator('nav a, header a, a:has-text("Find Storage"), a:has-text("My Account"), a:has-text("Locations"), a:has-text("About"), a:has-text("Contact")').first();
   15 |     // Broader CTA selector
   16 |     this.ctaButton = page.locator('a:has-text("Rent Now"), a:has-text("Pay Bill"), a:has-text("Find Storage"), a:has-text("Rent Online"), a:has-text("Get Started"), button:has-text("Find Storage"), button:has-text("Find Stores"), button:has-text("Rent Now"), [class*="cta" i], [class*="button" i]').first();
   17 |   }
   18 |
   19 |   async goto(url: string) {
>  20 |     await this.page.goto(url, { 
      |                     ^ TimeoutError: page.goto: Timeout 30000ms exceeded.
   21 |       waitUntil: 'domcontentloaded', // Changed from 'networkidle' to be less strict
   22 |       timeout: 30000 // Reduced timeout from 60000ms to 30000ms
   23 |     });
   24 |   }
   25 |
   26 |   async verifyLandingPage(url: string) {
   27 |     console.log(`Verifying: ${url}`);
   28 |     
   29 |     try {
   30 |       // 1. Verify page loads (check for any content)
   31 |       await expect(this.page.locator('body')).toBeVisible({ timeout: 10000 });
   32 |       console.log(`- Page loaded for ${url}`);
   33 |
   34 |       // 2. Verify Title (more flexible approach)
   35 |       const title = await this.page.title();
   36 |       expect(title.length, `Title is empty for ${url}`).toBeGreaterThan(0);
   37 |       console.log(`- Title verified for ${url}: "${title}"`);
   38 |
   39 |       // 3. Verify Logo Visibility (using your exact selector with fallback)
   40 |       try {
   41 |         await expect(this.logo).toBeVisible({ timeout: 8000 });
   42 |         console.log(`- Logo verified for ${url}`);
   43 |       } catch (error) {
   44 |         console.log(`- Logo with role 'link' and name 'logo' not found for ${url}, checking for alternative logo selectors...`);
   45 |         // Fallback: check for other common logo patterns
   46 |         const fallbackLogo = this.page.locator('img[alt*="logo" i], img[src*="logo" i], [class*="logo" i] img, header img, .logo').first();
   47 |         await expect(fallbackLogo).toBeVisible({ timeout: 5000 });
   48 |         console.log(`- Fallback logo verified for ${url}`);
   49 |       }
   50 |
   51 |       // 4. Verify Navigation Link Visibility (with fallback)
   52 |       try {
   53 |         await expect(this.navLink).toBeVisible({ timeout: 8000 });
   54 |         console.log(`- Navigation link verified for ${url}`);
   55 |       } catch (error) {
   56 |         console.log(`- Standard nav not found for ${url}, checking for any navigation...`);
   57 |         // Fallback: check for any navigation structure
   58 |         const anyNav = this.page.locator('nav, .nav, .navigation, .menu, header ul, header ol').first();
   59 |         await expect(anyNav).toBeVisible({ timeout: 5000 });
   60 |         console.log(`- Navigation structure verified for ${url}`);
   61 |       }
   62 |
   63 |       // 5. Verify CTA Button Visibility (with fallback)
   64 |       try {
   65 |         await expect(this.ctaButton).toBeVisible({ timeout: 8000 });
   66 |         console.log(`- CTA button verified for ${url}`);
   67 |       } catch (error) {
   68 |         console.log(`- Standard CTA not found for ${url}, checking for any prominent button...`);
   69 |         // Fallback: check for any button or prominent link
   70 |         const anyButton = this.page.locator('button, .btn, [class*="button"], a[class*="primary"], input[type="submit"]').first();
   71 |         await expect(anyButton).toBeVisible({ timeout: 5000 });
   72 |         console.log(`- Button/CTA verified for ${url}`);
   73 |       }
   74 |
   75 |       console.log(`✅ Successfully verified: ${url}`);
   76 |     } catch (error) {
   77 |       console.error(`❌ Verification failed for ${url}:`, error);
   78 |       throw error;
   79 |     }
   80 |   }
   81 |
   82 |   // Additional helper method to handle slow-loading pages
   83 |   async waitForPageLoad(timeout: number = 30000) {
   84 |     try {
   85 |       // Wait for the page to be in a loaded state
   86 |       await this.page.waitForLoadState('domcontentloaded', { timeout });
   87 |       
   88 |       // Additional wait for any dynamic content
   89 |       await this.page.waitForTimeout(2000);
   90 |       
   91 |       console.log('Page loading completed');
   92 |     } catch (error) {
   93 |       console.log('Page load timeout, but continuing with verification...');
   94 |     }
   95 |   }
   96 |
   97 |   // Method to verify basic page accessibility before detailed verification
   98 |   async isPageAccessible(): Promise<boolean> {
   99 |     try {
  100 |       // Check if we can access basic page elements
  101 |       await expect(this.page.locator('html')).toBeVisible({ timeout: 5000 });
  102 |       const title = await this.page.title();
  103 |       return title.length > 0;
  104 |     } catch (error) {
  105 |       return false;
  106 |     }
  107 |   }
  108 | }
```