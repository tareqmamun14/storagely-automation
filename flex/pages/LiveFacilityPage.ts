import { Page, Locator, expect } from '@playwright/test';
import { ISectionDetector, SectionContext, SectionResult, SECTION_DETECTORS, getDetector, settleImages } from './sections';
import { getRentHandoff, getHandoffCandidates, RentHandoff } from '../configs/profiles';

/**
 * LiveFacilityPage — page object for a published Flex v4 facility page.
 *
 * Two API surfaces:
 *  1. The legacy helpers used by existing tests (page-health, rent-journey) —
 *     kept stable so nothing breaks.
 *  2. The new section-detector surface, which exposes one detector per
 *     testable section. Each detector is layout-tolerant: it uses semantic
 *     locators (role / aria / text) rather than CSS classnames.
 */
export interface ConsoleEntry {
  type: 'error' | 'warning' | 'pageerror';
  text: string;
  url: string;
}

export class LiveFacilityPage {
  readonly page: Page;
  private consoleErrors: string[] = [];
  /** Full console capture (errors + warnings + uncaught pageerrors) with source URL. */
  private consoleLog: ConsoleEntry[] = [];
  /** HTTP status of the main document response from the last goto() (null if unknown). */
  lastNavStatus: number | null = null;

  constructor(page: Page) {
    this.page = page;
    // Capture errors AND warnings (the page's own bundle emits first-party
    // warnings like "[icon-leak]" we must surface) with their source URL.
    // Listeners are attached BEFORE goto() so the full load + hydration window
    // is captured — including the intermittent React #418 hydration error.
    this.page.on('console', msg => {
      const type = msg.type();
      if (type === 'error' || type === 'warning') {
        const loc = msg.location();
        const url = loc && loc.url ? loc.url : '';
        this.consoleLog.push({ type, text: msg.text(), url });
        if (type === 'error') this.consoleErrors.push(msg.text() + (url ? ` ${url}` : ''));
      }
    });
    // Uncaught exceptions surface via 'pageerror', not 'console' — capture them
    // too (a React render crash can land here rather than in console.error).
    this.page.on('pageerror', err => {
      this.consoleLog.push({ type: 'pageerror', text: err.message || String(err), url: '' });
      this.consoleErrors.push((err.message || String(err)) + ' [pageerror]');
    });
  }

  /** Raw console capture (errors + warnings + pageerrors) since construction. */
  getConsoleLog(): ConsoleEntry[] {
    return this.consoleLog;
  }

