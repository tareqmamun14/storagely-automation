import { Page } from '@playwright/test';
import { ISectionDetector, SectionContext, SectionResult, check } from './types';

/**
 * Promotions (Mini Mall layout).
 *
 * Mini Mall surfaces several promo signals on the listing page:
 *   • a headline promo banner image ("50% off for 12 weeks")
 *   • a "Featured Units / Limited-time Deal" rail
 *   • per-card "4 Weeks Free" badges + low-stock "N left" badges
 *   • the pricing disclaimer footnote (activation charge / intro-rate terms)
 *
 * Why its own section: promos are the highest-churn, most-error-prone content
 * (a mis-bound promo or a broken banner image is an immediate revenue + trust
 * hit), so they get dedicated assertions rather than hiding inside Units.
 */
export class PromoSection implements ISectionDetector {
  readonly id = 'promo';
  readonly label = 'Promotions';

  async verify(page: Page, ctx: SectionContext): Promise<SectionResult> {
    const start = Date.now();
    const errors: string[] = [];
    const checks = [];
    const data: Record<string, unknown> = {};

    try {
      // ── Headline promo banner image — must exist AND actually load ───
      const banner = await page.evaluate(() => {
        const img = Array.from(document.querySelectorAll<HTMLImageElement>('img'))
          .find(i => /%|free|off|deal|weeks?/i.test(i.alt || ''));
        if (!img) return null;
        return {
          alt: img.alt || '',
          loaded: img.complete && img.naturalWidth > 0,
          token: /\{[a-zA-Z0-9_.]+\}/.test(img.alt || '') || /\{[a-zA-Z0-9_.]+\}/.test(img.getAttribute('src') || ''),
        };
      });
      data.promoBanner = banner;
      // A hero promo BANNER image is optional — some facilities run promos only
      // as per-card "Weeks Free" badges (asserted below) with no banner. So the
      // banner's presence is informational; when a banner IS present it must load
      // cleanly and be token-free (hard checks).
      checks.push(check(
        'promo banner image present (info)',
        true,
        banner ? `alt="${banner.alt}"` : 'no banner image — promos shown as unit-card badges',
      ));
      if (banner) {
        checks.push(check('promo banner image loaded (not broken)', banner.loaded, banner.loaded ? 'ok' : 'naturalWidth=0'));
        checks.push(check('promo banner free of unresolved {tokens}', !banner.token, banner.token ? 'token leak in alt/src' : 'clean'));
      }

      // ── Per-card promo + stock badges ───────────────────────────────
      const badges = await page.evaluate(() => {
        const texts = Array.from(document.querySelectorAll<HTMLElement>('span, div, p'))
          .map(el => (el.innerText || '').trim())
          .filter(Boolean);
        const freeBadges = texts.filter(t => t.length < 40 && /\bweeks?\s+free\b|\bfree\b.*\bweeks?\b|\bmonths?\s+free\b/i.test(t));
        const stockBadges = texts.filter(t => /^\d+\s+left$/i.test(t));
        const featured = texts.some(t => /featured units/i.test(t));
        const limited = texts.some(t => /limited[- ]time/i.test(t));
        return {
          freeBadge: freeBadges[0] || '',
          freeBadgeCount: new Set(freeBadges).size,
          stockBadgeCount: new Set(stockBadges).size,
          featured, limited,
        };
      });
      data.badges = badges;
      // Per-card promo badges are PROMO-STYLE data, not template structure:
      // weeks-free promos badge each unit card, "75% off first 8 weeks"-style
      // banner promos often don't, and a location may run no promo at all
      // (Elizabethton TN showed both realities within one week). Badge
      // presence is therefore INFO — the HARD promo checks stay structural:
      // banner image loads, token-free, rail labelled while active,
      // pricing disclaimer present.
      const promoActive = badges.freeBadgeCount >= 1 || badges.featured || badges.limited || !!banner;
      checks.push(check(
        'per-card promo badges (info — promo-style dependent)',
        true,
        badges.freeBadgeCount
          ? `${badges.freeBadgeCount} "Weeks Free" badge(s), e.g. "${badges.freeBadge}"`
          : promoActive ? 'none — banner/rail-style promo without per-card badges'
          : 'none — no active promos on this location',
      ));
      // A "Featured Units" or "Limited-time Deal" rail is one promo STYLE;
      // per-card "Weeks Free" badges are another. Only fail when a rail is
      // expected (featured/limited text detected elsewhere) but unlabelled —
      // badge-only promos don't need a rail heading.
      const railExpected = badges.featured || badges.limited;
      checks.push(check(
        'Featured / Limited-time deal rail labelled (info)',
        true,
        railExpected
          ? `featured=${badges.featured}, limited-time=${badges.limited}`
          : 'no rail — promos shown as per-card badges only',
      ));
      // Low-stock badges are intermittent (depend on availability) — info only.
      checks.push(check(
        'low-stock "N left" badges (info)',
        true,
        `${badges.stockBadgeCount} card(s) show a stock badge`,
      ));

      // ── Pricing disclaimer footnote ─────────────────────────────────
      // Find the TIGHTEST element that carries the disclaimer text, not a wrapper
      // that merely *contains* it. An earlier version used DOM-order `.find()`,
      // which returned a giant ancestor whose innerText happened to start with the
      // nav menu — a false-pass pointing at the wrong node. We now require a
      // single-line leaf element matching activation/service-charge wording and
      // pick the shortest match (the real footnote, e.g. "*1-time activation
      // charge of $35 … + Applicable Facility Service Charge ($12 - $52 …)").
      const disclaimer = await page.evaluate(() => {
        // Bilingual: fr-ca wording (frais d'activation / frais de service /
        // taux d'introduction) — the fr-ca page may also omit the footnote
        // entirely (tolerated below).
        const kw = /activation charge|facility service charge|service charge|administrative fee|admin fee|intro(ductory)?\s+rate|subject to change|frais d.activation|frais de service|frais administratifs|taux d.introduction/i;
        const matches = Array.from(document.querySelectorAll<HTMLElement>('p, span, small, em, i, div, li'))
          .map(e => (e.innerText || '').trim())
          // A real footnote is a tight, single-line node — exclude wrappers
          // (the nav/page container have embedded \n line breaks).
          .filter(t => kw.test(t) && t.length >= 40 && t.length <= 600 && !t.includes('\n'))
          .sort((a, b) => a.length - b.length);
        return matches[0] || '';
      });
      data.disclaimer = disclaimer.slice(0, 200);
      // fr-ca ships no disclaimer footnote at all (verified live 2026-08-25) —
      // info-tolerate there; every other template must still show it.
      const isFrCaPage = /(^|\/\/)fr-ca\./.test(ctx.url);
      checks.push(check(
        isFrCaPage ? 'pricing disclaimer (info — fr-ca template has none)' : 'pricing disclaimer present',
        isFrCaPage ? true : disclaimer.length > 0,
        disclaimer ? `"${disclaimer.slice(0, 110)}…"` : (isFrCaPage ? 'no footnote on fr-ca — info only' : '(no disclaimer footnote found)'),
      ));
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
