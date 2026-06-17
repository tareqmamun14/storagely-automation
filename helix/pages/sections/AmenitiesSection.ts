import { Page } from '@playwright/test';
import { ISectionDetector, SectionContext, SectionResult, check } from './types';
import { getClientProfile } from '../../configs/profiles';

/**
 * Amenities / Facility-Features section.
 *
 * Anchored on the visible features heading — which is client-specific
 * ("Amenities" for Safeguard, "Facility Features" for Mini Mall), so the
 * heading pattern comes from the client profile. We then walk forward in the
 * DOM to collect the items, which avoids depending on the exact list
 * container class name (which the editor regenerates).
 */
export class AmenitiesSection implements ISectionDetector {
  readonly id = 'amenities';
  readonly label = 'Amenities';

  async verify(page: Page, ctx: SectionContext): Promise<SectionResult> {
    const start = Date.now();
    const errors: string[] = [];
    const checks = [];
    const data: Record<string, unknown> = {};

    try {
      const profile = getClientProfile(ctx.client);
      const headingRe = profile.amenitiesHeading;
      const heading = page.getByRole('heading', { name: headingRe }).first();
      const hasHeading = (await heading.count()) > 0;
      checks.push(check('Amenities / Facility Features heading visible', hasHeading,
        hasHeading ? undefined : `no heading matching ${headingRe}`));

      const items = await page.evaluate(({ headSrc, headFlags }) => {
        const headRe = new RegExp(headSrc, headFlags);
        // Anchor: first visible amenities / facility-features heading
        const headings = Array.from(document.querySelectorAll<HTMLElement>('h1, h2, h3, h4'))
          .filter(h => headRe.test(h.innerText || ''));
        const anchor = headings.find(h => {
          const r = h.getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        });
        if (!anchor) return [];

        // Drop chrome strings that occasionally bleed into the amenity area
        // (cookie consent banners, etc.). Maintained as a small explicit list so
        // we don't risk filtering legitimate amenity labels by accident.
        const blocklist = new Set([
          'Got it', 'Ok', 'OK', 'Accept', 'Accept All', 'Reject', 'Reject All',
          'Close', 'Dismiss', 'Learn More', 'Cookie Settings',
        ]);

        // Walk the DOM looking for the next ~600px containing list-like text.
        const collected: string[] = [];
        const anchorRect = anchor.getBoundingClientRect();
        const all = Array.from(document.querySelectorAll<HTMLElement>('li, span, div, p'));
        for (const el of all) {
          const r = el.getBoundingClientRect();
          if (r.y < anchorRect.bottom || r.y > anchorRect.bottom + 600) continue;
          if (r.width === 0 || r.height === 0) continue;
          const txt = (el.innerText || '').trim();
          if (!txt || txt.length > 40 || txt.includes('\n')) continue;
          if (blocklist.has(txt)) continue;
          // Allow digits, &, / and apostrophes so labels like "24/7 Video
          // Surveillance" and "Dollies & Handcarts" are captured, not just
          // letter-only amenities.
          if (/^[A-Z0-9][a-zA-Z0-9\-/&' ]{2,38}$/.test(txt) && !collected.includes(txt)) collected.push(txt);
          if (collected.length >= 40) break;
        }
        return collected;
      }, { headSrc: headingRe.source, headFlags: headingRe.flags });

      data.items = items;
      data.count = items.length;

      checks.push(check(
        'at least 1 amenity listed',
        items.length >= 1,
        items.length === 0 ? '(none extracted)' : items.slice(0, 8).join(', '),
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
