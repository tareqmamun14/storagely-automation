export enum HelixEnvironment {
  STAGING = 'staging',
  PRODUCTION = 'production'
}

const DEFAULT_ENVIRONMENT = HelixEnvironment.PRODUCTION as HelixEnvironment;

export const HELIX_ENVIRONMENT: HelixEnvironment =
  process.env.HELIX_ENV === 'staging'    ? HelixEnvironment.STAGING    :
  process.env.HELIX_ENV === 'production' ? HelixEnvironment.PRODUCTION :
  DEFAULT_ENVIRONMENT;

// ============================================================================
// §1  HELIX EDITOR
// ============================================================================
// The Helix web editor — sites.apps.mystoragely.com
// Requires tareq@storagely.io login (separate from personal email)
// ============================================================================

export const HELIX_EDITOR_URLS = {
  login: 'https://sites.apps.mystoragely.com',
  editor: 'https://sites.apps.mystoragely.com/editor/websites/website_bsHy80R9XMPVy88/pages?path=%2Ftest',
};

// ============================================================================
// §2  HELIX-BUILT CLIENT SITES (v4)
// ============================================================================
// Production sites built with Helix. These are the public-facing pages
// that Helix generates — validate layout, pricing, rent flow, etc.
//
// To add a new Helix client:
//   1. Add the location URL below
//   2. Add FMS mapping if applicable
// ============================================================================

export interface HelixClientSite {
  url: string;
  label: string;
  fms?: string;
}

export const HELIX_CLIENT_SITES: Record<string, HelixClientSite[]> = {
  // STAGING = the *.test.getstoragely.com Helix stage domain.
  [HelixEnvironment.STAGING]: [
    {
      url: 'https://safeguard.test.getstoragely.com/storage-units/florida/seffner/kingsway-road',
      label: 'Safeguard — Seffner, FL (Helix, stage)',
    },
    {
      url: 'https://safeguard.test.getstoragely.com/storage-units/illinois/bridgeview/harlem-avenue',
      label: 'Safeguard — Bridgeview, IL (Helix, stage)',
    },
  ],
  // PRODUCTION = real customer domains served by Helix.
  [HelixEnvironment.PRODUCTION]: [
    {
      url: 'https://www.safeguardit.com/storage-units/connecticut/bridgeport/west-end-west-side',
      label: 'Safeguard — Bridgeport, CT (Helix, prod)',
    },
  ],
};

export function getHelixClientSites(): HelixClientSite[] {
  return HELIX_CLIENT_SITES[HELIX_ENVIRONMENT] || [];
}
