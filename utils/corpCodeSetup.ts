// utils/corpCodeSetup.ts
// Pre-test setup: logs into staging admin, sets SiteLink Corp Password on Integrations page.
// Reuses existing DataSyncLoginPage and DataSyncIntegrationsPage page objects.
// STAGING ONLY — this is a no-op in production.

import { Browser, BrowserContext } from '@playwright/test';
import { DataSyncLoginPage } from '../pages/DataSyncLoginPage';
import { DataSyncIntegrationsPage } from '../pages/DataSyncIntegrationsPage';
import { CURRENT_ENVIRONMENT, Environment, STAGING_CORP_CODE_CLIENTS } from '../configs/urls';
import { ADMIN_CREDENTIALS } from '../configs/credentials';

const STAGING_BASE = 'https://test.staging.storagely-api.com';

/**
 * Extract the client slug from a staging or production URL.
 * e.g. "https://test.staging.storagely-api.com/bluebirdstorage/storage-units/..." → "bluebirdstorage"
 */
export function getClientSlug(url: string): string | null {
  try {
    const urlObj = new URL(url);
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
