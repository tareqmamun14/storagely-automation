// utils/dismissMarketingModal.ts
//
// Storagely's admin shows a "Manifesto" product-showcase marketing modal
// (`.stg-container.stg-layout-product_showcase`, with a `button.stg-close`)
// right after login, on the landing/dashboard page. It overlays the dashboard
// and intercepts clicks, so any post-login automation (corp-code entry on the
// Integrations page, settings, navigation) is blocked until it's dismissed.
//
// This helper closes it right after login lands. It is:
//   • non-blocking  — if the modal never appears, it no-ops after a short wait;
//   • idempotent    — safe to call after EVERY admin login;
//   • resilient     — clicks the × button, and if the overlay somehow lingers,
//                     strips just the showcase node from the DOM (marketing
//                     overlay only — nothing functional is removed).

import { Page } from '@playwright/test';

const CLOSE_SEL = 'button.stg-close, .stg-layout-product_showcase button[aria-label="Close" i]';
const MODAL_SEL = '.stg-layout-product_showcase';

/**
 * Dismiss the post-login "Manifesto" marketing modal if it appears.
 * @param page    the logged-in admin page (already on the landing/dashboard)
 * @param timeoutMs how long to wait for the modal to show before giving up
 * @returns true if a modal was dismissed, false if none appeared
 */
export async function dismissMarketingModal(page: Page, timeoutMs = 5000): Promise<boolean> {
  const closeBtn = page.locator(CLOSE_SEL).first();

  // Wait briefly for the modal to render — it loads a beat AFTER the dashboard,
  // so an immediate check would miss it. If it never shows, that's fine.
  try {
    await closeBtn.waitFor({ state: 'visible', timeout: timeoutMs });
  } catch {
    return false;
  }

  await closeBtn.click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(300);

  // Confirm it's gone; if not, remove the showcase node so it can't block clicks.
  const modal = page.locator(MODAL_SEL).first();
  if (await modal.isVisible().catch(() => false)) {
    await page.evaluate((sel) => {
      document.querySelectorAll(sel).forEach((el) => el.remove());
    }, MODAL_SEL).catch(() => {});
    console.log('✓ Removed lingering post-login marketing modal (Manifesto) via DOM');
    return true;
  }

  console.log('✓ Dismissed post-login marketing modal (Manifesto)');
  return true;
}
