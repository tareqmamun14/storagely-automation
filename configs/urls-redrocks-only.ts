// Temporary URLs file to test only Red Rocks
export enum Environment {
    STAGING = 'staging',
    PRODUCTION = 'production'
  }
  
export const CURRENT_ENVIRONMENT = Environment.STAGING;

export const ADMIN_URLS = {
  [Environment.STAGING]: 'https://test.staging.storagely-api.com/10-federal-storage/admin',
  [Environment.PRODUCTION]: 'https://10federalstorage.com/admin'
};

// Only Red Rocks for testing
export const CUSTOMER_URLS = {
  [Environment.STAGING]: [
    'https://test.staging.storagely-api.com/red-rocks-self-storage/storage-units/colorado/aurora/east-14th-avenue',
  ],
  [Environment.PRODUCTION]: [
    'https://redrocksstorage.com/storage-units/colorado/aurora/east-14th-avenue',
  ]
};

export const FMS_PLATFORM: Record<string, string> = {
  'https://redrocksstorage.com/storage-units/colorado/aurora/east-14th-avenue': 'storEDGE',
};

export const storageSiteUrls = [
  'https://redrocksstorage.com/',
];

export function getCurrentUrls() {
  return {
    admin: ADMIN_URLS[CURRENT_ENVIRONMENT],
    customer: CUSTOMER_URLS[CURRENT_ENVIRONMENT],
  };
}

export function getCompanyNameFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const host = urlObj.hostname;
    if (host.includes('staging')) {
      const pathParts = urlObj.pathname.split('/');
      return pathParts[1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    } else {
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
