// configs/urls.ts

export enum Environment {
    STAGING = 'staging',
    PRODUCTION = 'production'
  }
  // Switch between environments
  //export const CURRENT_ENVIRONMENT: Environment = Environment.STAGING;
  export const CURRENT_ENVIRONMENT: Environment = Environment.PRODUCTION;

  // Admin URLs
  export const ADMIN_URLS = {
    [Environment.STAGING]: 'https://test.staging.storagely-api.com/distinct-storage/admin',
    [Environment.PRODUCTION]: 'https://distinctstorage.com/admin'
  };
  
  // Customer URLs
  export const CUSTOMER_URLS = {
    [Environment.STAGING]: [
      'https://test.staging.storagely-api.com/distinct-storage/storage-units/connecticut/new-milford/kent-road',
      'https://test.staging.storagely-api.com/rhino-storage/storage-units/louisiana/covington/philip-drive',
      'https://test.staging.storagely-api.com/gatekeeper-self-storage/storage-units/georgia/peachtree-city/senoia-road',
      'https://test.staging.storagely-api.com/storage-boss/storage-units/louisiana/ponchatoula/west-pine-street',
      'https://test.staging.storagely-api.com/smart-self-storage-ohio/storage-units/ohio/macedonia/bavaria-road',

    ],
    [Environment.PRODUCTION]: [
       'https://distinctstorage.com/storage-units/connecticut/new-milford/kent-road',
       'https://rhino-storage.com/storage-units/louisiana/covington/philip-drive',
       'https://gatekeeperstoragega.com/storage-units/georgia/peachtree-city/senoia-road',
       'https://storagedepotla.com/storage-units/louisiana/hammond/north-morrison-blvd',
       'https://smartstorageohio.com/storage-units/ohio/macedonia/bavaria-road',
       ]
  };
  
  // FMS Platform information
export const FMS_PLATFORM: Record<string, string> = {
  'https://distinctstorage.com/storage-units/connecticut/new-milford/kent-road': 'storEDGE',
  'https://rhino-storage.com/storage-units/louisiana/covington/philip-drive': 'SiteLink',
  'https://gatekeeperstoragega.com/storage-units/georgia/peachtree-city/senoia-road': 'SiteLink',
  'https://storagedepotla.com/storage-units/louisiana/ponchatoula/west-pine-street': 'SiteLink',
  'https://smartstorageohio.com/storage-units/ohio/macedonia/bavaria-road' : 'SSM',
};
 
// ============================================
// UI COMPONENT SITE URLS (Home Page, Contact Page, etc.)
// ============================================
// Sites requiring Storerocket (no staging equivalent):
//   - ulok.com → skipped in staging, prints notice
// Sites with empty staging contact page (contact test skipped in staging):
//   - sunbirdstorage, bluebirdstorage, storage-boss (storagedepotla)
// ============================================
export const STORAGE_SITE_URLS = {
  [Environment.STAGING]: [
    'https://test.staging.storagely-api.com/smart-self-storage-ohio/',
    'https://test.staging.storagely-api.com/storage-star/',
    'https://test.staging.storagely-api.com/sunbirdstorage/',
    'https://test.staging.storagely-api.com/bluebirdstorage/',
    'https://test.staging.storagely-api.com/gatekeeper-self-storage/',
    'https://test.staging.storagely-api.com/first-storage/',
    'https://test.staging.storagely-api.com/red-rocks-self-storage/',
    'https://test.staging.storagely-api.com/distinct-storage/',
    'https://test.staging.storagely-api.com/rhino-storage/',
    'https://test.staging.storagely-api.com/storage-boss/',
    // ulok.com — Storerocket, no staging equivalent
    'https://test.staging.storagely-api.com/mini-mall-storage/',
  ],
  [Environment.PRODUCTION]: [
    'https://smartstorageohio.com/',
    'https://storagestar.com/',
    'https://sunbirdstorage.com/',
    'https://bluebirdstorage.ca/',
    'https://gatekeeperstoragega.com/',
    'https://www.firststorage.com/',
    'https://redrocksstorage.com/',
    'https://distinctstorage.com/',
    'https://rhino-storage.com/',
    'https://storagedepotla.com/',
    'https://ulok.com',
    'https://minimallstorage.com/',
  ]
};

// Storerocket-dependent sites (only available in production)
export const STOREROCKET_SITES = ['ulok.com'];

// Staging sites with empty/broken contact pages
export const STAGING_CONTACT_SKIP = ['sunbirdstorage', 'bluebirdstorage', 'storage-boss'];

