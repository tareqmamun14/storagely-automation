import * as fs from 'fs';
import * as path from 'path';
import { sampleSize, pinRunRotation, removeRunRotation } from './configs/locationPool';
import { getSelectedFlexEnv, registryUrlsByClient } from './configs/facilities';

/**
 * Pin ONE random seed for the whole run. FLEX-ONLY.
 *
 * FLEX_SAMPLE picks random locations at test-collection time — but Playwright
 * re-imports the spec in EVERY worker process, and unpinned Math.random()
 * would sample different URLs there, generating test titles the runner can't
 * match ("test not found"). This globalSetup writes a fresh seed once per run;
 * locationPool.samplePool() derives every process's picks deterministically
 * from it, so the collector and all workers agree on the same locations
 * (and Playwright retries hit the same URL — pinned targets stay pinned).
 *
 * `--list` runs skip globalSetup; samplePool falls back to an hour-stable
 * seed there, which only affects what a listing prints.
 */
export default async function globalSetup(): Promise<void> {
  const dir = path.resolve(__dirname, 'test-results');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'run-seed.json'),
    JSON.stringify({ seed: Date.now() % 2147483647, at: new Date().toISOString() }, null, 2),
  );

  // ── Rotation pinning (same once-per-run rule as the seed) ─────────────────
  // The default prod regression runs ONE location per client, advancing
  // through the curated rotation list each run. Advance + pin happen HERE —
  // exactly once — so collector, workers, and retries all agree on the pick.
  // Not applicable when the run pins locations, samples, opts out, or targets
  // the test env — then any leftover pin is removed instead.
  const pinnedRun = !!(process.env.FLEX_CUSTOM_URL || '').trim()
    || !!(process.env.FLEX_FACILITY_FILTER || '').trim();
  const sampling = sampleSize(pinnedRun) != null;
  const rotateOff = (process.env.FLEX_ROTATE || '').trim().toLowerCase() === 'off';
  if (!pinnedRun && !sampling && !rotateOff && getSelectedFlexEnv() === 'production') {
    const wanted = (process.env.FLEX_CLIENT || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    const all = registryUrlsByClient('production');
    const selected: Record<string, string[]> = {};
    for (const [client, urls] of Object.entries(all)) {
      if (!wanted.length || wanted.includes(client)) selected[client] = urls;
    }
    const picks = pinRunRotation(selected);
    console.log(`  🔄 rotation pinned for this run: ${Object.entries(picks).map(([c, u]) => `${c} → ${u}`).join('  ·  ')}`);
  } else {
    removeRunRotation();
  }
}
