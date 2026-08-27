import { test } from '../fixtures/rentReserveSPC-fixture';
import { RESERVATION_TARGETS, reservationEnabled, designatedUrlFor, RESERVATION_TENANT } from '../configs/reservations';
import { recordReservation } from '../utils/reservationRecord';
import { setupCorpCodeIfNeeded } from '../utils/corpCodeSetup';
import { CURRENT_ENVIRONMENT } from '../configs/urls';
import { takeErrorScreenshot } from '../utils/screenshot';

/**
 * ============================================
 * 📝 RESERVATION SUBMISSION SUITE
 * ============================================
 * Standalone — its own playwright process, launched by the control panel
 * whenever the 📝 Reservation toggle is ON (STORAGELY_RESERVATION), fully
 * independent of which other suites run.
 *
 * Per enabled client (configs/reservations.ts):
 *   1. Open the FIXED designated location (env-appropriate URL, cache-busted,
 *      build-host aware) — never a rotated/regular test location.
 *   2. Corp-code setup when staging SiteLink (no-op on prod).
 *   3. Click Reserve → fill tenant details → hCaptcha (manual solve on prod,
 *      🛑 banner + panel beep) → RESERVE THIS UNIT.
 *   4. REQUIRE the confirmation message — an error, or silence, FAILS the test.
 *   5. On pass: record to control-panel/reservations/ + auto-post the
 *      cancellation message to Slack (utils/reservationRecord.ts).
 *
 * This suite never runs a rental — the regular suites own that coverage.
 */
test.describe('📝 Reservation Submissions', () => {
  test.describe.configure({ retries: 0 });

  for (const target of RESERVATION_TARGETS.filter(t => t.driver === 'legacy-spc')) {
    const customer = target.label.split(' — ')[0];

    test(`Reservation submission — ${target.label}`, async ({ page, storageListingPage }) => {
      test.skip(!reservationEnabled(target.key), `${target.key} not enabled via STORAGELY_RESERVATION`);
      const url = designatedUrlFor(target);
      test.skip(!url, `${target.key} has no designated ${CURRENT_ENVIRONMENT} location`);
      test.setTimeout(0); // prod reserve modals gate the submit behind a manual hCaptcha

      const rsvName = `📝 Reservation — ${customer}`;
      console.log(`\n${'='.repeat(80)}`);
      console.log(`🏢 TESTING: ${rsvName}`);
      console.log(`⚙️  Platform: ${target.fms}`);
      console.log(`📍 Fixed reservation location (${CURRENT_ENVIRONMENT}): ${url}`);
      console.log('='.repeat(80));

      // Corp-code setup (staging SiteLink only — no-op in production).
      const browser = page.context().browser();
      if (browser) await setupCorpCodeIfNeeded(browser, url!);

      await storageListingPage.navigateWithCacheBusting(url!);
      const rsv = await storageListingPage.submitReservation(RESERVATION_TENANT, customer);

      if (rsv.ok) {
        recordReservation({
          client: target.key, label: target.label, locationUrl: url!,
          unit: rsv.unit || '(see modal capture in log)', tenant: RESERVATION_TENANT,
          confirmation: rsv.message, env: CURRENT_ENVIRONMENT, submittedAt: new Date().toISOString(),
        });
        console.log(`\n✅ TEST COMPLETED FOR: ${rsvName}`);
        console.log(`📊 Result: ${rsv.message}`);
      } else {
        console.error(`\n❌ TEST FAILED FOR: ${rsvName}`);
        console.error(`💥 Error: ${rsv.message}`);
        await takeErrorScreenshot(page, `reservation-${target.key}`).catch(() => {});
        throw new Error(`RESERVATION FAILED for ${customer}: ${rsv.message}`);
      }
    });
  }
});
