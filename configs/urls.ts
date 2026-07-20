export enum Environment {
  STAGING = 'staging',
  PRODUCTION = 'production'
}

// ── Default environment (used when not overridden by Control Panel) ──
// To switch by hand, comment/uncomment below as before.
const DEFAULT_ENVIRONMENT = Environment.STAGING as Environment;
//const DEFAULT_ENVIRONMENT = Environment.PRODUCTION as Environment;

// Control-Panel override: if STORAGELY_ENV is set ('staging' | 'production'),
// it wins. Otherwise the DEFAULT above is used (legacy behavior preserved).
export const CURRENT_ENVIRONMENT: Environment =
  process.env.STORAGELY_ENV === 'staging'    ? Environment.STAGING    :
  process.env.STORAGELY_ENV === 'production' ? Environment.PRODUCTION :
  DEFAULT_ENVIRONMENT;


// ============================================================================
// §1  V1 RENT FLOW
// ============================================================================
// Used by: rentReserveV1-validation.spec.ts
// Multi-step rent flow (Step 4 → Step 5 on separate pages).
//
// To add a new V1 client:
//   1. Add the location URL to CUSTOMER_URLS (both staging & production)
//   2. Add the production URL → FMS mapping to FMS_PLATFORM
// ============================================================================

// Admin panel URL (used for login/settings flows)
export const ADMIN_URLS = {
  [Environment.STAGING]:    'https://test.staging.storagely-api.com/distinct-storage/admin',
  [Environment.PRODUCTION]: 'https://distinctstorage.com/admin'
};

// V1 customer location URLs — one per client
export const CUSTOMER_URLS = {
  [Environment.STAGING]: [
    'https://test.staging.storagely-api.com/distinct-storage/storage-units/connecticut/new-milford/kent-road',       // Distinct   | storEDGE
    'https://test.staging.storagely-api.com/rhino-storage/storage-units/louisiana/covington/philip-drive',            // Rhino      | SiteLink
    'https://test.staging.storagely-api.com/gatekeeper-self-storage/storage-units/georgia/peachtree-city/senoia-road',// Gatekeeper | SiteLink
    'https://test.staging.storagely-api.com/storage-boss/storage-units/louisiana/ponchatoula/west-pine-street',       // StorageBoss| SiteLink
  ],
  [Environment.PRODUCTION]: [
    'https://rent.distinctstorage.com/storage-units/connecticut/new-milford/kent-road',              // Distinct    | storEDGE
    'https://rhino-storage.com/storage-units/louisiana/covington/philip-drive',                  // Rhino       | SiteLink
    'https://gatekeeperstoragega.com/storage-units/georgia/peachtree-city/senoia-road',         // Gatekeeper  | SiteLink
    'https://storagedepotla.com/storage-units/louisiana/hammond/north-morrison-blvd',            // StorageBoss | SiteLink
  ]
};

// FMS platform for each V1 production URL (used for logging)
export const FMS_PLATFORM: Record<string, string> = {
  'https://rent.distinctstorage.com/storage-units/connecticut/new-milford/kent-road':        'storEDGE',
  'https://rhino-storage.com/storage-units/louisiana/covington/philip-drive':            'SiteLink',
  'https://gatekeeperstoragega.com/storage-units/georgia/peachtree-city/senoia-road':   'SiteLink',
  'https://storagedepotla.com/storage-units/louisiana/hammond/north-morrison-blvd':      'SiteLink',
};


// ============================================================================
// §2  SPC (SINGLE-PAGE) RENT FLOW
// ============================================================================
// Used by: rentReserveSPC-validation.spec.ts
// Single-page layout where Step 4 (Rental Details) and Step 5 (Payment
// Details) are combined on one page.
//
// To add a new SPC client:
//   1. Add location URL to SINGLE_PAGE_RENT_URLS (staging & production)
//   2. Add URL → FMS mapping to SINGLE_PAGE_FMS_PLATFORM (staging & production)
//   3. If CAPTCHA on RENT NOW button: add to CAPTCHA_CUSTOMER_URLS
//   4. If CAPTCHA on Step 4 (before "Continue"): add to STEP_FOUR_CAPTCHA_URLS
//
// To disable a client temporarily: comment out its URL in ALL of the above.
// ============================================================================

