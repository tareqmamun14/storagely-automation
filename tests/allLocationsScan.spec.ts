import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { getStorageSiteUrls, CURRENT_ENVIRONMENT, Environment, STOREROCKET_SITES } from '../configs/urls';
import { scanPageImages, hasUnitsStructureRegression, countTotalBroken, type PageImageScan } from '../utils/imageScan';
import { scanUnitConflicts } from '../utils/unitConflictScan';

// ============================================
// ALL LOCATIONS — FULL SCAN ACROSS ALL CLIENTS
// ============================================
// For every Storagely client (V1 + V2), discovers EVERY facility URL by
// crawling the client's site, then runs two scans on each discovered location:
//
//   1. Image & Carousel       — TOP CAROUSEL / UNIT IMAGES / BOTTOM IMAGES
//      Detects 404s, decode errors, AND placeholder fallbacks like the
//      "no-storage-available.png" Storage Star prod bug.
//   2. Unit Feature Conflicts — same pair list as miniMallFullScan
//
// Mini Mall is excluded — it has its own dedicated, optimized scan in
// tests/miniMallFullScan.spec.ts (uses dedicated aggregate pages).
//
// Storerocket-fronted sites (ulok.com) are also skipped — they are external
// pages without our normal carousel/units structure.
//
// PRODUCTION ONLY:
//   Staging serves placeholder URLs that 404; this test would produce
//   noise. The whole suite is skipped when CURRENT_ENVIRONMENT is staging.
//
// USAGE (run individually):
//   npx playwright test tests/allLocationsScan.spec.ts --project=chrome
//
// WHY OPT-IN:
//   Discovery + per-location scanning easily takes 20-60 minutes depending
//   on how many locations each client publishes. Run on-demand via the
//   control panel's "All Pages" suite — not in standard UI runs.
// ============================================

const isStaging = CURRENT_ENVIRONMENT === Environment.STAGING;

// Real-time log helper (mirrors miniMallFullScan pattern)
const LOG_FILE = path.join(process.cwd(), 'all-locations-scan.txt');
fs.writeFileSync(LOG_FILE, '', 'utf8');
function log(msg: string): void {
  console.log(msg);
  fs.appendFileSync(LOG_FILE, msg + '\n', 'utf8');
}

// ─── URL classification ───────────────────────────────────────────────────────

const NON_GEO_SLUGS = [
  'storage-units-near-me',
  'storage-units-canada',
  'storage-units-united-states',
  'storage-unit-size-guide',
  'storage-units-size-guide',
];

/** True iff the URL is a 3-segment facility/listing page like /storage-units/state/city/slug. */
function isFacilityUrl(url: string, hostMatch: string): boolean {
  try {
    const u = new URL(url);
    if (!u.hostname.includes(hostMatch)) return false;
    return /\/storage-units\/[^/?#]+\/[^/?#]+\/[^/?#]+(?:\/)?$/.test(u.pathname);
  } catch { return false; }
}

/** True iff the URL is a hub-style nav page (/storage-units-XX, /locations, etc.). */
function isHubUrl(url: string, hostMatch: string): boolean {
  try {
    const u = new URL(url);
    if (!u.hostname.includes(hostMatch)) return false;
    if (NON_GEO_SLUGS.some(s => u.pathname.includes(s))) return false;
    return (
      /\/storage-units-[a-z]/.test(u.pathname) ||
      /\/locations\b/i.test(u.pathname) ||
      /\/find-storage\b/i.test(u.pathname) ||
      /\/our-locations\b/i.test(u.pathname)
    );
  } catch { return false; }
}

// ─── Discovery (per client) ───────────────────────────────────────────────────

/** Fetches one page and returns the facility URLs + hub URLs it links to. */
async function collectLinksFromPage(
  page: Page,
  url: string,
  hostMatch: string,
): Promise<{ facilities: string[]; hubs: string[] }> {
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 20_000 });
    await page.waitForTimeout(400);
    const hrefs: string[] = await page.evaluate(() =>
      Array.from(document.querySelectorAll('a[href]'))
        .map(a => (a as HTMLAnchorElement).href)
        .filter(h => /^https?:/.test(h))
    );
    const facilities = new Set<string>();
    const hubs       = new Set<string>();
    for (const href of hrefs) {
      const clean = href.split('#')[0].split('?')[0];
      if (isFacilityUrl(clean, hostMatch))   facilities.add(clean);
      else if (isHubUrl(clean, hostMatch))   hubs.add(clean);
    }
    return { facilities: Array.from(facilities), hubs: Array.from(hubs) };
  } catch {
    return { facilities: [], hubs: [] };
  }
}

