// configs/urls.ts

export enum Environment {
    STAGING = 'staging',
    PRODUCTION = 'production'
  }
  
  // Switch between environments
 // export const CURRENT_ENVIRONMENT = Environment.STAGING;
  export const CURRENT_ENVIRONMENT = Environment.PRODUCTION;

  // Admin URLs
  export const ADMIN_URLS = {
    [Environment.STAGING]: 'https://test.staging.storagely-api.com/10-federal-storage/admin',
    [Environment.PRODUCTION]: 'https://10federalstorage.com/admin'
  };
  
  // Customer URLs
  export const CUSTOMER_URLS = {
    [Environment.STAGING]: [

      'https://test.staging.storagely-api.com/10-federal-storage/storage-units/georgia/dahlonega/highway-19-north',
      'https://test.staging.storagely-api.com/bestbox-storage/storage-units/florida/pensacola/north-palafox',
      'https://test.staging.storagely-api.com/red-rocks-self-storage/storage-units/colorado/aurora/east-14th-avenue',
      'https://test.staging.storagely-api.com/distinct-storage/storage-units/connecticut/new-milford/kent-road',
      'https://test.staging.storagely-api.com/storage-star/storage-units/colorado/colorado-springs/aerotech-drive',
      'https://test.staging.storagely-api.com/bluebirdstorage/storage-units/alberta/calgary/mayland',
      'https://test.staging.storagely-api.com/sunbirdstorage/storage-units/nc/winston-salem/country-club',
      'https://test.staging.storagely-api.com/rhino-storage/storage-units/louisiana/covington/philip-drive',
      'https://test.staging.storagely-api.com/gatekeeper-self-storage/storage-units/georgia/peachtree-city/senoia-road',
      'https://test.staging.storagely-api.com/storage-boss/storage-units/louisiana/ponchatoula/west-pine-street',
      //'https://test.staging.storagely-api.com/mini-mall-storage/storage-units/alabama/courtland/highway-33', //mini-mall 

    ],
    [Environment.PRODUCTION]: [

      // 'https://10federalstorage.com/storage-units/washington/seattle/des-moines-memorial-drive',
      // 'https://www.bestboxstorage.com/storage-units/florida/pensacola/north-palafox',
      // 'https://redrocksstorage.com/storage-units/colorado/aurora/east-14th-avenue',
      // 'https://distinctstorage.com/storage-units/connecticut/new-milford/kent-road', //500 error
      // 'https://www.storagestar.com/storage-units/colorado/colorado-springs/aerotech-drive', //500 error 
      // 'https://bluebirdstorage.ca/storage-units/alberta/calgary/mayland',
      // 'https://sunbirdstorage.com/storage-units/nc/winston-salem/country-club',
      // 'https://rhino-storage.com/storage-units/louisiana/covington/philip-drive',
      // 'https://gatekeeperstoragega.com/storage-units/georgia/peachtree-city/senoia-road',
      // 'https://storagedepotla.com/storage-units/louisiana/ponchatoula/west-pine-street',
      ]
  };
  
  // FMS Platform information
export const FMS_PLATFORM: Record<string, string> = {
  'https://10federalstorage.com/storage-units/georgia/dahlonega/highway-19-north': 'storEDGE',
  'https://www.bestboxstorage.com/storage-units/florida/pensacola/north-palafox': 'storEDGE',
  'https://yourpremierstorage.com/storage-units/mississippi/magee/simpson-highway-149': 'storEDGE',
  'https://redrocksstorage.com/storage-units/colorado/aurora/east-14th-avenue': 'storEDGE',
  'https://distinctstorage.com/storage-units/connecticut/new-milford/kent-road': 'storEDGE',
  'https://www.storagestar.com/storage-units/colorado/colorado-springs/aerotech-drive': 'SSM',
  'https://bluebirdstorage.ca/storage-units/alberta/calgary/mayland': 'SiteLink',
  'https://sunbirdstorage.com/storage-units/nc/winston-salem/country-club': 'SiteLink',
  'https://rhino-storage.com/storage-units/louisiana/covington/philip-drive': 'SiteLink',
  'https://gatekeeperstoragega.com/storage-units/georgia/peachtree-city/senoia-road': 'SiteLink',
  'https://storagedepotla.com/storage-units/louisiana/ponchatoula/west-pine-street': 'SiteLink',
  'https://app.storagely.io/first-storage/storage-units/north-carolina/fayetteville/raeford-road': 'storEDGE',
};

  
export const storageSiteUrls = [
  'https://smartstorageohio.com/',
  'https://storagestar.com/',
  'https://sunbirdstorage.com/',
  'https://bluebirdstorage.ca/',
  'https://gatekeeperstoragega.com/',
  'https://10federalstorage.com/',
  'https://www.firststorage.com/',
  'https://www.bestboxstorage.com/',
  'https://yourpremierstorage.com/',
  'https://redrocksstorage.com/',
  'https://distinctstorage.com/',
  'https://rhino-storage.com/',
  'https://storagedepotla.com/',
  'https://modboxstorage.com/',
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
    'https://www.columbiaselfstorage.com/storage-units/new-jersey/south-plainfield/park-avenue'
  ]
};

// FMS Platform for Single-Page URLs
export const SINGLE_PAGE_FMS_PLATFORM: Record<string, string> = {
  'https://www.firststorage.com/storage-units/alabama/huntsville/memorial-parkway-sw': 'storEDGE',
  'https://www.columbiaselfstorage.com/storage-units/new-jersey/south-plainfield/park-avenue': 'storEDGE',
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