// ============================================
// STAGING CORP CODE CLIENTS
// ============================================
// Clients that require SiteLink Corp Password setup before rent flows in STAGING.
// Before running SPC or V1 tests for these clients, the automation will:
//   1. Go to {base}/{slug}/login
//   2. Login with admin credentials
//   3. Navigate to Settings > Integrations
//   4. Set SiteLink Corp Password
//   5. Save Changes
// To add a new client: add their slug and corp code below.
// STAGING ONLY — production does not need this.
// ============================================
export const STAGING_CORP_CODE_CLIENTS: Record<string, string> = {
  'bluebirdstorage': '7ou5@H@W9bdM$i',
  // Add more clients here:
  // 'sunbirdstorage': 'their-corp-code',
};

export function getStorageSiteUrls(): string[] {
  return STORAGE_SITE_URLS[CURRENT_ENVIRONMENT];
}

// Legacy alias for backwards compatibility
export const storageSiteUrls = STORAGE_SITE_URLS[Environment.PRODUCTION];

// ============================================
// SINGLE-PAGE RENT FLOW URLS
// ============================================
// These URLs use a single-page layout where Step 4 (Rental Details) 
// and Step 5 (Payment Details) are combined on one page.
// Used by: rentSinglePage-verification.spec.ts
// ============================================
export const SINGLE_PAGE_RENT_URLS = {
  [Environment.STAGING]: [
    'https://test.staging.storagely-api.com/first-storage/storage-units/alabama/huntsville/memorial-parkway-sw',
    'https://test.staging.storagely-api.com/columbia-self-storage/storage-units/new-jersey/south-plainfield/park-avenue',
    'https://test.staging.storagely-api.com/bluebirdstorage/storage-units/alberta/calgary/mayland',
    'https://test.staging.storagely-api.com/sunbirdstorage/storage-units/nc/winston-salem/country-club',   
    'https://test.staging.storagely-api.com/purely-storage/storage-units/washington/pasco/north-road-44',
    'https://test.staging.storagely-api.com/yourway-storage/storage-units/georgia/augusta/walton-way-ext',
    'https://test.staging.storagely-api.com/red-rocks-self-storage/storage-units/colorado/aurora/east-14th-avenuee',  
    'https://test.staging.storagely-api.com/storage-star/storage-units/colorado/colorado-springs/aerotech-drive',
    //'https://test.staging.storagely-api.com/mini-mall-storage/storage-units/alabama/courtland/highway-33',
  ],
  [Environment.PRODUCTION]: [
    'https://www.firststorage.com/storage-units/alabama/huntsville/memorial-parkway-sw',
    'https://www.columbiaselfstorage.com/storage-units/new-jersey/south-plainfield/park-avenue',
    'https://bluebirdstorage.ca/storage-units/alberta/calgary/mayland',
    'https://sunbirdstorage.com/storage-units/nc/winston-salem/country-club',
    'https://purelystorage.com/storage-units/washington/pasco/north-road-44',
    'https://www.yourwaystorage.com/storage-units/georgia/augusta/walton-way-ext',
    'https://ww2.redrocksstorage.com/storage-units/colorado/aurora/east-14th-avenue',
    'https://www.storagestar.com/storage-units/colorado/colorado-springs/aerotech-drive',
    //'https://minimallstorage.com/storage-units/arkansas/batesville/batesville-blvd',
  ]
};

// FMS Platform for Single-Page URLs
export const SINGLE_PAGE_FMS_PLATFORM: Record<string, string> = CURRENT_ENVIRONMENT === Environment.STAGING ? {
  'https://test.staging.storagely-api.com/first-storage/storage-units/alabama/huntsville/memorial-parkway-sw': 'storEDGE',
  'https://test.staging.storagely-api.com/columbia-self-storage/storage-units/new-jersey/south-plainfield/park-avenue': 'storEDGE',
  'https://test.staging.storagely-api.com/bluebirdstorage/storage-units/alberta/calgary/mayland': 'SiteLink',
  'https://test.staging.storagely-api.com/sunbirdstorage/storage-units/nc/winston-salem/country-club': 'SiteLink',
  'https://test.staging.storagely-api.com/purely-storage/storage-units/washington/pasco/north-road-44': 'storEDGE',
  'https://test.staging.storagely-api.com/yourway-storage/storage-units/georgia/augusta/walton-way-ext': 'SSM',
  'https://test.staging.storagely-api.com/red-rocks-self-storage/storage-units/colorado/aurora/east-14th-avenuee': 'SiteLink',
  'https://test.staging.storagely-api.com/storage-star/storage-units/colorado/colorado-springs/aerotech-drive': 'SSM',
  //'https://test.staging.storagely-api.com/mini-mall-storage/storage-units/alabama/courtland/highway-33': 'SiteLink',
} : {
  'https://www.firststorage.com/storage-units/alabama/huntsville/memorial-parkway-sw': 'storEDGE',
  'https://www.columbiaselfstorage.com/storage-units/new-jersey/south-plainfield/park-avenue': 'storEDGE',
  'https://bluebirdstorage.ca/storage-units/alberta/calgary/mayland': 'SiteLink',
  'https://sunbirdstorage.com/storage-units/nc/winston-salem/country-club': 'SiteLink',
  'https://purelystorage.com/storage-units/washington/pasco/north-road-44': 'storEDGE',
  'https://www.yourwaystorage.com/storage-units/georgia/augusta/walton-way-ext': 'SSM',
  'https://ww2.redrocksstorage.com/storage-units/colorado/aurora/east-14th-avenue': 'SiteLink',
  'https://www.storagestar.com/storage-units/colorado/colorado-springs/aerotech-drive': 'SSM',
  //'https://minimallstorage.com/storage-units/arkansas/batesville/batesville-blvd': 'SiteLink',
};

