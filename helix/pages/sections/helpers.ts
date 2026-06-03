import { Page } from '@playwright/test';

/**
 * Cross-section helpers used by multiple detectors.
 */

/**
 * Find unresolved template tokens (e.g. "{v2_api_location_units.width}") inside
 * a sub-tree of the DOM. Returns one entry per distinct leaking token.
 *
 * Localizing token leaks to a section (instead of a single page-wide check)
 * pinpoints which binding broke — far more actionable in a regression run.
 */
export async function tokensInSection(
  page: Page,
  rootSelector: string,
): Promise<string[]> {
  return page.evaluate((sel) => {
    const root = document.querySelector(sel);
    if (!root) return [];
    const txt = (root as HTMLElement).innerText || '';
    const attrs: string[] = [];
    root.querySelectorAll('[src], [href]').forEach(el => {
      attrs.push(el.getAttribute('src') || '');
      attrs.push(el.getAttribute('href') || '');
    });
    const combined = txt + ' ' + attrs.join(' ');
    return Array.from(new Set(combined.match(/\{[a-zA-Z0-9_.]+\}/g) || []));
  }, rootSelector);
}

/**
 * Verify a set of image elements within a region all loaded successfully.
 * `loaded` means complete=true AND naturalWidth > 0.
 *
 * Returns per-image status so failures can name the broken URL — broken
 * images are one of the most common Helix v4 regression points (renamed
 * S3 keys, CDN cache misses, etc.).
 */
export async function imagesLoadedInRegion(
  page: Page,
  selector: string,
  opts: { minSize?: number; maxImages?: number } = {},
): Promise<Array<{ src: string; loaded: boolean; alt: string; w: number; h: number }>> {
  const minSize = opts.minSize ?? 40;
  const maxImages = opts.maxImages ?? 25;
  return page.evaluate(({ selector, minSize, maxImages }) => {
    const region = document.querySelector(selector);
    if (!region) return [];
    const imgs = Array.from(region.querySelectorAll('img'))
      .filter(img => {
        const r = (img as HTMLImageElement).getBoundingClientRect();
        return r.width >= minSize && r.height >= minSize;
      })
      .slice(0, maxImages);
    return imgs.map(img => {
      const r = (img as HTMLImageElement).getBoundingClientRect();
      return {
        src: ((img as HTMLImageElement).src || '').slice(0, 200),
        loaded: (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0,
        alt: (img as HTMLImageElement).alt || '',
        w: Math.round(r.width),
        h: Math.round(r.height),
      };
    });
  }, { selector, minSize, maxImages });
}

/**
 * Scroll a heading into view so lazy-loaded content beneath it renders, then
 * return the heading's bounding rect (top/bottom y) for follow-up queries
 * that need to scope by vertical position.
 */
export async function settleSectionAtHeading(
  page: Page,
  headingPattern: RegExp,
): Promise<{ top: number; bottom: number } | null> {
  const heading = page.getByRole('heading', { name: headingPattern }).first();
  if ((await heading.count()) === 0) return null;
  await heading.scrollIntoViewIfNeeded({ timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(600);
  return page.evaluate((pat) => {
    const re = new RegExp(pat, 'i');
    const h = Array.from(document.querySelectorAll<HTMLElement>('h1, h2, h3, h4'))
      .find(el => re.test(el.innerText || ''));
    if (!h) return null;
    const r = h.getBoundingClientRect();
    return { top: r.top + window.scrollY, bottom: r.bottom + window.scrollY };
  }, headingPattern.source);
}