// --- 2a. SPC Location URLs ---
export const SINGLE_PAGE_RENT_URLS = {
  [Environment.STAGING]: [
    'https://test.staging.storagely-api.com/columbia-self-storage/storage-units/new-jersey/south-plainfield/park-avenue',     // Columbia       | storEDGE
    'https://test.staging.storagely-api.com/bluebirdstorage/storage-units/alberta/calgary/mayland',                           // Bluebird       | SiteLink
    'https://test.staging.storagely-api.com/sunbirdstorage/storage-units/nc/winston-salem/country-club',                      // Sunbird        | SiteLink
    'https://test.staging.storagely-api.com/purely-storage/storage-units/washington/pasco/north-road-44',                     // Purely         | storEDGE
    'https://test.staging.storagely-api.com/yourway-storage/storage-units/georgia/augusta/walton-way-ext',                    // YourWay        | SSM
    'https://test.staging.storagely-api.com/red-rocks-self-storage/storage-units/colorado/aurora/east-14th-avenue',           // Red Rocks      | SiteLink
    'https://test.staging.storagely-api.com/storage-star/storage-units/colorado/colorado-springs/aerotech-drive',             // Storage Star   | SSM
    'https://test.staging.storagely-api.com/storsafe-self-storage/storage-units/florida/melbourne/north-highway-1',           // Storsafe       | storEDGE
    'https://test.staging.storagely-api.com/smart-self-storage-ohio/storage-units/ohio/macedonia/bavaria-road',             // Smart Ohio     | SSM
    'https://test.staging.storagely-api.com/easy-stop-storage/storage-units/texas/bushland/south-fm-2381',                  // Easy Stop      | SiteLink
    //'https://test.staging.storagely-api.com/mini-mall-storage/storage-units/alabama/courtland/highway-33',                  // Mini Mall      | SiteLink (disabled)
  ],
  [Environment.PRODUCTION]: [
    'https://www.columbiaselfstorage.com/storage-units/new-jersey/south-plainfield/park-avenue',    // Columbia       | storEDGE
    'https://bluebirdstorage.ca/storage-units/alberta/calgary/mayland',                             // Bluebird       | SiteLink
    'https://sunbirdstorage.com/storage-units/nc/winston-salem/country-club',                       // Sunbird        | SiteLink
    'https://purelystorage.com/storage-units/washington/pasco/north-road-44',                       // Purely         | storEDGE
    'https://www.yourwaystorage.com/storage-units/georgia/augusta/walton-way-ext',                  // YourWay        | SSM
    'https://ww2.redrocksstorage.com/storage-units/colorado/aurora/east-14th-avenue',               // Red Rocks      | SiteLink
    //'https://www.storagestar.com/storage-units/colorado/colorado-springs/aerotech-drive',         // Storage Star | SSM — MOVED TO FLEX: prod runs from the Flex card (client "storagestar"); staging above still runs legacy SPC.
    'https://smartstorageohio.com/storage-units/ohio/macedonia/bavaria-road',                       // Smart Ohio     | SSM
    'https://www.storsafe.com/storage-units/florida/melbourne/north-highway-1',                     // Storsafe       | storEDGE
    'https://www.easystopstorage.com/storage-units/texas/bushland/south-fm-2381',                   // Easy Stop      | SiteLink
    //'https://minimallstorage.com/storage-units/arkansas/batesville/batesville-blvd',               // Mini Mall      | SiteLink (disabled)
  ]
};