/**
 * Discover every facility URL for one client by crawling:
 *   Level 0 — the homepage
 *   Level 1 — every hub URL discovered at Level 0 (states / locations pages)
 * Returns deduped facility URLs.
 */
async function discoverClientFacilities(page: Page, baseUrl: string): Promise<string[]> {
  const hostMatch = new URL(baseUrl).hostname.replace(/^www\.|^ww2\./, '');
  const facilities = new Set<string>();
  const visitedHubs = new Set<string>();

  // Level 0
  const home = await collectLinksFromPage(page, baseUrl, hostMatch);
  home.facilities.forEach(u => facilities.add(u));
  home.hubs.forEach(u => visitedHubs.add(u));

  // Level 1 — bounded to 25 hubs to keep discovery time predictable
  const hubsToVisit = Array.from(visitedHubs).slice(0, 25);
  for (const hub of hubsToVisit) {
    const r = await collectLinksFromPage(page, hub, hostMatch);
    r.facilities.forEach(u => facilities.add(u));
  }

  return Array.from(facilities);
}

// ─── Per-location combined scan ───────────────────────────────────────────────

interface LocationResult {
  url: string;
  conflictsStatus: 'passed' | 'failed' | 'skipped' | 'error';
  conflicts: string[];
  unitsChecked: number;
  images: PageImageScan | null;
  imageBroken: number;          // network failures + placeholder fallbacks
  imageNetworkFailed: number;
  imagePlaceholders: number;
  structureRegression: boolean;
  errorMsg?: string;
}

async function scanOneLocation(page: Page, url: string): Promise<LocationResult> {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25_000 });
    await page.waitForTimeout(800);

    const conflict = await scanUnitConflicts(page);
    const images   = await scanPageImages(page);
    const broken   = countTotalBroken(images);
    const network  = images.top.failed.length       + images.units.failed.length       + images.bottom.failed.length;
    const place    = images.top.placeholders.length + images.units.placeholders.length + images.bottom.placeholders.length;

    return {
      url,
      conflictsStatus: conflict.status,
      conflicts:       conflict.conflicts,
      unitsChecked:    conflict.unitsChecked,
      images,
      imageBroken:        broken,
      imageNetworkFailed: network,
      imagePlaceholders:  place,
      structureRegression: hasUnitsStructureRegression(images),
    };
  } catch (e) {
    return {
      url,
      conflictsStatus: 'error',
      conflicts: [],
      unitsChecked: 0,
      images: null,
      imageBroken: 0,
      imageNetworkFailed: 0,
      imagePlaceholders: 0,
      structureRegression: false,
      errorMsg: (e as Error).message.split('\n')[0],
    };
  }
}

// ─── URL → human-readable label ───────────────────────────────────────────────

