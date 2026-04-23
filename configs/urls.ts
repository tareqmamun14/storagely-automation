export enum Environment {
  STAGING = 'staging',
  PRODUCTION = 'production'
}

//export const CURRENT_ENVIRONMENT = Environment.STAGING as Environment;
export const CURRENT_ENVIRONMENT = Environment.PRODUCTION as Environment;


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
    'https://test.staging.storagely-api.com/smart-self-storage-ohio/storage-units/ohio/macedonia/bavaria-road',       // Smart Ohio | SSM
  ],
  [Environment.PRODUCTION]: [
    'https://distinctstorage.com/storage-units/connecticut/new-milford/kent-road',              // Distinct    | storEDGE
    'https://rhino-storage.com/storage-units/louisiana/covington/philip-drive',                  // Rhino       | SiteLink
    'https://gatekeeperstoragega.com/storage-units/georgia/peachtree-city/senoia-road',         // Gatekeeper  | SiteLink
    'https://storagedepotla.com/storage-units/louisiana/hammond/north-morrison-blvd',            // StorageBoss | SiteLink
    'https://smartstorageohio.com/storage-units/ohio/macedonia/bavaria-road',                   // Smart Ohio  | SSM
  ]
};

// FMS platform for each V1 production URL (used for logging)
export const FMS_PLATFORM: Record<string, string> = {
  'https://distinctstorage.com/storage-units/connecticut/new-milford/kent-road':        'storEDGE',
  'https://rhino-storage.com/storage-units/louisiana/covington/philip-drive':            'SiteLink',
  'https://gatekeeperstoragega.com/storage-units/georgia/peachtree-city/senoia-road':   'SiteLink',
  'https://storagedepotla.com/storage-units/louisiana/hammond/north-morrison-blvd':      'SiteLink',
  'https://smartstorageohio.com/storage-units/ohio/macedonia/bavaria-road':             'SSM',
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
    'https://test.staging.storagely-api.com/first-storage/storage-units/alabama/huntsville/memorial-parkway-sw',              // First Storage  | storEDGE
    'https://test.staging.storagely-api.com/columbia-self-storage/storage-units/new-jersey/south-plainfield/park-avenue',     // Columbia       | storEDGE
    'https://test.staging.storagely-api.com/bluebirdstorage/storage-units/alberta/calgary/mayland',                           // Bluebird       | SiteLink
    'https://test.staging.storagely-api.com/sunbirdstorage/storage-units/nc/winston-salem/country-club',                      // Sunbird        | SiteLink
    'https://test.staging.storagely-api.com/purely-storage/storage-units/washington/pasco/north-road-44',                     // Purely         | storEDGE
    'https://test.staging.storagely-api.com/yourway-storage/storage-units/georgia/augusta/walton-way-ext',                    // YourWay        | SSM
    'https://test.staging.storagely-api.com/red-rocks-self-storage/storage-units/colorado/aurora/east-14th-avenue',           // Red Rocks      | SiteLink
    'https://test.staging.storagely-api.com/storage-star/storage-units/colorado/colorado-springs/aerotech-drive',             // Storage Star   | SSM
    'https://test.staging.storagely-api.com/storsafe-self-storage/storage-units/florida/melbourne/north-highway-1',           // Storsafe       | storEDGE
    //'https://test.staging.storagely-api.com/mini-mall-storage/storage-units/alabama/courtland/highway-33',                  // Mini Mall      | SiteLink (disabled)
  ],
  [Environment.PRODUCTION]: [
    'https://www.firststorage.com/storage-units/alabama/huntsville/memorial-parkway-sw',             // First Storage  | storEDGE
    'https://www.columbiaselfstorage.com/storage-units/new-jersey/south-plainfield/park-avenue',    // Columbia       | storEDGE
    'https://bluebirdstorage.ca/storage-units/alberta/calgary/mayland',                             // Bluebird       | SiteLink
    'https://sunbirdstorage.com/storage-units/nc/winston-salem/country-club',                       // Sunbird        | SiteLink
    'https://purelystorage.com/storage-units/washington/pasco/north-road-44',                       // Purely         | storEDGE
    'https://www.yourwaystorage.com/storage-units/georgia/augusta/walton-way-ext',                  // YourWay        | SSM
    'https://ww2.redrocksstorage.com/storage-units/colorado/aurora/east-14th-avenue',               // Red Rocks      | SiteLink
    'https://www.storagestar.com/storage-units/colorado/colorado-springs/aerotech-drive',           // Storage Star   | SSM
    //'https://www.storsafe.com/storage-units/florida/melbourne/north-highway-1',                   // Storsafe       | storEDGE (disabled)
    //'https://minimallstorage.com/storage-units/arkansas/batesville/batesville-blvd',               // Mini Mall      | SiteLink (disabled)
  ]
};

