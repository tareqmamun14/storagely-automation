import { Page } from '@playwright/test';
import { ISectionDetector, SectionContext, SectionResult, check } from './types';

/**
 * Page Meta & Structured Data — the non-visual "head" of the location page.
 *
 * A location/listing page lives or dies on its SEO + sharing metadata and its
 * structured data (Google rich results for a storage facility). None of this
 * shows up in the visual sections, so it has its own detector:
 *
 *   • <title>, <meta name="description">          — search snippet
 *   • <link rel="canonical">                      — duplicate-content guard
 *   • Open Graph (og:title / og:image)            — social sharing card
 *   • <meta name="viewport">                      — mobile rendering
 *   • <html lang>                                 — a11y / locale
 *   • exactly one <h1>                            — document outline
 *   • JSON-LD structured data (SelfStorage/LocalBusiness + name/address,
 *     FAQPage, BreadcrumbList) parses and is well-formed
 *   • NO unresolved {template.tokens} in element attributes (alt/title/
 *     aria-label/placeholder/src/href) — the visual sections check innerText,
 *     but a token can hide in an attribute (e.g. a logo alt="{company.name}").
 *
 * Universal (runs for every client) — these are baseline web-quality bars, not
 * client-specific layout.
 */
export class SeoHeadSection implements ISectionDetector {
  readonly id = 'seohead';
  readonly label = 'Page Meta & Structured Data';

  async verify(page: Page, ctx: SectionContext): Promise<SectionResult> {
    const start = Date.now();
    const errors: string[] = [];
    const checks = [];
    const data: Record<string, unknown> = {};

    try {
      const head = await page.evaluate(() => {
        const metaContent = (sel: string) => {
          const el = document.querySelector(sel);
          return el ? (el.getAttribute('content') || el.getAttribute('href') || '') : '';
        };
        // ── JSON-LD structured data ──
        const ldNodes = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
        const types: string[] = [];
        let allValid = ldNodes.length > 0;
        let business: { type: string; name: string; hasAddress: boolean } | null = null;
        for (const n of ldNodes) {
          let parsed: unknown;
          try { parsed = JSON.parse(n.textContent || ''); } catch { allValid = false; continue; }
          const flat: Record<string, unknown>[] = [];
          const push = (o: unknown) => {
            if (!o || typeof o !== 'object') return;
            const obj = o as Record<string, unknown>;
            flat.push(obj);
            if (Array.isArray(obj['@graph'])) (obj['@graph'] as unknown[]).forEach(push);
          };
          (Array.isArray(parsed) ? parsed : [parsed]).forEach(push);
          for (const o of flat) {
            const t = String(o['@type'] || '');
            if (t) types.push(t);
            if (/storage|localbusiness|organization/i.test(t) && !business) {
              business = {
                type: t,
                name: String(o['name'] || ''),
                hasAddress: !!o['address'],
              };
            }
          }
        }
        // ── attribute token scan (rendered DOM) ──
        // Match {namespaced.token} (single brace WITH a dot) or {{any}} (double
        // brace) — same pattern as DataIntegrity, so a literal like {2024} is not
        // mistaken for an unresolved template token.
        const tokenRe = /\{\{\s*[\w.$-]+\s*\}\}|\{\s*[\w$-]*\.[\w.$-]+\s*\}/g;
        const attrLeaks = new Set<string>();
        for (const attr of ['alt', 'title', 'aria-label', 'placeholder', 'src', 'href']) {
          for (const el of Array.from(document.querySelectorAll('[' + attr + ']'))) {
            const v = el.getAttribute(attr) || '';
            for (const m of v.matchAll(tokenRe)) attrLeaks.add(`${el.tagName.toLowerCase()}[${attr}="${m[0]}"]`);
          }
        }
        return {
          title: document.title || '',
          description: metaContent('meta[name="description"]'),
          canonical: metaContent('link[rel="canonical"]'),
          ogTitle: metaContent('meta[property="og:title"]'),
          ogImage: metaContent('meta[property="og:image"]'),
          viewport: metaContent('meta[name="viewport"]'),
          lang: document.documentElement.getAttribute('lang') || '',
          h1Count: document.querySelectorAll('h1').length,
          ldBlocks: ldNodes.length,
          ldTypes: [...new Set(types)],
          ldValid: allValid,
          business,
          attrLeaks: [...attrLeaks].slice(0, 10),
        };
      });

      data.head = head;

      // ── <title> ──
      checks.push(check(
        'page <title> present and reasonable',
        head.title.trim().length >= 10 && head.title.length <= 120,
        head.title ? `"${head.title}" (${head.title.length} chars)` : '(empty)',
      ));
      // ── meta description ──
      checks.push(check(
        'meta description present',
        head.description.trim().length >= 30,
        head.description ? `${head.description.length} chars` : '(missing)',
      ));
      // ── canonical ──
      checks.push(check(
        'canonical link is an absolute URL',
        /^https?:\/\/.+/.test(head.canonical),
        head.canonical || '(missing)',
      ));
      // ── Open Graph ──
      checks.push(check(
        'Open Graph title + image present',
        head.ogTitle.trim().length > 0 && /^https?:\/\/.+/.test(head.ogImage),
        `og:title=${head.ogTitle ? 'ok' : '(missing)'}, og:image=${head.ogImage ? head.ogImage.slice(0, 50) : '(missing)'}`,
      ));
      // ── viewport (mobile) ──
      checks.push(check(
        'viewport meta present (mobile-ready)',
        /width=device-width/i.test(head.viewport),
        head.viewport || '(missing)',
      ));
      // ── html lang ──
      checks.push(check('html lang attribute set', head.lang.trim().length > 0, head.lang || '(missing)'));
      // ── single h1 ──
      checks.push(check('exactly one <h1>', head.h1Count === 1, `${head.h1Count} <h1> element(s)`));

      // ── structured data ──
      const hasBusiness = !!head.business && head.business.name.trim().length > 0;
      checks.push(check(
        'JSON-LD structured data valid (storage/local-business + name)',
        head.ldBlocks > 0 && head.ldValid && hasBusiness,
        head.ldBlocks === 0
          ? '(no JSON-LD on page)'
          : `${head.ldBlocks} block(s) [${head.ldTypes.join(', ')}]; business=${head.business ? `${head.business.type} "${head.business.name}" address=${head.business.hasAddress}` : '(none)'}${head.ldValid ? '' : ' — INVALID JSON'}`,
      ));

      // ── attribute token leaks ──
      checks.push(check(
        'no unresolved {tokens} in element attributes',
        head.attrLeaks.length === 0,
        head.attrLeaks.length === 0 ? 'clean' : `leaked: ${head.attrLeaks.join(', ')}`,
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
