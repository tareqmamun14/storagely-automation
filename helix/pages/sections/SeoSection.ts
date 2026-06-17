import { Page } from '@playwright/test';
import { ISectionDetector, SectionContext, SectionResult, check } from './types';

/**
 * SEO content block (Mini Mall layout).
 *
 * The long-form copy near the bottom of the listing page — several headed
 * prose sections ("Best Self Storage Units in …", "Self Storage Facility in …",
 * "Self Storage Features on …", "Rent Your … Storage Unit Today") with
 * paragraphs and internal links.
 *
 * This copy is template-bound (city / facility tokens), so it's a frequent
 * home for unresolved {token} leaks and empty paragraphs — both checked here.
 */
export class SeoSection implements ISectionDetector {
  readonly id = 'seo';
  readonly label = 'SEO Content';

  async verify(page: Page, ctx: SectionContext): Promise<SectionResult> {
    const start = Date.now();
    const errors: string[] = [];
    const checks = [];
    const data: Record<string, unknown> = {};

    try {
      const info = await page.evaluate(() => {
        // SEO prose headings carry one of these intent words + "storage" — which
        // distinguishes them from the unit-size headings ("Small Storage Units").
        const isSeoHeading = (t: string) =>
          /storage/i.test(t) && /\b(best|facility|features|rent your|guide|about)\b/i.test(t) && t.length <= 90;

        const headings = Array.from(document.querySelectorAll<HTMLElement>('h2, h3, h4'))
          .filter(h => isSeoHeading((h.innerText || '').trim()));
        if (headings.length === 0) {
          return { headingCount: 0, headings: [], paragraphCount: 0, linkCount: 0, tokens: [] as string[] };
        }

        // Common-ancestor container holding the SEO headings.
        let container: HTMLElement | null = headings[0];
        for (let i = 0; i < 8 && container; i++) {
          const within = headings.filter(h => container!.contains(h)).length;
          if (within >= Math.min(2, headings.length)) break;
          container = container.parentElement;
        }
        const root = container || headings[0].parentElement || document.body;

        const paragraphs = Array.from(root.querySelectorAll<HTMLElement>('p'))
          .map(p => (p.innerText || '').trim())
          .filter(t => t.length > 100);

        // Treat www. and the apex as the same site (links often point at
        // www.<brand>.com while the listing page is served from <brand>.com).
        const norm = (h: string) => h.replace(/^www\./i, '');
        const host = norm(location.host);
        const links = Array.from(root.querySelectorAll<HTMLAnchorElement>('a[href]'))
          .filter(a => {
            const href = a.getAttribute('href') || '';
            if (href.startsWith('/')) return true;
            try { return norm(new URL(a.href).host) === host; } catch { return false; }
          });

        const tokens = Array.from(new Set((root.innerText || '').match(/\{[a-zA-Z0-9_.]+\}/g) || []));

        return {
          headingCount: headings.length,
          headings: headings.map(h => (h.innerText || '').trim()).slice(0, 6),
          paragraphCount: paragraphs.length,
          linkCount: links.length,
          tokens,
        };
      });

      data.headings = info.headings;
      data.paragraphCount = info.paragraphCount;
      data.internalLinkCount = info.linkCount;

      checks.push(check(
        '≥ 2 SEO content headings',
        info.headingCount >= 2,
        info.headingCount ? info.headings.join(' | ') : '(no SEO headings found)',
      ));
      checks.push(check(
        '≥ 1 substantial SEO paragraph',
        info.paragraphCount >= 1,
        `${info.paragraphCount} paragraph(s) > 100 chars`,
      ));
      checks.push(check(
        'SEO block has internal links',
        info.linkCount >= 1,
        `${info.linkCount} internal link(s)`,
      ));
      checks.push(check(
        'no unresolved {tokens} in SEO copy',
        info.tokens.length === 0,
        info.tokens.length ? `leaked: ${info.tokens.join(', ')}` : 'clean',
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
