/**
 * Flex v4 facility registry.
 *
 * Every facility tested by the live + e2e specs is parameterized from this list.
 * Adding a new client/facility is a one-line change here — all section specs
 * (nav, header, FAQ, carousel, amenities, units, gallery, footer) and the
 * end-to-end rent journey auto-pick it up.
 *
 * NOTHING in this file should be facility-specific beyond the URL + the
 * minimal identity patterns (heading regex / title regex) used to confirm the
 * page actually rendered for the right client. Section detectors live in
 * `flex/pages/sections/` and use semantic locators, not facility-specific text.
 */
/**
 * Which deployment a facility lives on.
 *  - 'production' — the real customer-facing domain (e.g. www.safeguardit.com).
 *    Flex post-release regression runs against these, same as V1/V2 prod runs.
 *  - 'test'       — the Flex test/stage domain (*.test.getstoragely.com).
 */
import { getLocationPool, sampleSize, samplePool } from './locationPool';

export type FlexEnv = 'production' | 'test';

export interface FlexFacility {
  id: string;
  name: string;
  client: string;          // brand slug — e.g. "safeguard"
  env: FlexEnv;           // production (real domain) vs test (stage domain)
  url: string;
  /** Title pattern used to confirm correct page loaded. Layout-tolerant. */
  expectedTitle: RegExp;
  /** Facility heading pattern (the big H3 / H1 the user sees in the header). */
  expectedHeading: RegExp;
  /** Optional toggles — used by tests to skip checks when a section is intentionally absent. */
  features?: {
    hasUnits?: boolean;
    hasReviews?: boolean;
    hasAmenities?: boolean;
    hasFaq?: boolean;
    hasCarousel?: boolean;
    hasGallery?: boolean;
    hasFooter?: boolean;
    hasNav?: boolean;
    hasHeader?: boolean;
    // Mini Mall template sections (absent on the Safeguard baseline).
    hasFilters?: boolean;
    hasPromo?: boolean;
    hasUhaul?: boolean;
    hasSeo?: boolean;
  };
}

/**
 * Baseline feature set (the Safeguard template). Ships the shared sections;
 * the Mini-Mall-only sections are OFF here so baseline facilities skip them
 * cleanly. Custom ad-hoc URLs inherit this conservative set too.
 */
const ALL_FEATURES = {
  hasUnits: true, hasAmenities: true, hasFaq: true, hasCarousel: true,
  hasGallery: true, hasFooter: true, hasNav: true, hasHeader: true,
  // Mini-Mall-only sections — off on the baseline.
  hasReviews: false, hasFilters: false, hasPromo: false, hasUhaul: false, hasSeo: false,
} as const;

/**
 * Mini Mall feature set — the baseline shared sections PLUS the Mini-Mall
 * template's own sections (filter sidebar, promo strip, U-Haul block, customer
 * reviews, SEO copy).
 */
const MINIMALL_FEATURES = {
  ...ALL_FEATURES,
  hasReviews: true, hasFilters: true, hasPromo: true, hasUhaul: true, hasSeo: true,
} as const;

/**
 * Flex-built sites. Add new clients/locations here — every live + section spec
 * and the end-to-end rent journey auto-run against each one.
 *
 * `env` decides which deployment a facility belongs to:
 *   - 'production' → real customer domain; runs in the prod post-release regression.
 *   - 'test'       → *.test.getstoragely.com stage domain; runs in the test pass.
 * The control-panel Prod/Test toggle (and `FLEX_ENV`) filters this list.
 *
 * Flex is the launch pipeline going forward: as customers migrate, add one
 * row each. The page template is identical across clients — only the data
 * differs — so the generic section detectors apply to every facility unchanged.
 *
 * Keep features explicit so empty-state facilities can skip checks cleanly.
 */
