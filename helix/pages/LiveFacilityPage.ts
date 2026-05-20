import { Page, Locator, expect } from '@playwright/test';

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

  // ── Page-level assertions ──

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

  // ── Token audit ──

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

  // ── Unit / Rent assertions ──

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

  // ── Section assertions ──

  async expectReviewsSection() {
    const heading = this.page.getByRole('heading', { name: /customer reviews/i }).first();
    await expect(heading).toBeVisible({ timeout: 10_000 });
  }

  async expectAmenitiesSection() {
    const heading = this.page.getByRole('heading', { name: /amenities/i }).first();
    await expect(heading).toBeVisible({ timeout: 10_000 });
  }

  // ── Quality checks ──

  getConsoleErrors(): string[] {
    return this.consoleErrors.filter(
      e => !e.includes('favicon') && !e.includes('analytics') && !e.includes('gtm')
    );
  }

  async expectAllImagesLoaded() {
    await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await this.page.waitForTimeout(2000);
    await this.page.evaluate(() => window.scrollTo(0, 0));
    await this.page.waitForTimeout(1000);

    const results = await this.page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img[src]'));
      return imgs
        .filter(img => {
          const r = img.getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        })
        .map(img => ({
          src: (img as HTMLImageElement).src.slice(0, 120),
          loaded: (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0,
        }));
    });
    const broken = results.filter(r => !r.loaded);
    if (broken.length > 0) {
      console.log(`[warn] ${broken.length} images not fully loaded (may be lazy/CDN-delayed):`);
      for (const b of broken.slice(0, 5)) console.log(`  - ${b.src}`);
    }
    expect(broken.length, `${broken.length} of ${results.length} visible images failed to load`).toBeLessThanOrEqual(
      Math.floor(results.length * 0.2)
    );
  }

  // ── V2 handoff validation ──

  static validateRentNowUrl(href: string) {
    const url = new URL(href);
    expect(url.pathname).toContain('/step-four');
    const unitId = url.searchParams.get('unit_id');
    expect(unitId, 'unit_id missing from Rent Now URL').toBeTruthy();
    expect(Number(unitId)).toBeGreaterThan(0);
  }
}
