import { Page, Locator, expect } from '@playwright/test';
import { ISectionDetector, SectionContext, SectionResult, SECTION_DETECTORS, getDetector, settleImages } from './sections';
import { getRentHandoff, RentHandoff } from '../configs/profiles';

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
      if (msg.type() === 'error') {
        // Append the source/resource URL — for "Failed to load resource" 403s
        // the URL lives in location(), not text(), and client allow-lists need
        // it to scope (e.g. ignore only specific Atlas-API endpoints, not all 403s).
        const loc = msg.location();
        const url = loc && loc.url ? ` ${loc.url}` : '';
        this.consoleErrors.push(msg.text() + url);
      }
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

  // Backward-compatible Safeguard-flavored helpers (default rent handoff).
  async expectUnitsVisible() {
    await this.expectRentLinksVisible(getRentHandoff(undefined));
  }

  getRentNowLinks(): Locator {
    return this.page.getByRole('link', { name: getRentHandoff(undefined).rentLinkText });
  }

  async getRentNowHrefs(): Promise<string[]> {
    return this.getRentHrefs(getRentHandoff(undefined));
  }

  async getFirstRentNowHref(): Promise<string> {
    const hrefs = await this.getRentNowHrefs();
    expect(hrefs.length, 'No Rent Now links found on page').toBeGreaterThan(0);
    return hrefs[0];
  }

  // ── Client-aware rent helpers (Safeguard SPC + Mini Mall Yardi, …) ──────
  //
  // A unit card's Rent CTA is identified by BOTH its visible text (e.g.
  // "Rent Now" / "Rent") AND its href matching the client's handoff path
  // (/step-four | /yardi/start). The href filter is what keeps a stray top-nav
  // "Rent Unit" link (href="#") out of the result — text alone is ambiguous.

  rentLinksFor(handoff: RentHandoff): Locator {
    return this.page.getByRole('link', { name: handoff.rentLinkText });
  }

  async expectRentLinksVisible(handoff: RentHandoff) {
    await expect(this.rentLinksFor(handoff).first()).toBeVisible({ timeout: 15_000 });
  }

  /** Distinct Rent-CTA hrefs for the given client handoff (text + path matched). */
  async getRentHrefs(handoff: RentHandoff): Promise<string[]> {
    const textSrc = handoff.rentLinkText.source, textFlags = handoff.rentLinkText.flags;
    const pathSrc = handoff.pathPattern.source, pathFlags = handoff.pathPattern.flags;
    const hrefs = await this.page.evaluate(({ textSrc, textFlags, pathSrc, pathFlags }) => {
      const textRe = new RegExp(textSrc, textFlags);
      const pathRe = new RegExp(pathSrc, pathFlags);
      return Array.from(document.querySelectorAll('a'))
        .filter(a => textRe.test((a.textContent || '').trim()))
        .map(a => (a as HTMLAnchorElement).href)
        .filter(href => {
          if (!href) return false;
          try { return pathRe.test(new URL(href).pathname); } catch { return false; }
        });
    }, { textSrc, textFlags, pathSrc, pathFlags });
    return [...new Set(hrefs)];
  }

  async expectReviewsSection() {
    const heading = this.page.getByRole('heading', { name: /customer reviews/i }).first();
    await expect(heading).toBeVisible({ timeout: 10_000 });
  }

  async expectAmenitiesSection() {
    const heading = this.page.getByRole('heading', { name: /amenities/i }).first();
    await expect(heading).toBeVisible({ timeout: 10_000 });
  }

  /**
   * Reserve modal — click the first unit's Reserve button and verify the
   * "Finalize Reservation" modal opens with the selected unit + a reservation
   * form, then close it (Escape) and confirm it dismisses. Read-only: we never
   * submit a reservation. Returns granular checks for the journey reporter.
   */
  async verifyReserveModal(): Promise<{ ok: boolean; checks: Array<{ name: string; passed: boolean; detail: string }> }> {
    const page = this.page;
    const checks: Array<{ name: string; passed: boolean; detail: string }> = [];

    // First unit-card Reserve button. The accessible name includes the size
    // ("Reserve, 10x10 Climate"), so match the VISIBLE text instead — exactly
    // "Reserve", which also excludes the U-Haul "Reserve Now".
    const reserveBtn = page.locator('button').filter({ hasText: /^Reserve$/ }).first();
    const hasReserve = (await reserveBtn.count()) > 0;
    checks.push({ name: 'Reserve button present', passed: hasReserve, detail: hasReserve ? 'ok' : '(none)' });
    if (!hasReserve) return { ok: false, checks };

    await reserveBtn.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {});
    await reserveBtn.click({ timeout: 10_000 }).catch(() => {});

    const dialog = page.locator('[role="dialog"]').first();
    let opened = false;
    try { await dialog.waitFor({ state: 'visible', timeout: 8000 }); opened = true; } catch { /* no modal */ }
    checks.push({ name: 'Reserve opens a modal', passed: opened, detail: opened ? 'role=dialog appeared' : 'no modal after Reserve click' });

    if (opened) {
      const dlgText = (await dialog.innerText().catch(() => '')) || '';
      const hasHeading = /finaliz\w*\s+reservation|reservation/i.test(dlgText)
        || (await page.getByRole('heading', { name: /finaliz\w*\s+reservation|reservation/i }).count()) > 0;
      const hasSelectedUnit = /selected unit/i.test(dlgText) || /\d{1,3}\s*['′]?\s*[x×]\s*\d{1,3}/i.test(dlgText);
      const hasForm = (await dialog.getByRole('textbox', { name: /first name|email/i }).count()) > 0
        || /first name|email/i.test(dlgText);
      checks.push({ name: 'modal shows "Finalize Reservation"', passed: hasHeading, detail: hasHeading ? 'ok' : 'no reservation heading' });
      checks.push({ name: 'modal shows the selected unit', passed: hasSelectedUnit, detail: hasSelectedUnit ? 'ok' : 'no selected-unit details' });
      checks.push({ name: 'modal has a reservation form', passed: hasForm, detail: hasForm ? 'name/email fields present' : 'no form fields' });

      // Close it so downstream steps see a clean page.
      await page.keyboard.press('Escape').catch(() => {});
      await page.waitForTimeout(600);
      let stillOpen = await dialog.isVisible().catch(() => false);
      if (stillOpen) {
        await page.getByRole('button', { name: /close|cancel/i }).first().click({ timeout: 2000 }).catch(() => {});
        await page.waitForTimeout(300);
        stillOpen = await dialog.isVisible().catch(() => false);
      }
      checks.push({ name: 'modal closes', passed: !stillOpen, detail: stillOpen ? 'still visible after Escape/close' : 'closed' });
    }

    return { ok: checks.every(c => c.passed), checks };
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
   * False-positive avoidance (confirmed against live Safeguard + Mini Mall):
   *   1. TIMING — lazy / CDN-rendered images decode a beat after the page
   *      settles. settleImages() forces every lazy image to fetch (scroll into
   *      view + flip loading→eager) and polls until they finish, so a still-
   *      unloaded image afterwards is genuinely broken, not merely deferred.
   *   2. CAROUSEL DEFERRED SLIDES — a slider's non-active slides keep full
   *      layout size but are translated entirely off-screen (x ≥ viewport) and
   *      stay `loading="lazy"` with naturalWidth=0. They are intentionally
   *      deferred, not broken, so we exclude anything horizontally off-screen.
   *
   * NO tolerance: with lazy-loading handled robustly, "no image should be
   * broken" is a HARD bar — any on-screen content image (≥ 40px, so we skip
   * tracking pixels/spacers) that fails to load fails the check by name.
   */
  async expectAllImagesLoaded(): Promise<{ visible: number; loaded: number }> {
    // Force lazy images to load and wait for them to settle.
    await settleImages(this.page);

    const collect = () => this.page.evaluate(() => {
      const vw = window.innerWidth;
      return Array.from(document.querySelectorAll<HTMLImageElement>('img[src]'))
        .filter(img => {
          const r = img.getBoundingClientRect();
          if (r.width < 40 || r.height < 40) return false;        // tracking pixel / icon / spacer
          if (r.right <= 0 || r.left >= vw) return false;         // carousel deferred slide (off-screen X)
          return true;
        })
        .map(img => ({
          src: img.currentSrc || img.src,
          alt: img.alt || '(no alt)',
          loaded: img.complete && img.naturalWidth > 0,
        }));
    });

    // Final short re-poll as a last guard after the settle.
    let results = await collect();
    let broken = results.filter(r => !r.loaded);
    for (let attempt = 0; attempt < 4 && broken.length > 0; attempt++) {
      await this.page.waitForTimeout(500);
      results = await collect();
      broken = results.filter(r => !r.loaded);
    }

    if (broken.length > 0) {
      // Single line (the reporter keeps only the first line) — name the offenders.
      const offenders = broken
        .slice(0, 6)
        .map(b => `"${b.alt}" …${b.src.slice(-44)}`)
        .join(' · ');
      const more = broken.length > 6 ? ` (+${broken.length - 6} more)` : '';
      throw new Error(
        `${broken.length} of ${results.length} on-screen content images failed to load: ${offenders}${more}`,
      );
    }
    return { visible: results.length, loaded: results.length - broken.length };
  }

  // ── V2 handoff validation ─────────────────────────────────────────────

  /**
   * Validate a Rent CTA href against the client's checkout-handoff contract.
   *   • Safeguard (default) → /step-four?unit_id=<positive int>
   *   • Mini Mall           → /yardi/start?unit=<positive int>&type=rent
   * Passing no client falls back to the Safeguard contract (existing callers).
   */
  static validateRentNowUrl(href: string, client?: string) {
    const handoff = getRentHandoff(client);
    const url = new URL(href);
    expect(url.pathname, `Rent handoff path should match ${handoff.label}`).toMatch(handoff.pathPattern);
    const unitId = url.searchParams.get(handoff.unitParam);
    expect(unitId, `"${handoff.unitParam}" missing from Rent URL (${handoff.label})`).toBeTruthy();
    expect(Number(unitId), `"${handoff.unitParam}" should be a positive number`).toBeGreaterThan(0);
    if (handoff.requireType) {
      expect(url.searchParams.get('type'), `Rent URL should carry ?type=${handoff.requireType}`).toBe(handoff.requireType);
    }
  }
}