export const FACILITIES: FlexFacility[] = [
  // ── PRODUCTION (real customer domains) ──────────────────────────────────
  {
    id: 'safeguard-bridgeport-west-end',
    name: 'Safeguard — Bridgeport, CT (West End / West Side)',
    client: 'safeguard',
    env: 'production',
    url: 'https://www.safeguardit.com/storage-units/connecticut/bridgeport/west-end-west-side',
    expectedTitle: /self storage.*bridgeport|bridgeport.*storage|safeguard/i,
    expectedHeading: /safeguard.*self storage|west end|west side|bridgeport/i,
    features: { ...ALL_FEATURES },
  },

  // Mini Mall — the biggest client; its Flex listing page reuses the V4
  // template but with the Mini Mall layout (filter sidebar, promo strip,
  // U-Haul block, customer reviews, SEO copy) and a Yardi v2 checkout handoff
  // (/yardi/start). The 32 launch sites share this exact layout — add one row
  // each (same MINIMALL_FEATURES, only url + expected text differ).
  {
    id: 'minimall-carroll-columbus-lancaster',
    name: 'Mini Mall — Carroll, OH (Columbus-Lancaster Road)',
    client: 'minimall',
    env: 'production',
    url: 'https://minimallstorage.com/storage-units/ohio/carroll/columbus-lancaster-road',
    expectedTitle: /self storage|lancaster|mini mall/i,
    expectedHeading: /self storage units carroll|mini mall storage|columbus-lancaster/i,
    features: { ...MINIMALL_FEATURES },
  },
  // Second Minimal location — a DIFFERENT state/market so cross-location
  // structural differences (unit mix, promo presence, hours) are exercised.
  {
    id: 'minimall-birmingham-richard-arrington',
    name: 'Mini Mall — Birmingham, AL (Richard Arrington Jr Blvd)',
    client: 'minimall',
    env: 'production',
    url: 'https://minimallstorage.com/storage-units/alabama/birmingham/richard-arrington-jr-blvd',
    expectedTitle: /self storage|birmingham|mini mall/i,
    expectedHeading: /self storage units birmingham|mini mall storage|richard.arrington/i,
    features: { ...MINIMALL_FEATURES },
  },
  // Storage Star — migrated to Flex on PRODUCTION. Standard (Safeguard-baseline)
  // template: flat unit grid, "Amenities", SPC /step-four checkout. It DOES ship
  // the bottom long-form SEO copy block, so hasSeo is on (the other Mini-Mall-only
  // sections stay off). Legacy V1/SPC still covers Storage Star on STAGE; this row
  // is the prod Flex coverage. Client 'storagestar' → standard profile with two
  // nav relaxations (no blog link, Contact is a link not a dropdown) — see profiles.ts.
  {
    id: 'storagestar-marco-island-elkcam',
    name: 'Storage Star — Marco Island, FL (E Elkcam Circle)',
    client: 'storagestar',
    env: 'production',
    url: 'https://www.storagestar.com/storage-units/florida/marco-island/east-elkcam-circle',
    expectedTitle: /self storage.*marco island|marco island.*storage|storage star/i,
    expectedHeading: /storage star|elkcam|marco island/i,
    features: { ...ALL_FEATURES, hasSeo: true },
  },

  // TODO(minimall): when a Mini Mall Flex staging mirror is available, add the
  // matching { …, env: 'test', url: 'https://…' } row here so FLEX_ENV=test
  // exercises the same suite pre-production.

  // ── TEST / STAGE (*.test.getstoragely.com) ──────────────────────────────
  {
    id: 'safeguard-seffner-kingsway',
    name: 'Safeguard — Seffner, FL (Kingsway Road)',
    client: 'safeguard',
    env: 'test',
    url: 'https://safeguard.test.getstoragely.com/storage-units/florida/seffner/kingsway-road',
    expectedTitle: /self storage.*seffner|seffner.*storage|safeguard/i,
    expectedHeading: /safeguard.*self storage|kingsway/i,
    features: { ...ALL_FEATURES },
  },
  {
    id: 'safeguard-bridgeview-harlem',
    name: 'Safeguard — Bridgeview, IL (Harlem Ave)',
    client: 'safeguard',
    env: 'test',
    url: 'https://safeguard.test.getstoragely.com/storage-units/illinois/bridgeview/harlem-avenue',
    expectedTitle: /self storage.*bridgeview|bridgeview.*storage/i,
    expectedHeading: /safeguard.*self storage|harlem/i,
    features: { ...ALL_FEATURES },
  },
];

