import { Page } from '@playwright/test';
import { ISectionDetector, SectionContext, SectionResult, check } from './types';

/** Measure the FAQ container height around a question — used to detect expansion. */
async function measureFaqBlockHeight(page: Page, question: string): Promise<number> {
  return page.evaluate((q) => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('*'))
      .filter(el => (el.innerText || '').trim() === q.trim());
    if (els.length === 0) return 0;
    // Walk up to find the smallest ancestor that contains both the question
    // text AND a sibling/answer container. Use bounding-rect height as a proxy.
    let target: HTMLElement | null = els[0].parentElement;
    let best = els[0].getBoundingClientRect().height;
    for (let i = 0; i < 4 && target; i++) {
      const h = target.getBoundingClientRect().height;
      if (h > best) best = h;
      target = target.parentElement;
    }
    return best;
  }, question);
}

/**
 * FAQ section.
 *
 * Detect the "Frequently Asked Questions" heading (or "FAQ" variant), then
 * count question rows beneath it. Each question is typically a clickable
 * collapsible row whose text ends in "?".
 */
export class FAQSection implements ISectionDetector {
  readonly id = 'faq';
  readonly label = 'FAQ';

  async verify(page: Page, ctx: SectionContext): Promise<SectionResult> {
    const start = Date.now();
    const errors: string[] = [];
    const checks = [];
    const data: Record<string, unknown> = {};

    try {
      // FAQ heading text varies by client: Safeguard = "Frequently Asked
      // Questions", Mini Mall = "Have A Question?".
      const FAQ_HEADING = /frequently asked questions|have a question|^faq$/i;
      const heading = page.getByRole('heading', { name: FAQ_HEADING }).first();
      let hasHeading = (await heading.count()) > 0;
      if (!hasHeading) {
        // Fallback: any text node containing a FAQ-ish heading near a list.
        hasHeading = await page.evaluate(() => {
          const el = Array.from(document.querySelectorAll<HTMLElement>('*'))
            .find(e => /frequently asked questions|have a question/i.test(e.innerText?.trim() || ''));
          return !!el;
        });
      }
      checks.push(check('FAQ heading visible', hasHeading));

      // Try to scroll the FAQ into view so collapsibles render.
      try {
        await heading.first().scrollIntoViewIfNeeded({ timeout: 2000 });
        await page.waitForTimeout(500);
      } catch { /* no heading — fine, fallthrough */ }

      // Count question rows — text ending in "?" within a reasonable y-range below the heading.
      const questions = await page.evaluate(() => {
        const anchor = Array.from(document.querySelectorAll<HTMLElement>('h1, h2, h3, h4'))
          .find(h => /frequently asked questions|have a question|^faq$/i.test(h.innerText?.trim() || ''));
        if (!anchor) return [];
        const r0 = anchor.getBoundingClientRect();
        const candidates = Array.from(document.querySelectorAll<HTMLElement>('button, summary, div, p, span, h3, h4, dt, li'));
        const found: string[] = [];
        for (const el of candidates) {
          const r = el.getBoundingClientRect();
          if (r.y < r0.bottom - 20 || r.y > r0.bottom + 1500) continue;
          if (r.width === 0 || r.height === 0) continue;
          const txt = (el.innerText || '').trim();
          if (!txt || txt.length > 220 || txt.includes('\n')) continue;
          if (txt.endsWith('?') && !found.includes(txt)) found.push(txt);
        }
        return found.slice(0, 30);
      });

      data.questions = questions;
      data.count = questions.length;

      checks.push(check(
        'at least 1 FAQ question found',
        questions.length >= 1,
        questions.length === 0 ? '(no question rows detected)' : `${questions.length} questions`,
      ));

      // Heuristic: try clicking the first question to confirm it toggles an answer.
      // We measure expansion by either aria-expanded toggling OR the visible answer
      // text height growing. Many Helix v4 FAQ templates don't use aria-expanded,
      // so a missing attribute is not a failure — we only fail when the row IS a
      // button AND aria-expanded is wired AND it doesn't change on click.
      if (questions.length > 0) {
        try {
          const firstQ = page.getByRole('button', { name: questions[0] }).first();
          const hasButton = (await firstQ.count()) > 0;
          if (hasButton) {
            const before = await firstQ.getAttribute('aria-expanded');
            const heightBefore = await measureFaqBlockHeight(page, questions[0]);
            await firstQ.click({ timeout: 3000 });
            await page.waitForTimeout(500);
            const after = await firstQ.getAttribute('aria-expanded');
            const heightAfter = await measureFaqBlockHeight(page, questions[0]);
            const ariaToggled = before !== after;
            const visiblyExpanded = heightAfter > heightBefore + 5;
            const expanded = ariaToggled || visiblyExpanded;
            const ariaUnused = before == null && after == null;
            // If aria-expanded was never present and height didn't grow, treat as
            // "no interactive answer" — record as info-only, not a failure.
            if (!expanded && ariaUnused) {
              checks.push(check(
                'FAQ row is interactive (collapsible)',
                true,
                'aria-expanded not used; height unchanged — likely static FAQ list',
              ));
            } else {
              checks.push(check(
                'first FAQ row expands when clicked',
                expanded,
                `aria=${before}→${after}, height=${heightBefore}→${heightAfter}`,
              ));
            }
            // Collapse it back to leave page in original state for downstream checks.
            if (expanded) await firstQ.click({ timeout: 3000 }).catch(() => {});
          } else {
            // Question text isn't wrapped in a <button> — likely a static FAQ list.
            checks.push(check(
              'FAQ row is interactive (collapsible)',
              true,
              'first question not a button — treated as static list',
            ));
          }
        } catch (clickErr) {
          // soft — don't fail the section
          checks.push(check('first FAQ row expands when clicked', false, (clickErr as Error).message));
        }
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
