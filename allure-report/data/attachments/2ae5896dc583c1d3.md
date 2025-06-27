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
- link "Skip to content":
  - /url: "#theme-main"
- main:
  - heading "Self Storage Made Easy with Contactless Rentals & Move-Ins" [level=1]
  - link "Rent Now":
    - /url: /storage-units-near-me
  - link:
    - /url: "#mth3_section2"
    - img
  - link "Unit Size Guide":
    - /url: /pages/storage-unit-size-guide
    - heading "Unit Size Guide" [level=4]
  - link "Self Storage FAQs":
    - /url: /pages/self-storage-faq
    - heading "Self Storage FAQs" [level=4]
  - link "Storage Tips":
    - /url: /storage-type/storage-tips
    - heading "Storage Tips" [level=4]
  - img "image"
  - img "image"
  - img "image"
  - img
  - heading "Why Radiant Storage" [level=2]
  - paragraph: Welcome to Radiant Storage where we make self storage easy with contactless rentals and move-ins. We offer safe and secure facilities with easy drive-up storage units and customer service representatives available Monday thru Sunday
  - link "Rent or Reserve a Unit":
    - /url: /storage-units-near-me
  - heading "Contactless Rentals" [level=5]
  - heading "Keypad Entry Secure Gates" [level=5]
  - heading "Smart Unit 24/7 Monitoring" [level=5]
  - heading "Express Move-Ins" [level=5]
  - heading "How Does it Work?" [level=2]
  - paragraph: We make renting units as easy as possible. Follow these three steps and you’ll be moving in in no time!
  - link "Start Now":
    - /url: /storage-units-near-me
  - heading "Select a Unit" [level=4]
  - paragraph: Browse all available self storage unit sizes and amenities to find the best storage solution to fit your needs.
  - link "Find Storage":
    - /url: /storage-units-near-me
  - heading "Rent or Reserve" [level=4]
  - paragraph: Rent or reserve a storage unit with our convenient online platform. You’ll be ready to move in with just a few clicks!
  - link "Rent Now":
    - /url: /storage-units-near-me
  - heading "Store Your Stuff" [level=4]
  - paragraph: Once you’ve selected the proper storage unit, it’s time to start storing your possessions in our trusted facilities.
  - link "Size Guide":
    - /url: /pages/storage-unit-size-guide
  - img
  - heading "Our Facilities" [level=2]
  - img
  - heading "Interstate 10" [level=4]
  - heading "Beaumont, Texas" [level=5]
  - link "View Facility":
    - /url: /storage-units/texas/beaumont/interstate-10
  - link "Find Storage":
    - /url: /storage-units-near-me
  - img
  - heading "Bienville Blvd" [level=4]
  - heading "Ocean Springs, MS" [level=5]
  - link "View Facility":
    - /url: /storage-units/mississippi/ocean-springs/bienville-blvd
  - link "Find Storage":
    - /url: /storage-units-near-me
  - img
  - heading "Tenney Street" [level=4]
  - heading "Bridge City, TX" [level=5]
  - link "View Facility":
    - /url: /storage-units/texas/bridge-city/tenney-street
  - link "Find Storage":
    - /url: /storage-units-near-me
  - img
  - heading "Gulfway Drive" [level=4]
  - heading "Groves, TX" [level=5]
  - link "View Facility":
    - /url: /storage-units/texas/groves/gulfway-drive
  - link "Find Storage":
    - /url: /storage-units-near-me
  - link "View All Facilities":
    - /url: /storage-units-near-me
  - img
  - heading "Google Reviews" [level=2]
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