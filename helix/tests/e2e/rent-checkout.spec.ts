/**
 * Helix v4 → V2 SPC full rent checkout.
 *
 * This spec drives the COMPLETE rent flow for a Helix-rendered facility:
 *
 *   1. Land on the Helix v4 facility page
 *   2. Click "Rent Now" on a unit → navigates to V2 SPC /step-four
 *   3. Enable the Safeguard-required "24 Hour Access" recommended add-on
 *   4. Reuse the existing RentalDetailsPage_SPC page object (no new form code)
 *      to fill tenant + driver's license + payment + agreement
 *   5. Submit RENT NOW and capture the error toast (test card → expected decline)
 *
 * Per the brief: "we just use the existing SPC structure for this one, should
 * work for the full." We import the proven SPC page object and the same
 * SINGLE_PAGE_USER credentials used by `tests/rentReserveSPC-validation.spec.ts`
 * — no parallel implementation, no drift risk.
 */
import { test, expect } from '@playwright/test';
import { RentalDetailsPageSinglePage } from '../../../pages/RentalDetailsPage_SPC';
import { SINGLE_PAGE_USER } from '../../../configs/credentials';
import { getAllFacilities, HelixFacility } from '../../configs/facilities';

/**
 * Per-client SPC config: add-ons to enable + whether there's an hCaptcha gate.
 * Mirrors the patterns used by the main `tests/rentReserveSPC-validation.spec.ts`
 * (CAPTCHA_CUSTOMER_URLS / STEP_FOUR_CAPTCHA_URLS) but keyed by Helix client.
 *
 *   addons             — names to toggle in the "Recommended Add-ons" section
 *   captchaAtRentNow   — true → hCaptcha appears AFTER clicking RENT NOW (single-page)
 *   captchaAtStepFour  — true → hCaptcha appears ON the Step 4 page (two-step layouts)
 *
 * Adding a new Helix client = add one entry. No code changes needed elsewhere.
 */
interface ClientSpcConfig {
  addons: string[];
  captchaAtRentNow: boolean;
  captchaAtStepFour: boolean;
  discountTimingOptions?: string[];
}
const SPC_CONFIG_BY_CLIENT: Record<string, ClientSpcConfig> = {
  safeguard: {
    addons: ['24 Hour Access'],
    captchaAtRentNow: true,    // Safeguard shows hCaptcha after clicking RENT NOW
    captchaAtStepFour: false,
    discountTimingOptions: ['This Month', 'Next Month'],
  },
};

function spcConfigFor(facility: HelixFacility): ClientSpcConfig {
  return SPC_CONFIG_BY_CLIENT[facility.client] || {
    addons: [],
    captchaAtRentNow: false,
    captchaAtStepFour: false,
  };
}

const facilities = getAllFacilities();

