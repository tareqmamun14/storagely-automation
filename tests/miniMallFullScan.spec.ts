import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { scanPageImages, hasUnitsStructureRegression, countTotalBroken, shortSrc, type PageImageScan, type SectionScan } from '../utils/imageScan';
import { CONFLICTING_FEATURE_PAIRS as SHARED_PAIRS } from '../utils/unitConflictScan';

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

// Conflicting feature pairs — sourced from utils/unitConflictScan.ts so all
// scans (mini-mall, all-locations, ui-components) stay in sync. Append new
// pairs there to roll them out everywhere at once.
const CONFLICTING_FEATURE_PAIRS = SHARED_PAIRS;

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

// ─── Image / Carousel check (per facility) ────────────────────────────────────
// Uses the shared scan in utils/imageScan.ts so all three suites
// (uiComponents Module 8, miniMallFullScan, allLocationsScan) stay in sync.
// The page is already navigated to by the conflict checker — we just need to
// trigger lazy-loaders and read the per-section results.
async function scanFacilityImages(page: Page): Promise<PageImageScan> {
  return scanPageImages(page);
}

// ─── Conflict check ───────────────────────────────────────────────────────────

interface ScanResult {
  status: 'passed' | 'failed' | 'skipped' | 'error';
  conflicts: string[];
  unitsChecked: number;
  errorMsg?: string;
  images?: PageImageScan;
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

    // ── Image / Carousel scan (same page — already loaded) ───────────────
    let images: PageImageScan | undefined;
    try {
      images = await scanFacilityImages(page);
    } catch {
      // image scan failures should not break the conflict check — they are
      // surfaced as their own line in the summary.
      images = undefined;
    }

