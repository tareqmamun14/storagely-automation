import { Page } from '@playwright/test';
import { ISectionDetector, SectionContext, SectionResult, check } from './types';

/**
 * Facility header — the band directly under the top nav.
 *
 * Holds the facility name, a star rating + review count, office and access
 * hours, a phone number, and the street address. Everything here is a
 * dynamic template binding, so we verify shape (e.g. "phone format looks
 * right") rather than exact strings.
 */
export class FacilityHeaderSection implements ISectionDetector {
  readonly id = 'header';
  readonly label = 'Facility Header';

  async verify(page: Page, ctx: SectionContext): Promise<SectionResult> {
    const start = Date.now();
    const errors: string[] = [];
    const checks = [];
    const data: Record<string, unknown> = {};

    try {
      // The facility name renders as the topmost large heading (H1/H2/H3).
      const headingText = await page.evaluate(() => {
        const visible = Array.from(document.querySelectorAll<HTMLElement>('h1, h2, h3'))
          .filter(h => {
            const r = h.getBoundingClientRect();
            return r.width > 0 && r.height > 0 && r.y < 500;
          })
          .map(h => h.innerText.trim())
          .filter(Boolean);
        return visible[0] || '';
      });
      data.heading = headingText;
      checks.push(check('facility heading visible', headingText.length > 0, headingText || '(empty)'));

      // Rating block — usually "4.9(557)" or "★ 4.9" near the heading.
      const ratingInfo = await page.evaluate(() => {
        const body = document.body.innerText;
        const m = body.match(/([0-9]\.[0-9])\s*\(?\s*(\d{1,5})\s*\)?/);
        return m ? { rating: parseFloat(m[1]), reviewCount: parseInt(m[2], 10), raw: m[0] } : null;
      });
      if (ratingInfo) {
        data.rating = ratingInfo;
        checks.push(check(
          'rating is plausible (0–5 stars)',
          ratingInfo.rating >= 0 && ratingInfo.rating <= 5,
          `rating=${ratingInfo.rating}, reviews=${ratingInfo.reviewCount}`,
        ));
      } else {
        // Some configs may omit reviews — record but don't hard-fail.
        checks.push(check('rating block parseable', false, 'no rating/review pattern detected in body text'));
      }

      // Office hours + access hours buttons — they show truncated day-of-week label.
      const hoursTexts = await page.evaluate(() => {
        const all = Array.from(document.querySelectorAll<HTMLElement>('button, span, div'))
          .map(el => el.innerText?.trim() || '')
          .filter(t => /office\s*[:\n]/i.test(t) || /access\s*[:\n]/i.test(t))
          .filter(t => t.length < 60);
        return Array.from(new Set(all));
      });
      data.hours = hoursTexts;
      checks.push(check(
        'office or access hours present',
        hoursTexts.length > 0,
        hoursTexts.join(' | ') || 'no hours-labeled element',
      ));

      // Phone number — anywhere on the header (we'll scope to ~700px y).
      const phone = await page.evaluate(() => {
        const els = Array.from(document.querySelectorAll<HTMLElement>('a[href^="tel:"], a, span, button'));
        for (const el of els) {
          const r = el.getBoundingClientRect();
          if (r.y > 700 || r.width === 0) continue;
          const href = (el as HTMLAnchorElement).href || '';
          if (href.startsWith('tel:')) return href.replace('tel:', '').trim();
          const t = el.innerText?.trim() || '';
          // Generic phone pattern (NA + intl). Allow up to 1 leading +/country.
          const m = t.match(/(\+?\d?[ -]?\(?\d{3}\)?[ -.]?\d{3}[ -.]?\d{4})/);
          if (m) return m[1];
        }
        return '';
      });
      data.phone = phone;
      checks.push(check('phone number visible in header', phone.length > 0, phone || '(none)'));

      // Address — match a single-line street address (number + words + 2-letter
      // state + 5-digit zip). Single-line restriction prevents accidentally
      // matching a wrapper element that also contains the nav menu.
      const address = await page.evaluate(() => {
        // Address can live in the header band OR a map link (an <a> further down,
        // e.g. Mini Mall renders the full street+zip only in the Google-Maps link).
        // Search the upper page (y < 900) and include anchors/list items.
        const all = Array.from(document.querySelectorAll<HTMLElement>('p, div, span, address, a, li'))
          .filter(el => {
            const r = el.getBoundingClientRect();
            if (r.y >= 900 || r.width === 0) return false;
            const t = el.innerText?.trim() || '';
            // Single short line (≤ 120 chars), no embedded newlines.
            if (t.includes('\n') || t.length > 120 || t.length < 10) return false;
            // Number + street + state + zip — minimum street-address shape.
            return /\d{1,6}\s+\S+.*[A-Z]{2}\s*,?\s*\d{5}/.test(t);
          })
          .map(el => el.innerText?.trim() || '');
        return all[0] || '';
      });
      data.address = address;
      checks.push(check('address visible in header', address.length > 0, address || '(none)'));
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
