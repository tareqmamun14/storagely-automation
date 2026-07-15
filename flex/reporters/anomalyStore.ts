/**
 * Anomaly baseline store — the LOCAL, per-facility learning memory. FLEX-ONLY.
 *
 * Committed suppression lives in known-anomalies.json (curated). THIS file is the
 * opposite: an auto-updated, gitignored record of what each facility has looked
 * like over prior runs, so the suite can say "this anomaly is NEW (never seen)"
 * vs "recurring (seen before)". New things stand out; recurring things are
 * tracked but not silently hidden (only the curated known-list suppresses).
 *
 * It also keeps a small fingerprint history (unit count, median rate) so a run
 * can flag DRIFT — e.g. inventory suddenly halving, or the median rate jumping —
 * which often means a scrape/render problem or a real catalog change worth a look.
 *
 * All I/O is best-effort: a learning-store failure must NEVER break a test run.
 */
import * as fs from 'fs';
import * as path from 'path';

const BASELINE_DIR = path.resolve(__dirname, '..', 'test-results', 'anomaly-baselines');

export interface Fingerprint {
  unitCount: number;
  medianStandard: number | null;
  at: string; // ISO date
}

export interface Baseline {
  facilityId: string;
  /** signature → number of prior runs it appeared in. */
  signaturesSeen: Record<string, number>;
  /** rolling fingerprint history (most-recent last), capped. */
  history: Fingerprint[];
  runCount: number;
}

const EMPTY = (facilityId: string): Baseline => ({ facilityId, signaturesSeen: {}, history: [], runCount: 0 });

export function loadBaseline(facilityId: string): Baseline {
  try {
    const file = path.join(BASELINE_DIR, `${facilityId}.json`);
    if (!fs.existsSync(file)) return EMPTY(facilityId);
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    return { ...EMPTY(facilityId), ...parsed };
  } catch {
    return EMPTY(facilityId);
  }
}

/** true when this signature has NOT been seen in a prior run. */
export function isNewSignature(baseline: Baseline, signature: string): boolean {
  return !baseline.signaturesSeen[signature];
}

/**
 * Drift vs the most recent prior fingerprint. Returns a human note when the unit
 * count or median rate moved beyond `countDriftFraction`, else null.
 */
export function fingerprintDrift(baseline: Baseline, current: Fingerprint, fraction: number): string | null {
  const prev = baseline.history[baseline.history.length - 1];
  if (!prev) return null;
  const notes: string[] = [];
  if (prev.unitCount > 0) {
    const delta = Math.abs(current.unitCount - prev.unitCount) / prev.unitCount;
    if (delta > fraction) notes.push(`unit count ${prev.unitCount} → ${current.unitCount}`);
  }
  if (prev.medianStandard && current.medianStandard) {
    const delta = Math.abs(current.medianStandard - prev.medianStandard) / prev.medianStandard;
    if (delta > fraction) notes.push(`median rate $${prev.medianStandard} → $${current.medianStandard}`);
  }
  return notes.length ? notes.join('; ') : null;
}

/**
 * Persist this run: bump seen-counts for the signatures observed, append the
 * fingerprint (cap 10), increment runCount. Best-effort.
 */
export function updateBaseline(baseline: Baseline, signatures: string[], fingerprint: Fingerprint): void {
  try {
    fs.mkdirSync(BASELINE_DIR, { recursive: true });
    const next: Baseline = {
      ...baseline,
      runCount: baseline.runCount + 1,
      signaturesSeen: { ...baseline.signaturesSeen },
      history: [...baseline.history, fingerprint].slice(-10),
    };
    for (const sig of signatures) next.signaturesSeen[sig] = (next.signaturesSeen[sig] || 0) + 1;
    fs.writeFileSync(path.join(BASELINE_DIR, `${baseline.facilityId}.json`), JSON.stringify(next, null, 2), 'utf8');
  } catch {
    /* learning store is best-effort — never break a run */
  }
}
