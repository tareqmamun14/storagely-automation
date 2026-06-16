import { Page, Locator, expect } from '@playwright/test';
import { ISectionDetector, SectionContext, SectionResult, SECTION_DETECTORS, getDetector } from './sections';

/**
 * LiveFacilityPage — page object for a published Helix v4 facility page.
 *
 * Two API surfaces:
 *  1. The legacy helpers used by existing tests (page-health, rent-journey) —
 *     kept stable so nothing breaks.
 *  2. The new section-detector surface, which exposes one detector per
 *     testable section. Each detector is layout-tolerant: it uses semantic
 *     locators (role / aria / text) rather than CSS classnames.
 */
export class LiveFacilityPage {
  readonly page: Page;
  private consoleErrors: string[] = [];

  constructor(page: Page) {
    this.page = page;
    this.page.on('console', msg => {
      if (msg.type() === 'error') this.consoleErrors.push(msg.text());
    });
  }

  async goto(url: string) {
    await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await this.page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  }

  // ── Section detection ──────────────────────────────────────────────────
  //
  // Use these for the new section specs. Detectors are pure inspectors —
  // call after `goto()` and they return a SectionResult.

  /** All registered detectors, in display order. */
  get detectors(): ISectionDetector[] { return SECTION_DETECTORS; }

  /** Look up a single detector by section id (e.g. "nav", "units"). */
  detector(id: string): ISectionDetector { return getDetector(id); }

  /**
   * Run a single section detector against the current page.
   * The caller supplies the context (facility id / name / url) so the
   * report can identify which run the result belongs to.
   */
  async verifySection(id: string, ctx: SectionContext): Promise<SectionResult> {
    return this.detector(id).verify(this.page, ctx);
  }

  /**
   * Run every detector (or a filtered subset) against the current page.
   * Detectors run sequentially against the same page — one navigation, many
   * verifications. Returned in display order.
   */
  async verifyAllSections(ctx: SectionContext, sectionIds?: string[]): Promise<SectionResult[]> {
    const list = sectionIds && sectionIds.length > 0
      ? SECTION_DETECTORS.filter(d => sectionIds.includes(d.id))
      : SECTION_DETECTORS;
    const out: SectionResult[] = [];
    for (const detector of list) {
      try {
        const r = await detector.verify(this.page, ctx);
        out.push(r);
      } catch (err) {
        out.push({
          sectionId: detector.id,
          facilityId: ctx.facilityId,
          facilityName: ctx.facilityName,
          url: ctx.url,
          present: false,
          checks: [],
          durationMs: 0,
          errors: [(err as Error).message],
        });
      }
    }
    return out;
  }

  // ── Legacy page-level assertions (kept for existing tests) ────────────

  async expectPageLoaded() {
    const title = await this.page.title();
    expect(title.length).toBeGreaterThan(0);
    expect(title).not.toMatch(/404|error|not found/i);
  }

  async expectTitleMatches(pattern: RegExp) {
    const title = await this.page.title();
    expect(title).toMatch(pattern);
  }

  async expectFacilityHeading(pattern: RegExp) {
    const headings = this.page.locator('h1, h2, h3').filter({ hasText: pattern });
    const count = await headings.count();
    let found = false;
    for (let i = 0; i < count; i++) {
      if (await headings.nth(i).isVisible()) { found = true; break; }
    }
    expect(found, `No visible heading matching ${pattern}`).toBe(true);
  }

  async expectNoUnresolvedTokens() {
    const bodyText = await this.page.locator('body').innerText();
    const tokens = bodyText.match(/\{[a-zA-Z0-9_.]+\}/g) || [];
    expect(tokens, `Unresolved tokens leaked to page: ${tokens.join(', ')}`).toHaveLength(0);
  }

  async expectNoUnresolvedTokensInAttributes() {
    const leaks = await this.page.evaluate(() => {
      const found: string[] = [];
      const pattern = /\{[a-zA-Z0-9_.]+\}/g;
      document.querySelectorAll('img[src], a[href]').forEach(el => {
        const src = el.getAttribute('src') || '';
        const href = el.getAttribute('href') || '';
        for (const match of (src + ' ' + href).matchAll(pattern)) {
          found.push(match[0]);
        }
      });
      return [...new Set(found)];
    });
    expect(leaks, `Unresolved tokens in attributes: ${leaks.join(', ')}`).toHaveLength(0);
  }

  // ── Unit / Rent assertions (used by rent-journey spec) ────────────────

