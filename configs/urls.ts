// configs/urls.ts

export enum Environment {
    STAGING = 'staging',
    PRODUCTION = 'production'
  }
  
  // Switch between environments
  //export const CURRENT_ENVIRONMENT = Environment.STAGING;
  export const CURRENT_ENVIRONMENT = Environment.PRODUCTION;

  // Admin URLs
  export const ADMIN_URLS = {
    [Environment.STAGING]: 'https://test.staging.storagely-api.com/distinct-storage/admin',
    [Environment.PRODUCTION]: 'https://distinctstorage.com/admin'
  };
  
  // Customer URLs
  export const CUSTOMER_URLS = {
    [Environment.STAGING]: [
      'https://test.staging.storagely-api.com/distinct-storage/storage-units/connecticut/new-milford/kent-road',
      'https://test.staging.storagely-api.com/storage-star/storage-units/colorado/colorado-springs/aerotech-drive',
      'https://test.staging.storagely-api.com/rhino-storage/storage-units/louisiana/covington/philip-drive',
      'https://test.staging.storagely-api.com/gatekeeper-self-storage/storage-units/georgia/peachtree-city/senoia-road',
      'https://test.staging.storagely-api.com/storage-boss/storage-units/louisiana/ponchatoula/west-pine-street',



    ],
    [Environment.PRODUCTION]: [
       'https://distinctstorage.com/storage-units/connecticut/new-milford/kent-road'
      // 'https://www.storagestar.com/storage-units/colorado/colorado-springs/aerotech-drive', 
      // 'https://rhino-storage.com/storage-units/louisiana/covington/philip-drive',
      // 'https://gatekeeperstoragega.com/storage-units/georgia/peachtree-city/senoia-road',
      // 'https://storagedepotla.com/storage-units/louisiana/hammond/north-morrison-blvd',
       ]
  };
  
  // FMS Platform information
export const FMS_PLATFORM: Record<string, string> = {
  'https://ww2.redrocksstorage.com/storage-units/colorado/aurora/east-14th-avenue': 'storEDGE',
  'https://distinctstorage.com/storage-units/connecticut/new-milford/kent-road': 'storEDGE',
  'https://www.storagestar.com/storage-units/colorado/colorado-springs/aerotech-drive': 'SSM',
  'https://rhino-storage.com/storage-units/louisiana/covington/philip-drive': 'SiteLink',
  'https://gatekeeperstoragega.com/storage-units/georgia/peachtree-city/senoia-road': 'SiteLink',
  'https://storagedepotla.com/storage-units/louisiana/ponchatoula/west-pine-street': 'SiteLink',
};

  
export const storageSiteUrls = [
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
  'https://ulok.com'
];

// ============================================
// SINGLE-PAGE RENT FLOW URLS
// ============================================
// These URLs use a single-page layout where Step 4 (Rental Details) 
// and Step 5 (Payment Details) are combined on one page.
// Used by: rentSinglePage-verification.spec.ts
// ============================================
export const SINGLE_PAGE_RENT_URLS = {
  [Environment.STAGING]: [
    // Add staging URLs here if needed
  ],
  [Environment.PRODUCTION]: [
    'https://www.firststorage.com/storage-units/alabama/huntsville/memorial-parkway-sw',
    'https://www.columbiaselfstorage.com/storage-units/new-jersey/south-plainfield/park-avenue',
    'https://bluebirdstorage.ca/storage-units/alberta/calgary/mayland',
    'https://sunbirdstorage.com/storage-units/nc/winston-salem/country-club',
    'https://purelystorage.com/storage-units/arizona/buckeye/west-yuma-road',
    'https://www.yourwaystorage.com/storage-units/georgia/augusta/walton-way-ext',
    'https://ww2.redrocksstorage.com/storage-units/colorado/aurora/east-14th-avenue'
  ]
};

// FMS Platform for Single-Page URLs
export const SINGLE_PAGE_FMS_PLATFORM: Record<string, string> = {
  'https://www.firststorage.com/storage-units/alabama/huntsville/memorial-parkway-sw': 'storEDGE',
  'https://www.columbiaselfstorage.com/storage-units/new-jersey/south-plainfield/park-avenue': 'storEDGE',
  'https://bluebirdstorage.ca/storage-units/alberta/calgary/mayland': 'SiteLink',
  'https://sunbirdstorage.com/storage-units/nc/winston-salem/country-club': 'SiteLink',
  'https://purelystorage.com/storage-units/arizona/buckeye/west-yuma-road': 'storEDGE',
  'https://www.yourwaystorage.com/storage-units/georgia/augusta/walton-way-ext': 'SSM',
  'https://ww2.redrocksstorage.com/storage-units/colorado/aurora/east-14th-avenue': 'SiteLink'
};

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