// --- 2b. FMS Platform for each SPC URL (used for logging) ---
export const SINGLE_PAGE_FMS_PLATFORM: Record<string, string> = CURRENT_ENVIRONMENT === Environment.STAGING ? {
  'https://test.staging.storagely-api.com/first-storage/storage-units/alabama/huntsville/memorial-parkway-sw':          'storEDGE',
  'https://test.staging.storagely-api.com/columbia-self-storage/storage-units/new-jersey/south-plainfield/park-avenue': 'storEDGE',
  'https://test.staging.storagely-api.com/bluebirdstorage/storage-units/alberta/calgary/mayland':                       'SiteLink',
  'https://test.staging.storagely-api.com/sunbirdstorage/storage-units/nc/winston-salem/country-club':                  'SiteLink',
  'https://test.staging.storagely-api.com/purely-storage/storage-units/washington/pasco/north-road-44':                 'storEDGE',
  'https://test.staging.storagely-api.com/yourway-storage/storage-units/georgia/augusta/walton-way-ext':                'SSM',
  'https://test.staging.storagely-api.com/red-rocks-self-storage/storage-units/colorado/aurora/east-14th-avenue':       'SiteLink',
  'https://test.staging.storagely-api.com/storage-star/storage-units/colorado/colorado-springs/aerotech-drive':         'SSM',
  'https://test.staging.storagely-api.com/storsafe-self-storage/storage-units/florida/melbourne/north-highway-1':      'storEDGE',
  //'https://test.staging.storagely-api.com/mini-mall-storage/storage-units/alabama/courtland/highway-33':              'SiteLink',
} : {
  'https://www.firststorage.com/storage-units/alabama/huntsville/memorial-parkway-sw':          'storEDGE',
  'https://www.columbiaselfstorage.com/storage-units/new-jersey/south-plainfield/park-avenue': 'storEDGE',
  'https://bluebirdstorage.ca/storage-units/alberta/calgary/mayland':                          'SiteLink',
  'https://sunbirdstorage.com/storage-units/nc/winston-salem/country-club':                    'SiteLink',
  'https://purelystorage.com/storage-units/washington/pasco/north-road-44':                    'storEDGE',
  'https://www.yourwaystorage.com/storage-units/georgia/augusta/walton-way-ext':               'SSM',
  'https://ww2.redrocksstorage.com/storage-units/colorado/aurora/east-14th-avenue':            'SiteLink',
  'https://www.storagestar.com/storage-units/colorado/colorado-springs/aerotech-drive':        'SSM',
  //'https://www.storsafe.com/storage-units/florida/melbourne/north-highway-1':                'storEDGE',
  //'https://minimallstorage.com/storage-units/arkansas/batesville/batesville-blvd':            'SiteLink',
};

