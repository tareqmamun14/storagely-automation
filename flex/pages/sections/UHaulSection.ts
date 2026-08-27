import { Page } from '@playwright/test';
import { ISectionDetector, SectionContext, SectionResult, check } from './types';

/**
 * U-Haul Rental promo block (Mini Mall layout).
 *
 * A standalone card beneath the unit grid: truck image, "U-Haul Rental" label,
 * a size ("7' x 10'"), a "Starting at $19.95" price, and a "Reserve Now" CTA.
 * Verifies the block renders, the truck image isn't broken, the price is well
 * formed, and the CTA is present.
 */
export class UHaulSection implements ISectionDetector {
  readonly id = 'uhaul';
  readonly label = 'U-Haul Rental';

  async verify(page: Page, ctx: SectionContext): Promise<SectionResult> {
    const start = Date.now();
    const errors: string[] = [];
    const checks = [];
    const data: Record<string, unknown> = {};

    try {
      const info = await page.evaluate(() => {
        // The U-Haul block renders responsive variants: a desktop card with a
        // separate "Reserve Now" button, and a mobile card where the WHOLE card
        // is a single <button>. So we gather every U-Haul "card" (a container
        // mentioning "U-Haul Rental" that also shows a price) and accept the CTA
        // if any card has a Reserve button OR is itself clickable.
        const cards = Array.from(document.querySelectorAll<HTMLElement>('div, section, article, button, a'))
          .filter(el => /u-?haul\s*rental/i.test(el.textContent || '') && /\$\s?\d/.test(el.textContent || ''));

        // The U-Haul truck image (alt contains "u-haul").
        const img = Array.from(document.querySelectorAll<HTMLImageElement>('img'))
          .find(i => /u-?haul/i.test(i.alt || ''));

        let price = '';
        for (const c of cards) {
          const m = (c.textContent || '').match(/\$\s?\d{1,4}(?:\.\d{2})?/);
          if (m) { price = m[0]; break; }
        }

        let hasReserveCta = false;
        for (const c of cards) {
          const innerReserve = Array.from(c.querySelectorAll<HTMLElement>('button, a'))
            .some(b => /r[eé]serv/i.test((b.textContent || '') + ' ' + (b.getAttribute('aria-label') || ''))); // fr-ca: "Réserve maintenant"
          const selfClickable = c.tagName === 'BUTTON' || c.tagName === 'A';
          if (innerReserve || selfClickable) { hasReserveCta = true; break; }
        }

        const present = cards.length > 0 || !!img;
        if (!present) return null;
        return {
          present: true,
          price,
          imgLoaded: img ? (img.complete && img.naturalWidth > 0) : null,
          imgAlt: img?.alt || '',
          hasReserveCta,
          cardCount: cards.length,
        };
      });

      data.uhaul = info;

      // The U-Haul rental block is OPTIONAL — only facilities that actually offer
      // U-Haul render it. Treat its absence as a clean skip; when it IS present,
      // assert the truck image, price, and Reserve CTA are healthy.
      if (!info) {
        checks.push(check('U-Haul Rental (optional)', true, 'no U-Haul block on this facility — skipped'));
      } else {
        checks.push(check('U-Haul Rental block present', true, 'found'));
        checks.push(check(
          'U-Haul image loaded (not broken)',
          info.imgLoaded !== false,
          info.imgLoaded === null ? 'no image element in block' : (info.imgLoaded ? `ok ("${info.imgAlt}")` : 'naturalWidth=0'),
        ));
        // fr-ca renders the U-Haul block WITHOUT a price (verified live
        // 2026-08-25: "LOCATION DE CAMIONS U-HAUL … Réservez votre location…")
        // and French prices elsewhere read "37 $" — accept both formats, and
        // info-tolerate a missing price on the fr-ca template.
        const isFrCa = /(^|\/\/)fr-ca\./.test(ctx.url);
        const hasPrice = /\$\s*\d|\d[\d\s,]*\s*\$/.test(info.price);
        checks.push(check(
          isFrCa ? 'U-Haul price (info — fr-ca template has none)' : 'U-Haul price present',
          isFrCa ? true : hasPrice,
          info.price || (isFrCa ? 'no price on fr-ca — info only' : '(no price found)'),
        ));
        // fr-ca's U-Haul block is text+image only — no CTA at all (verified
        // live 2026-08-25: no buttons/anchors in the block, card not clickable).
        checks.push(check(
          isFrCa ? 'U-Haul "Reserve Now" CTA (info — fr-ca block has none)' : 'U-Haul "Reserve Now" CTA present',
          isFrCa ? true : info.hasReserveCta,
          info.hasReserveCta ? 'ok' : (isFrCa ? 'no CTA on fr-ca — info only' : '(no reserve button)'),
        ));
      }
    } catch (err) {
      errors.push((err as Error).message);
    }

    return {
      sectionId: this.id,
      facilityId: ctx.facilityId,
      facilityName: ctx.facilityName,
      url: ctx.url,
      present: checks.some(c => c.passed),
      checks,
      data,
      durationMs: Date.now() - start,
      errors: errors.length ? errors : undefined,
    };
  }
}
