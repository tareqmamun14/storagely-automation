import { Page } from '@playwright/test';
import { RentHandoff } from '../configs/profiles';

/**
 * V2 SPC checkout ENTRY (/step-four) — HANDSHAKE verification only.
 *
 * Mirrors YardiCheckoutStartPage.verifyHandoff: confirm the checkout page the
 * Rent CTA handed off to actually rendered WITH the right rental context —
 * unit id on the URL, the tenant form present, and money on the page — then
 * STOP. It never fills or submits anything, so it is safe to run autonomously
 * against PRODUCTION on every regression (no manual captcha, no live-FMS
 * submits). The FULL SPC drive (fill → add-ons → submit → capture result)
 * stays in the shared legacy RentalDetailsPage_SPC and runs with
 * FLEX_RENT_MODE=full.
 *
 * Selector notes: field shapes reuse the proven legacy SPC locator patterns
 * (role textbox "First name" / input[name="first_name"]); the money check
 * keys on the SPC breakdown's "Total Due Today" wording with generic price
 * fallbacks, so template chrome differences (Safeguard vs Storage Star)
 * don't false-flag.
 */
export class SpcCheckoutEntryPage {
  constructor(private readonly page: Page) {}

  async verifyHandoff(
    expectedLocation: RegExp,
    handoff: RentHandoff,
  ): Promise<{ ok: boolean; checks: Array<{ name: string; passed: boolean; detail: string }> }> {
    const p = this.page;
    await p.waitForLoadState('domcontentloaded').catch(() => {});

    // The SPC page is heavy (payment iframes + hCaptcha) — anchor readiness on
    // the tenant form's first-name field rather than network quiet.
    const firstName = p.getByRole('textbox', { name: /first name/i }).first()
      .or(p.locator('input[name="first_name"], input[name="firstName"]').first())
      .or(p.getByPlaceholder(/first name/i).first());
    await firstName.waitFor({ state: 'visible', timeout: 30_000 }).catch(() => {});

    // 1) URL carries the unit id (the actual handoff contract).
    let unitId: string | null = null;
    try { unitId = new URL(p.url()).searchParams.get(handoff.unitParam); } catch { /* keep null */ }
    const hasUnitId = !!unitId && /^\d+$/.test(unitId);

    // 2) Tenant/contact form rendered.
    const hasFirstName = await firstName.isVisible().catch(() => false);

    // 3) Money rendered — the SPC breakdown ("Total Due Today") or any $ amount.
    //    French-Canadian format: "28,96 $" (number before $, comma decimal).
    const bodyText = await p.locator('body').innerText().catch(() => '');
    const hasTotal = /total\s+due\s+today/i.test(bodyText)
      || /\$\s*\d[\d,]*(\.\d{2})?/.test(bodyText)
      || /\d[\d\s,.]*\s*\$/.test(bodyText);

    // 4) Same facility context (INFO — some SPC templates only show the unit,
    //    not the facility name; a miss is reported, never failed).
    const locationShown = expectedLocation.test(bodyText);

    // 5) Captcha gate (INFO — presence differs per client/env; report only).
    const hasCaptcha = (await p
      .locator('iframe[src*="hcaptcha" i], iframe[title*="hcaptcha" i], iframe[src*="captcha" i]')
      .count().catch(() => 0)) > 0;

    const checks = [
      {
        name: `checkout URL carries ?${handoff.unitParam}`,
        passed: hasUnitId,
        detail: hasUnitId ? `${handoff.unitParam}=${unitId}` : `missing/invalid on ${p.url()}`,
      },
      {
        name: 'tenant form rendered (first-name field)',
        passed: hasFirstName,
        detail: hasFirstName ? 'ok' : '(first-name field not visible within 30s)',
      },
      {
        name: 'move-in charges rendered',
        passed: hasTotal,
        detail: hasTotal ? 'Total Due Today / $ amount present' : '(no money found on the page)',
      },
      {
        name: 'facility context shown (info)',
        passed: true,
        detail: locationShown ? `matches ${expectedLocation}` : `facility name not shown on checkout (template choice — info only)`,
      },
      {
        name: 'captcha gate (info)',
        passed: true,
        detail: hasCaptcha ? 'hCaptcha iframe present' : 'no captcha iframe detected',
      },
    ];

    return { ok: checks.every(c => c.passed), checks };
  }
}