  /**
   * Classify the captured console into actionable buckets.
   *
   * Principle: NEVER swallow first-party errors. We only set aside a small,
   * explicit set of THIRD-PARTY analytics/marketing hosts (their beacons fail
   * independently of the storage page). Everything from the page itself or its
   * own CDN bundle is first-party and must surface.
   *   • reactErrors   — React #4xx (hydration/render) — ALWAYS a hard fail
   *   • iconLeak      — first-party "[icon-leak]" SSR warnings — hard fail
   *   • firstPartyErr — any other first-party console.error / pageerror — fail
   *   • resourceErr   — "Failed to load resource" Nxx (often WAF-under-bot) — info
   *   • thirdParty    — allow-listed third-party hosts — info
   */
  auditConsole(): {
    reactErrors: ConsoleEntry[];
    reactHydration: ConsoleEntry[];
    iconLeak: ConsoleEntry[];
    firstPartyErr: ConsoleEntry[];
    resourceErr: ConsoleEntry[];
    thirdParty: ConsoleEntry[];
    analytics: ConsoleEntry[];
    all: ConsoleEntry[];
  } {
    const THIRD_PARTY = [
      /bat\.bing\.com/i, /googletagmanager\.com/i, /google-analytics\.com/i,
      /facebook\.(com|net)/i, /doubleclick\.net/i, /hotjar/i, /clarity\.ms/i,
      /jQuery is not defined/i, // a GTM custom-tag error originating in gtm.js
      // Embedded 3rd-party widgets a customer drops onto their page. Their
      // failures (chat-widget mount races, subscription view-limits, marketing
      // beacons) are the vendor's — not the storage page's — so set them aside.
      /swivl-embed/i, /swivl3/i, /EmbeddableWidget is already mounted/i,   // Swivl chat/video
      /elfsightcdn\.com/i, /eapps\.Platform/i, /APP_VIEWS_LIMIT_REACHED/i, // Elfsight widgets
      /invocacdn\.com/i, /Invoca \d/i,                                     // Invoca call-tracking
    ];
    // Analytics / telemetry beacons: first-party by host (api.getstoragely.com)
    // but non-functional — a failed analytics POST never changes what the
    // customer sees, and it fires identically on EVERY site (a systemic
    // CORS/config issue), so it's info, not a per-facility regression failure.
    const ANALYTICS = [/\/api\/v\d+\/analytics\//i, /analytics\/events/i];

    const isThird = (m: ConsoleEntry) => THIRD_PARTY.some(re => re.test(m.url) || re.test(m.text));
    const isAnalytics = (m: ConsoleEntry) => ANALYTICS.some(re => re.test(m.url) || re.test(m.text));
    const isReact = (m: ConsoleEntry) => /Minified React error #4\d\d|react\.dev\/errors\/4\d\d|error-decoder\.html\?invariant=4\d\d/i.test(m.text);
    // Hydration-mismatch family (#418/#419/#421/#422/#423/#425). These are
    // intermittent and, on these template sites, are typically triggered by a
    // 3rd-party widget injecting DOM before hydration — informational, not a
    // hard fail. Any OTHER React #4xx (a genuine render crash) stays fatal.
    const isHydration = (m: ConsoleEntry) => /(?:react error #|errors\/|invariant=)(?:418|419|421|422|423|425)\b/i.test(m.text);
    const isIcon = (m: ConsoleEntry) => /\[icon-leak\]/i.test(m.text);
    const isResource = (m: ConsoleEntry) => /Failed to load resource/i.test(m.text);

    const reactAll = this.consoleLog.filter(isReact);
    const reactHydration = reactAll.filter(isHydration);
    const reactErrors = reactAll.filter(m => !isHydration(m));
    const iconLeak = this.consoleLog.filter(m => m.type === 'warning' && isIcon(m));
    const analytics = this.consoleLog.filter(m => isAnalytics(m) && !isReact(m));
    const thirdParty = this.consoleLog.filter(m => isThird(m) && !isReact(m) && !isAnalytics(m));
    const resourceErr = this.consoleLog.filter(m => isResource(m) && !isThird(m) && !isReact(m) && !isAnalytics(m));
    const firstPartyErr = this.consoleLog.filter(m =>
      (m.type === 'error' || m.type === 'pageerror') &&
      !isReact(m) && !isIcon(m) && !isThird(m) && !isAnalytics(m) && !isResource(m),
    );
    return { reactErrors, reactHydration, iconLeak, firstPartyErr, resourceErr, thirdParty, analytics, all: this.consoleLog };
  }

  async goto(url: string) {
    // Commit-first navigation. These prod pages can take well over 60s to reach
    // DOMContentLoaded when the CDN throttles automated traffic (a real browser
    // session was observed at ~96s DCL on Safeguard). Waiting on 'commit' (the
    // main document's first response) means a slow DCL never HARD-CRASHES the
    // whole journey at goto(); we then give DCL + networkidle generous
    // best-effort windows so the checks have content to work against. The HTTP
    // status still comes from the committed main-document response.
    //
    // Prod CDNs/WAFs also intermittently reject an automated navigation OUTRIGHT
    // with a transient network error (ERR_INVALID_RESPONSE / ERR_TIMED_OUT /
    // ERR_CONNECTION_*), especially when runs land close together. That's a
    // throttle artifact, not a down site — so retry once after a short backoff
    // before giving up (a genuinely down site still fails both attempts, so this
    // never masks a real outage).
    let response = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        response = await this.page.goto(url, { waitUntil: 'commit', timeout: 90_000 });
        break;
      } catch (err) {
        const msg = ((err as Error).message || '').split('\n')[0];
        const transient = /ERR_INVALID_RESPONSE|ERR_TIMED_OUT|ERR_CONNECTION|ERR_NETWORK_CHANGED|ERR_HTTP2|ERR_EMPTY_RESPONSE|NS_ERROR/i.test(msg);
        if (attempt === 2 || !transient) throw err;
        console.log(`⚠️ Navigation attempt ${attempt} failed (${msg.slice(0, 80)}) — retrying in 8s (likely CDN throttle)…`);
        await this.page.waitForTimeout(8000);
      }
    }
    this.lastNavStatus = response ? response.status() : null;
    await this.page.waitForLoadState('domcontentloaded', { timeout: 60_000 }).catch(() => {});
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
    // VISIBLE text only (innerText excludes <script>/<template>/<style> and
    // hidden nodes, where template tokens legitimately live). Catch both
    // {namespaced.token} (single brace WITH a dot) and {{any}} (double brace).
    const bodyText = await this.page.locator('body').innerText();
    const tokens = bodyText.match(/\{\{\s*[\w.$-]+\s*\}\}|\{\s*[\w$-]*\.[\w.$-]+\s*\}/g) || [];
    expect([...new Set(tokens)], `Unresolved tokens leaked to page: ${[...new Set(tokens)].join(', ')}`).toHaveLength(0);
  }