/**
 * Resolve the currently selected Flex environment.
 *
 * FLEX_ENV accepts production aliases (production / prod) and test aliases
 * (test / stage / staging). Default is PRODUCTION, because the headline use of
 * the Flex suite is prod post-release regression — same as the V1/V2 prod runs.
 */
export function getSelectedFlexEnv(): FlexEnv {
  const v = (process.env.FLEX_ENV || '').trim().toLowerCase();
  if (v === 'test' || v === 'stage' || v === 'staging') return 'test';
  return 'production';
}

/**
 * Resolve the facility list at runtime, honoring optional env-var overrides.
 *
 * - FLEX_ENV — 'production' (default) | 'test'. Restricts to facilities on the
 *     matching deployment. The control-panel Prod/Test toggle drives this.
 * - FLEX_CLIENT — comma-separated client slugs (e.g. "safeguard" | "minimall")
 *     to run ONE client's suite independently. This is how the control panel
 *     runs "Safeguard suite" vs "Minimal suite" separately. Empty = all clients.
 * - FLEX_FACILITY_FILTER — comma-separated facility IDs to restrict the run to
 *     (within the selected env). Empty / unset = every facility in that env.
 * - FLEX_CUSTOM_URL — comma-separated ON-DEMAND URLs (the control panel's
 *     "Custom URL" field). Each becomes an ad-hoc facility, with its client
 *     auto-detected from the host (a minimallstorage.com URL → the Mini Mall
 *     profile + sections, so the SAME tests run). When a custom URL is given we
 *     run ONLY those URLs — "test exactly what I pasted" — not the registry.
 */
