/**
 * Flex anomaly policy — the brain of the "catch unusual things + learn each run"
 * layer. FLEX-ONLY (nothing here is imported by the legacy suite).
 *
 * The section detectors verify KNOWN expectations (nav present, prices ≤, tokens
 * clean, …). This layer is the complement: it flags DATA that is *implausible or
 * unusual* even when it technically "renders", and routes each finding by its
 * likely SOURCE so the team knows who owns it:
 *
 *   • 'fms'      — comes straight from the FMS feed (unit dimensions, rates,
 *                  inventory). Storagely does NOT author these; legacy shows the
 *                  same values. So these NEVER fail the Storagely run — they are
 *                  surfaced as INFO for awareness (and for the FMS/ops team).
 *   • 'product'  — Storagely's template/binding (unresolved tokens, missing OG,
 *                  broken structure). A NEW one is a real regression → fails.
 *   • 'unknown'  — can't attribute yet (empty inventory, a big count/price drift).
 *                  A NEW one soft-fails so a human triages it (then it's either
 *                  acknowledged as fms/known, or filed as a product bug).
 *
 * "Learning": every anomaly gets a stable SIGNATURE. A curated, committed
 * known-list (known-anomalies.json) suppresses acknowledged ones to INFO so the
 * run converges to clean — WITHOUT ever silently hiding a real bug (only humans
 * add to that list). A local, gitignored baseline (anomalyStore) additionally
 * marks each anomaly NEW vs RECURRING so genuinely new things stand out.
 */

export type AnomalySource = 'fms' | 'product' | 'unknown';
export type AnomalyStatus = 'new' | 'recurring' | 'acknowledged';

export interface Anomaly {
  /** Stable machine code, e.g. 'zero-price', 'extreme-dimensions'. */
  code: string;
  /** Human message for the report. */
  message: string;
  /** A short, run-stable context key (e.g. the unit size "20x141"), or ''. */
  context: string;
  /** Likely owner of the issue. */
  source: AnomalySource;
  /** new (never seen) · recurring (seen before) · acknowledged (in known-list). */
  status: AnomalyStatus;
  /** If acknowledged, the note from the known-list (why it's expected). */
  note?: string;
}

/**
 * Plausibility thresholds for self-storage. Deliberately GENEROUS so a legit
 * large drive-up or long parking space never false-flags — only genuinely absurd
 * values trip these (e.g. Storage Star's FMS-sourced 20'×141' / 201'×106' units).
 */
export const ANOMALY_THRESHOLDS = {
  // Dimensions (feet). A real unit side tops out well under this; parking/RV
  // bays are long but not this long.
  maxUnitSideFt: 60,
  // Area (sq ft). ~30×40 = 1200 is a big drive-up; beyond 1500 is warehouse-scale.
  maxUnitAreaSqFt: 1500,
  // Monthly rate ceiling. A large climate drive-up rarely exceeds this.
  maxMonthlyRate: 2500,
  // A unit rate this many times the run's MEDIAN rate is a statistical outlier.
  priceOutlierFactor: 5,
  // Minimum priced units before the median-outlier test is meaningful.
  minUnitsForOutlier: 4,
  // vs baseline: unit count changing by more than this fraction is drift.
  countDriftFraction: 0.4,
} as const;

/** Intrinsic source of a code before the known-list is consulted. */
const CODE_SOURCE: Record<string, AnomalySource> = {
  'zero-price': 'fms',
  'negative-price': 'fms',
  'extreme-price': 'fms',
  'price-inversion': 'fms',
  'price-outlier': 'fms',
  'extreme-dimensions': 'fms',
  'implausible-aspect': 'fms',
  'unit-count-drift': 'unknown',
  'empty-inventory': 'unknown',
};
export function sourceForCode(code: string): AnomalySource {
  return CODE_SOURCE[code] || 'unknown';
}

/** Stable signature for a finding — used to match the known-list + baseline. */
export function anomalySignature(client: string, code: string, context: string): string {
  return `${(client || 'default').toLowerCase()}:${code}${context ? ':' + context : ''}`;
}

// ── Known / acknowledged anomalies (committed, curated) ─────────────────────
export interface KnownAnomaly {
  client: string;           // '*' = any client
  code: string;             // '*' = any code
  source?: AnomalySource;   // overrides the intrinsic source when set
  status: string;           // free-text lifecycle: 'known-fms' | 'reported' | …
  note?: string;
}

/**
 * A known entry matches an anomaly when client + code match (context is ignored),
 * so "all Storage Star zero-price units are known FMS data" is one entry, not one
 * per unit. '*' wildcards either field.
 */
export function matchKnown(known: KnownAnomaly[], client: string, code: string): KnownAnomaly | undefined {
  const c = (client || '').toLowerCase();
  return known.find(k =>
    (k.client === '*' || k.client.toLowerCase() === c) &&
    (k.code === '*' || k.code === code));
}