// --- 2c. Captcha on RENT NOW button ---
// URLs where hCaptcha appears before the final RENT NOW button.
// The test pauses for manual captcha solve, then clicks RENT NOW.
// Add/remove URLs here when a client enables/disables captcha.
export const CAPTCHA_CUSTOMER_URLS: string[] = CURRENT_ENVIRONMENT === Environment.STAGING ? [
  //'https://test.staging.storagely-api.com/first-storage/storage-units/alabama/huntsville/memorial-parkway-sw',          // First Storage
  //'https://test.staging.storagely-api.com/columbia-self-storage/storage-units/new-jersey/south-plainfield/park-avenue', // Columbia
  //'https://test.staging.storagely-api.com/bluebirdstorage/storage-units/alberta/calgary/mayland',                       // Bluebird
  //'https://test.staging.storagely-api.com/sunbirdstorage/storage-units/nc/winston-salem/country-club',                  // Sunbird
  //'https://test.staging.storagely-api.com/purely-storage/storage-units/washington/pasco/north-road-44',                 // Purely
  //'https://test.staging.storagely-api.com/yourway-storage/storage-units/georgia/augusta/walton-way-ext',                // YourWay
  //'https://test.staging.storagely-api.com/red-rocks-self-storage/storage-units/colorado/golden/west-colfax-avenue',     // Red Rocks
  //'https://test.staging.storagely-api.com/storage-star/storage-units/colorado/colorado-springs/aerotech-drive',         // Storage Star
  'https://test.staging.storagely-api.com/storsafe-self-storage/storage-units/florida/melbourne/north-highway-1',       // Storsafe
] : [
  'https://www.firststorage.com/storage-units/alabama/huntsville/memorial-parkway-sw',          // First Storage
  'https://www.columbiaselfstorage.com/storage-units/new-jersey/south-plainfield/park-avenue', // Columbia
  'https://bluebirdstorage.ca/storage-units/alberta/calgary/mayland',                          // Bluebird
  'https://sunbirdstorage.com/storage-units/nc/winston-salem/country-club',                    // Sunbird
  'https://purelystorage.com/storage-units/washington/pasco/north-road-44',                    // Purely
  'https://www.yourwaystorage.com/storage-units/georgia/augusta/walton-way-ext',               // YourWay
  'https://ww2.redrocksstorage.com/storage-units/colorado/aurora/east-14th-avenue',            // Red Rocks
  'https://www.storagestar.com/storage-units/colorado/colorado-springs/aerotech-drive',        // Storage Star
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
    'https://test.staging.storagely-api.com/first-storage/',             // First Storage
    'https://test.staging.storagely-api.com/red-rocks-self-storage/',    // Red Rocks
    'https://test.staging.storagely-api.com/distinct-storage/',          // Distinct
    'https://test.staging.storagely-api.com/rhino-storage/',             // Rhino
    'https://test.staging.storagely-api.com/storage-boss/',              // StorageBoss   ⚠️ staging contact empty
    // ulok.com — uses Storerocket, no staging equivalent (prod-only)
    'https://test.staging.storagely-api.com/mini-mall-storage/',         // Mini Mall ⭐
    'https://test.staging.storagely-api.com/storsafe-self-storage/',     // Storsafe
  ],
  [Environment.PRODUCTION]: [
    'https://smartstorageohio.com/',       // Smart Ohio
    'https://storagestar.com/',            // Storage Star
    'https://sunbirdstorage.com/',         // Sunbird
    'https://bluebirdstorage.ca/',         // Bluebird
    'https://gatekeeperstoragega.com/',    // Gatekeeper
    'https://www.firststorage.com/',       // First Storage
    'https://redrocksstorage.com/',        // Red Rocks
    'https://distinctstorage.com/',        // Distinct
    'https://rhino-storage.com/',          // Rhino
    'https://storagedepotla.com/',         // StorageBoss
    'https://ulok.com',                    // ULok (Storerocket — prod only)
    'https://minimallstorage.com/',        // Mini Mall ⭐
    'https://www.storsafe.com/',           // Storsafe
    'https://www.almightystorage.com/',    // Almighty Storage
  ]
};

// Sites that use Storerocket (no staging equivalent — skipped in staging)
export const STOREROCKET_SITES = ['ulok.com'];

// Staging sites whose contact page is empty/broken (contact test skipped in staging)
export const STAGING_CONTACT_SKIP = ['sunbirdstorage', 'bluebirdstorage', 'storage-boss'];

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

