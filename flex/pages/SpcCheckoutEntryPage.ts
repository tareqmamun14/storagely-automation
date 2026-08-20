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

  /**
   * Value-Based Pricing (VBP) probe — some units offer 2–4 selectable pricing
   * tiers on /step-four (Safeguard: "Best / Better / Good", storEDGE baseline:
   * "Basic / Enhanced / Premium"). Each tier is a clickable rounded card
   * (cursor-pointer, h3 tier name + $/mo price); the SELECTED card is painted
   * `bg-primary text-white`, and switching tiers refires the
   * rental-cost-breakdown XHR and repaints "Total Due Today" — each tier can
   * even map to a DIFFERENT location_unit_id. (DOM + behavior verified live on
   * safeguardit.com and columbiaselfstorage.com, 2026-08-07.)
   *
   * Clicks through every non-default tier, verifies the pricing breakdown
   * reloads with no error toast, then RESTORES the tier the page landed with
   * so the follow-on flow (handshake stop, or full fill → submit) rents the
   * exact unit it started on. Tier clicks never submit anything, so the probe
   * is safe for autonomous prod runs. Units without VBP report an info-pass
   * and the journey moves on.
   */
  async probeValueBasedPricing(): Promise<{ present: boolean; checks: Array<{ name: string; passed: boolean; detail: string }> }> {
    const p = this.page;
    const checks: Array<{ name: string; passed: boolean; detail: string }> = [];

    const cards = p
      .locator('div[class*="cursor-pointer"][class*="rounded-3xl"]')
      .filter({ has: p.locator('h3') })
      .filter({ hasText: /\$\s?\d|\d[\d\s,.]*\s*\$/ });
    const count = await cards.count().catch(() => 0);

    if (count < 2 || count > 4) {
      const detail = count === 0
        ? 'no VBP tier cards on this unit — probe skipped'
        : `${count} candidate card(s) — not a VBP tier group, probe skipped`;
      console.log(`  💰 VBP: ${detail}`);
      checks.push({ name: 'VBP pricing tiers (info)', passed: true, detail });
      return { present: false, checks };
    }

    const isSelected = async (i: number) => {
      const cls = (await cards.nth(i).getAttribute('class').catch(() => '')) || '';
      return /(^|\s)bg-primary(\s|$)/.test(cls) && /(^|\s)text-white(\s|$)/.test(cls);
    };
    const tierName = async (i: number) =>
      ((await cards.nth(i).locator('h3').first().textContent().catch(() => '')) || `tier ${i + 1}`).trim();
    const readTotal = async () => {
      const body = (await p.locator('body').innerText().catch(() => '')) || '';
      const m = body.match(/total\s+due\s+today[\s\S]{0,60}?(\$\s?[\d,]+(?:\.\d{2})?|\d[\d\s,.]*\s*\$)/i);
      return m ? m[1].replace(/\s+/g, ' ').trim() : '';
    };
    const errorToastText = async () => {
      const toasts = p.locator('[data-id*="toast-notification"], .toast-container, .toast, [role="alert"], .Toastify__toast');
      const n = await toasts.count().catch(() => 0);
      for (let i = 0; i < n; i++) {
        const t = ((await toasts.nth(i).textContent().catch(() => '')) || '').trim();
        if (t && /error|invalid|failed|unable|wrong|not available/i.test(t)) return t;
      }
      return '';
    };
    const clickTierAndSettle = async (i: number) => {
      const breakdown = p
        .waitForResponse(r => r.url().includes('rental-cost-breakdown'), { timeout: 10_000 })
        .catch(() => null);
      await cards.nth(i).scrollIntoViewIfNeeded().catch(() => {});
      try { await cards.nth(i).click({ timeout: 8_000 }); }
      catch { await cards.nth(i).click({ timeout: 5_000, force: true }).catch(() => {}); }
      const resp = await breakdown;
      await p.waitForTimeout(700); // let the totals repaint
      return resp;
    };

    // Inventory + baseline (which tier did the page land with?)
    const names: string[] = [];
    let originalIdx = 0;
    for (let i = 0; i < count; i++) {
      names.push(await tierName(i));
      if (await isSelected(i)) originalIdx = i;
    }
    const baselineTotal = await readTotal();
    console.log(`  💰 VBP: ${count} pricing tiers — ${names.map((n, i) => (i === originalIdx ? `${n}*` : n)).join(' / ')} (* = default · Total Due Today ${baselineTotal || 'n/a'})`);
    checks.push({
      name: 'VBP pricing tiers (info)',
      passed: true,
      detail: `${count} tiers: ${names.join(' / ')} — default "${names[originalIdx]}", Total Due Today ${baselineTotal || 'n/a'}`,
    });

    // Click through every non-default tier and watch the breakdown respond.
    const tierResults: string[] = [];
    let allOk = true;
    for (let i = 0; i < count; i++) {
      if (i === originalIdx) continue;
      const resp = await clickTierAndSettle(i);
      const selectedNow = await isSelected(i);
      const total = await readTotal();
      const toast = await errorToastText();
      const ok = selectedNow && !toast && (!!total || !!resp) && (!resp || resp.ok());
      allOk = allOk && ok;
      const bits = [
        selectedNow ? 'selected' : 'NOT selected',
        resp ? `breakdown ${resp.ok() ? 'reloaded (200)' : `HTTP ${resp.status()}`}` : 'breakdown XHR not observed',
        total ? `Total Due Today ${total}` : 'total not parsed',
        toast ? `ERROR TOAST: "${toast.slice(0, 120)}"` : 'no errors',
      ];
      console.log(`    ${ok ? '✓' : '✗'} tier "${names[i]}" — ${bits.join(' · ')}`);
      tierResults.push(`"${names[i]}": ${ok ? `ok${total ? ` @ ${total}` : ''}` : bits.join(', ')}`);
    }

    // Restore the tier the page landed with — the follow-on rent must target
    // the same unit the Rent CTA handed off to.
    await clickTierAndSettle(originalIdx);
    const restored = await isSelected(originalIdx);
    const restoredTotal = await readTotal();
    console.log(`    ${restored ? '✓' : '✗'} restored default tier "${names[originalIdx]}" (Total Due Today ${restoredTotal || 'n/a'})`);
    if (!restored) allOk = false;

    console.log(`  ${allOk ? '✅ VBP tier switching OK — pricing breakdown reloads cleanly on every tier' : '❌ VBP tier switching had problems — see tier lines above'}`);
    checks.push({
      name: 'VBP tier switching — pricing breakdown reloads, no errors',
      passed: allOk,
      detail: `${tierResults.join(' · ')} · restore "${names[originalIdx]}": ${restored ? 'ok' : 'FAILED'}`,
    });

    return { present: true, checks };
  }
}
