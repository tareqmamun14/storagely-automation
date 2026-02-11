// configs/data-sync-config.ts
// Configuration for Data Sync tests - independent of all other configs
//
// ─── HOW TO USE ──────────────────────────────────────────────────────
//  1. Switch environment by commenting/uncommenting CURRENT_ENV below
//  2. Comment/uncomment clients in DATA_SYNC_CLIENTS array
//  3. Run single command:
//       npx playwright test data-sync-verification.spec.ts --headed
// ─────────────────────────────────────────────────────────────────────

export type FmsType = 'SiteLink' | 'storEDGE' | 'SSM';

export interface DataSyncClient {
  name: string;
  slug: string;            // URL slug e.g. 'gate-5'
  fmsType: FmsType;
  syncRowDescription: string;  // Row 1 description text to match
}

// ─── Switch between environments (comment/uncomment) ─────────────────
//export const CURRENT_ENV: 'stage' | 'prod' = 'stage';
export const CURRENT_ENV: 'stage' | 'prod' = 'prod';

// ─── Client Definitions ─────────────────────────────────────────────
export const SITELINK_CLIENT: DataSyncClient = {
  name: 'Gate 5 Self Storage',
  slug: 'gate-5',
  fmsType: 'SiteLink',
  syncRowDescription: 'Sync SiteLink Locations',
};

export const STOREDGE_CLIENT: DataSyncClient = {
  name: 'Storagely Self Storage',
  slug: 'storagelyselfstorage',
  fmsType: 'storEDGE',
  syncRowDescription: 'Sync StorEDGE Locations',
};

export const SSM_CLIENT: DataSyncClient = {
  name: 'Smart Self Storage Ohio',
  slug: 'smart-self-storage-ohio',
  fmsType: 'SSM',
  syncRowDescription: 'Sync SSM Locations',
};

// ─── CLIENTS TO RUN (comment/uncomment to control) ───────────────────
export const DATA_SYNC_CLIENTS: DataSyncClient[] = [

  SITELINK_CLIENT,       // SiteLink  (gate-5)

  STOREDGE_CLIENT,       // storEDGE  (storagelyselfstorage)
  SSM_CLIENT,            // SSM       (smart-self-storage-ohio)

];

// ─── Environment Base URLs ───────────────────────────────────────────
export const BASE_URLS = {
  stage: 'https://test.staging.storagely-api.com',
  prod: 'https://app.storagely.io',
};

// ─── Credentials ─────────────────────────────────────────────────────
export const CREDENTIALS = {
  stage: {
    email: 'admin@localhost.com',
    password: 'adminadmin',
  },
  prod: {
    email: 'tareq@storagely.io',
    password: 'XcgymAY5fPWkQer',
  },
};

// ─── SiteLink Stage Exception ────────────────────────────────────────
export const SITELINK_STAGE_CORP_PASSWORD = 'Gate5rocks!';

// ─── Helper Functions ────────────────────────────────────────────────
export function getLoginUrl(slug: string): string {
  return `${BASE_URLS[CURRENT_ENV]}/${slug}/login`;
}

export function getDataSyncUrl(slug: string): string {
  return `${BASE_URLS[CURRENT_ENV]}/${slug}/admin/data-sync`;
}

export function getIntegrationsUrl(slug: string): string {
  return `${BASE_URLS[CURRENT_ENV]}/${slug}/admin/integrations`;
}
