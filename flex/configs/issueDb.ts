/**
 * Flex ISSUE DATABASE — suite-side reader + gate. FLEX-ONLY.
 *
 * `flex/issue-db/issues.json` is the COMMITTED single source of truth for
 * triaged findings. It syncs desktop↔laptop via git, the control panel's
 * Issues dashboard reads/writes it, and this module gates the journey with it.
 *
 * Issue lifecycle (status):
 *   'new'          untriaged failure — the suite still FAILS on it
 *   'candidate'    exploratory/anomaly lead (info-only find, awaiting triage)
 *   'false-flag'   OUR check is wrong → demoted to info until the suite is
 *                  fixed (dashboard shows "SUITE FIX NEEDED")
 *   'informed'     real bug, team informed → demoted to tagged info (tracked)
 *   'acknowledged' real bug, triaged/backlogged → demoted to tagged info
 *   'fixed'        believed fixed → NOT demoted; if it reappears the run
 *                  fails loudly again (regression!)
 *
 * TWO layers of gating prevent noise from turning runs red:
 *
 * 1. Known-issue gate: triaged issues (informed / acknowledged / false-flag)
 *    demote matching FAILED checks to tagged info-passes — a red journey
 *    always means SOMETHING NEW.
 *
 * 2. Priority gate: LOW-priority areas (seohead, integrity, exploratory) and
 *    low-priority health checks (token attributes) auto-demote even when NEW.
 *    Only HIGH/NORMAL priority failures (rent flow, page crash, HTTP errors,
 *    broken components) can turn a run red.
 *
 * Triaged issues stay visible — tagged in every report and listed in the
 * panel dashboard — instead of re-failing every run. Only humans (via the
 * panel or an edit) change a status; the panel auto-APPENDS new issues but
 * never auto-demotes them.
 */
import * as fs from 'fs';
import * as path from 'path';

export type IssueStatus =
  | 'new' | 'candidate' | 'false-flag' | 'informed' | 'acknowledged' | 'fixed';

export interface FlexIssue {
  id: string;
  /** One issue can cover several check signatures (same root cause). */
  signatures: string[];
  client: string;
  area: string;
  check: string;
  title: string;
  detail: string;
  source: 'suite' | 'exploratory' | 'anomaly';
  status: IssueStatus;
  slackChannel?: string;
  comments: Array<{ text: string; at: string }>;
  firstSeen: string;
  lastSeen: string;
  occurrences: number;
  urls: string[];
}

const DB_FILE = path.resolve(__dirname, '..', 'issue-db', 'issues.json');

/** Statuses that demote a matching FAILED check to a tagged info-pass. */
const DEMOTABLE: ReadonlySet<string> = new Set(['false-flag', 'informed', 'acknowledged']);

// ── Priority classification ──────────────────────────────────────────
// Shared between the suite gate and the control panel. HIGH = broken
// feature / checkout; LOW = SEO meta, data-consistency cosmetics,
// exploratory probes, attribute-only tokens. Everything else = NORMAL.
const LOW_AREAS: ReadonlySet<string> = new Set(['seohead', 'integrity', 'exploratory']);
const HIGH_HEALTH_RE = /http status|react.*crash|units.*rent/i;
const LOW_HEALTH_RE  = /token.*attribute/i;

export type CheckPriority = 'high' | 'normal' | 'low';

export function checkPriority(area: string, checkName: string): CheckPriority {
  const a = (area || '').toLowerCase();
  const c = (checkName || '').toLowerCase();
  if (a === 'rent') return 'high';
  if (a === 'health' && HIGH_HEALTH_RE.test(c)) return 'high';
  if (LOW_AREAS.has(a)) return 'low';
  if (a === 'health' && LOW_HEALTH_RE.test(c)) return 'low';
  return 'normal';
}

/**
 * Auto-demote LOW-priority failed checks to tagged info-passes.
 * Runs AFTER the known-issue gate. This ensures minor findings (seohead,
 * integrity cosmetics, exploratory probes) never turn a run red — they're
 * still visible in the report and dashboard, just not blocking.
 */
export function applyPriorityGate(
  area: string,
  checks: ReadonlyArray<{ name: string; passed: boolean; detail?: string }>,
): string[] {
  const demoted: string[] = [];
  for (const ck of checks) {
    if (ck.passed) continue;
    if (checkPriority(area, ck.name) === 'low') {
      ck.passed = true;
      ck.detail = `[low-priority] ${ck.detail || ''}`.trim();
      demoted.push(ck.name);
    }
  }
  return demoted;
}

/**
 * "Open Graph title + image present" → "open-graph-title-image-present".
 * MUST stay identical to normalizeCheck() in control-panel/server.js — the
 * panel aggregator and this gate must compute the same signatures.
 */
export function normalizeCheck(name: string): string {
  return (name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/** Signature = "<client>|<area>|<normalized-check>". Area = 'health' | sectionId | 'rent' | 'exploratory'. */
export function issueSignature(client: string, area: string, checkName: string): string {
  return `${(client || '').toLowerCase()}|${(area || '').toLowerCase()}|${normalizeCheck(checkName)}`;
}

let cached: FlexIssue[] | null = null;
export function loadIssueDb(): FlexIssue[] {
  if (cached) return cached;
  try {
    const parsed = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    cached = Array.isArray(parsed?.issues) ? parsed.issues : [];
  } catch {
    cached = []; // no DB / unreadable = nothing demoted (fail normally)
  }
  return cached;
}

/** The demotable issue matching this exact client+area+check, or null. */
export function matchKnownIssue(client: string, area: string, checkName: string): FlexIssue | null {
  const sig = issueSignature(client, area, checkName);
  for (const issue of loadIssueDb()) {
    if (DEMOTABLE.has(issue.status) && Array.isArray(issue.signatures) && issue.signatures.includes(sig)) {
      return issue;
    }
  }
  return null;
}

/**
 * Demote FAILED checks that match a triaged issue to tagged info-passes,
 * IN PLACE (the same check objects flow into the journey report, so the tag
 * shows up in terminal/JSON/Markdown and the panel dashboard). Returns what
 * was demoted so callers can log it.
 */
export function applyKnownIssueGate(
  client: string,
  area: string,
  checks: ReadonlyArray<{ name: string; passed: boolean; detail?: string }>,
): Array<{ name: string; issueId: string; status: IssueStatus }> {
  const demoted: Array<{ name: string; issueId: string; status: IssueStatus }> = [];
  for (const ck of checks) {
    if (ck.passed) continue;
    const issue = matchKnownIssue(client, area, ck.name);
    if (!issue) continue;
    const tag = issue.status === 'false-flag'
      ? `[known:false-flag #${issue.id} — SUITE FIX NEEDED]`
      : `[known:${issue.status} #${issue.id}]`;
    ck.passed = true;
    ck.detail = `${tag} ${ck.detail || ''}`.trim();
    demoted.push({ name: ck.name, issueId: issue.id, status: issue.status });
  }
  return demoted;
}