// --- 2b. FMS Platform for each SPC URL (used for logging) ---
export const SINGLE_PAGE_FMS_PLATFORM: Record<string, string> = CURRENT_ENVIRONMENT === Environment.STAGING ? {
  'https://test.staging.storagely-api.com/columbia-self-storage/storage-units/new-jersey/south-plainfield/park-avenue': 'storEDGE',
  'https://test.staging.storagely-api.com/bluebirdstorage/storage-units/alberta/calgary/mayland':                       'SiteLink',
  'https://test.staging.storagely-api.com/sunbirdstorage/storage-units/nc/winston-salem/country-club':                  'SiteLink',
  'https://test.staging.storagely-api.com/purely-storage/storage-units/washington/pasco/north-road-44':                 'storEDGE',
  'https://test.staging.storagely-api.com/yourway-storage/storage-units/georgia/augusta/walton-way-ext':                'SSM',
  'https://test.staging.storagely-api.com/red-rocks-self-storage/storage-units/colorado/aurora/east-14th-avenue':       'SiteLink',
  'https://test.staging.storagely-api.com/storage-star/storage-units/colorado/colorado-springs/aerotech-drive':         'SSM',
  'https://test.staging.storagely-api.com/storsafe-self-storage/storage-units/florida/melbourne/north-highway-1':      'storEDGE',
  'https://test.staging.storagely-api.com/smart-self-storage-ohio/storage-units/ohio/macedonia/bavaria-road':           'SSM',
  'https://test.staging.storagely-api.com/easy-stop-storage/storage-units/texas/bushland/south-fm-2381':               'SiteLink',
  //'https://test.staging.storagely-api.com/mini-mall-storage/storage-units/alabama/courtland/highway-33':              'SiteLink',
} : {
  'https://www.columbiaselfstorage.com/storage-units/new-jersey/south-plainfield/park-avenue': 'storEDGE',
  'https://bluebirdstorage.ca/storage-units/alberta/calgary/mayland':                          'SiteLink',
  'https://sunbirdstorage.com/storage-units/nc/winston-salem/country-club':                    'SiteLink',
  'https://purelystorage.com/storage-units/washington/pasco/north-road-44':                    'storEDGE',
  'https://www.yourwaystorage.com/storage-units/georgia/augusta/walton-way-ext':               'SSM',
  'https://ww2.redrocksstorage.com/storage-units/colorado/aurora/east-14th-avenue':            'SiteLink',
  //'https://www.storagestar.com/storage-units/colorado/colorado-springs/aerotech-drive':      'SSM',  // Storage Star — prod moved to Flex
  'https://smartstorageohio.com/storage-units/ohio/macedonia/bavaria-road':                   'SSM',
  'https://www.storsafe.com/storage-units/florida/melbourne/north-highway-1':                  'storEDGE',
  'https://www.easystopstorage.com/storage-units/texas/bushland/south-fm-2381':                'SiteLink',
  //'https://minimallstorage.com/storage-units/arkansas/batesville/batesville-blvd':            'SiteLink',
};

// --- 2c. Captcha on RENT NOW button ---
// URLs where hCaptcha appears before the final RENT NOW button.
// The test pauses for manual captcha solve, then clicks RENT NOW.
// Add/remove URLs here when a client enables/disables captcha.
export const CAPTCHA_CUSTOMER_URLS: string[] = CURRENT_ENVIRONMENT === Environment.STAGING ? [
  //'https://test.staging.storagely-api.com/columbia-self-storage/storage-units/new-jersey/south-plainfield/park-avenue', // Columbia
  //'https://test.staging.storagely-api.com/bluebirdstorage/storage-units/alberta/calgary/mayland',                       // Bluebird
  //'https://test.staging.storagely-api.com/sunbirdstorage/storage-units/nc/winston-salem/country-club',                  // Sunbird
  //'https://test.staging.storagely-api.com/purely-storage/storage-units/washington/pasco/north-road-44',                 // Purely
  //'https://test.staging.storagely-api.com/yourway-storage/storage-units/georgia/augusta/walton-way-ext',                // YourWay
  //'https://test.staging.storagely-api.com/red-rocks-self-storage/storage-units/colorado/golden/west-colfax-avenue',     // Red Rocks
  //'https://test.staging.storagely-api.com/storage-star/storage-units/colorado/colorado-springs/aerotech-drive',         // Storage Star
  //'https://test.staging.storagely-api.com/storsafe-self-storage/storage-units/florida/melbourne/north-highway-1',     // Storsafe (no captcha)
] : [
  'https://www.columbiaselfstorage.com/storage-units/new-jersey/south-plainfield/park-avenue', // Columbia
  'https://bluebirdstorage.ca/storage-units/alberta/calgary/mayland',                          // Bluebird
  'https://sunbirdstorage.com/storage-units/nc/winston-salem/country-club',                    // Sunbird
  'https://purelystorage.com/storage-units/washington/pasco/north-road-44',                    // Purely
  'https://www.yourwaystorage.com/storage-units/georgia/augusta/walton-way-ext',               // YourWay
  'https://ww2.redrocksstorage.com/storage-units/colorado/aurora/east-14th-avenue',            // Red Rocks
  //'https://www.storagestar.com/storage-units/colorado/colorado-springs/aerotech-drive',      // Storage Star — prod moved to Flex (no legacy prod captcha entry needed)
  'https://smartstorageohio.com/storage-units/ohio/macedonia/bavaria-road',                   // Smart Ohio
  //'https://www.storsafe.com/storage-units/florida/melbourne/north-highway-1',                // Storsafe (disabled)
];

