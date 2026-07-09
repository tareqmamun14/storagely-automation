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
        const clean = (t: string) => (t || '').replace(/\s+/g, ' ').trim();
        // SEO prose headings are storage-marketing TITLES near the bottom of the
        // page. Detect them structurally, NOT by a fixed copy list — copy varies
        // per location ("Best Self Storage Units in Lancaster" on Carroll vs
        // "Self Storage Solutions in Birmingham" on Birmingham), so a hard-coded
        // intent-word list false-flagged the second location. A SEO heading:
        //   • mentions "storage"          (marketing prose, not "Amenities"/"FAQ")
        //   • is ≥ 3 words, 15–110 chars  (a title, not a chip/label)
        //   • is NOT a unit-size ("10'x10'") or a unit-GROUP label ("… Units")
        //   • has no "|" (the facility-name format "Brand | Location")
        //   • isn't a known section/widget label (reviews/map/nav).
        const NON_SEO = /^(amenit|faqs?\b|frequently asked|customer reviews|reviews\b|what our customers|where you'?ll find|find storage|storage resources|about$|contact|connect|group by|storage usage|unit features?|unit size|need assistance)/i;
        const isUnitSize = (t: string) => /^\d{1,3}\s*['′]?\s*[x×]/i.test(t);
        const isSeoHeading = (t: string) =>
          /storage/i.test(t) &&
          t.split(/\s+/).length >= 3 &&
          t.length >= 15 && t.length <= 110 &&
          !isUnitSize(t) &&
          !/\bunits?$/i.test(t) &&
          !t.includes('|') &&
          !NON_SEO.test(t);

        const headings = Array.from(document.querySelectorAll<HTMLElement>('h1, h2, h3, h4'))
          .filter(h => isSeoHeading(clean(h.innerText)));
        // Fall back to the substantial-paragraph region if no marketing heading
        // matched, so the block is still measured (paragraphs are the primary
        // "is there long-form SEO copy" signal).
        if (headings.length === 0) {
          const bigParas = Array.from(document.querySelectorAll<HTMLElement>('p'))
            .filter(p => clean(p.innerText).length > 100);
          if (bigParas.length === 0) return { headingCount: 0, headings: [], paragraphCount: 0, linkCount: 0, tokens: [] as string[] };
          headings.push(...bigParas.slice(0, 1)); // seed container from prose
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

        // "Internal" = same brand, by the first DNS label (the brand token).
        // This holds across environments: a staging page at
        // minimallstorage.getstoragely.com whose SEO copy links to the prod
        // minimallstorage.com is still linking to ITS OWN brand — the brand
        // token "minimallstorage" matches — whereas a www./apex swap on prod
        // (www.brand.com vs brand.com) also matches. Non-brand hosts (facebook,
        // getstoragely infra) don't.
        const brand = (h: string) => h.replace(/^www\./i, '').split('.')[0];
        const pageBrand = brand(location.host);
        const links = Array.from(root.querySelectorAll<HTMLAnchorElement>('a[href]'))
          .filter(a => {
            const href = a.getAttribute('href') || '';
            if (href.startsWith('/')) return true;
            try { return brand(new URL(a.href).host) === pageBrand; } catch { return false; }
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
