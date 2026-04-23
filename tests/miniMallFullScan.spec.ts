import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// Real-time log helper: writes to both console AND scan-progress.txt
// so progress is visible even before the test exits (Node.js buffers stdout
// when piped, but fs.appendFileSync flushes immediately to disk).
const LOG_FILE = path.join(process.cwd(), 'scan-progress.txt');
// Truncate/create log file at module load time
fs.writeFileSync(LOG_FILE, '', 'utf8');
function log(msg: string): void {
  console.log(msg);
  fs.appendFileSync(LOG_FILE, msg + '\n', 'utf8');
}

// ============================================
// MINI MALL — FULL LOCATION SCAN
// ============================================
// Discovers ALL Mini Mall facility pages by crawling the site navbar
// (3 levels deep: homepage → state/province hubs → city hubs → facilities),
// then checks every discovered location for contradictory unit feature labels.
//
// This test is intentionally standalone — it does NOT share state with
// uiComponents-validation.spec.ts. The existing Section 6 in that file
// acts as a targeted fallback for the known critical locations.
//
// USAGE (run individually):
//   npx playwright test tests/miniMallFullScan.spec.ts --project=chrome
//
// WHY SEPARATE:
//   Discovery + scanning 100+ locations takes several minutes.
//   Run this on-demand (e.g. after a Yardi/SiteLink sync update), not in CI.
// ============================================

const MINI_MALL_BASE = 'https://minimallstorage.com';

// Conflicting feature pairs — same as in uiComponents-validation.spec.ts Section 6.
// Append new pairs here if new contradictory combinations are ever discovered.
const CONFLICTING_FEATURE_PAIRS: Array<{ a: string; b: string; note: string }> = [
  {
    a: 'Climate Controlled',
    b: 'Non-Climate Controlled',
    note: 'A unit cannot be both climate-controlled AND non-climate-controlled',
  },
  {
    a: 'Covered',
    b: 'Uncovered',
    note: 'A unit cannot be both covered AND uncovered',
  },
  {
    a: 'Drive Up',
    b: 'Interior Hallway',
    note: 'A unit cannot have both drive-up and interior hallway access',
  },
  {
    a: 'Heated',
    b: 'Non-Heated',
    note: 'A unit cannot be both heated and non-heated',
  },
];

// ─── URL classification ───────────────────────────────────────────────────────

// Non-geographic aggregate pages that match /storage-units-[slug] but are not locations.
const NON_GEO_SLUGS = [
  'storage-units-near-me',
  'storage-units-canada',
  'storage-units-united-states',
  'storage-unit-size-guide',
  'storage-units-size-guide',
];

/**
 * Returns true ONLY for individual facility/listing pages.
 * Required pattern: /storage-units/[state-or-province]/[city]/[facility-slug]
 *   exactly 3 slash-separated segments after /storage-units/, nothing more.
 *
 * ✓  /storage-units/alberta/lethbridge/stubb-ross-road
 * ✓  /storage-units/alabama/birmingham/richard-arrington-jr-blvd
 * ✓  /storage-units/alabama/courtland/highway-33
 * ✗  /storage-units-airdrie          (city hub — uses hyphen, not slashes)
 * ✗  /storage-units/alberta          (province page — only 1 segment)
 * ✗  /storage-units/alberta/airdrie  (city page — only 2 segments)
 */
function isFacilityUrl(url: string): boolean {
  // Match EXACTLY 3 path segments after /storage-units/ with no trailing slash or further segments.
  // Each segment: one or more non-slash, non-query, non-fragment chars.
  return /\/storage-units\/[^/?#]+\/[^/?#]+\/[^/?#]+(?:\/)?$/.test(
    new URL(url).pathname
  );
}

/**
 * Returns true if the URL is a state/province/city hub navigational page.
 * Pattern: /storage-units-[slug]   (hyphenated, NOT slash-based path)
 * Excludes known non-geographic aggregate pages.
 */
function isNavHubUrl(url: string): boolean {
  return (
    /\/storage-units-[a-z]/.test(url) &&
    !url.includes('/storage-units/') &&
    !NON_GEO_SLUGS.some(slug => url.includes(slug))
  );
}

// ─── Discovery helpers ────────────────────────────────────────────────────────

