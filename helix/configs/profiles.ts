/**
 * Per-client Helix profiles.
 *
 * Helix is becoming multi-client. The section detectors are layout-tolerant
 * (semantic locators, no CSS hashes), but a few EXPECTATIONS legitimately
 * differ between clients' published templates:
 *
 *   • Safeguard's top nav has a Blog link + a Contact dropdown.
 *     Mini Mall's does not (Blog lives in the footer; menus are
 *     Find Storage / Resources / About / My Account).
 *   • Safeguard titles its features block "Amenities".
 *     Mini Mall titles it "Facility Features".
 *   • The Rent CTA hands off to different checkouts:
 *       Safeguard → V2 SPC      (link text "Rent Now" → /step-four?unit_id)
 *       Mini Mall → Yardi v2    (link text "Rent"     → /yardi/start?…unit=…&type=rent)
 *
 * Rather than branch on the client inside every detector, each detector reads
 * the relevant slice of its client's profile via getClientProfile(ctx.client).
 * Unknown clients fall back to DEFAULT_PROFILE, which preserves the original
 * Safeguard behavior — so onboarding Mini Mall changes nothing for Safeguard.
 */

/** How a facility's Rent CTA hands off to its checkout. */
export interface RentHandoff {
  /** Human label for reports, e.g. "V2 SPC /step-four" | "Yardi v2 /yardi/start". */
  label: string;
  /** Matches the Rent link's visible/inner text (NOT the Reserve button). */
  rentLinkText: RegExp;
  /** The handoff URL's pathname must match this. */
  pathPattern: RegExp;
  /** Query param that carries the unit id on the handoff URL. */
  unitParam: string;
  /** If set, the handoff URL must carry ?type=<value> (e.g. "rent"). */
  requireType?: string;
  /** Substring for locating the clickable Rent anchor by href (a[href*=…]). */
  hrefContains: string;
  /**
   * true  → drive the on-page V2 SPC form to submit (Safeguard).
   * false → drive the Yardi v2 checkout instead (Mini Mall): fill tenant
   *         details → manual captcha → Continue → fetch the rent result/error.
   */
  drivesSpcForm: boolean;
  /** true → the checkout is gated by a manual hCaptcha (test timeout removed). */
  manualCaptcha: boolean;
}

/** Nav expectations that differ by client template. */
export interface NavProfile {
  /** Minimum visible top-nav items. */
  minItems: number;
  /** Safeguard ships a Blog link in the top nav; Mini Mall does not. */
  expectBlogLink: boolean;
  /** Safeguard ships a Contact dropdown revealing Inquiry / Contact-Us; Mini Mall does not. */
  expectContactDropdown: boolean;
  /** Both ship a My Account / tenant-portal item (link or dropdown button). */
  expectMyAccount: boolean;
  /**
   * Menu dropdown triggers to exercise (open → expect ≥1 revealed link →
   * collapse with Escape). Used when the client has menu dropdowns other than
   * Contact. Empty = don't exercise any dropdown.
   */
  dropdownTriggers: RegExp[];
  /**
   * Header action CTAs to assert are present (e.g. Pay Online / Rent Unit /
   * Call Us). Empty = none to assert.
   */
  actionCtas: RegExp[];
}

export interface ClientProfile {
  client: string;
  /** Heading that anchors the amenities / features block. */
  amenitiesHeading: RegExp;
  nav: NavProfile;
  rentHandoff: RentHandoff;
  /**
   * Console-error messages to treat as benign for this client (in addition to
   * the always-ignored favicon/analytics/gtm noise). Keeps "no false flags":
   * e.g. Mini Mall's Atlas JSON 403s + a React #418 hydration warning are
   * harness/CDN artifacts, not user-facing regressions.
   */
  consoleAllowlist: RegExp[];
}