    return {
      status: conflicts.length > 0 ? 'failed' : 'passed',
      conflicts,
      unitsChecked: rowCount,
      images,
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
    log('  Phase 2: Scanning each location for unit feature conflicts + images/carousel...');
    log(`${DASH}\n`);

    const passed:  string[]                                                 = [];
    const failed:  Array<{ label: string; url: string; conflicts: string[] }> = [];
    const skipped: string[]                                                 = [];
    const errors:  Array<{ label: string; url: string; error: string }>    = [];

    // Image scan results for the dedicated image summary section
    type SectionName = 'TOP CAROUSEL' | 'UNIT IMAGES' | 'BOTTOM IMAGES';
    interface ImageFailureEntry { section: SectionName; src: string; alt: string; kind: 'NETWORK' | 'PLACEHOLDER'; }
    interface TinyImageEntry    { section: SectionName; src: string; width: number; height: number; }
    interface ImageScanRecord {
      label: string;
      url: string;
      top:    SectionScan;
      units:  SectionScan;
      bottom: SectionScan;
      totalChecked: number;
      totalBroken:  number;       // network failures + placeholder fallbacks
      totalNetwork: number;
      totalPlaceholder: number;
      failures: ImageFailureEntry[];
      tinyImages: TinyImageEntry[];
      structureRegression: boolean;
    }
    const imagePassed: ImageScanRecord[] = [];
    const imageFailed: ImageScanRecord[] = [];
    const structureRegressions: ImageScanRecord[] = [];

    const pad = String(facilityUrls.length).length;

    for (let i = 0; i < facilityUrls.length; i++) {
      const url    = facilityUrls[i];
      const label  = urlToLabel(url);
      const prefix = `  [${String(i + 1).padStart(pad)}/${facilityUrls.length}]`;

      const result = await checkUrlForConflicts(page, url);

      // ── Build a one-line image suffix when image scan ran ──────────────
      let imgTag = '';
      if (result.images) {
        const img = result.images;
        const tot         = img.top.total + img.units.total + img.bottom.total;
        const networkFld  = img.top.failed.length + img.units.failed.length + img.bottom.failed.length;
        const placeholderFld = img.top.placeholders.length + img.units.placeholders.length + img.bottom.placeholders.length;
        const totalBroken = networkFld + placeholderFld;
        const tinyCount   = img.top.tiny.length + img.units.tiny.length + img.bottom.tiny.length;
        const structureRegression = hasUnitsStructureRegression(img);

        const tagParts: string[] = [];
        if (totalBroken === 0) {
          tagParts.push(`🖼️  ${tot}/${tot} images ✅`);
        } else {
          const subParts: string[] = [];
          if (networkFld    > 0) subParts.push(`${networkFld} NETWORK`);
          if (placeholderFld > 0) subParts.push(`${placeholderFld} PLACEHOLDER`);
          tagParts.push(`🖼️  ${tot - totalBroken}/${tot} images — ${subParts.join(' + ')} ❌`);
        }
        if (tinyCount > 0) tagParts.push(`⚠️ ${tinyCount} tiny`);
        if (structureRegression) tagParts.push(`🚨 STRUCTURE REGRESSION`);
        imgTag = `  |  ${tagParts.join('  |  ')}`;

        const failures: ImageFailureEntry[] = [
          ...img.top.failed.map(f         => ({ section: 'TOP CAROUSEL'  as const, src: f.src, alt: f.alt, kind: 'NETWORK'     as const })),
          ...img.top.placeholders.map(f   => ({ section: 'TOP CAROUSEL'  as const, src: f.src, alt: f.alt, kind: 'PLACEHOLDER' as const })),
          ...img.units.failed.map(f       => ({ section: 'UNIT IMAGES'   as const, src: f.src, alt: f.alt, kind: 'NETWORK'     as const })),
          ...img.units.placeholders.map(f => ({ section: 'UNIT IMAGES'   as const, src: f.src, alt: f.alt, kind: 'PLACEHOLDER' as const })),
          ...img.bottom.failed.map(f      => ({ section: 'BOTTOM IMAGES' as const, src: f.src, alt: f.alt, kind: 'NETWORK'     as const })),
          ...img.bottom.placeholders.map(f=> ({ section: 'BOTTOM IMAGES' as const, src: f.src, alt: f.alt, kind: 'PLACEHOLDER' as const })),
        ];
        const tinyImages: TinyImageEntry[] = [
          ...img.top.tiny.map(t    => ({ section: 'TOP CAROUSEL'  as const, src: t.src, width: t.width, height: t.height })),
          ...img.units.tiny.map(t  => ({ section: 'UNIT IMAGES'   as const, src: t.src, width: t.width, height: t.height })),
          ...img.bottom.tiny.map(t => ({ section: 'BOTTOM IMAGES' as const, src: t.src, width: t.width, height: t.height })),
        ];
        const record: ImageScanRecord = {
          label, url,
          top:    img.top,
          units:  img.units,
          bottom: img.bottom,
          totalChecked:     tot,
          totalBroken,
          totalNetwork:     networkFld,
          totalPlaceholder: placeholderFld,
          failures,
          tinyImages,
          structureRegression,
        };
        if (totalBroken > 0) imageFailed.push(record); else imagePassed.push(record);
        if (structureRegression) structureRegressions.push(record);
      }

      if (result.status === 'passed') {
        log(`${prefix} ${label} — ✅ PASS  (${result.unitsChecked} units)${imgTag}`);
        passed.push(label);
      } else if (result.status === 'failed') {
        log(`${prefix} ${label} — ❌ FAIL  (${result.conflicts.length} conflict(s))${imgTag}`);
        result.conflicts.forEach(c => log(`          🚨 ${c}`));
        failed.push({ label, url, conflicts: result.conflicts });
      } else if (result.status === 'skipped') {
        log(`${prefix} ${label} — ○  SKIP  (no unit listings)${imgTag}`);
        skipped.push(label);
      } else {
        log(`${prefix} ${label} — ⚠️  ERROR`);
        log(`          ${result.errorMsg}`);
        errors.push({ label, url, error: result.errorMsg ?? 'unknown error' });
      }

      // Print broken image list immediately under the line for quick scanning
      if (result.images) {
        const allBroken = [
          ...result.images.top.failed.map(f         => ({ s: 'TOP CAROUSEL',  k: 'NETWORK',     ...f })),
          ...result.images.top.placeholders.map(f   => ({ s: 'TOP CAROUSEL',  k: 'PLACEHOLDER', ...f })),
          ...result.images.units.failed.map(f       => ({ s: 'UNIT IMAGES',   k: 'NETWORK',     ...f })),
          ...result.images.units.placeholders.map(f => ({ s: 'UNIT IMAGES',   k: 'PLACEHOLDER', ...f })),
          ...result.images.bottom.failed.map(f      => ({ s: 'BOTTOM IMAGES', k: 'NETWORK',     ...f })),
          ...result.images.bottom.placeholders.map(f=> ({ s: 'BOTTOM IMAGES', k: 'PLACEHOLDER', ...f })),
        ];
        for (const f of allBroken) {
          log(`          🖼️  [${f.s}/${f.k}] ${shortSrc(f.src)}${f.alt ? `  alt="${f.alt}"` : ''}`);
        }
      }
    }

    // ━━━ PHASE 3: Summary ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const scanned = passed.length + failed.length + errors.length;

    // Aggregate image counts (used by both the high-level summary line and the
    // detailed failure section below).
    const totalImgChecked     = imagePassed.concat(imageFailed).reduce((n, r) => n + r.totalChecked, 0);
    const totalImgBroken      = imageFailed.reduce((n, r) => n + r.totalBroken,      0);
    const totalImgNetwork     = imageFailed.reduce((n, r) => n + r.totalNetwork,     0);
    const totalImgPlaceholder = imageFailed.reduce((n, r) => n + r.totalPlaceholder, 0);
    const totalImgLoaded      = totalImgChecked - totalImgBroken;

    log(`\n${BAR}`);
    log('  ⭐  MINI MALL FULL SCAN — RESULTS SUMMARY');
    log(`${BAR}`);
    log(`  Discovered     : ${facilityUrls.length} facility page(s) from navbar`);
    log(`  Scanned        : ${scanned}  |  Skipped: ${skipped.length} (no unit listings on page)`);
    log(`  Unit Conflicts : ✅ ${passed.length} passed  |  ❌ ${failed.length} failed`);
    log(`  Image/Carousel : ✅ ${imagePassed.length} passed  |  ❌ ${imageFailed.length} failed  (sections checked: TOP CAROUSEL, UNIT IMAGES, BOTTOM IMAGES)`);
    if (imageFailed.length > 0) {
      log(`     Breakdown   : ${totalImgNetwork} network failure(s) + ${totalImgPlaceholder} placeholder fallback(s)`);
    }
    if (structureRegressions.length > 0) {
      log(`  🚨 Structure   : ${structureRegressions.length} location(s) have unit rows but ZERO unit images — selectors likely outdated`);
    }
    if (errors.length > 0) {
      log(`  ⚠️   Load errors: ${errors.length}`);
    }

    // ── Failed locations (unit feature conflicts) ─────────────────────────────
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

    // ── Image / Carousel — failures (every broken image, grouped by location) ─
    if (imageFailed.length > 0) {
      log(`\n${DASH}`);
      log('  🖼️   FAILED IMAGES / CAROUSEL — Locations With Broken or Placeholder Images:');
      log(`${DASH}`);
      imageFailed.forEach((r, idx) => {
        log(`\n  ${idx + 1}. ${r.label}`);
        log(`     URL    : ${r.url}`);
        log(`     Sections: top ${r.top.loaded}/${r.top.total} | units ${r.units.loaded}/${r.units.total} | bottom ${r.bottom.loaded}/${r.bottom.total}`);
        if (r.totalNetwork     > 0) log(`     Network failures   : ${r.totalNetwork}`);
        if (r.totalPlaceholder > 0) log(`     Placeholder fallbacks: ${r.totalPlaceholder} (real image missing on backend → "No Image Available" graphic shown)`);
        r.failures.forEach(f => {
          const altPart = f.alt ? `  alt="${f.alt}"` : '';
          log(`     ❌ [${f.section}/${f.kind}] ${shortSrc(f.src)}${altPart}`);
        });
      });
    }

    // ── Image / Carousel — successes (which sections were checked & passed) ───
    if (imagePassed.length > 0) {
      log(`\n${DASH}`);
      log('  🖼️   IMAGE / CAROUSEL — Locations That Passed (sections checked):');
      log(`${DASH}`);
      imagePassed.forEach(r => {
        const parts: string[] = [];
        const dimSummary = (s: SectionScan) =>
          s.dims ? ` (dims ${s.dims.minW}×${s.dims.minH}→${s.dims.maxW}×${s.dims.maxH})` : '';
        if (r.top.total    > 0) parts.push(`TOP CAROUSEL ✅ ${r.top.loaded}/${r.top.total}${dimSummary(r.top)}`);
        if (r.units.total  > 0) parts.push(`UNIT IMAGES ✅ ${r.units.loaded}/${r.units.total}${dimSummary(r.units)}`);
        if (r.bottom.total > 0) parts.push(`BOTTOM IMAGES ✅ ${r.bottom.loaded}/${r.bottom.total}${dimSummary(r.bottom)}`);
        if (parts.length === 0) parts.push('no images detected on page');
        log(`  ✅ ${r.label} — ${parts.join('  |  ')}`);
        if (r.tinyImages.length > 0) {
          log(`     ⚠️  ${r.tinyImages.length} loaded image(s) suspiciously small (<30×30) — possible placeholder`);
        }
      });
    }

    // ── Structure regressions (unit rows present but 0 unit images detected) ──
    if (structureRegressions.length > 0) {
      log(`\n${DASH}`);
      log('  🚨  STRUCTURE REGRESSION — Unit rows in DOM but ZERO unit images detected:');
      log(`${DASH}`);
      log('  → Unit row markup likely changed (e.g. .listviewrows children restructured).');
      log('  → Update unit-image selectors in scanFacilityImages() inside miniMallFullScan.spec.ts.');
      structureRegressions.forEach((r, idx) => {
        log(`\n  ${idx + 1}. ${r.label}`);
        log(`     URL: ${r.url}`);
      });
    }

    // ── Tiny-image summary (loaded but suspiciously small — possible placeholders) ──
    const tinyTotal = imagePassed.concat(imageFailed).reduce((n, r) => n + r.tinyImages.length, 0);
    if (tinyTotal > 0) {
      log(`\n${DASH}`);
      log(`  ⚠️   TINY IMAGES (<30×30) — ${tinyTotal} suspicious loaded image(s) across all locations:`);
      log(`${DASH}`);
      log('  → These DECODED successfully but are smaller than 30px — likely 1×1 placeholders or icons.');
      log('  → Not flagged as a hard failure; review to confirm.');
      const allTiny = imagePassed.concat(imageFailed)
        .flatMap(r => r.tinyImages.map(t => ({ label: r.label, ...t })));
      // Show up to 20 to keep noise down
      allTiny.slice(0, 20).forEach((t, idx) => {
        log(`  ${idx + 1}. [${t.section}] ${t.width}×${t.height}  ${shortSrc(t.src)}  (${t.label})`);
      });
      if (allTiny.length > 20) log(`  …and ${allTiny.length - 20} more`);
    }

    log(`\n  🖼️   Image/Carousel TOTAL: ${totalImgLoaded}/${totalImgChecked} image(s) loaded across ${imagePassed.length + imageFailed.length} location(s)`);

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

    // Fail the Playwright test if any of: unit-feature conflicts, broken images,
    // or structure regressions were found — all three surfaced together.
    const conflictMsg = failed.length === 0 ? '' :
      `${failed.length} Mini Mall location(s) have contradictory unit feature labels:\n` +
      failed.map(f => `\n• ${f.label}\n  ${f.url}\n  ${f.conflicts.map(c => `🚨 ${c}`).join('\n  ')}`).join('\n');

    const imageMsg = imageFailed.length === 0 ? '' :
      `\n\n${imageFailed.length} Mini Mall location(s) have broken images/carousel (${totalImgBroken} broken: ${totalImgNetwork} network + ${totalImgPlaceholder} placeholder):\n` +
      imageFailed.map(r => `\n• ${r.label}\n  ${r.url}\n  ` +
        r.failures.map(f => `🖼️  [${f.section}/${f.kind}] ${f.src}${f.alt ? ` (alt="${f.alt}")` : ''}`).join('\n  ')
      ).join('\n');

    const structureMsg = structureRegressions.length === 0 ? '' :
      `\n\n${structureRegressions.length} Mini Mall location(s) have unit rows but ZERO unit images detected — selectors likely outdated:\n` +
      structureRegressions.map(r => `\n• ${r.label}\n  ${r.url}`).join('\n');

    expect(
      failed.length + imageFailed.length + structureRegressions.length,
      (conflictMsg + imageMsg + structureMsg).trim() || 'mini mall scan failed'
    ).toBe(0);
  });
});
