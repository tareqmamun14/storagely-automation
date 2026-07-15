/**
 * Flex location pool + random sampling. FLEX-ONLY.
 *
 * The facility registry pins ONE known-good URL per client (a stable anchor).
 * To WIDEN coverage, a run can instead sample RANDOM locations for a client so
 * different pages get exercised over time (catching page-specific data/render
 * issues the fixed URL would never touch).
 *
 * Pool = a committed curated seed (below) ∪ an optional local, gitignored cache
 * grown by sitemap discovery (flex/test-results/location-pools/<client>.json,
 * written by discoverLocations()). Sampling reads the pool synchronously so it
 * works at Playwright's (sync) test-collection time — no network at collection.
 *
 * Reproducibility: sampling is controlled by FLEX_SAMPLE and is DISABLED whenever
 * a run pins locations (FLEX_CUSTOM_URL / FLEX_FACILITY_FILTER) — i.e. while
 * you're investigating a specific page or a retry is needed, the target never
 * changes. The URLs picked for a run are logged so a finding can be reproduced
 * by pinning that URL.
 */
import * as fs from 'fs';
import * as path from 'path';

/**
 * Committed seed pool of REAL production location URLs per client. Grown over
 * time (and by discoverLocations()). Sampling falls back to the registry
 * facility for any client with no pool entries.
 */
export const LOCATION_POOL: Record<string, string[]> = {
  storagestar: [
    'https://www.storagestar.com/storage-units/florida/marco-island/east-elkcam-circle',
    'https://www.storagestar.com/storage-units/colorado/avon/910-nottingham-road',
    'https://www.storagestar.com/storage-units/colorado/colorado-springs/aerotech-drive',
  ],
  minimall: [
    'https://minimallstorage.com/storage-units/ohio/carroll/columbus-lancaster-road',
    'https://minimallstorage.com/storage-units/alabama/birmingham/richard-arrington-jr-blvd',
  ],
  safeguard: [
    'https://www.safeguardit.com/storage-units/connecticut/bridgeport/west-end-west-side',
  ],
};

const CACHE_DIR = path.resolve(__dirname, '..', 'test-results', 'location-pools');

/** Committed seed ∪ locally-discovered cache (deduped), for a client. */
export function getLocationPool(client: string): string[] {
  const c = (client || '').toLowerCase();
  const seed = LOCATION_POOL[c] || [];
  let discovered: string[] = [];
  try {
    const file = path.join(CACHE_DIR, `${c}.json`);
    if (fs.existsSync(file)) {
      const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (Array.isArray(parsed)) discovered = parsed.filter((u): u is string => typeof u === 'string');
    }
  } catch { /* cache is best-effort */ }
  return [...new Set([...seed, ...discovered])];
}

/**
 * Parse FLEX_SAMPLE. Returns the sample size N when random sampling is on, else
 * null. Forms: "random" (N=2) · "random:3" · "3" (bare number → N=3).
 * Sampling is force-disabled when the run pins locations.
 */
export function sampleSize(pinned: boolean): number | null {
  if (pinned) return null;
  const raw = (process.env.FLEX_SAMPLE || '').trim().toLowerCase();
  if (!raw) return null;
  const m = raw.match(/^(?:random(?::(\d+))?|(\d+))$/);
  if (!m) return null;
  const n = m[1] ? parseInt(m[1], 10) : m[2] ? parseInt(m[2], 10) : 2;
  return Number.isFinite(n) && n > 0 ? n : 2;
}

/**
 * Pick up to n distinct URLs from a pool. Deterministic-per-process is NOT
 * required, but we DO want a run's picks fixed once chosen (so Playwright
 * retries hit the same URL) — the caller samples once at collection time and
 * reuses the result for the whole run, so retries never re-sample.
 */
export function samplePool(pool: string[], n: number): string[] {
  if (pool.length <= n) return [...pool];
  const copy = [...pool];
  const out: string[] = [];
  while (out.length < n && copy.length) {
    const idx = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}
