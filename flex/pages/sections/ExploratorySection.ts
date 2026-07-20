import { Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { ISectionDetector, SectionContext, SectionResult, check } from './types';
import { getRentHandoff } from '../../configs/profiles';
import { EXPLORATORY_CATALOG, ExploratoryProbe } from '../../configs/exploratoryCatalog';

/**
 * Exploratory Probe — "test something NEW each run". FLEX-ONLY.
 *
 * Rotates through configs/exploratoryCatalog.ts, running the N least-recently-
 * run probes on every journey (rotation state is per-client, local, and
 * gitignored — flex/test-results/exploratory-state/<client>.json). Over a
 * handful of runs every probe has visited every facility, continuously
 * widening coverage beyond the fixed checks without making any single run
 * slower.
 *
 * POLICY: info-only. A probe finding NEVER fails the run — it is reported as
 * "FINDING: …" and the control panel's Issues dashboard turns it into a
 * CANDIDATE issue for human triage. FLEX_EXPLORE_N overrides how many probes
 * run per journey (default 4; 0 disables).
 */
export class ExploratorySection implements ISectionDetector {
  readonly id = 'exploratory';
  readonly label = 'Exploratory Probe';

  async verify(page: Page, ctx: SectionContext): Promise<SectionResult> {
    const start = Date.now();
    const errors: string[] = [];
    const checks = [];
    const data: Record<string, unknown> = {};

    const n = probesPerRun();
    if (n === 0) {
      checks.push(check('exploratory rotation (info)', true, 'disabled via FLEX_EXPLORE_N=0'));
      return this.result(ctx, checks, data, start, errors);
    }

    // FLEX_EXPLORE_FORCE=<id,id> — verification mode: run EXACTLY these probes
    // (the panel's Re-verify button uses this to confirm/refute a finding) and
    // leave the rotation state untouched.
    const forced = forcedProbes();
    const state = loadState(ctx.client);
    const picked = forced ?? pickProbes(state, n);
    data.probes = picked.map(p => p.id);
    checks.push(check('exploratory rotation (info)', true, forced
      ? `VERIFICATION run — forced probe(s): ${picked.map(p => p.id).join(', ')} (rotation state untouched)`
      : `run #${state.runs + 1} — probing: ${picked.map(p => p.id).join(', ')} (rotates least-recently-run first; catalog=${EXPLORATORY_CATALOG.length})`));

    const handoff = ctx.handoff ?? getRentHandoff(ctx.client);
    let findings = 0;
    for (const probe of picked) {
      try {
        const r = await probe.run(page, { client: ctx.client, url: ctx.url, hrefContains: handoff.hrefContains });
        if (r.finding) findings++;
        // Info-only by design: passed=true either way. "FINDING:" is the
        // contract the panel aggregator keys on to raise a candidate issue.
        checks.push(check(`explore: ${probe.id}`, true,
          r.finding ? `FINDING: ${r.finding}  ·  (${r.detail})  ·  why: ${probe.why}` : `clean — ${r.detail}`));
      } catch (err) {
        // A broken probe must never break the journey — report and move on.
        checks.push(check(`explore: ${probe.id}`, true, `probe error (info): ${(err as Error).message?.split('\n')[0]}`));
      }
    }
    data.findings = findings;

    if (!forced) saveState(ctx.client, state, picked);
    return this.result(ctx, checks, data, start, errors);
  }

  private result(ctx: SectionContext, checks: SectionResult['checks'], data: Record<string, unknown>, start: number, errors: string[]): SectionResult {
    return {
      sectionId: this.id,
      facilityId: ctx.facilityId,
      facilityName: ctx.facilityName,
      url: ctx.url,
      present: true,
      checks,
      data,
      durationMs: Date.now() - start,
      errors: errors.length ? errors : undefined,
    };
  }
}

// ── Rotation state (local, gitignored via flex/test-results/) ────
interface ExploreState { runs: number; lastRun: Record<string, number>; }

const STATE_DIR = path.resolve(__dirname, '..', '..', 'test-results', 'exploratory-state');

/** FLEX_EXPLORE_FORCE=<id,id> → those catalog probes exactly, or null. */
function forcedProbes(): ExploratoryProbe[] | null {
  const raw = (process.env.FLEX_EXPLORE_FORCE || '').trim().toLowerCase();
  if (!raw) return null;
  const ids = new Set(raw.split(',').map(s => s.trim()).filter(Boolean));
  const picked = EXPLORATORY_CATALOG.filter(p => ids.has(p.id.toLowerCase()));
  return picked.length ? picked : null;
}

function probesPerRun(): number {
  const raw = (process.env.FLEX_EXPLORE_N || '').trim();
  if (raw === '') return 4;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? Math.min(n, EXPLORATORY_CATALOG.length) : 4;
}

function stateFile(client: string): string {
  return path.join(STATE_DIR, `${(client || 'unknown').toLowerCase()}.json`);
}

function loadState(client: string): ExploreState {
  try {
    const parsed = JSON.parse(fs.readFileSync(stateFile(client), 'utf8'));
    if (parsed && typeof parsed.runs === 'number' && parsed.lastRun) return parsed;
  } catch { /* fresh state */ }
  return { runs: 0, lastRun: {} };
}

/**
 * Graduated (alwaysRun) probes run EVERY journey; the rest rotate
 * least-recently-run first (never-run = first), stable catalog order on ties.
 */
function pickProbes(state: ExploreState, n: number): ExploratoryProbe[] {
  const always = EXPLORATORY_CATALOG.filter(p => p.alwaysRun);
  const rotating = EXPLORATORY_CATALOG.filter(p => !p.alwaysRun)
    .map((p, i) => ({ p, i, last: state.lastRun[p.id] ?? -1 }))
    .sort((a, b) => a.last - b.last || a.i - b.i)
    .slice(0, n)
    .map(x => x.p);
  return [...always, ...rotating];
}

function saveState(client: string, state: ExploreState, picked: ExploratoryProbe[]): void {
  try {
    state.runs += 1;
    for (const p of picked) state.lastRun[p.id] = state.runs;
    fs.mkdirSync(STATE_DIR, { recursive: true });
    fs.writeFileSync(stateFile(client), JSON.stringify(state, null, 2));
  } catch { /* best-effort — rotation just restarts if unwritable */ }
}