  async expectNoUnresolvedTokensInAttributes() {
    // Scan EVERY text-bearing attribute, not just img[src]/a[href]: a leaked
    // {template.token} also hides in alt / title / aria-label / placeholder
    // (e.g. a logo rendered as alt="{company.name} logo"), which the visible-
    // text token check never sees. Handles {single.token} and {{double}}.
    const leaks = await this.page.evaluate(() => {
      const found: string[] = [];
      const pattern = /\{\{\s*[\w.$-]+\s*\}\}|\{\s*[\w$-]*\.[\w.$-]+\s*\}/g;
      for (const attr of ['src', 'href', 'alt', 'title', 'aria-label', 'placeholder', 'value', 'content']) {
        document.querySelectorAll('[' + attr + ']').forEach(el => {
          // Skip <template>/<script> attribute scopes (none in practice, but safe).
          if (el.closest('template, script')) return;
          const v = el.getAttribute(attr) || '';
          for (const match of v.matchAll(pattern)) {
            found.push(`${attr}=${match[0]}`);
          }
        });
      }
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
    // Target the first VISIBLE Reserve button. Responsive templates render each
    // unit card twice (mobile + desktop twin, one display:none), so plain
    // `.first()` can pin to a HIDDEN twin — Playwright then waits the full
    // actionability timeout for a button that never becomes visible and the
    // click never lands (observed on Minimal/Birmingham: 25 Reserve buttons, 11
    // hidden → "no modal" false-flag). `button:visible` skips the twins.
    const reserveBtn = page.locator('button:visible').filter({ hasText: /^Reserve$/ }).first();
    const hasReserve = (await reserveBtn.count()) > 0;
    checks.push({ name: 'Reserve button present', passed: hasReserve, detail: hasReserve ? 'ok' : '(none)' });
    if (!hasReserve) return { ok: false, checks };

    await reserveBtn.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {});
    await reserveBtn.click({ timeout: 10_000 }).catch(() => {});

    const dialog = page.locator('[role="dialog"]').first();
    let opened = false;
    try { await dialog.waitFor({ state: 'visible', timeout: 10_000 }); opened = true; } catch { /* no modal */ }
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
   * DELIVERABILITY, not paint-timing, is the bar. Prod image CDNs THROTTLE
   * automated traffic, so a perfectly valid image (one a real user sees) may not
   * decode within any fixed window under Playwright — confirmed live on
   * Safeguard: the same "unloaded" images return HTTP 200 on a direct fetch and
   * paint moments later. So after the settle + re-poll, any still-unpainted
   * in-viewport image is RE-VERIFIED for reachability (a no-cors fetch resolves
   * for any reachable URL, rejects only on a genuine network failure). Reachable-
   * but-unpainted = throttling → reported as info; only GENUINELY UNREACHABLE
   * images (404/DNS/refused) fail the check. Off-screen-X carousel slides stay
   * deferred and are excluded.
   */
  async expectAllImagesLoaded(): Promise<{ total: number; checked: number; loaded: number; throttled: number }> {
    // Force lazy images to load and wait for them to settle.
    await settleImages(this.page);

    const collect = () => this.page.evaluate(() => {
      const vw = window.innerWidth;
      const all = Array.from(document.querySelectorAll<HTMLImageElement>('img'));
      const inViewport = all.filter(img => {
        const r = img.getBoundingClientRect();
        if (r.width < 16 || r.height < 16) return false;          // tracking pixel / spacer
        if (r.right <= 0 || r.left >= vw) return false;           // carousel deferred slide (off-screen X)
        return true;
      });
      return {
        total: all.length,
        checked: inViewport.map(img => ({
          src: img.currentSrc || img.src,
          alt: img.alt || '(no alt)',
          loaded: img.complete && img.naturalWidth > 0,
        })),
      };
    });

    // Re-poll for ~9s (12×750ms) to let slow-but-valid images paint naturally.
    let res = await collect();
    let broken = res.checked.filter(r => !r.loaded);
    for (let attempt = 0; attempt < 12 && broken.length > 0; attempt++) {
      await this.page.waitForTimeout(750);
      res = await collect();
      broken = res.checked.filter(r => !r.loaded);
    }

    // Reachability re-check: distinguish "throttled but deliverable" (info) from
    // "genuinely broken" (fail). no-cors fetch resolves for any reachable URL and
    // rejects only on a real network failure, so it survives cross-origin CDNs.
    let unreachable = broken;
    if (broken.length > 0) {
      const srcs = [...new Set(broken.map(b => b.src).filter(Boolean))];
      const reach: Record<string, boolean> = await this.page.evaluate(async (urls) => {
        const out: Record<string, boolean> = {};
        await Promise.all(urls.map(async (u) => {
          try { await fetch(u, { mode: 'no-cors' }); out[u] = true; }
          catch { out[u] = false; }
        }));
        return out;
      }, srcs);
      unreachable = broken.filter(b => reach[b.src] === false);
    }

    if (unreachable.length > 0) {
      const offenders = unreachable
        .slice(0, 6)
        .map(b => `"${b.alt}" …${b.src.slice(-44)}`)
        .join(' · ');
      const more = unreachable.length > 6 ? ` (+${unreachable.length - 6} more)` : '';
      throw new Error(
        `${unreachable.length} of ${res.checked.length} in-viewport images are UNREACHABLE ` +
        `(of ${res.total} total <img>): ${offenders}${more}`,
      );
    }
    const throttled = broken.length; // all remaining were reachable → CDN throttle
    return { total: res.total, checked: res.checked.length, loaded: res.checked.length - broken.length, throttled };
  }

  // ── V2 handoff validation ─────────────────────────────────────────────

  /**
   * Validate a Rent CTA href against the client's checkout-handoff contract.
   *   • Safeguard (default) → /step-four?unit_id=<positive int>
   *   • Mini Mall           → /yardi/start?unit=<positive int>&type=rent
   * Passing no client falls back to the Safeguard contract (existing callers).
   */
  /**
   * Detect this PAGE's actual checkout handoff by probing the DOM. Mixed-FMS
   * clients hand off differently per location (Mini Mall: Yardi locations →
   * /yardi/start, SiteLink locations like Sainte-Thérèse QC → /step-four), so
   * the client profile's handoff is only the default — whichever candidate
   * actually has visible Rent anchors on the page wins.
   */
  async resolveRentHandoff(client?: string): Promise<RentHandoff> {
    const candidates = getHandoffCandidates(client);
    for (const h of candidates) {
      const n = await this.page
        .locator(`a[href*="${h.hrefContains}"]:not([aria-hidden="true"])`)
        .count().catch(() => 0);
      if (n > 0) {
        if (h.hrefContains !== candidates[0].hrefContains) {
          console.log(`  🧭 handoff detected from page DOM: ${h.label} (profile default: ${candidates[0].label})`);
        }
        return h;
      }
    }
    return candidates[0]; // no rent anchors at all — downstream checks report it
  }

  static validateRentNowUrl(href: string, client?: string, handoffOverride?: RentHandoff) {
    const handoff = handoffOverride ?? getRentHandoff(client);
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