function urlToLabel(u: string): string {
  try {
    const url = new URL(u);
    const parts = url.pathname.replace(/^\/storage-units\//, '').split('/').filter(Boolean);
    const cap = (s: string) => s.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    if (parts.length === 3) return `${cap(parts[1])}, ${cap(parts[2])} · ${cap(parts[0])}`;
    return parts.map(cap).join(' / ') || u;
  } catch { return u; }
}

function clientLabel(baseUrl: string): string {
  try {
    let host = new URL(baseUrl).hostname.replace(/^www\.|^ww2\./, '');
    host = host.split('.')[0];
    return host.replace(/storage$/i, ' Storage').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim();
  } catch { return baseUrl; }
}

// ─── Test — produces ONE Playwright test that scans every client ──────────────

test.use({ headless: true });

test.describe('🔭 All Locations — Full Scan (All Clients, All Pages)', () => {
  test.setTimeout(0); // unlimited — discovery + scan can take an hour

  test('Scan ALL locations of ALL clients for unit feature conflicts + image/carousel issues', async ({ page }) => {

    if (isStaging) {
      log('\n  ⚠️  SKIPPED — All Pages scan runs in PRODUCTION only.');
      log('     Staging serves placeholder URLs that 404 and would produce noisy results.');
      test.skip();
      return;
    }

    const BAR  = '═'.repeat(74);
    const DASH = '─'.repeat(74);

    // ── Build client list (production homepages, excluding mini-mall + storerocket) ─
    const clientHomepages = getStorageSiteUrls().filter(u => {
      const host = u.toLowerCase();
      if (host.includes('minimallstorage'))                            return false; // dedicated mini-mall scan
      if (STOREROCKET_SITES.some(s => host.includes(s.toLowerCase()))) return false; // ulok.com etc.
      return true;
    });

    log(`\n${BAR}`);
    log('  🔭  ALL LOCATIONS — FULL SCAN (All Clients, All Pages)');
    log(`${BAR}`);
    log(`  Clients to scan : ${clientHomepages.length}`);
    log('  Per location, runs: (a) Image & Carousel scan  (b) Unit Feature Conflict scan');
    log(`  Mini Mall excluded — has its own dedicated scan in miniMallFullScan.spec.ts`);
    log(`  Storerocket sites excluded (no compatible markup): ${STOREROCKET_SITES.join(', ')}`);

    interface ClientReport {
      label: string;
      base:  string;
      facilities: string[];
      results: LocationResult[];
      discoveryError?: string;
    }
    const reports: ClientReport[] = [];

    // ━━━ PHASE 1: Discovery + per-location scan, one client at a time ━━━━━━━
    for (let ci = 0; ci < clientHomepages.length; ci++) {
      const base  = clientHomepages[ci];
      const label = clientLabel(base);
      log(`\n${DASH}`);
      log(`  CLIENT [${ci + 1}/${clientHomepages.length}] : ${label}  (${base})`);
      log(`${DASH}`);

      let facilities: string[] = [];
      let discoveryError: string | undefined;
      try {
        facilities = await discoverClientFacilities(page, base);
      } catch (e) {
        discoveryError = (e as Error).message.split('\n')[0];
        log(`  ⚠️  Discovery failed: ${discoveryError}`);
      }

      log(`  Discovered ${facilities.length} facility page(s).`);

      const results: LocationResult[] = [];
      const pad = String(facilities.length).length || 1;
      for (let i = 0; i < facilities.length; i++) {
        const url    = facilities[i];
        const ll     = urlToLabel(url);
        const prefix = `    [${String(i + 1).padStart(pad)}/${facilities.length}]`;

        const r = await scanOneLocation(page, url);
        results.push(r);

        const hasProblem = r.conflictsStatus === 'failed' || r.imageBroken > 0 || r.structureRegression || r.conflictsStatus === 'error';
        if (hasProblem) {
          log(`${prefix} ❌ ${ll}`);
          if (r.conflictsStatus === 'failed') r.conflicts.forEach(c => log(`           🚨 ${c}`));
          if (r.images && r.imageBroken > 0) {
            for (const f of r.images.units.failed)       log(`           ❌ Unit image MISSING (network) — ${f.alt || 'no alt'}`);
            for (const f of r.images.units.placeholders) log(`           ❌ Unit image PLACEHOLDER — ${f.alt || 'no alt'}`);
            if (r.images.top.failed.length + r.images.top.placeholders.length > 0)
              log(`           ❌ Top carousel: ${r.images.top.failed.length + r.images.top.placeholders.length} broken`);
            if (r.images.bottom.failed.length + r.images.bottom.placeholders.length > 0)
              log(`           ❌ Bottom images: ${r.images.bottom.failed.length + r.images.bottom.placeholders.length} broken`);
          }
          if (r.structureRegression) log(`           🚨 Unit rows exist but 0 unit images detected`);
          if (r.errorMsg) log(`           ⚠️  ${r.errorMsg}`);
        } else {
          log(`${prefix} ✅ ${ll}`);
        }
      }

      reports.push({ label, base, facilities, results, discoveryError });
    }

    // ━━━ PHASE 2: Per-client + grand summary ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    log(`\n${BAR}`);
    log('  🔭  ALL LOCATIONS — RESULTS SUMMARY');
    log(`${BAR}`);

    let totalFacilities       = 0;
    let totalConflictsFailed  = 0;
    let totalImageFailedLocs  = 0;
    let totalImageNetwork     = 0;
    let totalImagePlaceholder = 0;
    let totalStructure        = 0;
    let totalLoadErrors       = 0;

    for (const r of reports) {
      totalFacilities       += r.facilities.length;
      totalConflictsFailed  += r.results.filter(x => x.conflictsStatus === 'failed').length;
      totalImageFailedLocs  += r.results.filter(x => x.imageBroken > 0).length;
      totalImageNetwork     += r.results.reduce((n, x) => n + x.imageNetworkFailed, 0);
      totalImagePlaceholder += r.results.reduce((n, x) => n + x.imagePlaceholders, 0);
      totalStructure        += r.results.filter(x => x.structureRegression).length;
      totalLoadErrors       += r.results.filter(x => x.conflictsStatus === 'error').length;
    }

    // ── FAILURES — location + unit detail ────────────────────────────────────
    const allFailures: Array<{ client: string; r: LocationResult }> = [];
    for (const rep of reports) {
      for (const r of rep.results) {
        if (r.conflictsStatus === 'failed' || r.imageBroken > 0 || r.structureRegression) {
          allFailures.push({ client: rep.label, r });
        }
      }
    }

    if (allFailures.length > 0) {
      log(`\n${BAR}`);
      log(`  ❌  ISSUES FOUND (${allFailures.length} location(s))`);
      log(`${BAR}`);
      for (const f of allFailures) {
        log(`\n  [${f.client}] ${urlToLabel(f.r.url)}`);
        log(`  ${f.r.url}`);
        if (f.r.conflicts.length > 0)
          f.r.conflicts.forEach(c => log(`    🚨 ${c}`));
        if (f.r.images) {
          for (const img of f.r.images.units.failed)
            log(`    ❌ Unit image MISSING (network) — ${img.alt || 'no alt'}`);
          for (const img of f.r.images.units.placeholders)
            log(`    ❌ Unit image PLACEHOLDER — ${img.alt || 'no alt'}`);
          if (f.r.images.top.failed.length + f.r.images.top.placeholders.length > 0)
            log(`    ❌ Top carousel: ${f.r.images.top.failed.length + f.r.images.top.placeholders.length} broken`);
          if (f.r.images.bottom.failed.length + f.r.images.bottom.placeholders.length > 0)
            log(`    ❌ Bottom images: ${f.r.images.bottom.failed.length + f.r.images.bottom.placeholders.length} broken`);
        }
        if (f.r.structureRegression)
          log(`    🚨 Unit rows exist but 0 unit images detected`);
      }
    }

    // ── PASSED — compact summary ─────────────────────────────────────────────
    const passedByClient: Record<string, number> = {};
    for (const rep of reports) {
      const passed = rep.results.filter(x =>
        x.conflictsStatus !== 'failed' && x.imageBroken === 0 && !x.structureRegression && x.conflictsStatus !== 'error'
      ).length;
      if (passed > 0) passedByClient[rep.label] = passed;
    }
    const passedTotal = Object.values(passedByClient).reduce((a, b) => a + b, 0);
    if (passedTotal > 0) {
      log(`\n${BAR}`);
      log(`  ✅  PASSED: ${passedTotal} location(s)`);
      log(`${BAR}`);
      for (const [client, count] of Object.entries(passedByClient)) {
        log(`  ${client}: ${count} location(s) — all images OK, no conflicts`);
      }
    }

    // ── Totals ───────────────────────────────────────────────────────────────
    log(`\n${BAR}`);
    log(`  📊  ${reports.length} clients | ${totalFacilities} locations | ${passedTotal} passed | ${allFailures.length} failed`);
    if (totalLoadErrors > 0) log(`  ⚠️  ${totalLoadErrors} location(s) failed to load`);
    log(`${BAR}\n`);

    expect(
      totalConflictsFailed + totalImageFailedLocs + totalStructure,
      `${allFailures.length} location(s) with issues. See ${LOG_FILE} for details.`
    ).toBe(0);
  });
});