export function getAllFacilities(): FlexFacility[] {
  const env = getSelectedFlexEnv();
  const filter = (process.env.FLEX_FACILITY_FILTER || '').split(',').map(s => s.trim()).filter(Boolean);

  const customRaw = process.env.FLEX_CUSTOM_URL || '';
  if (customRaw.trim()) {
    // On-demand mode: run ONLY the pasted URL(s), each resolved to its client.
    return customRaw
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .map((url, i) => {
        const client = clientForUrl(url);
        return {
          id: `custom-${i + 1}-${slugForUrl(url)}`,
          name: `Custom — ${labelForUrl(url)}`,
          client,
          env,
          url,
          expectedTitle: /.+/,         // any non-empty title — we don't know what to expect
          expectedHeading: /.+/,       // any non-empty heading
          features: { ...featuresForClient(client) },
        };
      });
  }

  const clients = (process.env.FLEX_CLIENT || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

  // ── Random location sampling (opt-in via FLEX_SAMPLE; prod-only) ──────────
  // Widen coverage by running RANDOM locations from each selected client's pool
  // instead of the single pinned registry URL. DISABLED whenever the run pins
  // locations (a FLEX_FACILITY_FILTER, or FLEX_CUSTOM_URL handled above) so an
  // investigation/retry always hits the same page. Picks are made ONCE here and
  // reused for the whole run, so Playwright retries never re-sample.
  const pinned = filter.length > 0;
  const n = sampleSize(pinned);
  if (n != null && env === 'production') {
    const selectedClients = clients.length ? clients : getClients().map(c => c.toLowerCase());
    const sampled: FlexFacility[] = [];
    const picked: string[] = [];
    for (const client of selectedClients) {
      const pool = getLocationPool(client);
      if (pool.length === 0) {
        // No pool for this client → fall back to its registry facilities.
        sampled.push(...FACILITIES.filter(f => f.env === env && f.client.toLowerCase() === client));
        continue;
      }
      samplePool(pool, n).forEach((url, i) => {
        const c = clientForUrl(url);
        sampled.push({
          id: `sample-${client}-${i + 1}-${slugForUrl(url)}`,
          name: `Sample — ${labelForUrl(url)}`,
          client: c, env, url,
          expectedTitle: /.+/, expectedHeading: /.+/,
          features: { ...featuresForClient(c) },
        });
        picked.push(url);
      });
    }
    if (sampled.length) {
      console.log(`\n  🎲 FLEX_SAMPLE=random:${n} — sampling ${sampled.length} location(s) this run:\n    ${picked.join('\n    ')}\n    (reproduce a finding by pinning FLEX_CUSTOM_URL=<url>)\n`);
      return sampled;
    }
  }

  let base = FACILITIES.filter(f => f.env === env);
  if (clients.length > 0) base = base.filter(f => clients.includes(f.client.toLowerCase()));
  if (filter.length > 0) base = base.filter(f => filter.includes(f.id));
  return base;
}

/** Distinct client slugs in the registry (for the control panel's per-client suites). */
export function getClients(): string[] {
  return [...new Set(FACILITIES.map(f => f.client))];
}

export function getFacility(id: string): FlexFacility {
  const f = getAllFacilities().find(fac => fac.id === id);
  if (!f) throw new Error(`Facility not found: ${id}. Available: ${getAllFacilities().map(fac => fac.id).join(', ')}`);
  return f;
}

// ── Helpers (URL-derived metadata for custom URLs) ──

function hostBrand(url: string): string {
  try { return new URL(url).hostname.split('.')[0] || 'custom'; }
  catch { return 'custom'; }
}

/**
 * Map a custom/on-demand URL to its client slug so getClientProfile() resolves
 * the right profile (nav layout, rent handoff, etc.). Mini Mall + Safeguard are
 * detected by host; anything else falls back to the host brand token (which
 * getClientProfile treats as the Safeguard-baseline default).
 */
export function clientForUrl(url: string): string {
  let host = '';
  try { host = new URL(url).hostname.toLowerCase(); } catch { return 'default'; }
  if (host.includes('minimallstorage') || host.includes('mini-mall')) return 'minimall';
  if (host.includes('safeguard')) return 'safeguard';
  if (host.includes('storagestar')) return 'storagestar';
  return hostBrand(url);
}

// ── Template detection (future-proofing) ────────────────────────────────────
// Two Flex location-page TEMPLATES exist today:
//   • 'standard' — the Safeguard template. The DEFAULT and the one most future
//                  clients ship with (flat unit grid, no filter sidebar).
//   • 'minimall' — Minimal's UNIQUE template (filter sidebar, promo strip,
//                  U-Haul block, reviews, SEO copy, grouped/featured carousels).
// When onboarding a NEW client: give a facility URL to detectTemplate(). Known
// hosts map directly; anything ELSE defaults to 'standard' (Safeguard) — so a
// brand-new client inherits the reusable Safeguard groups with zero config, and
// you only add a bespoke profile/feature-set if it turns out to differ.
export type TemplateId = 'standard' | 'minimall';

export function templateForClient(client: string | undefined): TemplateId {
  return (client || '').toLowerCase() === 'minimall' ? 'minimall' : 'standard';
}

/** Fingerprint a facility URL → its template + client slug + feature set. */
export function detectTemplate(url: string): { client: string; template: TemplateId; features: typeof ALL_FEATURES | typeof MINIMALL_FEATURES } {
  const client = clientForUrl(url);
  const template = templateForClient(client);
  return { client, template, features: template === 'minimall' ? MINIMALL_FEATURES : ALL_FEATURES };
}

/** Feature set for a custom/sampled URL's client. Mini Mall gets its extra
 *  sections; Storage Star is the standard template PLUS the SEO copy block. */
function featuresForClient(client: string): typeof MINIMALL_FEATURES | typeof ALL_FEATURES {
  if (client === 'minimall') return MINIMALL_FEATURES;
  if (client === 'storagestar') return { ...ALL_FEATURES, hasSeo: true };
  return ALL_FEATURES;
}

function slugForUrl(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname.split('/').filter(Boolean).slice(-2).join('-');
    return (u.hostname.split('.')[0] + '-' + path).replace(/[^a-z0-9-]/gi, '-').toLowerCase().slice(0, 60);
  } catch { return 'ad-hoc'; }
}

function labelForUrl(url: string): string {
  try {
    const u = new URL(url);
    const tail = u.pathname.split('/').filter(Boolean).slice(-2).join(' / ');
    return `${u.hostname.replace(/^www\./, '')} (${tail || '/'})`;
  } catch { return url; }
}
