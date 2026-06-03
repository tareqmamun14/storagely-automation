import { Page } from '@playwright/test';
import { ISectionDetector, SectionContext, SectionResult, check } from './types';

/**
 * Footer section.
 *
 * Footer columns vary by client (Storage Types / Resources / About / Contact
 * / States / Cities, plus an optional Legal row). We assert structural shape:
 *   • a <footer> element exists
 *   • at least 2 navigational columns of links
 *   • social media icons (any of Facebook/X/IG/YouTube/TikTok)
 *   • copyright text
 */
export class FooterSection implements ISectionDetector {
  readonly id = 'footer';
  readonly label = 'Footer';

  async verify(page: Page, ctx: SectionContext): Promise<SectionResult> {
    const start = Date.now();
    const errors: string[] = [];
    const checks = [];
    const data: Record<string, unknown> = {};

    try {
      // Scroll the footer into view so any lazy-loaded sections render.
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(1000);

      const footer = page.locator('footer').first();
      const hasFooter = (await footer.count()) > 0;
      checks.push(check('<footer> element exists', hasFooter));

      const summary = await page.evaluate(() => {
        const footer = document.querySelector('footer');
        if (!footer) return null;

        // Headings inside the footer ≈ column titles.
        const columnHeadings = Array.from(footer.querySelectorAll<HTMLElement>('h2, h3, h4'))
          .map(h => h.innerText?.trim() || '')
          .filter(Boolean);

        // Hyperlinks inside the footer (excluding social icons we'll match separately).
        const links = Array.from(footer.querySelectorAll<HTMLAnchorElement>('a[href]'))
          .map(a => ({ text: a.innerText?.trim() || '', href: a.href }))
          .filter(l => l.text || l.href);

        // Social platforms (match by aria-label / href, since the link text is usually empty).
        const socialKeywords = ['facebook', 'twitter', 'x.com', 'instagram', 'youtube', 'tiktok', 'linkedin', 'pinterest'];
        const socialLinks = Array.from(footer.querySelectorAll<HTMLAnchorElement>('a[href]'))
          .map(a => ({
            label: (a.getAttribute('aria-label') || '').toLowerCase(),
            href: a.href.toLowerCase(),
          }))
          .filter(s => socialKeywords.some(k => s.href.includes(k) || s.label.includes(k)))
          .map(s => socialKeywords.find(k => s.href.includes(k) || s.label.includes(k))!)
          .filter(Boolean);

        // Phone in footer (e.g. brand main line).
        const phoneM = (footer.innerText || '').match(/\(?\d{3}\)?[ -.]?\d{3}[ -.]?\d{4}/);
        const phone = phoneM ? phoneM[0] : '';

        // Copyright pattern.
        const copyM = (footer.innerText || '').match(/©\s*[\w &,]+|\bcopyright\b.*/i);
        const copyright = copyM ? copyM[0].slice(0, 120) : '';

        return {
          columnHeadings,
          linkCount: links.length,
          social: Array.from(new Set(socialLinks)),
          phone,
          copyright,
        };
      });

      if (!summary) {
        return {
          sectionId: this.id,
          facilityId: ctx.facilityId,
          facilityName: ctx.facilityName,
          url: ctx.url,
          present: false,
          checks,
          data,
          durationMs: Date.now() - start,
          errors: ['<footer> element missing'],
        };
      }

      data.columnHeadings = summary.columnHeadings;
      data.linkCount = summary.linkCount;
      data.socialPlatforms = summary.social;
      data.phone = summary.phone;
      data.copyright = summary.copyright;

      checks.push(check(
        '≥ 2 footer column headings',
        summary.columnHeadings.length >= 2,
        summary.columnHeadings.join(', ') || '(none)',
      ));
      checks.push(check(
        '≥ 5 footer links',
        summary.linkCount >= 5,
        `${summary.linkCount} link(s)`,
      ));
      checks.push(check(
        'at least 1 social media link',
        summary.social.length >= 1,
        summary.social.join(', ') || '(none)',
      ));
      checks.push(check(
        'copyright line present',
        summary.copyright.length > 0,
        summary.copyright || '(none)',
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