/**
 * Console noise common to EVERY Helix V4 site under automation — observed on
 * both Safeguard and Mini Mall, so it lives at the shared default level:
 *   • Atlas JSON endpoints (location / faqs / reviews) return 403 from the
 *     static CDN/WAF for the automation browser. The page renders fine without
 *     them (they only hydrate reviews/FAQ extras), so this is a harness/CDN
 *     artifact, not a user-facing regression.
 *   • a React #418 hydration warning emitted by the V4 build.
 * These never indicate a real break, so allow-listing them keeps "no false
 * flags" without masking genuine errors (anything else still fails the check).
 */
// NOTE: console classification now lives in LiveFacilityPage.auditConsole(),
// which NEVER allow-lists first-party errors (React #4xx + [icon-leak] hard-fail)
// and only sets aside specific THIRD-PARTY analytics hosts. This list is kept
// only for the (now-unused) ClientProfile.consoleAllowlist field; it must NOT
// contain first-party patterns (no React #418, no first-party API errors) so it
// can never be re-wired to swallow a real bug.
const HELIX_CONSOLE_ALLOWLIST: RegExp[] = [
  // Third-party marketing/analytics beacons only (fail independently of the page).
  /bat\.bing\.com/i,
  /facebook\.com\/tr/i,
  /googletagmanager\.com|google-analytics\.com/i,
];

/**
 * Safeguard = the original baseline. Unknown clients inherit this, so the
 * pre-multi-client behavior is preserved exactly.
 */
export const DEFAULT_PROFILE: ClientProfile = {
  client: 'default',
  amenitiesHeading: /amenit(y|ies)/i,
  nav: {
    minItems: 3,
    expectBlogLink: true,
    expectContactDropdown: true,
    expectMyAccount: true,
    dropdownTriggers: [],
    actionCtas: [],
  },
  rentHandoff: {
    label: 'V2 SPC /step-four',
    rentLinkText: /rent now/i,
    pathPattern: /\/step-four/,
    unitParam: 'unit_id',
    hrefContains: '/step-four',
    drivesSpcForm: true,
    manualCaptcha: false,
  },
  consoleAllowlist: HELIX_CONSOLE_ALLOWLIST,
};

const PROFILES: Record<string, ClientProfile> = {
  safeguard: { ...DEFAULT_PROFILE, client: 'safeguard' },

  minimall: {
    client: 'minimall',
    // Mini Mall titles the features block "Facility Features".
    amenitiesHeading: /facility features|amenit(y|ies)/i,
    nav: {
      minItems: 3,
      expectBlogLink: false,        // Blog lives in the footer, not the top nav
      expectContactDropdown: false, // no Contact dropdown
      expectMyAccount: true,        // present as a dropdown BUTTON, not a direct link
      dropdownTriggers: [/^find storage$/i, /^getting started$/i, /^resources$/i, /^about$/i],
      actionCtas: [/pay online/i, /rent unit/i, /call us/i],
    },
    rentHandoff: {
      label: 'Yardi v2 /yardi/start',
      rentLinkText: /^rent\b/i,     // link reads "Rent" (Reserve is a separate button)
      pathPattern: /\/yardi\/start/,
      unitParam: 'unit',
      requireType: 'rent',
      hrefContains: '/yardi/start',
      drivesSpcForm: false,         // drive the Yardi v2 checkout (manual captcha)
      manualCaptcha: true,
    },
    // Same Helix-wide console artifacts as the baseline (the reviews-API 403 is
    // why ReviewsSection treats empty review bodies as info, not a failure).
    consoleAllowlist: HELIX_CONSOLE_ALLOWLIST,
  },
};

/** Resolve a client's profile. Unknown / undefined clients inherit DEFAULT_PROFILE. */
export function getClientProfile(client: string | undefined): ClientProfile {
  if (!client) return DEFAULT_PROFILE;
  return PROFILES[client] || DEFAULT_PROFILE;
}

/** Resolve just the rent-handoff contract for a client. */
export function getRentHandoff(client: string | undefined): RentHandoff {
  return getClientProfile(client).rentHandoff;
}