/**
 * Navigate to a page, wait for it to settle, then collect all Mini Mall hrefs
 * and split them into facility URLs (direct listing pages) and hub URLs (nav pages).
 */
async function collectLinksFromPage(
  page: Page,
  url: string
): Promise<{ facilities: string[]; hubs: string[] }> {
  try {
    // waitUntil:'load' waits for the load event (all resources + initial JS bundle).
    // Then we wait 300ms for React components (store-finder CTAs etc.) to render
    // their href links into the DOM before we snapshot all <a> tags.
    await page.goto(url, { waitUntil: 'load', timeout: 15000 });
    await page.waitForTimeout(300);

    const hrefs: string[] = await page.evaluate(() =>
      Array.from(document.querySelectorAll('a[href]'))
        .map(a => (a as HTMLAnchorElement).href)
        .filter(h => h.includes('minimallstorage.com'))
    );

    const facilities = new Set<string>();
    const hubs = new Set<string>();

    for (const href of hrefs) {
      const clean = href.split('#')[0].split('?')[0];
      if (isFacilityUrl(clean)) {
        facilities.add(clean);
      } else if (isNavHubUrl(clean)) {
        hubs.add(clean);
      }
    }

    return { facilities: Array.from(facilities), hubs: Array.from(hubs) };
  } catch {
    log(`    ⚠️  Could not load: ${url}`);
    return { facilities: [], hubs: [] };
  }
}

/**
 * 3-level discovery crawl over the Mini Mall navigation:
 *
 *   Level 0 — US + Canada aggregate pages (2 pages)
 *     Collects state/province hub links.
 *
 *   Level 1 — State/Province hub pages (~22-30 pages)
 *     Collects direct facility links (e.g. /storage-units/alberta/lethbridge/...)
 *     + city hub links (e.g. /storage-units-airdrie).
 *
 *   Level 2 — City hub pages discovered from Level 1 (may have direct facility links)
 *     Some cities have an SEO/content hub that also links to the Storagely
 *     facility page via JavaScript-rendered CTAs.
 *
 * Starting from the canonical US/Canada aggregate pages (instead of the homepage
 * footer which links to 130+ city-level hubs) keeps Level 1 to ~25 pages and
 * makes discovery complete in under 2 minutes.
 */
async function discoverAllLocations(page: Page): Promise<string[]> {
  const facilityUrls = new Set<string>();
  const visitedHubs  = new Set<string>();

  // ── Level 0: US and Canada aggregate pages ────────────────────────────────
  //    These pages list all US states and Canadian provinces respectively.
  const aggregateSeed = [
    `${MINI_MALL_BASE}/storage-units-united-states`,
    `${MINI_MALL_BASE}/storage-units-canada`,
  ];
  log('    Scanning US and Canada aggregate pages (2 pages)...');
  const stateHubs = new Set<string>();
  for (const aggUrl of aggregateSeed) {
    const r = await collectLinksFromPage(page, aggUrl);
    r.facilities.forEach(u => facilityUrls.add(u));
    r.hubs.forEach(u => stateHubs.add(u));
  }
  stateHubs.forEach(u => visitedHubs.add(u));

  // ── Level 1: SKIPPED ──────────────────────────────────────────────────────
  // The aggregate pages already embed all facility URLs directly — scanning
  // the 130+ state/city hubs found in Level 0 adds no new facility URLs and
  // only wastes ~350s waiting on Cloudflare timeouts.
  log(`    Discovered ${facilityUrls.size} facility URL(s) directly from aggregate pages.`);
  log(`    (Skipping ${stateHubs.size} hub pages — all facilities already found.)`);

  return Array.from(facilityUrls);
}

// ─── Conflict check ───────────────────────────────────────────────────────────

interface ScanResult {
  status: 'passed' | 'failed' | 'skipped' | 'error';
  conflicts: string[];
  unitsChecked: number;
  errorMsg?: string;
}

/**
 * Navigate to a facility listing page and check every unit row (.listviewrows)
 * for contradictory feature pairs using the mask-then-check technique.
 *
 * ONLY accepts true facility pages (3-segment /storage-units/state/city/slug URLs).
 * Any other URL is rejected immediately — without loading the page — so hub/nav
 * pages never cost any network time in the scan phase.
 */
