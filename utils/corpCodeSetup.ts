// utils/corpCodeSetup.ts
// Pre-test setup: logs into staging admin, sets SiteLink Corp Password on Integrations page.
// Reuses existing DataSyncLoginPage and DataSyncIntegrationsPage page objects.
// STAGING ONLY — this is a no-op in production.

import { Browser, BrowserContext } from '@playwright/test';
import { DataSyncLoginPage } from '../pages/DataSyncLoginPage';
import { DataSyncIntegrationsPage } from '../pages/DataSyncIntegrationsPage';
import { CURRENT_ENVIRONMENT, Environment, STAGING_CORP_CODE_CLIENTS } from '../configs/urls';
import { ADMIN_CREDENTIALS } from '../configs/credentials';

// Honors STORAGELY_BUILD_BASE so the Control Panel can point corp-code
// setup at a build-instance host (e.g. https://elastic-hypatia.staging.storagely-api.com).
// When the env var is unset, behavior is identical to before.
const STAGING_BASE = (process.env.STORAGELY_BUILD_BASE?.trim() || 'https://test.staging.storagely-api.com').replace(/\/$/, '');

// Flex URLs use {client}.test.getstoragely.com — the hostname prefix maps to
// the staging admin slug used by STAGING_CORP_CODE_CLIENTS. Add entries here
// when onboarding a new SiteLink client that has both a Flex site and a legacy
// staging admin slug.
const FLEX_HOST_TO_SLUG: Record<string, string> = {
  'safeguard':       'safeguard-self-storage',
  'mini-mall':       'mini-mall-storage',
  'gatekeeper':      'gatekeeper-self-storage',
  'easy-stop':       'easy-stop-storage',
  'storage-boss':    'storage-boss',
  'bluebirdstorage': 'bluebirdstorage',
  'sunbirdstorage':  'sunbirdstorage',
};

/**
 * Extract the client slug from a staging or production URL.
 * Handles both legacy staging URLs and Flex-style URLs:
 *   "https://test.staging.storagely-api.com/safeguard-self-storage/..." → "safeguard-self-storage"
 *   "https://safeguard.test.getstoragely.com/..."                      → "safeguard-self-storage"
 */
export function getClientSlug(url: string): string | null {
  try {
    const urlObj = new URL(url);

    // Flex URLs: {prefix}.test.getstoragely.com → look up the admin slug
    const host = urlObj.hostname;
    if (host.endsWith('.test.getstoragely.com')) {
      const prefix = host.replace('.test.getstoragely.com', '');
      if (prefix in FLEX_HOST_TO_SLUG) return FLEX_HOST_TO_SLUG[prefix];
      // Try partial match (e.g. "fr-ca.minimallstorage" → check if any key is a substring)
      for (const [key, slug] of Object.entries(FLEX_HOST_TO_SLUG)) {
        if (prefix.includes(key)) return slug;
      }
    }

    // Legacy staging: first path segment is the slug
    const parts = urlObj.pathname.split('/').filter(Boolean);
    return parts[0] || null;
  } catch {
    return null;
  }
}

/**
 * Check if a URL belongs to a client that needs corp code setup in staging.
 */
export function needsCorpCodeSetup(url: string): boolean {
  if (CURRENT_ENVIRONMENT !== Environment.STAGING) return false;
  const slug = getClientSlug(url);
  return slug !== null && slug in STAGING_CORP_CODE_CLIENTS;
}

/**
 * Get the corp code for a client URL (returns null if not needed).
 */
export function getCorpCode(url: string): string | null {
  const slug = getClientSlug(url);
  if (!slug) return null;
  return STAGING_CORP_CODE_CLIENTS[slug] ?? null;
}

/**
 * Run the corp code setup flow for a given client URL.
 * Opens a NEW browser context (isolated from the test), logs in, sets corp password, closes.
 * Safe to call for any URL — it's a no-op if the client doesn't need setup.
 */
export async function setupCorpCodeIfNeeded(browser: Browser, testUrl: string): Promise<void> {
  if (!needsCorpCodeSetup(testUrl)) return;

  const slug = getClientSlug(testUrl)!;
  const corpCode = STAGING_CORP_CODE_CLIENTS[slug];
  const creds = ADMIN_CREDENTIALS[Environment.STAGING];

  const loginUrl = `${STAGING_BASE}/${slug}/login`;
  const integrationsUrl = `${STAGING_BASE}/${slug}/admin/integrations`;

  console.log(`\n🔧 CORP CODE SETUP for "${slug}"`);
  console.log(`   Login URL: ${loginUrl}`);
  console.log(`   Integrations URL: ${integrationsUrl}`);

  // Use a separate context so cookies don't leak into the test
  const setupContext: BrowserContext = await browser.newContext();
  const setupPage = await setupContext.newPage();

  try {
    // Step 1: Login
    const loginPage = new DataSyncLoginPage(setupPage);
    await loginPage.goto(loginUrl);
    await loginPage.loginStage(creds.email, creds.password);
    console.log(`   ✅ Logged in as ${creds.email}`);

    // Step 2: Navigate to Integrations and set corp password
    const integrationsPage = new DataSyncIntegrationsPage(setupPage);
    await integrationsPage.goto(integrationsUrl);
    await integrationsPage.setSiteLinkCorpPassword(corpCode);
    console.log(`   ✅ Corp password set for ${slug}`);

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`   ❌ Corp code setup failed for ${slug}: ${msg}`);
    // Don't throw — let the test continue and fail naturally if corp code was actually needed
  } finally {
    await setupPage.close();
    await setupContext.close();
    console.log(`   ✅ Setup context closed — ready for test\n`);
  }
}