  async expectUnitsVisible() {
    const rentLink = this.page.getByRole('link', { name: /rent now/i }).first();
    await expect(rentLink).toBeVisible({ timeout: 15_000 });
  }

  getRentNowLinks(): Locator {
    return this.page.getByRole('link', { name: /rent now/i });
  }

  async getRentNowHrefs(): Promise<string[]> {
    const hrefs = await this.page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      return links
        .filter(a => /rent now/i.test(a.textContent || ''))
        .map(a => a.href)
        .filter(Boolean);
    });
    return [...new Set(hrefs)];
  }

  async getFirstRentNowHref(): Promise<string> {
    const hrefs = await this.getRentNowHrefs();
    expect(hrefs.length, 'No Rent Now links found on page').toBeGreaterThan(0);
    return hrefs[0];
  }

  async expectReviewsSection() {
    const heading = this.page.getByRole('heading', { name: /customer reviews/i }).first();
    await expect(heading).toBeVisible({ timeout: 10_000 });
  }

  async expectAmenitiesSection() {
    const heading = this.page.getByRole('heading', { name: /amenities/i }).first();
    await expect(heading).toBeVisible({ timeout: 10_000 });
  }

  // ── Quality checks ─────────────────────────────────────────────────────

  getConsoleErrors(): string[] {
    return this.consoleErrors.filter(
      e => !e.includes('favicon') && !e.includes('analytics') && !e.includes('gtm')
    );
  }

  /**
   * Assert on-screen images are loaded — and return the counts so callers can
   * report the actual numbers.
   *
   * False-positive avoidance (two causes, both confirmed against live Safeguard):
   *   1. TIMING — lazy / CDN-rendered images decode a beat after the page
   *      settles. A single fixed-wait snapshot intermittently caught them
   *      mid-load ("8 of 36 failed" when all 36 actually load). We now POLL:
   *      scroll to trigger lazy loads, then re-check every second until the
   *      broken set clears (or the grace window expires).
   *   2. CAROUSEL DEFERRED SLIDES — a slider's non-active slides keep full
   *      layout size but are translated entirely off-screen (x ≥ viewport) and
   *      stay `loading="lazy"` with naturalWidth=0. They are intentionally
   *      deferred, not broken, so we exclude anything horizontally off-screen.
   */
  async expectAllImagesLoaded(): Promise<{ visible: number; loaded: number }> {
    // Trigger lazy-loading: walk the page top→bottom, then settle back at top.
    await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await this.page.waitForTimeout(1500);
    await this.page.evaluate(() => window.scrollTo(0, 0));
    await this.page.waitForTimeout(500);

    const collect = () => this.page.evaluate(() => {
      const vw = window.innerWidth;
      return Array.from(document.querySelectorAll<HTMLImageElement>('img[src]'))
        .filter(img => {
          const r = img.getBoundingClientRect();
          if (r.width <= 0 || r.height <= 0) return false;        // not rendered
          if (r.right <= 0 || r.left >= vw) return false;         // carousel deferred slide (off-screen X)
          return true;
        })
        .map(img => ({
          src: img.currentSrc || img.src,
          alt: img.alt || '(no alt)',
          loaded: img.complete && img.naturalWidth > 0,
        }));
    });

    // Poll: give lazy / CDN-delayed images up to ~6s of grace to finish.
    let results = await collect();
    let broken = results.filter(r => !r.loaded);
    for (let attempt = 0; attempt < 6 && broken.length > 0; attempt++) {
      await this.page.waitForTimeout(1000);
      results = await collect();
      broken = results.filter(r => !r.loaded);
    }

    const limit = Math.floor(results.length * 0.2);
    if (broken.length > limit) {
      // Single line (the reporter keeps only the first line) — name the offenders.
      const offenders = broken
        .slice(0, 6)
        .map(b => `"${b.alt}" …${b.src.slice(-44)}`)
        .join(' · ');
      const more = broken.length > 6 ? ` (+${broken.length - 6} more)` : '';
      throw new Error(
        `${broken.length} of ${results.length} on-screen images failed to load (tolerance ${limit}): ${offenders}${more}`,
      );
    }
    return { visible: results.length, loaded: results.length - broken.length };
  }

  // ── V2 handoff validation ─────────────────────────────────────────────

  static validateRentNowUrl(href: string) {
    const url = new URL(href);
    expect(url.pathname).toContain('/step-four');
    const unitId = url.searchParams.get('unit_id');
    expect(unitId, 'unit_id missing from Rent Now URL').toBeTruthy();
    expect(Number(unitId)).toBeGreaterThan(0);
  }
}
