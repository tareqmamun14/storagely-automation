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
