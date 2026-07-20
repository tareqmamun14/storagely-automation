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
import { applyKnownIssueGate } from '../../configs/issueDb';
import { getLocationPool } from '../../configs/locationPool';
import { YardiCheckoutStartPage } from '../../pages/YardiCheckoutStartPage';
import { SpcCheckoutEntryPage } from '../../pages/SpcCheckoutEntryPage';
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

// ── Rent-flow depth — FLEX_RENT_MODE=full|handshake ────────────
// 'handshake' (autonomous-safe): click Rent → verify the checkout ENTRY
//   rendered with the right unit context → STOP. No form fill, no manual
//   captcha, no submits against a live FMS — safe to run unattended against
//   PRODUCTION on every regression, so reserve+rent coverage never gets skipped.
// 'full' (user-present): drive the checkout to submit (SPC test-card decline /
//   Yardi rent-outcome fetch), pausing for manual captcha where gated.
// Default: production → handshake, test/stage → full (captcha-free there).
type RentMode = 'full' | 'handshake';
function resolveRentMode(env: string): RentMode {
  const raw = (process.env.FLEX_RENT_MODE || '').trim().toLowerCase();
  if (raw === 'full' || raw === 'handshake') return raw;
  return env === 'production' ? 'handshake' : 'full';
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
  // Storage Star — same standard /step-four SPC checkout as Safeguard. Prod SPC
  // gates the RENT NOW submit behind a manual hCaptcha (user solves it), so the
  // journey removes its timeout. Add-ons / discount-timing are Safeguard-specific
  // chrome, so left empty here (the SPC form fill handles an empty add-on list).
  storagestar: {
    addons: [],
    captchaAtRentNow: true,
    captchaAtStepFour: false,
  },
  // Mini Mall — only reached when a location hands off to /step-four (its
  // SiteLink-FMS Flex pages, e.g. Sainte-Thérèse QC; the Yardi pages take the
  // /yardi/start branch instead). SPC submit is captcha-gated → manual solve.
  minimall: {
    addons: [],
    captchaAtRentNow: true,
    captchaAtStepFour: false,
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
    const rentMode = resolveRentMode(facility.env);
    // Handshake mode never reaches a captcha, so the normal timeout applies.
    const hasCaptcha = rentMode === 'full' &&
      (cfg.captchaAtRentNow || cfg.captchaAtStepFour || getRentHandoff(facility.client).manualCaptcha);

    test(`${facility.name} — full journey`, async ({ page }) => {
      test.setTimeout(hasCaptcha ? 0 : 8 * 60_000);

      const collector = new JourneyCollector({
        id: facility.id, name: facility.name, url: facility.url, client: facility.client,
      });
      const live = new LiveFacilityPage(page);
      // Sections that STILL fail after the known-issue gate (i.e. NEW issues).
      // Feeds the sibling cross-check at the end of the journey.
      let failedSectionIds: string[] = [];

      try {
        // ── STEP 0: ONE navigation ──────────────────────────────────
        await live.goto(facility.url);
        await live.expectPageLoaded();

        // Resolve THIS page's checkout handoff from the live DOM (mixed-FMS
        // clients: Mini Mall has Yardi AND SiteLink locations on Flex — the
        // profile handoff is only a default). Health, sections, and the rent
        // step all use this resolved handoff.
        const pageHandoff = await live.resolveRentHandoff(facility.client);

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
            // Failure detail must carry the ACTUAL title (triage needs to see
            // what the page served — error page? wrong locale? empty?).
            expect(title, `page title was "${title}" — expected ${facility.expectedTitle}`).toMatch(facility.expectedTitle);
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
              const handoff = pageHandoff;
              await live.expectRentLinksVisible(handoff);
              const hrefs = await live.getRentHrefs(handoff);
              expect(hrefs.length, 'no Rent links found').toBeGreaterThan(0);
              for (const href of hrefs) LiveFacilityPage.validateRentNowUrl(href, facility.client, handoff);
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

          // Known-issue gate: triaged issues (informed / acknowledged /
          // false-flag in flex/issue-db/issues.json) demote to tagged info —
          // a red journey always means something NEW.
          const demotedHealth = applyKnownIssueGate(facility.client, 'health', collector.activeChecks);
          if (demotedHealth.length) {
            console.log(`  ⚑ known-issue gate (health): ${demotedHealth.map(d => `${d.name} → ${d.status} #${d.issueId}`).join(' · ')}`);
          }
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
            client: facility.client, handoff: pageHandoff,
          }, ids);

          // Known-issue gate (per section-check): triaged issues demote to
          // tagged info BEFORE section pass/fail is computed — red = NEW only.
          const demotedSec: string[] = [];
          for (const r of results) {
            for (const d of applyKnownIssueGate(facility.client, r.sectionId, r.checks)) {
              demotedSec.push(`${r.sectionId}: ${d.name} → ${d.status} #${d.issueId}`);
            }
          }
          if (demotedSec.length) console.log(`  ⚑ known-issue gate (sections): ${demotedSec.join(' · ')}`);

          collector.addSectionResults(results, sectionLabels);

          for (const r of results) {
            expect.soft(sectionPassed(r), `Section [${r.sectionId}] failed: ${
              r.checks.filter(ck => !ck.passed).map(ck => ck.name).join('; ')
            }`).toBe(true);
          }

          failedSectionIds = results.filter(r => !sectionPassed(r)).map(r => r.sectionId);

          collector.endStep();
        } else {
          collector.skipStep('sections', 'Sections');
        }

        // ── STEP 3: Reserve modal ───────────────────────────────────
        // Click a unit's Reserve button → verify the reservation modal opens
        // (selected unit + form) → close it. Captcha-free, so it runs with the
        // sections/rent layers. Clients without a reserve modal skip cleanly.
        // DOM-aware: only Mini Mall ships a reserve modal, and only on SOME
        // templates (the SiteLink-FMS Flex pages may not) — probe before running.
        const clientHasReserveModal = facility.client === 'minimall' &&
          (await page.getByRole('button', { name: /reserve/i }).first().isVisible().catch(() => false) ||
           await page.getByRole('link', { name: /^reserve$/i }).first().isVisible().catch(() => false));
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

          const handoff = pageHandoff;

          // Locate the card's REAL Rent CTA by its checkout href — robust across
          // link-text differences ("Rent Now" on Safeguard, "Rent" on Storage Star
          // / Mini Mall) and both handoffs (/step-four, /yardi/start). The href is
          // the contract; a stray top-nav "Rent Online/Unit" link never carries it.
          //
          // EXCLUDE aria-hidden anchors: Storage Star (and other standard-template
          // cards) wrap each unit in an invisible full-card click overlay —
          // `<a aria-hidden="true" tabindex="-1" class="absolute inset-0" …same href>`
          // — layered ON TOP of the visible "Rent" button. A plain .first() hits
          // that overlay, not the button (unreliable click → sometimes the SPA
          // routes to /storage-units-near-me instead of checkout). Dropping the
          // aria-hidden overlay leaves the actual, visible Rent CTA.
          // Pick the first ACTIONABLE Rent CTA, not the first in DOM order:
          // Mini Mall renders units in AUTO-ROTATING carousels, so the first
          // matching link can sit on a slide that never becomes "stable" —
          // scrollIntoViewIfNeeded then times out (observed: Birmingham).
          // Probe candidates in order with a short stability budget and take
          // the first that settles; fall back to a raw DOM scroll on the first.
          // FREEZE animations first. Mini Mall renders units in an AUTO-ROTATING
          // carousel — the Rent button is literally moving, so Playwright's click
          // actionability wait ("element must be stable") never settles and times
          // out (observed: Birmingham, 15s timeout on an anchor that resolved
          // fine). Manually the button works — it's automation-only flake.
          // Killing transitions/animations makes the CTA hold still.
          await page.addStyleTag({
            content: '*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}',
          }).catch(() => { /* CSP may block — the fallbacks below still cover it */ });

          const rentCandidates = page.locator(`a[href*="${handoff.hrefContains}"]:not([aria-hidden="true"])`);
          const candidateCount = Math.min(await rentCandidates.count(), 12);
          let rentLink = rentCandidates.first();
          let anchored = false;
          for (let i = 0; i < candidateCount && !anchored; i++) {
            const cand = rentCandidates.nth(i);
            if (!(await cand.isVisible().catch(() => false))) continue;
            try {
              await cand.scrollIntoViewIfNeeded({ timeout: 2500 });
              rentLink = cand;
              anchored = true;
            } catch { /* unstable (rotating slide) — try the next candidate */ }
          }
          if (!anchored) {
            await rentLink.evaluate(el => el.scrollIntoView({ block: 'center', inline: 'center' })).catch(() => {});
          }
          await page.waitForTimeout(300);
          const beforeUrl = page.url();

          // Reach the checkout the way a user would (click), but never let
          // carousel motion / a sticky-header overlay fail a WORKING button:
          //   1) normal click (proves the CTA is actionable)
          //   2) force click (bypasses the stability/occlusion wait)
          //   3) navigate the anchor's real href — the href IS the checkout
          //      contract, so this reaches the exact same page the button targets
          // A fallback is LOGGED (transparency — never silently hide a broken CTA).
          const targetHref = await rentLink.getAttribute('href').catch(() => null);
          let clicked = false;
          for (const opts of [{ timeout: 8_000 }, { timeout: 5_000, force: true }]) {
            try { await rentLink.click(opts); clicked = true; break; }
            catch { /* try the next strategy */ }
          }
          if (!clicked) {
            if (!targetHref) throw new Error('Rent CTA was not clickable and exposed no href to fall back to.');
            const abs = new URL(targetHref, page.url()).href;
            console.log(`  ⚠️ Rent CTA not click-actionable (carousel motion / overlay) — reaching checkout via its href: ${abs}`);
            await page.goto(abs).catch(() => {});
          }

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

          if (rentMode === 'handshake') {
            // ── HANDSHAKE (autonomous-safe): verify the checkout ENTRY carries
            // the right rental context, then STOP — no form fill, no captcha,
            // no submit against the live FMS. FLEX_RENT_MODE=full (or the
            // panel's "Full checkout" depth) drives the checkout to submit.
            const entry = handoff.drivesSpcForm
              ? await new SpcCheckoutEntryPage(page).verifyHandoff(facility.expectedHeading, handoff)
              : await new YardiCheckoutStartPage(page).verifyHandoff(facility.expectedHeading);
            for (const c of entry.checks) {
              collector.check(c.name, c.passed, c.detail,
                c.passed ? undefined : `Inspect the ${handoff.label} checkout entry page`);
            }
            const demotedRent = applyKnownIssueGate(facility.client, 'rent', collector.activeChecks);
            if (demotedRent.length) {
              console.log(`  ⚑ known-issue gate (rent): ${demotedRent.map(d => `${d.name} → ${d.status} #${d.issueId}`).join(' · ')}`);
            }
            for (const c of collector.activeChecks) {
              if (!c.passed) expect.soft(false, `Rent handshake: ${c.name} — ${c.detail}`).toBe(true);
            }
          } else if (handoff.drivesSpcForm) {
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

        // ── STEP 5: Sibling cross-check — page-specific vs SYSTEMIC ─
        // Only when NEW section failures survived the known-issue gate: re-run
        // exactly those detectors on a SIBLING location of the same client and
        // attach a verdict per section. Pure intelligence — verdicts never
        // re-fail the run (the original failure already did); they tell the
        // triager whether the bug is template-wide or local to this page.
        // Runs AFTER rent (both navigate away). FLEX_SIBLING=off disables.
        // (Health-only failures aren't cross-checked — the token/meta product
        // bugs they'd catch also surface in the seohead section detector.)
        if (failedSectionIds.length && process.env.FLEX_SIBLING !== 'off') {
          const sibling = getLocationPool(facility.client).filter(u => u !== facility.url)[0];
          collector.beginStep('sibling', 'Sibling Cross-Check');
          if (!sibling) {
            collector.check('sibling available (info)', true,
              `no other pooled location for ${facility.client} — cannot classify page-specific vs systemic (grow the pool: npm run run:flex:discover)`);
          } else {
            collector.check('sibling target (info)', true,
              `${sibling} — re-verifying: ${failedSectionIds.join(', ')}`);
            try {
              const siblingLive = new LiveFacilityPage(page);
              await siblingLive.goto(sibling);
              const sibResults = await siblingLive.verifyAllSections({
                facilityId: `${facility.id}--sibling`,
                facilityName: `${facility.name} (sibling)`,
                url: sibling,
                client: facility.client,
                handoff: await siblingLive.resolveRentHandoff(facility.client),
              }, failedSectionIds);
              for (const sr of sibResults) {
                // Gate the sibling too — a DIFFERENT, already-triaged issue on
                // the sibling must not masquerade as "reproduces" (false SYSTEMIC).
                applyKnownIssueGate(facility.client, sr.sectionId, sr.checks);
                const alsoFails = !sectionPassed(sr);
                const failNames = sr.checks.filter(c => !c.passed).map(c => c.name).join('; ');
                collector.check(`verdict: ${sr.sectionId}`, true, alsoFails
                  ? `SYSTEMIC — also fails on the sibling (${failNames || 'section failed'}) → template/config-level, not this page`
                  : `PAGE-SPECIFIC — sibling is clean → issue is local to ${facility.url}`);
              }
            } catch (e) {
              collector.check('sibling cross-check ran', true,
                `could not complete (info): ${(e as Error).message?.split('\n')[0]}`);
            }
          }
          collector.endStep();
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