// --- 2d. Captcha on Step 4 (before "Continue to next step") ---
// Different from 2c: captcha appears during form fill, NOT at RENT NOW.
// To mute a client: comment out their URL.
export const STEP_FOUR_CAPTCHA_URLS: string[] = CURRENT_ENVIRONMENT === Environment.STAGING ? [
  //'https://test.staging.storagely-api.com/mini-mall-storage/storage-units/alabama/courtland/highway-33',   // Mini Mall (disabled)
] : [
  //'https://minimallstorage.com/storage-units/arkansas/batesville/batesville-blvd',                         // Mini Mall (disabled)
];


// ============================================================================
// §3  UI COMPONENTS VALIDATION
// ============================================================================
// Used by: uiComponents-validation.spec.ts
// Tests Home Page, Contact Page, Offer Text, Banner Loading across all sites.
//
// To add a new site:
//   1. Add URL to STORAGE_SITE_URLS (staging & production)
//   2. If it uses Storerocket (no staging version): add domain to STOREROCKET_SITES
//   3. If staging contact page is empty/broken: add slug to STAGING_CONTACT_SKIP
// ============================================================================

export const STORAGE_SITE_URLS = {
  [Environment.STAGING]: [
    'https://test.staging.storagely-api.com/smart-self-storage-ohio/',   // Smart Ohio
    'https://test.staging.storagely-api.com/storage-star/',              // Storage Star
    'https://test.staging.storagely-api.com/sunbirdstorage/',            // Sunbird       ⚠️ staging contact empty
    'https://test.staging.storagely-api.com/bluebirdstorage/',           // Bluebird      ⚠️ staging contact empty
    'https://test.staging.storagely-api.com/gatekeeper-self-storage/',   // Gatekeeper
    'https://test.staging.storagely-api.com/red-rocks-self-storage/',    // Red Rocks
    'https://test.staging.storagely-api.com/distinct-storage/',          // Distinct
    'https://test.staging.storagely-api.com/rhino-storage/',             // Rhino
    'https://test.staging.storagely-api.com/storage-boss/',              // StorageBoss   ⚠️ staging contact empty
    'https://test.staging.storagely-api.com/mini-mall-storage/',         // Mini Mall ⭐
    'https://test.staging.storagely-api.com/storsafe-self-storage/',     // Storsafe
  ],
  [Environment.PRODUCTION]: [
    'https://smartstorageohio.com/',       // Smart Ohio
    'https://storagestar.com/',            // Storage Star
    'https://sunbirdstorage.com/',         // Sunbird
    'https://bluebirdstorage.ca/',         // Bluebird
    'https://gatekeeperstoragega.com/',    // Gatekeeper
    'https://redrocksstorage.com/',        // Red Rocks
    'https://distinctstorage.com/',        // Distinct
    'https://rhino-storage.com/',          // Rhino
    'https://storagedepotla.com/',         // StorageBoss
    'https://minimallstorage.com/',        // Mini Mall ⭐
    'https://www.storsafe.com/',           // Storsafe
    'https://www.almightystorage.com/',    // Almighty Storage
  ]
};

// Sites that use Storerocket (no staging equivalent — skipped in staging)
export const STOREROCKET_SITES: string[] = [];

// Staging sites whose contact page is empty/broken (contact test skipped in staging)
export const STAGING_CONTACT_SKIP = ['sunbirdstorage', 'bluebirdstorage', 'storage-boss'];

// Sites (any environment) where the contact page has no contact form — contact test skipped
export const CONTACT_SKIP_SITES = ['smartstorageohio'];

// Sites where the FAQ page has no accordion / is not testable — FAQ test skipped entirely
export const FAQ_SKIP_SITES = ['almightystorage'];

// Contact pages that have hCaptcha / reCAPTCHA requiring manual solve.
// When a site is in this list, automation fills the form, pauses for you
// to solve the CAPTCHA in the browser, then clicks Send.
// Test timeout is set to 0 (unlimited) for these sites.
// NOTE: Native-form sites (Gatekeeper, RedRocks, Rhino, StorageDepot) have
//       hCaptcha but currently pass without solving it.  Un-comment below
//       if the server starts enforcing CAPTCHA validation.
export const CONTACT_CAPTCHA_SITES: string[] = [
  // 'gatekeeperstoragega.com',
  // 'redrocksstorage.com',
  // 'rhino-storage.com',
  // 'storagedepotla.com',
];

// Legacy alias for backwards compatibility
export const storageSiteUrls = STORAGE_SITE_URLS[Environment.PRODUCTION];


