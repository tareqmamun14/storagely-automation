// tests/data-sync-verification.spec.ts
// Data Sync verification tests for SiteLink, storEDGE, and SSM clients
//
// ─── HOW TO RUN ──────────────────────────────────────────────────────
//
//  Single command (runs whatever is active in data-sync-config.ts):
//
//    npx playwright test data-sync-verification.spec.ts --headed
//
//  To switch environment:
//    Open configs/data-sync-config.ts and toggle CURRENT_ENV:
//      export const CURRENT_ENV: 'stage' | 'prod' = 'stage';
//      //export const CURRENT_ENV: 'stage' | 'prod' = 'prod';
//
//  To run only specific clients:
//    Comment/uncomment in DATA_SYNC_CLIENTS array in data-sync-config.ts:
//      export const DATA_SYNC_CLIENTS: DataSyncClient[] = [
//        SITELINK_CLIENT,
//        //STOREDGE_CLIENT,   // ← commented = skipped
//        //SSM_CLIENT,        // ← commented = skipped
//      ];
//
// ─────────────────────────────────────────────────────────────────────

import { test, expect, Page, BrowserContext } from '@playwright/test';
import { DataSyncLoginPage } from '../pages/DataSyncLoginPage';
import { DataSyncIntegrationsPage } from '../pages/DataSyncIntegrationsPage';
import { DataSyncPage } from '../pages/DataSyncPage';
import {
  CURRENT_ENV,
  DATA_SYNC_CLIENTS,
  CREDENTIALS,
  SITELINK_STAGE_CORP_PASSWORD,
  getLoginUrl,
  getDataSyncUrl,
  getIntegrationsUrl,
  type DataSyncClient,
} from '../configs/data-sync-config';

// =====================================================================
// RESULT COLLECTOR — accumulates results for final summary
// =====================================================================
interface SyncResult {
  client: string;
  fmsType: string;
  env: string;
  sync: string;
  result: string;
  status: '✅ PASS' | '❌ FAIL';
}
const allResults: SyncResult[] = [];

// Disable Playwright's built-in artifact recording — we manage our own context
// This avoids EBUSY file-lock errors from OneDrive syncing test-results/
test.use({ trace: 'off', video: 'off', screenshot: 'off' });

// =====================================================================
// TESTS — login once, then run all clients on the same page/session
// =====================================================================
test.describe(`Data Sync — ${CURRENT_ENV.toUpperCase()} Environment`, () => {
  test.describe.configure({ mode: 'serial', retries: 0 });

  let sharedContext: BrowserContext;
  let sharedPage: Page;

  // ─── LOGIN ONCE before all tests ──────────────────────────────
  test.beforeAll(async ({ browser }) => {
    sharedContext = await browser.newContext();
    sharedPage = await sharedContext.newPage();

    const firstClient = DATA_SYNC_CLIENTS[0];
    const loginPage = new DataSyncLoginPage(sharedPage);
    const creds = CREDENTIALS[CURRENT_ENV];
    const loginUrl = getLoginUrl(firstClient.slug);

    console.log(`\n🔐 Logging in once at: ${loginUrl}`);
    await loginPage.goto(loginUrl);

    if (CURRENT_ENV === 'stage') {
      await loginPage.loginStage(creds.email, creds.password);
    } else {
      await loginPage.loginProd(creds.email, creds.password);
    }

    // SiteLink Stage Exception — set corp password
    if (firstClient.fmsType === 'SiteLink' && CURRENT_ENV === 'stage') {
      const integrationsPage = new DataSyncIntegrationsPage(sharedPage);
      const integrationsUrl = getIntegrationsUrl(firstClient.slug);
      console.log(`🔧 SiteLink stage exception — navigating to integrations: ${integrationsUrl}`);
      await integrationsPage.goto(integrationsUrl);
      await integrationsPage.setSiteLinkCorpPassword(SITELINK_STAGE_CORP_PASSWORD);
    }

    console.log('✅ Login complete — session will be reused for all clients\n');
  });

  // ─── CLEANUP + FINAL SUMMARY after all tests ─────────────────
  test.afterAll(async () => {
    const total = allResults.length;
    const passed = allResults.filter(r => r.status === '✅ PASS').length;
    const failed = total - passed;

    console.log(`\n\n`);
    console.log(`╔═══════════════════════════════════════════════════════════════╗`);
    console.log(`║          📋  DATA SYNC — FINAL SUMMARY                       ║`);
    console.log(`╠═══════════════════════════════════════════════════════════════╣`);

    for (const r of allResults) {
      console.log(`║  ${r.status}  🏢 ${r.client} (${r.fmsType})`);
      console.log(`║        🔄 ${r.sync}`);
      console.log(`║        📊 Last Update: ${r.result}`);
      console.log(`║`);
    }

    console.log(`╠═══════════════════════════════════════════════════════════════╣`);
    console.log(`║  🌐 Environment : ${allResults[0]?.env ?? CURRENT_ENV.toUpperCase()}`);
    console.log(`║  📦 Total       : ${total}    ✅ Passed: ${passed}    ❌ Failed: ${failed}`);
    console.log(`╚═══════════════════════════════════════════════════════════════╝`);
    console.log(`\n`);

    sharedContext?.close().catch(() => {});
  });

  // ─── PER-CLIENT TESTS — no re-login, just navigate to data-sync ──
  for (const client of DATA_SYNC_CLIENTS) {
    test(`Data Sync - ${client.fmsType} (${client.name}) [${CURRENT_ENV}]`, async () => {
      test.setTimeout(600000); // 10 min

      const dataSyncPage = new DataSyncPage(sharedPage);
      const dataSyncUrl = getDataSyncUrl(client.slug);

      try {
        console.log(`\n📊 Navigating to Data Sync page: ${dataSyncUrl}`);
        await dataSyncPage.goto(dataSyncUrl);

        // Perform sync → poll Working/Queue → read last update
        const lastUpdate = await dataSyncPage.performSyncAndGetLastUpdate(
          client.syncRowDescription
        );

        // Collect result
        const passed = lastUpdate !== 'Not yet synced' && lastUpdate.length > 0;
        allResults.push({
          client: client.name,
          fmsType: client.fmsType,
          env: CURRENT_ENV.toUpperCase(),
          sync: client.syncRowDescription,
          result: lastUpdate,
          status: passed ? '✅ PASS' : '❌ FAIL',
        });

        if (!passed) {
          console.log(`❌ ${client.name} — Last Update was empty or not synced`);
        }
      } catch (err) {
        // Record failure but DON'T throw — let next client run
        const msg = (err as Error).message?.slice(0, 100) ?? 'Unknown error';
        console.log(`\n❌ ${client.name} FAILED: ${msg}`);
        allResults.push({
          client: client.name,
          fmsType: client.fmsType,
          env: CURRENT_ENV.toUpperCase(),
          sync: client.syncRowDescription,
          result: `ERROR: ${msg}`,
          status: '❌ FAIL',
        });
      }
    });
  }
});
