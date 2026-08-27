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

      // Office hours + access hours — the label WORDING varies by template:
      //   • Carroll / Safeguard render "Office:" / "Access:"  (colon)
      //   • Birmingham renders "Office Hours" / "Access Hours" (the word "Hours",
      //     no colon) — e.g. "Office Hours Wed: 8:30am – 5:30pm".
      // Match BOTH forms so a legit "Office Hours" label isn't false-flagged as
      // "no hours-labeled element". (verified live on all three.)
      const hoursTexts = await page.evaluate(() => {
        // Bilingual: fr-ca renders "Bureau: Mercredi : 9h00 – 17h00" and
        // "Accès : Tous les jours de 6 h à 22 h" (verified live 2026-08-25).
        const HOURS_LABEL = /\b(office|access|bureau|acc[eè]s)\s*(?:hours\b|[:\n])/i;
        const all = Array.from(document.querySelectorAll<HTMLElement>('button, span, div'))
          .map(el => el.innerText?.trim() || '')
          .filter(t => HOURS_LABEL.test(t))
          .filter(t => t.length < 60);
        return Array.from(new Set(all));
      });
      data.hours = hoursTexts;
      checks.push(check(
        'office or access hours present',
        hoursTexts.length > 0,
        hoursTexts.join(' | ') || 'no hours-labeled element',
      ));

      // Hours VALUE is well-formed — the label ("Office:") rendering isn't
      // enough; the schedule behind it must actually bind. Both templates show
      // the CURRENT day only, as static text (verified live — no expander):
      //   • Minimal:   "Office: Thu: 8:30am - 5:30pm" / "Access: Thu: 6am - 10pm"
      //   • Safeguard: "Office: Mon: 9AM - 7PM"       / "Access: Mon: 6AM - 10PM"
      // So we require at least one hours string to carry a real time range
      // (am/pm or 24h HH:MM) or a Closed/24-hour keyword. This catches a broken
      // binding ("Office:" with an empty / {token} / "Invalid Date" value) that
      // the presence check above would wave through. Deliberately broad across
      // casing + colon variants so it never false-flags a legit schedule.
      // French time formats: "9h00", "6 h à 22 h", "fermé".
      const HOURS_VALUE = /\d{1,2}(:\d{2})?\s*(am|pm)|\d{1,2}:\d{2}|\d{1,2}\s*h(\d{2})?\b|closed|fermé|24\s*\/?\s*7|24\s*hours?|open 24/i;
      const hoursWithValue = hoursTexts.filter(t => HOURS_VALUE.test(t));
      checks.push(check(
        'office/access hours show a real schedule (time range or Closed)',
        hoursTexts.length === 0 || hoursWithValue.length >= 1,
        hoursTexts.length === 0
          ? '(no hours label — see presence check)'
          : hoursWithValue.length >= 1
            ? hoursWithValue.join(' | ')
            : `hours label present but value missing/garbled: ${hoursTexts.join(' | ')}`,
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

      // Address — present if ANY of these resolve (templates differ on layout):
      //   1. a single line with street + state + zip ("3900 … Carroll OH, 43112")
      //   2. a street line + a separate city/state/zip line (Chicago renders
      //      "1030 W. North Avenue" and "Chicago, IL 60642" on two lines)
      //   3. the Google-Maps "directions" link destination (the street address)
      const address = await page.evaluate(() => {
        const inHeader = (el: HTMLElement) => {
          const r = el.getBoundingClientRect();
          return r.y < 900 && r.width > 0;
        };
        const els = Array.from(document.querySelectorAll<HTMLElement>('p, div, span, address, a, li')).filter(inHeader);

        // 1) full single-line address
        const oneLine = els
          .map(e => (e.innerText || '').trim())
          .find(t => !t.includes('\n') && t.length >= 10 && t.length <= 120 && /\d{1,6}\s+\S+.*[A-Z]{2}\s*,?\s*\d{5}/.test(t));
        if (oneLine) return oneLine;

        // 2) street line + city/state/zip line
        const lines = els.map(e => (e.innerText || '').trim()).filter(t => t && !t.includes('\n') && t.length <= 80);
        const street = lines.find(t => /^\d{1,6}\s+\S+.*\b(ave|avenue|st|street|rd|road|blvd|dr|drive|way|pkwy|ln|lane|hwy|highway|ct|court|pl|place|cir|circle|ter|terrace|sq|square|trail|trl)\b/i.test(t));
        const cityZip = lines.find(t => /[A-Za-z].*\b[A-Z]{2}\b[ ,]*\d{5}\b/.test(t));
        if (street && cityZip) return `${street}, ${cityZip}`;

        // 3) google-maps directions link destination
        const map = document.querySelector('a[href*="google.com/maps"], a[href*="/maps/"], a[href*="destination="]');
        if (map) {
          const href = map.getAttribute('href') || '';
          const m = href.match(/destination=([^&]+)/);
          if (m) { const d = decodeURIComponent(m[1]); if (/\d{1,6}\s+\S+/.test(d)) return d; }
        }
        return '';
      });
      data.address = address;
      checks.push(check('address visible in header', address.length > 0, address || '(none)'));

      // Mini Mall header action buttons: the "What Will Fit?" sizing helper and
      // the FAQ jump link. (Client-specific header chrome — gated to minimall.)
      if (ctx.client === 'minimall') {
        // "What Will Fit?" is a <button> on some templates and an <a> anchor
        // (#what-will-fit) on others — accept either. The fr-ca template does
        // NOT ship it at all (verified live 2026-08-25) → info-pass there.
        const isFrCa = /(^|\/\/)fr-ca\./.test(ctx.url);
        const hasWhatWillFit =
          (await page.getByRole('button', { name: /what will fit/i }).count()) > 0 ||
          (await page.getByRole('link', { name: /what will fit/i }).count()) > 0;
        const hasFaqJump = (await page.getByRole('link', { name: /^faq$/i }).count()) > 0;
        checks.push(check(
          isFrCa ? '"What Will Fit?" button (info — not on the fr-ca template)' : '"What Will Fit?" button present',
          isFrCa ? true : hasWhatWillFit,
          hasWhatWillFit ? 'ok' : (isFrCa ? 'not offered on fr-ca — info only' : '(missing)'),
        ));
        checks.push(check('FAQ jump link present', hasFaqJump, hasFaqJump ? 'ok' : '(missing)'));
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