export const STAGING_CORP_CODE_CLIENTS: Record<string, string> = {
  'bluebirdstorage': '7ou5@H@W9bdM$i',
  'sunbirdstorage':  '7ou5@H@W9bdM$i',
  // Add more clients here:
  // 'client-slug': 'their-corp-code',
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
  { url: 'https://distinctstorage.com/storage-units/connecticut/new-milford/kent-road',                                        fms: 'storEDGE', version: 'V1', label: 'Distinct Storage — New Milford, CT' },
  // SiteLink
  { url: 'https://selfstorage.ca/storage-units/british-columbia/mission/gill-avenue',                                          fms: 'SiteLink', version: 'V1', label: 'U-Lock Mini Storage — Mission, BC' },
  // SSM
  { url: 'https://smartstorageohio.com/storage-units/ohio/macedonia/bavaria-road',                                             fms: 'SSM',      version: 'V1', label: 'Smart Storage Ohio — Macedonia, OH' },

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
  { url: 'https://www.firststorage.com/storage-units/alabama/huntsville/memorial-parkway-sw',                                   fms: 'storEDGE', label: 'First Storage — Huntsville, AL'                  },
  { url: 'https://www.columbiaselfstorage.com/storage-units/new-jersey/south-plainfield/park-avenue',                          fms: 'storEDGE', label: 'Columbia Self Storage — South Plainfield, NJ'    },
  { url: 'https://purelystorage.com/storage-units/washington/pasco/north-road-44',                                              fms: 'storEDGE', label: 'Purely Storage — Pasco, WA'                      },
  { url: 'https://distinctstorage.com/storage-units/connecticut/new-milford/kent-road',                                        fms: 'storEDGE', label: 'Distinct Storage — New Milford, CT'              },
  { url: 'https://www.storsafe.com/storage-units/iowa/altoona/34th-avenue-southwest',                                          fms: 'storEDGE', label: 'StorSafe — Altoona, IA'                          },

  // --- SiteLink clients ---
  { url: 'https://bluebirdstorage.ca/storage-units/alberta/calgary/mayland',                                                   fms: 'SiteLink', label: 'Bluebird Storage — Calgary, AB'                  },
  { url: 'https://sunbirdstorage.com/storage-units/nc/winston-salem/country-club',                                             fms: 'SiteLink', label: 'Sunbird Storage — Winston-Salem, NC'             },
  { url: 'https://ww2.redrocksstorage.com/storage-units/colorado/aurora/east-14th-avenue',                                     fms: 'SiteLink', label: 'Red Rocks Storage — Aurora, CO'                  },
  { url: 'https://rhino-storage.com/storage-units/louisiana/covington/philip-drive',                                           fms: 'SiteLink', label: 'Rhino Storage — Covington, LA'                   },
  { url: 'https://gatekeeperstoragega.com/storage-units/georgia/peachtree-city/senoia-road',                                   fms: 'SiteLink', label: 'Gatekeeper Self Storage — Peachtree City, GA'   },
  { url: 'https://storagedepotla.com/storage-units/louisiana/hammond/north-morrison-blvd',                                     fms: 'SiteLink', label: 'Storage Depot LA — Hammond, LA'                },
  { url: 'https://selfstorage.ca/storage-units/british-columbia/mission/gill-avenue',                                          fms: 'SiteLink', label: 'U-Lock Mini Storage — Mission, BC'              },

  // --- SSM clients ---
  { url: 'https://www.storagestar.com/storage-units/colorado/colorado-springs/aerotech-drive',                                 fms: 'SSM',      label: 'Storage Star — Colorado Springs, CO'               },
  { url: 'https://www.yourwaystorage.com/storage-units/georgia/augusta/walton-way-ext',                                        fms: 'SSM',      label: 'YourWay Storage — Augusta, GA'                     },
  { url: 'https://smartstorageohio.com/storage-units/ohio/macedonia/bavaria-road',                                             fms: 'SSM',      label: 'Smart Storage Ohio — Macedonia, OH'                },
];


// ============================================================================
// §7  HELPER FUNCTIONS
// ============================================================================

/** Returns UI component site URLs for the current environment. */
export function getStorageSiteUrls(): string[] {
  return STORAGE_SITE_URLS[CURRENT_ENVIRONMENT];
}

/** Returns SPC rent flow URLs for the current environment. */
export function getSinglePageUrls() {
  return {
    customer: SINGLE_PAGE_RENT_URLS[CURRENT_ENVIRONMENT],
  };
}

/** Returns V1 rent flow URLs (admin + customer) for the current environment. */
export function getCurrentUrls() {
  return {
    admin: ADMIN_URLS[CURRENT_ENVIRONMENT],
    customer: CUSTOMER_URLS[CURRENT_ENVIRONMENT],
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
