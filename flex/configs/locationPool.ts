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
 * Pick up to n distinct URLs from a pool — DETERMINISTIC per run.
 *
 * Playwright re-imports the spec in every worker process; if each process
 * sampled independently (Math.random), workers would generate different test
 * titles than the runner collected → "test not found". So picks derive from a
 * run-pinned seed: flex/global-setup.ts writes test-results/run-seed.json once
 * per run and every process reads the same value (retries therefore also hit
 * the same URL). `--list` (no globalSetup) falls back to an hour-stable seed.
 * The pool's own content salts the seed so different clients get independent
 * picks within one run.
 */
export function samplePool(pool: string[], n: number): string[] {
  if (pool.length <= n) return [...pool];
  const rand = mulberry32(runSeed() ^ hashStr(pool.join('|')));
  const copy = [...pool];
  const out: string[] = [];
  while (out.length < n && copy.length) {
    const idx = Math.floor(rand() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}

// ── Rotating single-location regression (default prod cadence) ──
// One location per client per run, advancing through the client's CURATED
// rotation list on each regression: registry rows first, then the committed
// seed pool. NOT the discovered sitemap cache — the default regression only
// visits vetted pages; "graduate" a discovered URL by adding it to
// LOCATION_POOL above (curated, committed). FLEX_SAMPLE remains the
// wide-coverage sweep over the full (discovered) pool.

const RUN_ROTATION_FILE = path.resolve(__dirname, '..', 'test-results', 'run-rotation.json');
const ROTATION_STATE_FILE = path.resolve(__dirname, '..', 'test-results', 'rotation-state.json');

/** Curated rotation list for a client: registry URLs ∪ committed seeds (deduped, stable order). */
export function rotationList(client: string, registryUrls: string[]): string[] {
  const c = (client || '').toLowerCase();
  return [...new Set([...registryUrls, ...(LOCATION_POOL[c] || [])])];
}

/** This run's pinned rotation picks (written once by flex/global-setup.ts), or null. */
export function readRunRotation(): Record<string, string> | null {
  try {
    const { picks, at } = JSON.parse(fs.readFileSync(RUN_ROTATION_FILE, 'utf8'));
    // Freshness: a pick only has to hold for ONE run (guards --list leftovers).
    if (picks && typeof picks === 'object' && Date.now() - Date.parse(at) < 12 * 3600_000) return picks;
  } catch { /* no pinned rotation */ }
  return null;
}

/**
 * Advance each client's rotation pointer and pin this run's pick. Called ONCE
 * per run from flex/global-setup.ts — never from test files (workers re-import
 * them, and re-advancing there would desync test titles across processes).
 */
export function pinRunRotation(registryUrlsByClient: Record<string, string[]>): Record<string, string> {
  let state: Record<string, number> = {};
  try { state = JSON.parse(fs.readFileSync(ROTATION_STATE_FILE, 'utf8')) || {}; } catch { /* fresh state */ }
  const picks: Record<string, string> = {};
  for (const [client, registryUrls] of Object.entries(registryUrlsByClient)) {
    const list = rotationList(client, registryUrls);
    if (!list.length) continue;
    const idx = Number.isFinite(state[client]) ? (state[client] as number) : 0;
    picks[client] = list[idx % list.length];
    state[client] = (idx + 1) % list.length;
  }
  try {
    fs.mkdirSync(path.dirname(RUN_ROTATION_FILE), { recursive: true });
    fs.writeFileSync(RUN_ROTATION_FILE, JSON.stringify({ picks, at: new Date().toISOString() }, null, 2));
    fs.writeFileSync(ROTATION_STATE_FILE, JSON.stringify(state, null, 2));
  } catch { /* best-effort — collection falls back to registry anchors */ }
  return picks;
}

/** Drop a stale pinned rotation (pinned/sampled runs must not read leftovers). */
export function removeRunRotation(): void {
  try { fs.unlinkSync(RUN_ROTATION_FILE); } catch { /* already gone */ }
}

const RUN_SEED_FILE = path.resolve(__dirname, '..', 'test-results', 'run-seed.json');

function runSeed(): number {
  try {
    const { seed, at } = JSON.parse(fs.readFileSync(RUN_SEED_FILE, 'utf8'));
    // Freshness guard: a seed only has to hold for ONE run. Ignore leftovers
    // (e.g. --list without globalSetup reading a days-old file).
    if (Number.isFinite(seed) && Date.now() - Date.parse(at) < 12 * 3600_000) return seed;
  } catch { /* no seed file — fall through */ }
  return Math.floor(Date.now() / 3600_000); // hour-stable fallback (listings)
}

/** Small deterministic PRNG (mulberry32) — plenty for shuffling a URL pool. */
function mulberry32(a: number): () => number {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}
