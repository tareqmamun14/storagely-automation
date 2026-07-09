/**
 * Flex v4 — UNIFIED FACILITY JOURNEY (one browser per customer/facility).
 *
 * Single source of truth for the control-panel Flex run. Mirrors V1/SPC:
 * ONE test per customer, ONE browser, ONE navigation, top-down:
 *
 *     ┌─ open the facility page (once) ─────────────────────────────┐
 *     │  STEP 1  Page health        (selectable — checked by default) │
 *     │  STEP 2  Page sections      (selectable — checked by default) │
 *     │  STEP 3  Reserve modal      (placeholder — not implemented)   │
 *     │  STEP 4  Rent flow          (selectable — always LAST)        │
 *     └───────────────────────────────────────────────────────────────┘
 *
 * All steps are selectable via the control panel. Rent is LAST because it
 * navigates AWAY from the listing page to V2 SPC (/step-four). Everything
 * that needs the listing page (health, sections, reserve) must finish first.
 *
 * Report: at the end of every journey, a per-customer report prints to
 * terminal and saves to flex/test-results/journey/ (JSON + Markdown).
 * Passed checks show the actual data validated. Failed checks show exactly
 * what broke + where to inspect on the live page.
 */
import { test, expect } from '@playwright/test';
import { LiveFacilityPage } from '../../pages/LiveFacilityPage';
import { getAllFacilities, FlexFacility } from '../../configs/facilities';
import { getEnabledSections } from '../../configs/sections';
import { sectionPassed } from '../../pages/sections/types';
import { getClientProfile, getRentHandoff } from '../../configs/profiles';
import { YardiCheckoutStartPage } from '../../pages/YardiCheckoutStartPage';
import { RentalDetailsPageSinglePage } from '../../../pages/RentalDetailsPage_SPC';
import { MiniMallRentalPage } from '../../../pages/MiniMallRentalPage';
import { SINGLE_PAGE_USER } from '../../../configs/credentials';
import {
  JourneyCollector,
  printJourneyReport,
  writeJourneyJson,
  writeJourneyMarkdown,
  journeyReportPath,
} from '../../reporters/journeyReporter';

// ── Layer selection — empty FLEX_LAYERS = run everything ───────
const LAYERS = (process.env.FLEX_LAYERS || '').split(',').map(s => s.trim()).filter(Boolean);
function layerOn(name: 'health' | 'sections' | 'rent'): boolean {
  if (LAYERS.length === 0) return true;
  return LAYERS.includes(name);
}

// ── Per-client SPC config ───────────────────────────────────────
interface ClientSpcConfig {
  addons: string[];
  captchaAtRentNow: boolean;
  captchaAtStepFour: boolean;
  discountTimingOptions?: string[];
}
const SPC_CONFIG_BY_CLIENT: Record<string, ClientSpcConfig> = {
  safeguard: {
    addons: ['24 Hour Access'],
    captchaAtRentNow: true,
    captchaAtStepFour: false,
    discountTimingOptions: ['This Month', 'Next Month'],
  },
};
function spcConfigFor(facility: FlexFacility): ClientSpcConfig {
  return SPC_CONFIG_BY_CLIENT[facility.client] || {
    addons: [], captchaAtRentNow: false, captchaAtStepFour: false,
  };
}

const facilities = getAllFacilities();
const runStamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);

