import { Page } from '@playwright/test';

/**
 * Shared types for Helix v4 section detectors.
 *
 * Each section detector returns a SectionResult — a structured record that
 * tests can assert against AND the reporter can render. This keeps the
 * "what did we find on the page" data independent from the "did it pass"
 * judgement, so failures show *why* (e.g. "found 0 amenities; expected ≥ 1")
 * rather than just a stack trace.
 */

export interface SectionCheck {
  /** Short label for this sub-check, e.g. "has at least one slide indicator". */
  name: string;
  /** True if the sub-check passed. */
  passed: boolean;
  /** Optional human-readable extra info — actual value, why it failed, etc. */
  detail?: string;
}

export interface SectionResult {
  /** Stable section ID matching `configs/sections.ts`. */
  sectionId: string;
  /** Facility identifier the section was inspected on. */
  facilityId: string;
  /** Friendly facility name (for log lines and reports). */
  facilityName: string;
  /** URL inspected. */
  url: string;
  /** True when the section was found at all (regardless of sub-check outcomes). */
  present: boolean;
  /** Granular sub-checks. */
  checks: SectionCheck[];
  /** Structured data extracted from the section — e.g. unit price ranges, slide count. */
  data?: Record<string, unknown>;
  /** Wall-clock duration in ms. */
  durationMs: number;
  /** Any uncaught errors during detection (logged, not thrown). */
  errors?: string[];
}

/**
 * Contract every section detector implements. Detectors should be pure
 * inspectors: navigate is done by the caller, they only look at the page.
 */
export interface ISectionDetector {
  readonly id: string;
  readonly label: string;
  verify(page: Page, ctx: SectionContext): Promise<SectionResult>;
}

export interface SectionContext {
  facilityId: string;
  facilityName: string;
  url: string;
  /**
   * Brand slug (e.g. "safeguard", "minimall"). Detectors resolve per-client
   * expectations via getClientProfile(ctx.client) — nav layout, amenities
   * heading, rent handoff, etc. Unknown/empty falls back to the Safeguard
   * baseline, so existing single-client behavior is preserved.
   */
  client: string;
}

/** Roll all sub-checks up into a pass/fail. */
export function sectionPassed(r: SectionResult): boolean {
  return r.present && r.checks.every(c => c.passed) && (r.errors == null || r.errors.length === 0);
}

/** Convenience constructor for a single check. */
export function check(name: string, passed: boolean, detail?: string): SectionCheck {
  return { name, passed, detail };
}

/**
 * Force lazy-loaded images to fetch, then wait for them to settle.
 *
 * Every Helix v4 image (unit cards, hero carousel strips, gallery) ships
 * `loading="lazy"`, so anything below the fold — or a horizontally-clipped
 * carousel slide — reports naturalWidth=0 until it scrolls into view. Measuring
 * "is this image broken?" before the lazy fetch completes produces FALSE
 * positives (observed: Safeguard Bridgeport flagged 5 unit cards + 1 hero as
 * "broken" that load perfectly once scrolled to). This scrolls every image into
 * view to trigger the fetch, flips lazy→eager as a belt-and-braces nudge,
 * returns to the top, then polls (Node-side, hard-capped) until the images that
 * occupy real layout space finish loading. A genuinely broken image never
 * resolves, so a subsequent naturalWidth===0 assertion still catches it.
 */
export async function settleImages(page: Page, opts: { maxWaitMs?: number } = {}): Promise<void> {
  const maxWaitMs = opts.maxWaitMs ?? 6000;
  await page.evaluate(async () => {
    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
    for (const im of Array.from(document.querySelectorAll('img'))) {
      try { im.scrollIntoView({ block: 'center' }); } catch { /* detached node */ }
      if (im.getAttribute('loading') === 'lazy') im.setAttribute('loading', 'eager');
      await sleep(8);
    }
    window.scrollTo(0, 0);
  });
  const deadline = Date.now() + maxWaitMs;
  for (;;) {
    const pending = await page.evaluate(() =>
      Array.from(document.querySelectorAll('img')).filter(im => {
        const r = im.getBoundingClientRect();
        // Only wait on images big enough to be real content — skip 0-size /
        // icon-sized tracking pixels that may never resolve.
        return r.width >= 40 && r.height >= 40 && !(im.complete && im.naturalWidth > 0);
      }).length,
    );
    if (pending === 0 || Date.now() > deadline) return;
    await page.waitForTimeout(400);
  }
}
