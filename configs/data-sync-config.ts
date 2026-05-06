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
// Default (used when Control Panel does not override via STORAGELY_DS_ENV):
const _DEFAULT_DS_ENV: 'stage' | 'prod' = 'stage';
//const _DEFAULT_DS_ENV: 'stage' | 'prod' = 'prod';

export const CURRENT_ENV: 'stage' | 'prod' =
  process.env.STORAGELY_DS_ENV === 'stage' ? 'stage' :
  process.env.STORAGELY_DS_ENV === 'prod'  ? 'prod'  :
  _DEFAULT_DS_ENV;

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
// Default list (used when Control Panel does not override).
const _DEFAULT_DATA_SYNC_CLIENTS: DataSyncClient[] = [

  SITELINK_CLIENT,       // SiteLink  (gate-5)

  STOREDGE_CLIENT,       // storEDGE  (storagelyselfstorage)
  SSM_CLIENT,            // SSM       (smart-self-storage-ohio)

];

// Control-Panel override: STORAGELY_DS_CLIENTS = comma-separated FMS types
// to KEEP, e.g. "SiteLink,SSM". When unset, the default list above is used.
function _filteredDsClients(): DataSyncClient[] {
  const raw = process.env.STORAGELY_DS_CLIENTS;
  if (!raw || !raw.trim()) return _DEFAULT_DATA_SYNC_CLIENTS;
  const want = raw.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  if (want.length === 0) return _DEFAULT_DATA_SYNC_CLIENTS;
  const all: DataSyncClient[] = [SITELINK_CLIENT, STOREDGE_CLIENT, SSM_CLIENT];
  return all.filter(c => want.includes(c.fmsType.toLowerCase()));
}

export const DATA_SYNC_CLIENTS: DataSyncClient[] = _filteredDsClients();

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
// Override with STORAGELY_SITELINK_STAGE_PWD if set by Control Panel.
export const SITELINK_STAGE_CORP_PASSWORD =
  process.env.STORAGELY_SITELINK_STAGE_PWD?.trim() || 'Gate5rocks!';

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
