// configs/urls.ts

export enum Environment {
    STAGING = 'staging',
    PRODUCTION = 'production'
  }
  
  // Switch between environments
  export const CURRENT_ENVIRONMENT = Environment.PRODUCTION;
  
  // Admin URLs
  export const ADMIN_URLS = {
    [Environment.STAGING]: 'https://test.staging.storagely-api.com/10-federal-storage/admin',
    [Environment.PRODUCTION]: 'https://10federalstorage.com/admin'
  };
  
  // Customer URLs
  export const CUSTOMER_URLS = {
    [Environment.STAGING]: [
      'https://test.staging.storagely-api.com/10-federal-storage/storage-units/texas/burleson/south-burleson-blvd',
      'https://test.staging.storagely-api.com/bestbox-storage/storage-units/florida/pensacola/north-palafox',
      'https://test.staging.storagely-api.com/radiant-storage/storage-units/alabama/tuscaloosa/8th-avenue',
      'https://test.staging.storagely-api.com/premier-storage/storage-units/mississippi/laurel/ms-15',
      'https://test.staging.storagely-api.com/red-rocks-self-storage/storage-units/colorado/aurora/east-14th-avenue',
      'https://test.staging.storagely-api.com/distinct-storage/storage-units/connecticut/new-milford/kent-road',
      'https://test.staging.storagely-api.com/storage-star/storage-units/colorado/colorado-springs/aerotech-drive',
      'https://test.staging.storagely-api.com/bluebirdstorage/storage-units/alberta/calgary/mayland',
      'https://test.staging.storagely-api.com/sunbirdstorage/storage-units/nc/winston-salem/country-club',
      'https://test.staging.storagely-api.com/rhino-storage/storage-units/louisiana/covington/philip-drive',
      'https://test.staging.storagely-api.com/gatekeeper-self-storage/storage-units/georgia/peachtree-city/senoia-road',
      'https://test.staging.storagely-api.com/storage-boss/storage-units/louisiana/ponchatoula/west-pine-street',
      'https://test.staging.storagely-api.com/mini-mall-storage/storage-units/arkansas/batesville/batesville-blvd',
      'https://test.staging.storagely-api.com/first-storage/storage-units/north-carolina/fayetteville/raeford-road',
      'https://test.staging.storagely-api.com/allpurposestorage/storage-units/maine/belgrade/manchester-road',
      
    ],
    [Environment.PRODUCTION]: [
      'https://10federalstorage.com/storage-units/texas/arlington/avenue-f',
      'https://www.bestboxstorage.com/storage-units/florida/pensacola/north-palafox',
      'https://radiantstorage.com/storage-units/alabama/tuscaloosa/8th-avenue',
      'https://yourpremierstorage.com/storage-units/mississippi/laurel/ms-15',
      'https://redrocksstorage.com/storage-units/colorado/aurora/east-14th-avenue',
      'https://distinctstorage.com/storage-units/connecticut/new-milford/kent-road',
      'https://www.storagestar.com/storage-units/colorado/colorado-springs/aerotech-drive',
      'https://bluebirdstorage.ca/storage-units/alberta/calgary/mayland',
      'https://sunbirdstorage.com/storage-units/nc/winston-salem/country-club',
      'https://rhino-storage.com/storage-units/louisiana/covington/philip-drive',
      'https://gatekeeperstoragega.com/storage-units/georgia/peachtree-city/senoia-road',
      'https://storagedepotla.com/storage-units/louisiana/ponchatoula/west-pine-street',
      'https://app.storagely.io/mini-mall-storage/storage-units/arkansas/batesville/batesville-blvd',
      'https://app.storagely.io/first-storage/storage-units/north-carolina/fayetteville/raeford-road',
      'https://app.storagely.io/allpurposestorage/storage-units/maine/belgrade/manchester-road',
    ]
  };
  
  // FMS Platform information
  export const FMS_PLATFORM: Record<string, string> = {
      'https://10federalstorage.com/storage-units/north-carolina/high-point/greensboro-road': 'storEDGE',
      'https://www.bestboxstorage.com/storage-units/missouri/ofallon/highway-k': 'storEDGE',
      'https://radiantstorage.com/storage-units/texas/galveston/church-street': 'storEDGE',
      'https://yourpremierstorage.com/storage-units/mississippi/laurel/ms-15': 'storEDGE',
      'https://redrocksstorage.com/storage-units/colorado/aurora/east-14th-avenue': 'storEDGE',
      'https://distinctstorage.com/storage-units/connecticut/new-milford/kent-road': 'storEDGE',
      'https://www.storagestar.com/storage-units/colorado/colorado-springs/aerotech-drive': 'SSM',
      'https://bluebirdstorage.ca/storage-units/alberta/calgary/blackfoot-trail': 'SiteLink',
      'https://sunbirdstorage.com/storage-units/nc/winston-salem/country-club-road': 'SiteLink',
      'https://rhino-storage.com/storage-units/louisiana/covington/philip-drive': 'SiteLink',
      'https://gatekeeperstoragega.com/storage-units/georgia/peachtree-city/senoia-road': 'SiteLink',
      'https://storagedepotla.com/storage-units/louisiana/ponchatoula/west-pine-street': 'SiteLink',
      'https://app.storagely.io/mini-mall-storage/storage-units/alabama/courtland/highway-33': 'SiteLink',
      'https://app.storagely.io/first-storage/storage-units/north-carolina/fayetteville/raeford-road' : 'storEDGE',
      'https://app.storagely.io/allpurposestorage/storage-units/maine/belgrade/manchester-road' : 'storEDGE',

  };
  
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