async function checkUrlForConflicts(page: Page, url: string): Promise<ScanResult> {
  // Hard gate: only scan pages that ARE a facility slug page.
  // Discovery should already guarantee this, but this is a defensive safety net.
  try { if (!isFacilityUrl(url)) return { status: 'skipped', conflicts: [], unitsChecked: 0 }; }
  catch { return { status: 'skipped', conflicts: [], unitsChecked: 0 }; }

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForSelector('.listviewrows', { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(500);

    const unitRows = page.locator('.listviewrows');
    const rowCount = await unitRows.count();

    if (rowCount === 0) {
      return { status: 'skipped', conflicts: [], unitsChecked: 0 };
    }

    const conflicts: string[] = [];

    for (let i = 0; i < rowCount; i++) {
      const row = unitRows.nth(i);
      const rowText = await row.innerText();

      // Build a short identifier for readable error messages
      const dimsEl = row.locator('h2.widthHeight');
      const nameEl = row.locator('.unit-type-listing-name');
      const dims = (await dimsEl.count() > 0)
        ? (await dimsEl.first().innerText()).replace(/WIDTH|DEPTH/gi, '').replace(/\s+/g, ' ').trim()
        : '';
      const name = (await nameEl.count() > 0)
        ? (await nameEl.first().innerText()).replace(/\d{4,}/g, '').trim()
        : '';
      const unitLabel = [dims, name].filter(Boolean).join(' ').trim() || `Row ${i + 1}`;

      // Mask-then-check: strip pair.b from the text before looking for pair.a.
      // This prevents "Non-Climate Controlled" from triggering a false "Climate Controlled" hit.
      for (const pair of CONFLICTING_FEATURE_PAIRS) {
        const escapedB = pair.b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const masked = rowText.replace(new RegExp(escapedB, 'gi'), '[MASKED]');
        if (masked.includes(pair.a) && rowText.includes(pair.b)) {
          conflicts.push(`${unitLabel} — shows "${pair.a}" AND "${pair.b}" simultaneously`);
        }
      }
    }

    return {
      status: conflicts.length > 0 ? 'failed' : 'passed',
      conflicts,
      unitsChecked: rowCount,
    };
  } catch (e) {
    return {
      status: 'error',
      conflicts: [],
      unitsChecked: 0,
      errorMsg: (e as Error).message.split('\n')[0],
    };
  }
}

// ─── URL → human-readable label ───────────────────────────────────────────────

function capitalize(slug: string): string {
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/**
 * Converts a facility URL into a short, readable label.
 *
 * /storage-units/alberta/lethbridge/stubb-ross-road      → Lethbridge, Stubb Ross Road · Alberta
 * /storage-units/south-carolina/longs/highway-9-east     → Longs, Highway 9 East · South Carolina
 * /storage-units/canada/alberta/airdrie                  → Alberta, Airdrie · Canada
 */
function urlToLabel(url: string): string {
  try {
    const parts = new URL(url).pathname
      .replace(/^\/storage-units\//, '')
      .split('/')
      .filter(Boolean)
      .map(capitalize);

    if (parts.length === 0) return url;
    if (parts.length === 1) return parts[0];
    if (parts.length === 2) return `${parts[1]} · ${parts[0]}`;
    if (parts.length === 3) return `${parts[1]}, ${parts[2]} · ${parts[0]}`;
    // 4+ segments (e.g. canada/province/city/facility)
    return `${parts[parts.length - 2]}, ${parts[parts.length - 1]} · ${parts.slice(0, -2).join(' / ')}`;
  } catch {
    return url;
  }
}

// ─── Test ─────────────────────────────────────────────────────────────────────

// Force headless regardless of environment — this scan visits 300+ pages
// and would take hours in headed Chrome. Headless is 3-5× faster.
// Must be top-level (cannot be inside test.describe with launchOptions).
test.use({ headless: true });

test.describe('⭐ Mini Mall — Full Location Scan (All Sites)', () => {
  // No timeout — this scan covers 100+ locations and takes several minutes.
  test.setTimeout(0);

  test('Scan ALL Mini Mall locations for unit feature conflicts', async ({ page }) => {

    const BAR  = '═'.repeat(70);
    const DASH = '─'.repeat(70);

    // ━━━ PHASE 1: Discovery ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    log(`\n${BAR}`);
    log('  ⭐  MINI MALL — FULL LOCATION SCAN');
    log(`${BAR}`);
    log('  Phase 1: Discovering all locations from the navbar...\n');

    const facilityUrls = await discoverAllLocations(page);

    log(`\n  ✓ Discovered ${facilityUrls.length} facility page(s) to scan`);

    if (facilityUrls.length === 0) {
      log('\n  ⚠️  No facility URLs found — the site navigation structure may have changed.');
      log(`\n${BAR}\n`);
      expect(facilityUrls.length, 'No facility URLs discovered from Mini Mall navbar').toBeGreaterThan(0);
      return;
    }

    // ━━━ PHASE 2: Scan ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    log(`\n${DASH}`);
    log('  Phase 2: Scanning each location for unit feature conflicts...');
    log(`${DASH}\n`);

    const passed:  string[]                                                 = [];
    const failed:  Array<{ label: string; url: string; conflicts: string[] }> = [];
    const skipped: string[]                                                 = [];
    const errors:  Array<{ label: string; url: string; error: string }>    = [];

    const pad = String(facilityUrls.length).length;

    for (let i = 0; i < facilityUrls.length; i++) {
      const url    = facilityUrls[i];
      const label  = urlToLabel(url);
      const prefix = `  [${String(i + 1).padStart(pad)}/${facilityUrls.length}]`;

      const result = await checkUrlForConflicts(page, url);

      if (result.status === 'passed') {
        log(`${prefix} ${label} — ✅ PASS  (${result.unitsChecked} units)`);
        passed.push(label);
      } else if (result.status === 'failed') {
        log(`${prefix} ${label} — ❌ FAIL  (${result.conflicts.length} conflict(s))`);
        result.conflicts.forEach(c => log(`          🚨 ${c}`));
        failed.push({ label, url, conflicts: result.conflicts });
      } else if (result.status === 'skipped') {
        log(`${prefix} ${label} — ○  SKIP  (no unit listings)`);
        skipped.push(label);
      } else {
        log(`${prefix} ${label} — ⚠️  ERROR`);
        log(`          ${result.errorMsg}`);
        errors.push({ label, url, error: result.errorMsg ?? 'unknown error' });
      }
    }

    // ━━━ PHASE 3: Summary ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const scanned = passed.length + failed.length + errors.length;

    log(`\n${BAR}`);
    log('  ⭐  MINI MALL FULL SCAN — RESULTS SUMMARY');
    log(`${BAR}`);
    log(`  Discovered     : ${facilityUrls.length} facility page(s) from navbar`);
    log(`  Scanned        : ${scanned}  |  Skipped: ${skipped.length} (no unit listings on page)`);
    log(`  ✅  Passed     : ${passed.length}`);
    log(`  ❌  Failed     : ${failed.length}`);
    if (errors.length > 0) {
      log(`  ⚠️   Load errors: ${errors.length}`);
    }

    // ── Failed locations ──────────────────────────────────────────────────────
    if (failed.length > 0) {
      log(`\n${DASH}`);
      log('  ❌  FAILED LOCATIONS — Contradictory Unit Feature Labels Detected:');
      log(`${DASH}`);
      failed.forEach((f, idx) => {
        log(`\n  ${idx + 1}. ${f.label}`);
        log(`     URL : ${f.url}`);
        f.conflicts.forEach(c => log(`     🚨  ${c}`));
      });
    }

    // ── Load errors ───────────────────────────────────────────────────────────
    if (errors.length > 0) {
      log(`\n${DASH}`);
      log('  ⚠️   LOAD ERRORS — Pages that could not be loaded:');
      log(`${DASH}`);
      errors.forEach((e, idx) => {
        log(`  ${idx + 1}. ${e.label}`);
        log(`     URL   : ${e.url}`);
        log(`     Error : ${e.error}`);
      });
    }

    log(`\n${BAR}\n`);

    // Fail the Playwright test if any conflicts were found
    expect(
      failed.length,
      `${failed.length} Mini Mall location(s) have contradictory unit feature labels:\n` +
      failed.map(f =>
        `\n• ${f.label}\n  ${f.url}\n  ${f.conflicts.map(c => `🚨 ${c}`).join('\n  ')}`
      ).join('\n')
    ).toBe(0);
  });
});
