import { Page, expect } from '@playwright/test';

/**
 * Yardi v2 checkout START page (e.g. minimallstorage.com/.../yardi/start?…&type=rent).
 *
 * This is where the Mini Mall Helix listing page hands off when a unit's Rent
 * link is clicked — the Mini Mall analogue of Safeguard's V2 SPC /step-four.
 *
 * For the LOCATION-page suite we only VERIFY the handoff landed correctly and
 * the checkout entry rendered (rental summary + tenant form + captcha gate). We
 * do NOT fill or submit — the checkout is captcha-gated and the full Yardi flow
 * is covered by tests/miniMallRental.spec.ts. This keeps us within the Helix
 * rule: "stop at the V2 handoff URL — do not drive V2 checkout forms."
 */
export class YardiCheckoutStartPage {
  constructor(private readonly page: Page) {}

  /**
   * Confirm the Yardi checkout entry rendered. `expectedLocation` is the
   * facility's heading pattern — we assert the rental summary names the same
   * location the listing page was for (no cross-wired handoff).
   */
  async verifyHandoff(expectedLocation: RegExp): Promise<{ ok: boolean; checks: Array<{ name: string; passed: boolean; detail: string }> }> {
    const p = this.page;
    await p.waitForLoadState('domcontentloaded').catch(() => {});

    const summaryHeading = p.getByRole('heading', { name: /summary of rental/i }).first();
    const tenantHeading = p.getByRole('heading', { name: /tenant details/i }).first();
    const firstName = p.getByRole('textbox', { name: /first name/i }).first();
    const continueBtn = p.getByRole('button', { name: /continue to next step/i }).first();
    const captcha = p.locator('iframe[src*="hcaptcha" i], iframe[title*="hcaptcha" i], iframe[src*="captcha" i]').first();

    const hasSummary = (await summaryHeading.count()) > 0;
    const hasTenant = (await tenantHeading.count()) > 0;
    const hasFirstName = (await firstName.count()) > 0;
    const hasContinue = (await continueBtn.count()) > 0;
    const hasCaptcha = (await captcha.count()) > 0;

    // The rental summary should name the same facility/location we came from.
    const summaryText = await p.locator('body').innerText().catch(() => '');
    const locationMatches = expectedLocation.test(summaryText);

    const checks = [
      { name: '"Summary of Rental" rendered', passed: hasSummary, detail: hasSummary ? 'ok' : '(missing)' },
      { name: 'rental summary names the correct location', passed: locationMatches, detail: locationMatches ? `matches ${expectedLocation}` : `summary did not match ${expectedLocation}` },
      { name: 'Tenant Details form present', passed: hasTenant && hasFirstName, detail: (hasTenant && hasFirstName) ? 'heading + first-name field' : `tenantHeading=${hasTenant}, firstName=${hasFirstName}` },
      { name: '"Continue to next step" CTA present', passed: hasContinue, detail: hasContinue ? 'ok' : '(missing)' },
      { name: 'captcha gate present (hCaptcha)', passed: hasCaptcha, detail: hasCaptcha ? 'hCaptcha iframe found' : '(no captcha iframe — verify checkout is gated)' },
    ];

    return { ok: checks.every(c => c.passed), checks };
  }
}
