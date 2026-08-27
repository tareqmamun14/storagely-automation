import { Page } from '@playwright/test';
import { ISectionDetector, SectionContext, SectionResult, check } from './types';

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
      // Questions", Mini Mall = "Have A Question?", fr-ca = "Vous avez une
      // question?" (verified live 2026-08-25).
      const FAQ_HEADING = /frequently asked questions|have a question|vous avez une question|^faq$/i;
      const heading = page.getByRole('heading', { name: FAQ_HEADING }).first();
      let hasHeading = (await heading.count()) > 0;
      if (!hasHeading) {
        // Fallback: any text node containing a FAQ-ish heading near a list.
        hasHeading = await page.evaluate(() => {
          const el = Array.from(document.querySelectorAll<HTMLElement>('*'))
            .find(e => /frequently asked questions|have a question|vous avez une question/i.test(e.innerText?.trim() || ''));
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
          .find(h => /frequently asked questions|have a question|vous avez une question|^faq$/i.test(h.innerText?.trim() || ''));
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

      // Click the first question and assert a real expand⇄collapse round-trip.
      //
      // FAQ accordions in the wild signal "open" three different ways, so we read
      // whichever applies (in priority order):
      //   1. aria-expanded on the trigger button  (semantic, Safeguard)
      //   2. an answer panel's open-state — an `active`/`open` class, or a
      //      max-height that toggles 0px ⇄ Npx  (Mini Mall uses `.faq-answer.active`
      //      with max-height 0px ⇄ 500px; the answer text is always in the DOM and
      //      there is no aria, so the old height-of-ancestors heuristic saw nothing)
      //   3. the bounding height of the question's container growing  (fallback)
      // Only a genuinely static list (no button, no signal) is treated as info.
      if (questions.length > 0) {
        try {
          const toggle = await page.evaluate(async (q) => {
            const wait = (ms: number) => new Promise(r => setTimeout(r, ms));
            const triggers = Array.from(document.querySelectorAll<HTMLElement>('button, summary, [role="button"]'))
              .filter(el => (el.innerText || '').trim() === q);
            const btn = triggers.find(el => el.getClientRects().length > 0) || triggers[0];
            if (!btn) return { kind: 'no-button' as const };

            // Resolve the answer panel: aria-controls target → next sibling →
            // a sibling whose class looks like an answer/collapsible region.
            const panelFor = (b: HTMLElement): HTMLElement | null => {
              const ac = b.getAttribute('aria-controls');
              if (ac) { const el = document.getElementById(ac); if (el) return el; }
              if (b.nextElementSibling) return b.nextElementSibling as HTMLElement;
              const p = b.parentElement;
              if (p) return (Array.from(p.children).find(c =>
                c !== b && /answer|accordion|content|panel|collaps/i.test((c.className || '').toString())) as HTMLElement) || null;
              return null;
            };
            const panel = panelFor(btn);

            // Discrete open-state: 1=open, 0=closed, -1=unknown.
            const stateOf = (b: HTMLElement, p: HTMLElement | null): number => {
              const aria = b.getAttribute('aria-expanded');
              if (aria === 'true') return 1;
              if (aria === 'false') return 0;
              if (p) {
                const cls = (p.className || '').toString();
                if (/\b(active|open|expanded|show)\b/i.test(cls)) return 1;
                if (/\b(collaps|closed)\b/i.test(cls)) return 0;
                const mh = getComputedStyle(p).maxHeight;
                if (mh && mh !== 'none') return mh === '0px' ? 0 : 1;
                return p.getBoundingClientRect().height > 2 ? 1 : 0;
              }
              return -1;
            };
            // Continuous fallback: tallest container height around the button.
            const heightOf = (b: HTMLElement): number => {
              let node: HTMLElement | null = b.parentElement, best = 0;
              for (let i = 0; i < 3 && node; i++) { best = Math.max(best, node.getBoundingClientRect().height); node = node.parentElement; }
              return best;
            };

            btn.scrollIntoView({ block: 'center' }); await wait(200);
            const s0 = stateOf(btn, panel), h0 = heightOf(btn);
            btn.click(); await wait(500);
            const s1 = stateOf(btn, panel), h1 = heightOf(btn);
            btn.click(); await wait(500);
            const s2 = stateOf(btn, panel), h2 = heightOf(btn);
            return {
              kind: 'measured' as const,
              hasPanel: !!panel,
              panelCls: panel ? (panel.className || '').toString().slice(0, 40) : null,
              s0, s1, s2, h0: Math.round(h0), h1: Math.round(h1), h2: Math.round(h2),
            };
          }, questions[0]);

          if (toggle.kind === 'no-button') {
            checks.push(check('FAQ row is interactive (collapsible)', true,
              'first question not a button — treated as static list'));
          } else {
            const stateKnown = toggle.s0 !== -1;
            // Expand: first click flips the open-state (or grows the container).
            const expanded = stateKnown
              ? toggle.s0 !== toggle.s1
              : Math.abs(toggle.h1 - toggle.h0) > 5;
            // Collapse: second click flips it back to the original state.
            const collapsedBack = stateKnown
              ? (toggle.s1 !== toggle.s2 && toggle.s2 === toggle.s0)
              : Math.abs(toggle.h2 - toggle.h1) > 5;
            const signal = stateKnown
              ? `state ${toggle.s0}→${toggle.s1}→${toggle.s2}${toggle.panelCls ? ` [panel: ${toggle.panelCls}]` : ''}`
              : `height ${toggle.h0}→${toggle.h1}→${toggle.h2}`;

            if (!expanded && !stateKnown && !toggle.hasPanel) {
              // No button signal AND no panel AND height never moved → static list.
              checks.push(check('FAQ row is interactive (collapsible)', true,
                `no toggle signal — likely static FAQ list (${signal})`));
            } else {
              checks.push(check('first FAQ row expands when clicked', expanded, signal));
              checks.push(check('first FAQ row collapses when clicked again', collapsedBack, signal));
            }
          }
        } catch (clickErr) {
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