// ============================================
// CAPTCHA CUSTOMER URLS
// ============================================
// URLs where hCaptcha appears before the RENT NOW button.
// The test will pause and prompt the user to solve the captcha manually,
// then continue clicking RENT NOW and capturing the error.
// To add a new captcha customer: just add the URL string to this array.
// ============================================
export const CAPTCHA_CUSTOMER_URLS: string[] = CURRENT_ENVIRONMENT === Environment.STAGING ? [
  'https://test.staging.storagely-api.com/first-storage/storage-units/alabama/huntsville/memorial-parkway-sw',
  'https://test.staging.storagely-api.com/columbia-self-storage/storage-units/new-jersey/south-plainfield/park-avenue',
  'https://test.staging.storagely-api.com/bluebirdstorage/storage-units/alberta/calgary/mayland',
  'https://test.staging.storagely-api.com/sunbirdstorage/storage-units/nc/winston-salem/country-club',
  'https://test.staging.storagely-api.com/purely-storage/storage-units/washington/pasco/north-road-44',
  'https://test.staging.storagely-api.com/yourway-storage/storage-units/georgia/augusta/walton-way-ext',
  'https://test.staging.storagely-api.com/red-rocks-self-storage/storage-units/colorado/golden/west-colfax-avenue',
  'https://test.staging.storagely-api.com/storage-star/storage-units/colorado/colorado-springs/aerotech-drive',
] : [
  'https://www.firststorage.com/storage-units/alabama/huntsville/memorial-parkway-sw',
  'https://www.columbiaselfstorage.com/storage-units/new-jersey/south-plainfield/park-avenue',
  'https://bluebirdstorage.ca/storage-units/alberta/calgary/mayland',
  'https://sunbirdstorage.com/storage-units/nc/winston-salem/country-club',
  'https://purelystorage.com/storage-units/washington/pasco/north-road-44',
  'https://www.yourwaystorage.com/storage-units/georgia/augusta/walton-way-ext',
  'https://ww2.redrocksstorage.com/storage-units/colorado/aurora/east-14th-avenue',
  'https://www.storagestar.com/storage-units/colorado/colorado-springs/aerotech-drive',
];

// ============================================
// STEP-FOUR CAPTCHA URLS
// ============================================
// URLs where hCaptcha appears on Step 4 (before "Continue to next step"),
// NOT before the final RENT NOW button. These customers have a two-step
// flow (Step 4 → Step 5) within the single-page test suite.
// The captcha is handled during form fill, not at RENT NOW time.
// To mute a customer: just comment out or remove their URL.
// ============================================
export const STEP_FOUR_CAPTCHA_URLS: string[] = CURRENT_ENVIRONMENT === Environment.STAGING ? [
  //'https://test.staging.storagely-api.com/mini-mall-storage/storage-units/alabama/courtland/highway-33',
] : [
  //'https://minimallstorage.com/storage-units/arkansas/batesville/batesville-blvd',
];

// Helper function to get single-page URLs based on environment
export function getSinglePageUrls() {
  return {
    customer: SINGLE_PAGE_RENT_URLS[CURRENT_ENVIRONMENT],
  };
}


  // Helper function to get the current set of URLs based on environment
  export function getCurrentUrls() {
    return {
      admin: ADMIN_URLS[CURRENT_ENVIRONMENT],
      customer: CUSTOMER_URLS[CURRENT_ENVIRONMENT],
    };
  }
  
  // Helper function to get company/client name from URL
  export function getCompanyNameFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const host = urlObj.hostname;
      // Extract company name from hostname or path
      if (host.includes('staging')) {
        // For staging URLs, get from path
        const pathParts = urlObj.pathname.split('/');
        return pathParts[1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      } else {
        // For production URLs, get from hostname
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