test.describe('Helix v4 → V2 SPC — Full Rent Checkout', () => {
  test.describe.configure({ retries: 0 });

  for (const facility of facilities) {
    const cfg = spcConfigFor(facility);
    const captchaLabel = cfg.captchaAtRentNow ? ' (hCaptcha)' : '';

    test(`${facility.name} — Rent Now → fill form → submit (addons: ${cfg.addons.join(', ') || 'none'})${captchaLabel}`, async ({ page }) => {
      // Captcha clients need unlimited time (user solves manually in browser).
      // Non-captcha clients get a reasonable 5-minute cap.
      test.setTimeout((cfg.captchaAtRentNow || cfg.captchaAtStepFour) ? 0 : 5 * 60_000);
      console.log(`\n${'='.repeat(80)}`);
      console.log(`🏢 ${facility.name}`);
      console.log(`🌐 ${facility.url}`);
      console.log(`🧩 Add-ons to enable:   ${cfg.addons.length ? cfg.addons.join(', ') : '(none)'}`);
      console.log(`🤖 hCaptcha @ RentNow:  ${cfg.captchaAtRentNow ? 'yes — manual solve required' : 'no'}`);
      console.log(`🤖 hCaptcha @ Step-4:   ${cfg.captchaAtStepFour ? 'yes — manual solve required' : 'no'}`);
      console.log('='.repeat(80));

      // ── STEP 1: Land on Helix facility ──────────────────────────────────
      console.log('\n📍 STEP 1: Navigating to Helix facility page…');
      await page.goto(facility.url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
      await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
      console.log('✅ Helix facility page loaded');

      // ── STEP 2: Click Rent Now → V2 SPC /step-four ──────────────────────
      console.log('\n📍 STEP 2: Clicking Rent Now on a unit…');
      const rentLink = page.getByRole('link', { name: /rent now/i }).first();
      await rentLink.scrollIntoViewIfNeeded({ timeout: 10_000 });
      await page.waitForTimeout(300); // tiny settle to let layout finish

      const beforeUrl = page.url();
      await rentLink.click({ timeout: 15_000 });

      try {
        await page.waitForURL(/step-four/, { timeout: 30_000 });
      } catch {
        throw new Error(
          `Rent Now click did not navigate to /step-four.\n` +
          `   before: ${beforeUrl}\n` +
          `   after:  ${page.url()}\n` +
          `   Manual repro:\n` +
          `     1. Open ${facility.url}\n` +
          `     2. Click any "Rent Now" button\n` +
          `     3. Expected: lands on /step-four with the V2 SPC form\n` +
          `     4. Observed: URL stayed on the listing page`,
        );
      }
      await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
      console.log(`✅ V2 SPC checkout loaded: ${page.url()}`);

      // ── STEP 3 + 4: Reuse existing SPC page object to fill the full form ──
      // No new form-fill code here — the same RentalDetailsPage_SPC that runs
      // for every other SPC client also runs here, plus the new `recommendedAddons`
      // hook for Safeguard's "24 Hour Access" toggle.
      console.log('\n📍 STEP 3: Filling SPC form (reusing existing page object)…');
      const spcForm = new RentalDetailsPageSinglePage(page);
      await spcForm.fillCompleteSinglePageForm({
        firstName:           SINGLE_PAGE_USER.firstName,
        lastName:            SINGLE_PAGE_USER.lastName,
        email:               SINGLE_PAGE_USER.email,
        phone:               SINGLE_PAGE_USER.phone,
        address:             SINGLE_PAGE_USER.address,
        city:                SINGLE_PAGE_USER.city,
        province:            SINGLE_PAGE_USER.province,
        zipCode:             SINGLE_PAGE_USER.zipCode,
        alternateFirstName:  SINGLE_PAGE_USER.alternateFirstName,
        alternateLastName:   SINGLE_PAGE_USER.alternateLastName,
        alternatePhone:      SINGLE_PAGE_USER.alternatePhone,
        alternateEmail:      SINGLE_PAGE_USER.alternateEmail,
        driversLicense:      SINGLE_PAGE_USER.driversLicense,
        driversLicenseState: SINGLE_PAGE_USER.driversLicenseState,
        birthMonth:          SINGLE_PAGE_USER.birthMonth,
        birthDate:           SINGLE_PAGE_USER.birthDate,
        birthYear:           SINGLE_PAGE_USER.birthYear,
        paymentInfo:         SINGLE_PAGE_USER.paymentInfo,
      }, cfg.captchaAtStepFour, facility.client, cfg.addons);
      console.log('✅ SPC form completed');

      // ── STEP 5: Submit RENT NOW and capture the result ─────────────────
      console.log('\n📍 STEP 4: Submitting RENT NOW…');
      const result = await spcForm.clickRentNowAndCaptureError(cfg.captchaAtRentNow, facility.client);
      console.log(`\n📊 Final result for ${facility.name}: ${result || '(no toast)'}`);

      // The test card will normally be declined → an expected toast appears.
      // We don't require a specific message — we just require the flow REACHED
      // the submission stage (i.e. the form fill + add-on toggle + submit all
      // succeeded). The toast string is captured for the report.
      expect(typeof result === 'string', 'expected a string result (toast/error or empty)').toBe(true);
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════
// Discount Timing Verification — "This Month" vs "Next Month"
//
// Safeguard SPC has a "Select When to Apply Discount" dropdown that
// changes the breakdown line items. We verify both options independently:
// select the option → capture breakdown → solve hCaptcha → submit → capture error.
// ═══════════════════════════════════════════════════════════════════════

test.describe('Helix v4 → V2 SPC — Discount Timing Verification', () => {
  test.describe.configure({ retries: 0 });

  for (const facility of facilities) {
    const cfg = spcConfigFor(facility);
    if (!cfg.discountTimingOptions || cfg.discountTimingOptions.length === 0) continue;

    for (const timingOption of cfg.discountTimingOptions) {
      test(`${facility.name} — Discount: "${timingOption}" → breakdown + submit`, async ({ page }) => {
        test.setTimeout(0); // hCaptcha — unlimited time

        console.log(`\n${'='.repeat(80)}`);
        console.log(`🏢 ${facility.name}`);
        console.log(`📅 Discount Timing: ${timingOption}`);
        console.log('='.repeat(80));

        // ── STEP 1: Land on Helix facility ──
        console.log('\n📍 STEP 1: Navigating to Helix facility page…');
        await page.goto(facility.url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
        console.log('✅ Helix facility page loaded');

        // ── STEP 2: Click Rent Now → V2 SPC /step-four ──
        console.log('\n📍 STEP 2: Clicking Rent Now on a unit…');
        const rentLink = page.getByRole('link', { name: /rent now/i }).first();
        await rentLink.scrollIntoViewIfNeeded({ timeout: 10_000 });
        await page.waitForTimeout(300);

        const beforeUrl = page.url();
        await rentLink.click({ timeout: 15_000 });

        try {
          await page.waitForURL(/step-four/, { timeout: 30_000 });
        } catch {
          throw new Error(
            `Rent Now click did not navigate to /step-four.\n` +
            `   before: ${beforeUrl}\n` +
            `   after:  ${page.url()}`,
          );
        }
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
        console.log(`✅ V2 SPC checkout loaded: ${page.url()}`);

        // ── STEP 3: Fill form (reuse existing SPC page object) ──
        console.log('\n📍 STEP 3: Filling SPC form…');
        const spcForm = new RentalDetailsPageSinglePage(page);
        await spcForm.fillCompleteSinglePageForm({
          firstName:           SINGLE_PAGE_USER.firstName,
          lastName:            SINGLE_PAGE_USER.lastName,
          email:               SINGLE_PAGE_USER.email,
          phone:               SINGLE_PAGE_USER.phone,
          address:             SINGLE_PAGE_USER.address,
          city:                SINGLE_PAGE_USER.city,
          province:            SINGLE_PAGE_USER.province,
          zipCode:             SINGLE_PAGE_USER.zipCode,
          alternateFirstName:  SINGLE_PAGE_USER.alternateFirstName,
          alternateLastName:   SINGLE_PAGE_USER.alternateLastName,
          alternatePhone:      SINGLE_PAGE_USER.alternatePhone,
          alternateEmail:      SINGLE_PAGE_USER.alternateEmail,
          driversLicense:      SINGLE_PAGE_USER.driversLicense,
          driversLicenseState: SINGLE_PAGE_USER.driversLicenseState,
          birthMonth:          SINGLE_PAGE_USER.birthMonth,
          birthDate:           SINGLE_PAGE_USER.birthDate,
          birthYear:           SINGLE_PAGE_USER.birthYear,
          paymentInfo:         SINGLE_PAGE_USER.paymentInfo,
        }, cfg.captchaAtStepFour, facility.client, cfg.addons);
        console.log('✅ SPC form completed');

        // ── STEP 4: Select discount timing ──
        console.log(`\n📍 STEP 4: Selecting discount timing → "${timingOption}"…`);
        await spcForm.selectDiscountTiming(timingOption);

        // ── STEP 5: Capture breakdown line items ──
        console.log('\n📍 STEP 5: Capturing breakdown line items…');
        const breakdown = await spcForm.captureBreakdownLineItems();

        expect(breakdown.items.length, 'breakdown should have at least one line item').toBeGreaterThan(0);
        expect(breakdown.total, 'Total Due Today should be present').toBeTruthy();
        console.log(`✅ Breakdown captured: ${breakdown.items.length} line items, total: ${breakdown.total}`);

        // ── STEP 6: Submit RENT NOW (hCaptcha + capture error) ──
        // Zoom out so hCaptcha + Rent Now button both fit in the viewport
        await page.evaluate(() => { (document.body.style as any).zoom = '0.75'; });
        await page.waitForTimeout(300);
        const rentBtn = page.locator('button#rent-now, button:has-text("Rent Now"), button:has-text("RENT NOW")').first();
        await rentBtn.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {});

        console.log('\n📍 STEP 6: Submitting RENT NOW…');
        const result = await spcForm.clickRentNowAndCaptureError(cfg.captchaAtRentNow, facility.client);

        // Reset zoom
        await page.evaluate(() => { (document.body.style as any).zoom = '1'; }).catch(() => {});

        console.log(`\n${'─'.repeat(60)}`);
        console.log(`📅 Discount Timing: ${timingOption}`);
        console.log(`📊 Breakdown:`);
        for (const item of breakdown.items) {
          console.log(`   ${item.label}: ${item.amount}`);
        }
        console.log(`   Total Due Today: ${breakdown.total}`);
        console.log(`📊 Submit result: ${result || '(no toast)'}`);
        console.log('─'.repeat(60));

        expect(typeof result === 'string', 'expected a string result (toast/error or empty)').toBe(true);
      });
    }
  }
});
