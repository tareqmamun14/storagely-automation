import { Page } from '@playwright/test';
import { ISectionDetector, SectionContext, SectionResult, check } from './types';

/**
 * Data integrity — cross-checks the DATA on the page for internal consistency,
 * independent of layout. These catch content/binding bugs that "does the
 * element exist" checks miss:
 *
 *   • review COUNT must agree everywhere it appears (a page showing 783, 1107
 *     and 739 reviews at once is a data bug — and a likely cause of React
 *     hydration mismatches / #418).
 *   • star RATING must agree everywhere.
 *   • no PLACEHOLDER phone numbers (the 555-01xx reserved fictional range,
 *     e.g. a "Toll-Free (800) 555-0142" that shipped to production).
 *   • no unresolved {template.token} / {{token}} in VISIBLE text.
 *
 * Universal (runs for every client).
 */
export class DataIntegritySection implements ISectionDetector {
  readonly id = 'integrity';
  readonly label = 'Data Integrity';

  async verify(page: Page, ctx: SectionContext): Promise<SectionResult> {
    const start = Date.now();
    const errors: string[] = [];
    const checks = [];
    const data: Record<string, unknown> = {};

    try {
      const facts = await page.evaluate(() => {
        // ── review counts + ratings (only from review/rating CONTEXTS, so we
        //    don't pick up phone area-codes or unit counts) ──
        const reviewCounts = new Set<number>();
        const ratings = new Set<number>();

        // Exclude "nearby / other locations" sections — their ratings belong to
        // DIFFERENT facilities and must not be compared against this page's own.
        const nearbyRe = /can.t find|nearby|other location|more storage/i;
        const nearbyContainers: Element[] = [];
        document.querySelectorAll('h2, h3').forEach(h => {
          if (nearbyRe.test(h.textContent || '')) {
            const container = h.closest('section') || h.parentElement;
            if (container) nearbyContainers.push(container);
          }
        });
        function isNearby(el: Element): boolean {
          return nearbyContainers.some(c => c.contains(el));
        }
        const bodyEl = document.body.cloneNode(true) as HTMLElement;
        nearbyContainers.forEach(c => {
          const id = c.getAttribute('data-testid') || c.id;
          const match = id
            ? bodyEl.querySelector(`[data-testid="${id}"], #${id}`)
            : null;
          if (match) { match.remove(); return; }
          const heading = c.querySelector('h2, h3');
          if (!heading) return;
          const txt = (heading.textContent || '').trim();
          bodyEl.querySelectorAll('h2, h3').forEach(clH => {
            if ((clH.textContent || '').trim() === txt) {
              const clC = clH.closest('section') || clH.parentElement;
              clC?.remove();
            }
          });
        });
        const bodyText = bodyEl.innerText;

        document.querySelectorAll('[aria-label]').forEach(e => {
          if (isNearby(e)) return;
          const a = e.getAttribute('aria-label') || '';
          const m = a.match(/from\s+([\d,]+)\s+reviews?/i);
          if (m) reviewCounts.add(parseInt(m[1].replace(/,/g, ''), 10));
          // AGGREGATE rating only — a decimal "X.Y out of 5" (the facility's
          // overall score). Per-review labels are INTEGER stars ("5 out of 5
          // stars") and must NOT be compared against the aggregate, so we
          // require a decimal point.
          const r = a.match(/\b([0-5]\.\d)\s*out of\s*5\b/i);
          if (r) ratings.add(parseFloat(r[1]));
        });
        // "N reviews" / "(1,107 reviews)" — the word "reviews" anchors it, so
        // phone parens like "(872)" are NOT matched.
        for (const m of bodyText.matchAll(/\(?([\d,]{1,7})\)?\s+reviews?\b/gi)) {
          reviewCounts.add(parseInt(m[1].replace(/,/g, ''), 10));
        }
        // Aggregate rating in visible text: a decimal next to "out of 5" or a
        // "(N)" review count — again decimals only, never per-review integers.
        for (const m of bodyText.matchAll(/\b([0-5]\.\d)\s*(?:out of\s*5|\(\s*\d)/gi)) {
          ratings.add(parseFloat(m[1]));
        }

        // ── phone numbers (tel: links + visible text) ──
        const phones = new Set<string>();
        document.querySelectorAll('a[href^="tel:"]').forEach(a => phones.add((a.getAttribute('href') || '').replace('tel:', '').trim()));
        for (const m of bodyText.matchAll(/\+?1?[\s.\-]?\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4}/g)) phones.add(m[0].trim());
        const placeholders = [...phones].filter(p => {
          const d = p.replace(/\D/g, '');
          // NANP reserved fictional range: exchange 555, line 0100-0199.
          return /555010\d|555011\d|55501\d\d/.test(d);
        });

        // ── unresolved tokens in VISIBLE text (innerText excludes script/
        //    template/hidden, where template tokens legitimately live) ──
        const tokenRe = /\{\{\s*[\w.$-]+\s*\}\}|\{\s*[\w$-]*\.[\w.$-]+\s*\}/g;
        const textTokens = [...new Set((bodyText.match(tokenRe) || []).map(t => t.trim()))];

        return {
          reviewCounts: [...reviewCounts].sort((a, b) => a - b),
          ratings: [...ratings].sort((a, b) => a - b),
          phones: [...phones],
          placeholders,
          textTokens,
        };
      });

      data.reviewCounts = facts.reviewCounts;
      data.ratings = facts.ratings;
      data.placeholderPhones = facts.placeholders;
      data.visibleTextTokens = facts.textTokens;

      // ── review-count consistency ──
      // Tolerate a SMALL drift: the first-party facility rating badge (e.g.
      // 4.6 / 85) and the live third-party reviews widget (e.g. 4.7 / 84) are
      // two different data sources sampled at slightly different times, so a
      // ±1-few / ±5% difference is expected and NOT a Storagely binding bug.
      // The check exists to catch GROSS mismatches (e.g. 739 vs 1107 from the
      // same source — a real hydration/binding defect), which blow past tolerance.
      const rc = facts.reviewCounts;
      const rcMax = rc.length ? rc[rc.length - 1] : 0;
      const rcSpread = rc.length ? rcMax - rc[0] : 0;
      const rcTol = Math.max(2, Math.round(rcMax * 0.05));
      const rcConsistent = rc.length <= 1 || rcSpread <= rcTol;
      checks.push(check(
        'review count is consistent across the page',
        rcConsistent,
        rc.length <= 1
          ? (rc.length ? `${rc[0]} reviews` : '(no review count found)')
          : rcConsistent
            ? `${rc.join('/')} reviews — within tolerance (badge vs live reviews widget)`
            : `MISMATCH — page shows ${rc.join(' vs ')} reviews in different spots`,
      ));

      // ── rating consistency (±0.2★ tolerance, same rationale) ──
      const rt = facts.ratings;
      const rtSpread = rt.length ? rt[rt.length - 1] - rt[0] : 0;
      const rtConsistent = rt.length <= 1 || rtSpread <= 0.2;
      checks.push(check(
        'star rating is consistent across the page',
        rtConsistent,
        rt.length <= 1
          ? (rt.length ? `${rt[0]} ★` : '(no rating found)')
          : rtConsistent
            ? `${rt.join('/')} ★ — within tolerance (badge vs live reviews widget)`
            : `MISMATCH — page shows ${rt.join(' vs ')} ★ in different spots`,
      ));

      // ── rating within valid range ──
      const badRatings = facts.ratings.filter(r => r < 0 || r > 5);
      checks.push(check(
        'star rating within the 0–5 range',
        badRatings.length === 0,
        badRatings.length === 0 ? (facts.ratings.length ? 'ok' : '(no rating found)') : `out of range: ${badRatings.join(', ')}`,
      ));

      // ── placeholder phone numbers ──
      checks.push(check(
        'no placeholder (555-01xx) phone numbers',
        facts.placeholders.length === 0,
        facts.placeholders.length === 0
          ? `${facts.phones.length} phone number(s), none placeholder`
          : `PLACEHOLDER phone(s) shipped: ${facts.placeholders.join(', ')}`,
      ));

      // ── unresolved tokens in visible text ──
      checks.push(check(
        'no unresolved {template.tokens} in visible text',
        facts.textTokens.length === 0,
        facts.textTokens.length === 0 ? 'clean' : `leaked: ${facts.textTokens.slice(0, 10).join(', ')}`,
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