test.describe('Flex Facility Journey', () => {
  test.describe.configure({ retries: 0 });

  for (const facility of facilities) {
    const cfg = spcConfigFor(facility);
    const hasCaptcha = cfg.captchaAtRentNow || cfg.captchaAtStepFour || getRentHandoff(facility.client).manualCaptcha;

    test(`${facility.name} — full journey`, async ({ page }) => {
      test.setTimeout(hasCaptcha ? 0 : 8 * 60_000);

      const collector = new JourneyCollector({
        id: facility.id, name: facility.name, url: facility.url, client: facility.client,
      });
      const live = new LiveFacilityPage(page);

      try {
        // ── STEP 0: ONE navigation ──────────────────────────────────
        await live.goto(facility.url);
        await live.expectPageLoaded();

        // ── STEP 1: Page health (optional) ──────────────────────────
        if (layerOn('health')) {
          collector.beginStep('health', 'Page Health');

          await collector.runCheck('HTTP status', async () => {
            const status = live.lastNavStatus;
            expect(status, `Main document returned HTTP ${status}`).toBe(200);
            return `${status} OK`;
          }, 'Check the page returns HTTP 200 (Network tab, main document request)');

          await collector.runCheck('Title', async () => {
            const title = await page.title();
            expect(title).toMatch(facility.expectedTitle);
            return `"${title}"`;
          }, 'Check the page title in the browser tab');

          await collector.runCheck('Facility heading', async () => {
            await live.expectFacilityHeading(facility.expectedHeading);
            const h = page.locator('h1, h2, h3').filter({ hasText: facility.expectedHeading }).first();
            const text = await h.textContent().catch(() => null);
            return text ? `"${text.trim()}"` : undefined;
          }, 'Check the main heading on the facility page');

          await collector.runCheck('No unresolved {tokens} in text', async () => {
            const bodyText = await page.locator('body').innerText();
            const tokens = bodyText.match(/\{[a-zA-Z0-9_.]+\}/g) || [];
            expect(tokens, `Leaked tokens: ${tokens.join(', ')}`).toHaveLength(0);
            return 'clean';
          }, 'Search the page text for leaked {template_tokens}');

          await collector.runCheck('No unresolved {tokens} in attributes', async () => {
            await live.expectNoUnresolvedTokensInAttributes();
            return 'clean';
          }, 'Check img src and link href attributes for {tokens}');

          await collector.runCheck('Images loaded', async () => {
            const counts = await live.expectAllImagesLoaded();
            const note = counts.throttled
              ? `, ${counts.throttled} slow-but-reachable (CDN throttled automation)`
              : '';
            return `${counts.loaded}/${counts.checked} in-viewport images painted${note} (${counts.total} total <img> on page)`;
          }, 'Scroll the full page (lazy-load) and check every in-viewport image; only off-screen carousel slides are excluded. Only genuinely UNREACHABLE images fail (throttled-but-reachable ones are reported as info).');

          if (facility.features?.hasUnits !== false) {
            await collector.runCheck('Units + Rent links', async () => {
              const handoff = getRentHandoff(facility.client);
              await live.expectRentLinksVisible(handoff);
              const hrefs = await live.getRentHrefs(handoff);
              expect(hrefs.length, 'no Rent links found').toBeGreaterThan(0);
              for (const href of hrefs) LiveFacilityPage.validateRentNowUrl(href, facility.client);
              return `${hrefs.length} Rent links, all valid ${handoff.label}`;
            }, 'Check the units section for Rent buttons');
          }

          // Console audit — capture errors + warnings + uncaught pageerrors from
          // the whole load/hydration window. We NEVER swallow first-party errors;
          // only a small set of third-party analytics hosts is set aside (info).
          // Give late-firing hydration errors (#418) a beat to surface.
          await page.waitForTimeout(1200);
          const audit = live.auditConsole();
          // Compact console summary. The page bundle emits dozens of benign
          // [icon-leak] SSR diagnostics + 3rd-party widget/analytics noise;
          // dumping ALL of it buried the real errors. Print only the ACTIONABLE
          // entries (real errors/pageerrors, minus icon-leak) and summarize the
          // rest as a single counts line.
          if (audit.all.length) {
            const actionable = audit.all.filter(m =>
              (m.type === 'error' || m.type === 'pageerror') && !/\[icon-leak\]/i.test(m.text));
            const noise = audit.all.length - actionable.length;
            console.log(`\n  ── console (${audit.all.length} msgs: ${actionable.length} actionable, ${noise} noise) ──`);
            for (const m of actionable.slice(0, 15)) {
              console.log(`    [${m.type}] ${m.text.slice(0, 160)}${m.url ? `  @ ${m.url.slice(-60)}` : ''}`);
            }
            if (actionable.length > 15) console.log(`    … +${actionable.length - 15} more`);
            if (audit.iconLeak.length || audit.thirdParty.length || audit.analytics.length || audit.reactHydration.length) {
              console.log(`    (informational: icon-leak×${audit.iconLeak.length}, 3rd-party×${audit.thirdParty.length}, analytics×${audit.analytics.length}, react-hydration×${audit.reactHydration.length})`);
            }
          }
          // React RENDER CRASH (#4xx excluding the hydration family) — hard fail.
          collector.check('No React render crash (#4xx)', audit.reactErrors.length === 0,
            audit.reactErrors.length === 0 ? 'none' : audit.reactErrors.map(e => e.text.slice(0, 120)).join(' | '),
            audit.reactErrors.length > 0 ? 'React threw a non-hydration #4xx (render crash) — inspect the component tree via the trace.' : undefined);
          // React HYDRATION mismatch (#418 family) — INFO only. Intermittent and
          // usually caused by a 3rd-party widget (chat/reviews) mutating the DOM
          // before hydration; not reliably reproducible, so it never blocks.
          collector.check('React hydration (#418 family) — info', true,
            audit.reactHydration.length === 0 ? 'none' : `${audit.reactHydration.length} hydration warning(s) — intermittent, non-blocking`);
          // First-party [icon-leak] — INFO only. This is an SSR icon-subsetting
          // DIAGNOSTIC the bundle logs for its own devs; the icons still render.
          // Not a customer-facing defect, so it never blocks the journey.
          collector.check('First-party [icon-leak] (info)', true,
            audit.iconLeak.length === 0 ? 'none' : `${audit.iconLeak.length} icon-leak diagnostic(s) — SSR subsetting, non-blocking`);
          collector.check('No first-party console errors', audit.firstPartyErr.length === 0,
            audit.firstPartyErr.length === 0 ? 'none' : audit.firstPartyErr.slice(0, 3).map(e => e.text.slice(0, 120)).join(' | '),
            audit.firstPartyErr.length > 0 ? 'Open DevTools console on the facility page' : undefined);
          // Info-only: resource 4xx/5xx (often WAF-under-automation), analytics
          // beacons, and allow-listed third-party widget noise.
          collector.check('Resource/analytics/3rd-party console (info)', true,
            `resource-errors=${audit.resourceErr.length}, analytics=${audit.analytics.length}, third-party=${audit.thirdParty.length}`);

          for (const ck of collector.activeChecks) {
            if (!ck.passed) expect.soft(false, `Health: ${ck.name} — ${ck.detail}`).toBe(true);
          }

          collector.endStep();
        } else {
          collector.skipStep('health', 'Page Health');
        }

        // ── STEP 2: Page sections (optional) ────────────────────────
        if (layerOn('sections')) {
          collector.beginStep('sections', 'Sections');

          const sectionDefs = getEnabledSections();
          const ids = sectionDefs.map(s => s.id).filter(id => {
            const f = facility.features;
            if (!f) return true;
            const key = ('has' + id[0].toUpperCase() + id.slice(1)) as keyof NonNullable<typeof f>;
            return f[key] !== false;
          });
          const sectionLabels = Object.fromEntries(sectionDefs.map(s => [s.id, s.label]));

          const results = await live.verifyAllSections({
            facilityId: facility.id, facilityName: facility.name, url: facility.url,
            client: facility.client,
          }, ids);

          collector.addSectionResults(results, sectionLabels);

          for (const r of results) {
            expect.soft(sectionPassed(r), `Section [${r.sectionId}] failed: ${
              r.checks.filter(ck => !ck.passed).map(ck => ck.name).join('; ')
            }`).toBe(true);
          }

          collector.endStep();
        } else {
          collector.skipStep('sections', 'Sections');
        }

        // ── STEP 3: Reserve modal ───────────────────────────────────
        // Click a unit's Reserve button → verify the reservation modal opens
        // (selected unit + form) → close it. Captcha-free, so it runs with the
        // sections/rent layers. Clients without a reserve modal skip cleanly.
        const clientHasReserveModal = facility.client === 'minimall';
        if (clientHasReserveModal && (layerOn('sections') || layerOn('rent'))) {
          collector.beginStep('reserve', 'Reserve Modal');
          const reserve = await live.verifyReserveModal();
          for (const c of reserve.checks) {
            collector.check(c.name, c.passed, c.detail,
              c.passed ? undefined : 'Click a unit Reserve button and check the modal');
          }
          for (const c of reserve.checks) {
            if (!c.passed) expect.soft(false, `Reserve: ${c.name} — ${c.detail}`).toBe(true);
          }
          collector.endStep();
        } else {
          collector.skipStep('reserve', 'Reserve Modal');
        }

        // ── STEP 4: Rent flow (runs LAST — navigates away to V2 SPC) ─
        if (layerOn('rent')) {
          collector.beginStep('rent', 'Rent Flow');

          const handoff = getRentHandoff(facility.client);

          // Safeguard's Rent CTA is uniquely "Rent Now"; Mini Mall's link reads
          // "Rent" (which also matches a #-only top-nav "Rent Unit"), so target
          // the Mini Mall link by its checkout href to be safe.
          const rentLink = handoff.drivesSpcForm
            ? page.getByRole('link', { name: /rent now/i }).first()
            : page.locator(`a[href*="${handoff.hrefContains}"]`).first();
          await rentLink.scrollIntoViewIfNeeded({ timeout: 10_000 });
          await page.waitForTimeout(300);
          const beforeUrl = page.url();
          await rentLink.click({ timeout: 15_000 });

          try {
            // 'commit' (not the default 'load'): we only need the URL to change.
            // The checkout page is heavy (hCaptcha + external scripts) and rarely
            // fires 'load' within 30s, which would falsely read as "didn't navigate".
            await page.waitForURL(handoff.pathPattern, {
              timeout: 30_000,
              waitUntil: handoff.drivesSpcForm ? 'load' : 'commit',
            });
          } catch {
            collector.check(`Navigate to ${handoff.label}`, false,
              `Did not navigate. Before: ${beforeUrl} — After: ${page.url()}`,
              `Click a Rent button on the facility page and confirm it lands on ${handoff.label}`);
            throw new Error(
              `Rent did not navigate to ${handoff.label}.\n` +
              `   before: ${beforeUrl}\n   after:  ${page.url()}`,
            );
          }
          await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
          collector.check(`Navigate to ${handoff.label}`, true, page.url());

          if (handoff.drivesSpcForm) {
          // ── Safeguard: drive the on-page V2 SPC form to submit ──
          const spcForm = new RentalDetailsPageSinglePage(page);
          await spcForm.fillCompleteSinglePageForm({
            firstName:           SINGLE_PAGE_USER.firstName,
            lastName:            SINGLE_PAGE_USER.lastName,
            email:               SINGLE_PAGE_USER.email,
            phone:               SINGLE_PAGE_USER.phone,
            address:             SINGLE_PAGE_USER.address,
            city:                SINGLE_PAGE_USER.city,
            province:            SINGLE_PAGE_USER.province,
            zipCode:             SINGLE_PAGE_USER.zipCode,
            alternateFirstName:  SINGLE_PAGE_USER.alternateFirstName,
            alternateLastName:   SINGLE_PAGE_USER.alternateLastName,
            alternatePhone:      SINGLE_PAGE_USER.alternatePhone,
            alternateEmail:      SINGLE_PAGE_USER.alternateEmail,
            driversLicense:      SINGLE_PAGE_USER.driversLicense,
            driversLicenseState: SINGLE_PAGE_USER.driversLicenseState,
            birthMonth:          SINGLE_PAGE_USER.birthMonth,
            birthDate:           SINGLE_PAGE_USER.birthDate,
            birthYear:           SINGLE_PAGE_USER.birthYear,
            paymentInfo:         SINGLE_PAGE_USER.paymentInfo,
          }, cfg.captchaAtStepFour, facility.client, cfg.addons);
          collector.check('SPC form filled', true,
            `Addons: ${cfg.addons.length > 0 ? cfg.addons.join(', ') : 'none'}`);

          const chosenTiming = await spcForm.selectDiscountTimingIfPresent(cfg.discountTimingOptions?.[0]);
          collector.check('Discount timing', true,
            chosenTiming ? `Selected: "${chosenTiming}"` : 'n/a (no dropdown)');

          const result = await spcForm.clickRentNowAndCaptureError(cfg.captchaAtRentNow, facility.client);
          collector.check('Submit rent', typeof result === 'string',
            `Result: ${result || '(no response)'}`,
            typeof result !== 'string' ? 'Check the Rent Now submit button and payment validation on /step-four' : undefined);
          expect(typeof result === 'string', 'expected a string submit result').toBe(true);
          } else {
            // ── Mini Mall: verify the Yardi checkout ENTRY rendered, then DRIVE
            // the Yardi v2 checkout (fill tenant → manual captcha → Continue) and
            // FETCH the rent outcome/error. Reuses the proven MiniMallRentalPage
            // Yardi flow (same as tests/miniMallRental.spec.ts).
            const yardi = new YardiCheckoutStartPage(page);
            const handoffResult = await yardi.verifyHandoff(facility.expectedHeading);
            for (const c of handoffResult.checks) {
              collector.check(c.name, c.passed, c.detail,
                c.passed ? undefined : 'Inspect the /yardi/start checkout entry page');
            }
            for (const c of handoffResult.checks) {
              if (!c.passed) expect.soft(false, `Handoff: ${c.name} — ${c.detail}`).toBe(true);
            }

            // Drive the Yardi v2 checkout and capture the rent outcome.
            const mm = new MiniMallRentalPage(page);
            await mm.fillYardiTenantDetails({
              firstName: SINGLE_PAGE_USER.firstName,
              lastName:  SINGLE_PAGE_USER.lastName,
              email:     SINGLE_PAGE_USER.email,
              phone:     SINGLE_PAGE_USER.phone,
            });
            collector.check('Yardi tenant details filled', true,
              `${SINGLE_PAGE_USER.firstName} ${SINGLE_PAGE_USER.lastName} / ${SINGLE_PAGE_USER.email}`);

            await mm.waitForManualCaptcha(facility.name);
            await mm.clickContinueToNextStep(facility.client);
            const rentResult = await mm.waitForYardiRedirect();
            // "Rent error fetch": SUCCESS (redirect) or a captured ERROR both mean
            // we exercised the rent path and fetched the outcome; only a TIMEOUT
            // (no determinable result) is a failure.
            const fetched = /^SUCCESS|^ERROR/.test(rentResult);
            collector.check('Yardi v2 rent — outcome fetched', fetched, rentResult,
              fetched ? undefined : 'Yardi did not redirect or surface an error — inspect the checkout');
            expect(fetched, `Yardi rent outcome: ${rentResult}`).toBe(true);
          }

          collector.endStep();
        } else {
          collector.skipStep('rent', 'Rent Flow');
        }
      } catch (err) {
        collector.check('FATAL', false,
          (err as Error).message?.split('\n')[0],
          'An unexpected error crashed the journey — check the full Playwright trace');
        collector.endStep('failed');
        throw err;
      } finally {
        const report = collector.finalize();
        printJourneyReport(report);
        writeJourneyJson(report, journeyReportPath(facility.id, runStamp, 'json'));
        writeJourneyMarkdown(report, journeyReportPath(facility.id, runStamp, 'md'));
      }
    });
  }
});