// ============================================================================
// §4  STAGING WORKAROUNDS
// ============================================================================
// Clients that require SiteLink Corp Password setup before rent flows
// in STAGING. Before running SPC or V1 tests, the automation will:
//   1. Go to {base}/{slug}/login
//   2. Login with admin credentials
//   3. Navigate to Settings > Integrations
//   4. Set SiteLink Corp Password
//   5. Save Changes
//
// STAGING ONLY — production does not need this.
// To add a new client: add their slug → corp-code below.
// ============================================================================

// Baseline (committed) — keep slugs you want hardcoded so they ALWAYS work.
const _BASE_STAGING_CORP_CODE_CLIENTS: Record<string, string> = {
  'bluebirdstorage':          '7ou5@H@W9bdM$i',
  'sunbirdstorage':           '7ou5@H@W9bdM$i',
  'mini-mall-storage':        'bright31SKIES!',
  'storage-boss':             'P?artie42!',
  'easy-stop-storage':        'E6oVs7YRD5Crst!',
  'gatekeeper-self-storage':  'Oct#2024!!',
};

// Optional Control-Panel runtime overrides (slug → corp code).
// Provided as JSON via STORAGELY_CORP_CODES_JSON env var.
function _envCorpCodes(): Record<string, string> {
  const raw = process.env.STORAGELY_CORP_CODES_JSON;
  if (!raw || !raw.trim()) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

export const STAGING_CORP_CODE_CLIENTS: Record<string, string> = {
  ..._BASE_STAGING_CORP_CODE_CLIENTS,
  ..._envCorpCodes(),
};


// ============================================================================
// §5  LOCATION PAGE PRICING VALIDATION
// ============================================================================
// Used by: uiComponents-validation.spec.ts (Unit Pricing section)
// Verifies that dual-price units show first price < second price.
//
// Each entry: { url, fms, version, label }
// ============================================================================

export interface PricingLocationConfig {
  url: string;
  fms: string;       // storEDGE | SiteLink | SSM | Yardi
  version: string;   // V1 | V2
  label: string;     // Human-readable name
}

export const PRICING_VALIDATION_LOCATIONS: PricingLocationConfig[] = [
  // --- V2 Clients ---
  // storEDGE
  { url: 'https://www.storsafe.com/storage-units/iowa/altoona/34th-avenue-southwest',                                          fms: 'storEDGE', version: 'V2', label: 'StorSafe (Cubix) — Altoona, IA' },
  { url: 'https://www.columbiaselfstorage.com/storage-units/arizona/cottonwood/az-260',                                        fms: 'storEDGE', version: 'V2', label: 'Columbia Self Storage — Cottonwood, AZ' },
  // SiteLink
  { url: 'https://app.storagely.io/green-valley-storage/storage-units/arizona/green-valley/west-duval-commerce-court',          fms: 'SiteLink', version: 'V2', label: 'Green Valley (Argus) — Green Valley, AZ' },
  { url: 'https://bluebirdstorage.ca/storage-units/alberta/calgary/mayland',                                                   fms: 'SiteLink', version: 'V2', label: 'Bluebird Storage — Calgary, AB' },
  // SSM
  { url: 'https://www.storagestar.com/storage-units/colorado/colorado-springs/aerotech-drive',                                  fms: 'SSM',      version: 'V2', label: 'Storage Star — Colorado Springs, CO' },

  // --- V1 Clients ---
  // storEDGE
  { url: 'https://rent.distinctstorage.com/storage-units/connecticut/new-milford/kent-road',                                        fms: 'storEDGE', version: 'V1', label: 'Distinct Storage — New Milford, CT' },
  // SiteLink
  // SSM
  { url: 'https://smartstorageohio.com/storage-units/ohio/macedonia/bavaria-road',                                             fms: 'SSM',      version: 'V2', label: 'Smart Storage Ohio — Macedonia, OH' },

  // --- Yardi ---
  { url: 'https://minimallstorage.com/storage-units/alabama/birmingham/richard-arrington-jr-blvd',                             fms: 'Yardi',    version: 'V2', label: '⭐ Mini Mall Storage — Birmingham, AL' },
];


// ============================================================================
// §6  UNIT FEATURE CONFLICT CHECK LOCATIONS
// ============================================================================
// Used by: uiComponents-validation.spec.ts (Unit Feature Conflicts section)
//
// Verifies that no unit on a listing page shows contradictory feature labels
// at the same time (e.g., "Climate Controlled" AND "Non-Climate Controlled").
//
// Primary focus: Mini Mall (Yardi) where this bug was found in production.
// Root cause: FMS attribute substring-matching was too broad — "covered" matched
// inside "uncovered", "climate controlled" matched inside "non-climate controlled".
// The FMS sync was fixed to use strict whole-word matching, but a future change
// could reintroduce a similar regression — this test acts as the safety net.
//
// Conflicting pairs detected automatically (see CONFLICTING_FEATURE_PAIRS in test):
//   - "Climate Controlled"  ↔  "Non-Climate Controlled"
//   - "Covered"             ↔  "Uncovered"
//
// To add more locations: add an entry below. Production URLs only (FMS data is
// live; staging test data may not have the same attributes).
// ============================================================================

export interface UnitFeaturesLocationConfig {
  url: string;
  label: string;
  fms: string;    // Yardi | SiteLink | storEDGE | SSM
}

export const UNIT_FEATURES_CONFLICT_LOCATIONS: UnitFeaturesLocationConfig[] = [
  // --- Mini Mall (Yardi) — primary bug locations ---
  { url: 'https://minimallstorage.com/storage-units/alberta/airdrie/east-lake-road-ne',                                         fms: 'Yardi',    label: '⭐ Mini Mall — Airdrie, AB (original bug site)'     },
  { url: 'https://minimallstorage.com/storage-units/south-carolina/longs/highway-9-east',                                       fms: 'Yardi',    label: '⭐ Mini Mall — Longs, SC (original bug site)'       },
  // --- Mini Mall (Yardi) — additional coverage ---
  { url: 'https://minimallstorage.com/storage-units/alabama/birmingham/richard-arrington-jr-blvd',                              fms: 'Yardi',    label: '⭐ Mini Mall — Birmingham, AL'                      },
  // --- Mini Mall (SiteLink) — different FMS to catch any SiteLink-side regressions ---
  { url: 'https://minimallstorage.com/storage-units/alabama/courtland/highway-33',                                              fms: 'SiteLink', label: '⭐ Mini Mall — Courtland, AL (SiteLink)'           },

  // --- storEDGE clients ---
  { url: 'https://www.columbiaselfstorage.com/storage-units/new-jersey/south-plainfield/park-avenue',                          fms: 'storEDGE', label: 'Columbia Self Storage — South Plainfield, NJ'    },
  { url: 'https://purelystorage.com/storage-units/washington/pasco/north-road-44',                                              fms: 'storEDGE', label: 'Purely Storage — Pasco, WA'                      },
  { url: 'https://rent.distinctstorage.com/storage-units/connecticut/new-milford/kent-road',                                        fms: 'storEDGE', label: 'Distinct Storage — New Milford, CT'              },
  { url: 'https://www.storsafe.com/storage-units/iowa/altoona/34th-avenue-southwest',                                          fms: 'storEDGE', label: 'StorSafe — Altoona, IA'                          },

  // --- SiteLink clients ---
  { url: 'https://bluebirdstorage.ca/storage-units/alberta/calgary/mayland',                                                   fms: 'SiteLink', label: 'Bluebird Storage — Calgary, AB'                  },
  { url: 'https://sunbirdstorage.com/storage-units/nc/winston-salem/country-club',                                             fms: 'SiteLink', label: 'Sunbird Storage — Winston-Salem, NC'             },
  { url: 'https://ww2.redrocksstorage.com/storage-units/colorado/aurora/east-14th-avenue',                                     fms: 'SiteLink', label: 'Red Rocks Storage — Aurora, CO'                  },
  { url: 'https://rhino-storage.com/storage-units/louisiana/covington/philip-drive',                                           fms: 'SiteLink', label: 'Rhino Storage — Covington, LA'                   },
  { url: 'https://gatekeeperstoragega.com/storage-units/georgia/peachtree-city/senoia-road',                                   fms: 'SiteLink', label: 'Gatekeeper Self Storage — Peachtree City, GA'   },
  { url: 'https://storagedepotla.com/storage-units/louisiana/hammond/north-morrison-blvd',                                     fms: 'SiteLink', label: 'Storage Depot LA — Hammond, LA'                },

  // --- SSM clients ---
  { url: 'https://www.storagestar.com/storage-units/colorado/colorado-springs/aerotech-drive',                                 fms: 'SSM',      label: 'Storage Star — Colorado Springs, CO'               },
  { url: 'https://www.yourwaystorage.com/storage-units/georgia/augusta/walton-way-ext',                                        fms: 'SSM',      label: 'YourWay Storage — Augusta, GA'                     },
  { url: 'https://smartstorageohio.com/storage-units/ohio/macedonia/bavaria-road',                                             fms: 'SSM',      label: 'Smart Storage Ohio — Macedonia, OH'                },
];


// ============================================================================
// §8  MINI-MALL RENTAL FLOW
// ============================================================================
// Used by: miniMallRental.spec.ts
// Dedicated rent flow test for Mini Mall Storage — the biggest client.
// Supports two FMS backends:
//   • SiteLink — two-step layout (Step 4 tenant + captcha → Step 5 payment)
//   • Yardi    — tenant details + captcha → redirects to securecafenet.com
//
// SiteLink staging requires corp code setup (see §4).
// Yardi staging does NOT need corp code.
//
// Control Panel can also pass a custom URL via STORAGELY_MMRENT_CUSTOM.
// ============================================================================

export interface MiniMallRentalConfig {
  url: string;
  fms: 'SiteLink' | 'Yardi';
  label: string;
}

export const MINI_MALL_RENTAL_URLS: Record<string, MiniMallRentalConfig[]> = {
  [Environment.STAGING]: [
    { url: 'https://test.staging.storagely-api.com/mini-mall-storage/storage-units/quebec/sainte-therese/30-place-sicard',                          fms: 'SiteLink', label: '⭐ Mini Mall SiteLink — Sainte-Thérèse, QC' },
    { url: 'https://test.staging.storagely-api.com/mini-mall-storage-yardi/storage-units/alabama/birmingham/richard-arrington-jr-blvd',              fms: 'Yardi',    label: '⭐ Mini Mall Yardi — Birmingham, AL' },
  ],
  [Environment.PRODUCTION]: [
    // MOVED TO FLEX (2026-07-17): Sainte-Thérèse QC prod is now a Flex v4 page
    // (French-market template variant, /step-four SPC handoff) — the legacy
    // SiteLink spec can't find its rent buttons ("No rent … buttons found",
    // run-2026-07-16T20-21). Covered by the Flex journey via Ad-hoc URL until
    // a Flex variant profile lands; staging entry above still works.
    // { url: 'https://minimallstorage.com/storage-units/quebec/sainte-therese/place-sicard',                                                       fms: 'SiteLink', label: '⭐ Mini Mall SiteLink — Sainte-Thérèse, QC' },
    { url: 'https://minimallstorage.com/storage-units/florida/deland/golf-club-drive',                                                fms: 'Yardi',    label: '⭐ Mini Mall Yardi — DeLand, FL' },
  ],
};

/** Detect FMS type from a Mini Mall URL (staging slug or runtime detection). */
export function detectMiniMallFms(url: string): 'SiteLink' | 'Yardi' {
  const lower = url.toLowerCase();
  if (lower.includes('mini-mall-storage-yardi')) return 'Yardi';
  if (lower.includes('/yardi/')) return 'Yardi';
  return 'SiteLink';
}

/** Returns Mini Mall rental flow URLs for the current environment. */
export function getMiniMallRentalUrls(): MiniMallRentalConfig[] {
  let urls = MINI_MALL_RENTAL_URLS[CURRENT_ENVIRONMENT] || [];
  urls = urls.map(u => ({ ...u, url: _swapStagingBase([u.url])[0] }));

  // Custom URLs override per-flow (separate fields for SiteLink and Yardi)
  const customSitelink = process.env.STORAGELY_MMRENT_CUSTOM_SITELINK?.trim();
  const customYardi    = process.env.STORAGELY_MMRENT_CUSTOM_YARDI?.trim();
  if (customSitelink || customYardi) {
    const result: MiniMallRentalConfig[] = [];
    if (customSitelink) result.push({ url: customSitelink, fms: 'SiteLink', label: `Custom SiteLink — ${getCompanyNameFromUrl(customSitelink)}` });
    if (customYardi)    result.push({ url: customYardi,    fms: 'Yardi',    label: `Custom Yardi — ${getCompanyNameFromUrl(customYardi)}` });
    return result;
  }

  const filter = process.env.STORAGELY_MMRENT_FILTER?.trim()?.toLowerCase();
  if (filter) {
    urls = urls.filter(u =>
      u.fms.toLowerCase().includes(filter) || u.url.toLowerCase().includes(filter) || u.label.toLowerCase().includes(filter)
    );
  }

  return urls;
}


// ============================================================================
// §7  HELPER FUNCTIONS
// ============================================================================

// ── Control-Panel runtime overrides ────────────────────────────────────────
// These ONLY take effect when the matching env var is set by the Control
// Panel. With no env vars set, behavior is identical to before.
//
//   STORAGELY_<SUITE>_CLIENTS = comma-separated substrings to KEEP
//        (e.g. "bluebird,sunbird"  → keeps URLs whose lowercase form
//        contains any of those substrings)
//   STORAGELY_<SUITE>_EXTRA   = comma-separated URLs to APPEND
//
//   <SUITE> ∈ { UI, SPC, V1 }
// ──────────────────────────────────────────────────────────────────────────

function _csv(name: string): string[] {
  const v = process.env[name];
  if (!v || !v.trim()) return [];
  return v.split(',').map(s => s.trim()).filter(Boolean);
}

// Default staging hostname — what's hardcoded in CUSTOMER_URLS / SINGLE_PAGE_RENT_URLS / STORAGE_SITE_URLS.
const _DEFAULT_STAGING_BASE = 'https://test.staging.storagely-api.com';

/**
 * If STORAGELY_BUILD_BASE is set AND we're in staging mode, swap the default
 * staging host for the developer-supplied build-instance host on every URL.
 * Used by the "Build Instance Regression" mode of the Control Panel.
 */
export function getBuildBase(): string | null {
  const v = process.env.STORAGELY_BUILD_BASE?.trim();
  return v || null;
}
function _swapStagingBase(urls: string[]): string[] {
  const build = getBuildBase();
  if (!build || CURRENT_ENVIRONMENT !== Environment.STAGING) return urls;
  const trimmed = build.replace(/\/$/, '');
  return urls.map(u => u.replace(_DEFAULT_STAGING_BASE, trimmed));
}
function _swapAdmin(adminUrl: string): string {
  const build = getBuildBase();
  if (!build || CURRENT_ENVIRONMENT !== Environment.STAGING) return adminUrl;
  return adminUrl.replace(_DEFAULT_STAGING_BASE, build.replace(/\/$/, ''));
}

function _applyClientFilter(urls: string[], envName: string): string[] {
  const subs = _csv(envName).map(s => s.toLowerCase());
  if (subs.length === 0) return urls;
  return urls.filter(u => subs.some(s => u.toLowerCase().includes(s)));
}

function _applyExtras(urls: string[], envName: string): string[] {
  const extras = _csv(envName);
  if (extras.length === 0) return urls;
  // De-duplicate while preserving order
  const seen = new Set(urls);
  const merged = [...urls];
  for (const x of extras) if (!seen.has(x)) { merged.push(x); seen.add(x); }
  return merged;
}

/** Returns UI component site URLs for the current environment. */
export function getStorageSiteUrls(): string[] {
  let urls = STORAGE_SITE_URLS[CURRENT_ENVIRONMENT];
  urls = _swapStagingBase(urls);
  urls = _applyClientFilter(urls, 'STORAGELY_UI_CLIENTS');
  urls = _applyExtras(urls, 'STORAGELY_UI_EXTRA');
  return urls;
}

/** Returns SPC rent flow URLs for the current environment. */
export function getSinglePageUrls() {
  let urls = SINGLE_PAGE_RENT_URLS[CURRENT_ENVIRONMENT];
  urls = _swapStagingBase(urls);
  urls = _applyClientFilter(urls, 'STORAGELY_SPC_CLIENTS');
  urls = _applyExtras(urls, 'STORAGELY_SPC_EXTRA');
  return { customer: urls };
}

/** Returns V1 rent flow URLs (admin + customer) for the current environment. */
export function getCurrentUrls() {
  let urls = CUSTOMER_URLS[CURRENT_ENVIRONMENT];
  urls = _swapStagingBase(urls);
  urls = _applyClientFilter(urls, 'STORAGELY_V1_CLIENTS');
  urls = _applyExtras(urls, 'STORAGELY_V1_EXTRA');
  return {
    admin: _swapAdmin(ADMIN_URLS[CURRENT_ENVIRONMENT]),
    customer: urls,
  };
}

/** Extracts a human-readable company name from a staging or production URL. */
export function getCompanyNameFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const host = urlObj.hostname;
    if (host.includes('staging')) {
      // Staging: company name is the first path segment
      const pathParts = urlObj.pathname.split('/');
      return pathParts[1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    } else {
      // Production: company name is the hostname
      const hostParts = host.split('.');
      if (hostParts[0] === 'www') {
        return hostParts[1].replace(/storage$/, ' Storage');
      } else {
        return hostParts[0].replace(/storage$/, ' Storage');
      }
    }
  } catch (error) {
    return 'Unknown Company';
  }
}
