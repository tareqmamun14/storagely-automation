export enum FlexEnvironment {
  STAGING = 'staging',
  PRODUCTION = 'production'
}

const DEFAULT_ENVIRONMENT = FlexEnvironment.PRODUCTION as FlexEnvironment;

export const FLEX_ENVIRONMENT: FlexEnvironment =
  process.env.FLEX_ENV === 'staging'    ? FlexEnvironment.STAGING    :
  process.env.FLEX_ENV === 'production' ? FlexEnvironment.PRODUCTION :
  DEFAULT_ENVIRONMENT;

// ============================================================================
// §1  FLEX EDITOR
// ============================================================================
// The Flex web editor — sites.apps.mystoragely.com
// Requires tareq@storagely.io login (separate from personal email)
// ============================================================================

export const FLEX_EDITOR_URLS = {
  login: 'https://sites.apps.mystoragely.com',
  editor: 'https://sites.apps.mystoragely.com/editor/websites/website_bsHy80R9XMPVy88/pages?path=%2Ftest',
};

// ============================================================================
// §2  FLEX-BUILT CLIENT SITES (v4)
// ============================================================================
// Production sites built with Flex. These are the public-facing pages
// that Flex generates — validate layout, pricing, rent flow, etc.
//
// To add a new Flex client:
//   1. Add the location URL below
//   2. Add FMS mapping if applicable
// ============================================================================

export interface FlexClientSite {
  url: string;
  label: string;
  fms?: string;
}

export const FLEX_CLIENT_SITES: Record<string, FlexClientSite[]> = {
  // STAGING = the *.test.getstoragely.com Flex stage domain.
  [FlexEnvironment.STAGING]: [
    {
      url: 'https://safeguard.test.getstoragely.com/storage-units/florida/seffner/kingsway-road',
      label: 'Safeguard — Seffner, FL (Flex, stage)',
    },
    {
      url: 'https://safeguard.test.getstoragely.com/storage-units/illinois/bridgeview/harlem-avenue',
      label: 'Safeguard — Bridgeview, IL (Flex, stage)',
    },
  ],
  // PRODUCTION = real customer domains served by Flex.
  [FlexEnvironment.PRODUCTION]: [
    {
      url: 'https://www.safeguardit.com/storage-units/connecticut/bridgeport/west-end-west-side',
      label: 'Safeguard — Bridgeport, CT (Flex, prod)',
    },
  ],
};

export function getFlexClientSites(): FlexClientSite[] {
  return FLEX_CLIENT_SITES[FLEX_ENVIRONMENT] || [];
}
