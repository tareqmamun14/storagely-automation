/**
 * Journey reporter — per-customer test report for the unified facility journey.
 *
 * Tracks every step (health, sections, reserve, rent) with granular checks,
 * then produces:
 *   - Clean terminal output — data alongside passes, inspect hints on failures
 *   - JSON artifact (machine-readable, for CI dashboards)
 *   - Markdown summary (human-readable, easy to skim)
 *
 * Each customer/facility gets ONE report covering the entire top-down journey.
 */
import * as fs from 'fs';
import * as path from 'path';
import { SectionResult, sectionPassed } from '../pages/sections/types';
import { formatFindings } from './sectionReporter';

// ── Types ──────────────────────────────────────────────────────

export interface StepCheck {
  name: string;
  passed: boolean;
  detail?: string;
  /** Where to look on the live page if this check failed. */
  inspectHint?: string;
}

export interface JourneyStep {
  id: string;
  label: string;
  status: 'passed' | 'failed' | 'skipped';
  checks: StepCheck[];
  durationMs: number;
}

export interface JourneyReport {
  facility: { id: string; name: string; url: string; client: string };
  timestamp: string;
  totalDurationMs: number;
  steps: JourneyStep[];
  summary: { total: number; passed: number; failed: number; skipped: number };
}

// ── Collector — accumulates results during the journey ─────────

export class JourneyCollector {
  private steps: JourneyStep[] = [];
  private active: { id: string; label: string; checks: StepCheck[]; start: number } | null = null;

  constructor(
    public readonly facility: JourneyReport['facility'],
    private startTime = Date.now(),
  ) {}

  beginStep(id: string, label: string): this {
    if (this.active) this.endStep();
    this.active = { id, label, checks: [], start: Date.now() };
    return this;
  }

  check(name: string, passed: boolean, detail?: string, inspectHint?: string): this {
    if (!this.active) return this;
    this.active.checks.push({ name, passed, detail, inspectHint });
    return this;
  }

  /**
   * Run a check function. If it returns a string, that becomes the pass detail
   * (the data you saw/validated). If it throws, the error becomes the fail detail.
   */
  async runCheck(name: string, fn: () => Promise<string | void>, inspectHint?: string): Promise<boolean> {
    if (!this.active) return false;
    try {
      const detail = await fn();
      this.active.checks.push({ name, passed: true, detail: detail || undefined });
      return true;
    } catch (err) {
      const msg = (err as Error).message || String(err);
      this.active.checks.push({ name, passed: false, detail: msg.split('\n')[0], inspectHint });
      return false;
    }
  }

  /**
   * Fold SectionResult[] into the current step as individual checks.
   * Each section becomes one check line with data summary.
   * @param sectionLabels — map of sectionId → human label (e.g. "Image Carousel")
   */
  addSectionResults(results: SectionResult[], sectionLabels?: Record<string, string>): this {
    if (!this.active) return this;
    for (const r of results) {
      const ok = sectionPassed(r);
      const passedCount = r.checks.filter(c => c.passed).length;
      const totalCount = r.checks.length;
      const findings = formatFindings(r);
      const countsLabel = `${passedCount}/${totalCount} checks`;
      const label = sectionLabels?.[r.sectionId] || r.sectionId;

      if (ok) {
        this.active.checks.push({
          name: r.sectionId,
          passed: true,
          detail: findings ? `${countsLabel}  •  ${findings}` : countsLabel,
        });
      } else {
        const failures = r.checks.filter(c => !c.passed);
        const failDetail = failures
          .map(c => `${c.name}${c.detail ? ' — ' + c.detail : ''}`)
          .join('; ');
        this.active.checks.push({
          name: r.sectionId,
          passed: false,
          detail: `${countsLabel}  •  FAILED: ${failDetail}`,
          inspectHint: `Inspect the "${label}" section on the facility page`,
        });
      }
    }
    return this;
  }

  endStep(overrideStatus?: 'passed' | 'failed'): this {
    if (!this.active) return this;
    const { id, label, checks, start } = this.active;
    const hasFail = checks.some(c => !c.passed);
    this.steps.push({
      id, label,
      status: overrideStatus || (hasFail ? 'failed' : 'passed'),
      checks,
      durationMs: Date.now() - start,
    });
    this.active = null;
    return this;
  }

  /** Read the checks collected in the current step (before endStep). */
  get activeChecks(): ReadonlyArray<StepCheck> {
    return this.active?.checks || [];
  }

  skipStep(id: string, label: string): this {
    if (this.active) this.endStep();
    this.steps.push({ id, label, status: 'skipped', checks: [], durationMs: 0 });
    return this;
  }

  finalize(): JourneyReport {
    if (this.active) this.endStep();
    const total = this.steps.length;
    const passed = this.steps.filter(s => s.status === 'passed').length;
    const failed = this.steps.filter(s => s.status === 'failed').length;
    const skipped = this.steps.filter(s => s.status === 'skipped').length;
    return {
      facility: this.facility,
      timestamp: new Date().toISOString(),
      totalDurationMs: Date.now() - this.startTime,
      steps: this.steps,
      summary: { total, passed, failed, skipped },
    };
  }
}

// ── Terminal output ────────────────────────────────────────────

const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m',
  cyan: '\x1b[36m', gray: '\x1b[90m',
};
const USE_COLOR = process.env.FLEX_NO_COLOR == null && process.stdout.isTTY !== false;
function cc(color: keyof typeof C, text: string): string {
  return USE_COLOR ? `${C[color]}${text}${C.reset}` : text;
}

function fmtDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function printJourneyReport(report: JourneyReport): void {
  const { facility: f, summary: s, steps, totalDurationMs } = report;
  const bar = '='.repeat(70);

  console.log('');
  console.log(cc('cyan', bar));
  console.log(cc('cyan', `  JOURNEY REPORT — ${cc('bold', f.name)}`));
  console.log(cc('gray', `  ${f.url}`));
  console.log(cc('gray', `  Client: ${f.client}  •  ${report.timestamp}`));

  const parts: string[] = [];
  if (s.passed) parts.push(cc('green', `${s.passed} passed`));
  if (s.failed) parts.push(cc('red', `${s.failed} failed`));
  if (s.skipped) parts.push(cc('gray', `${s.skipped} skipped`));
  console.log(cc('cyan', `  ${parts.join('  •  ')}  •  ${fmtDuration(totalDurationMs)}`));
  console.log(cc('cyan', bar));

  for (const step of steps) {
    const icon = step.status === 'passed' ? cc('green', '✓')
               : step.status === 'failed' ? cc('red', '✗')
               : cc('gray', '⏭');
    const statusColor = step.status === 'failed' ? 'red' as const
                      : step.status === 'passed' ? 'green' as const
                      : 'gray' as const;
    const dur = step.status === 'skipped' ? 'skipped' : fmtDuration(step.durationMs);

    console.log('');
    console.log(`  ${icon} ${cc(statusColor, step.label.toUpperCase().padEnd(40))} ${cc('gray', dur)}`);

    for (const ck of step.checks) {
      const mark = ck.passed ? cc('green', '✓') : cc('red', '✗');
      const detail = ck.detail ? cc('gray', `  — ${truncate(ck.detail, 90)}`) : '';
      console.log(`    ${mark} ${ck.name}${detail}`);
    }
  }

  // Failure summary — only if there are failures
  const allFailedChecks = steps.flatMap(step =>
    step.checks.filter(ck => !ck.passed).map(ck => ({ step: step.label, stepId: step.id, ...ck })),
  );
  if (allFailedChecks.length > 0) {
    console.log('');
    console.log(cc('red', `  ${'─'.repeat(66)}`));
    console.log(cc('red', `  FAILURES (${allFailedChecks.length}) — inspect on: ${cc('bold', f.url)}`));
    console.log(cc('red', `  ${'─'.repeat(66)}`));
    for (const fail of allFailedChecks) {
      console.log(cc('red', `  ✗ ${fail.step} > ${fail.name}`));
      if (fail.detail) console.log(cc('gray', `    ${fail.detail}`));
      if (fail.inspectHint) console.log(cc('yellow', `    → ${fail.inspectHint}`));
    }
  }

  console.log('');
  console.log(cc('cyan', bar));
  console.log('');
}

// ── File output ────────────────────────────────────────────────

export function writeJourneyJson(report: JourneyReport, outFile: string): void {
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(report, null, 2), 'utf8');
  console.log(cc('gray', `  JSON report:     ${outFile}`));
}

export function writeJourneyMarkdown(report: JourneyReport, outFile: string): void {
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  const { facility: f, summary: s, steps, totalDurationMs } = report;

  const lines: string[] = [];
  lines.push(`# Journey Report — ${f.name}`);
  lines.push('');
  lines.push(`| | |`);
  lines.push(`|---|---|`);
  lines.push(`| **URL** | ${f.url} |`);
  lines.push(`| **Client** | ${f.client} |`);
  lines.push(`| **Date** | ${report.timestamp} |`);
  lines.push(`| **Duration** | ${fmtDuration(totalDurationMs)} |`);

  const statusParts: string[] = [];
  if (s.passed) statusParts.push(`${s.passed} passed`);
  if (s.failed) statusParts.push(`${s.failed} failed`);
  if (s.skipped) statusParts.push(`${s.skipped} skipped`);
  lines.push(`| **Result** | ${statusParts.join(' / ')} |`);
  lines.push('');

  // Steps summary table
  lines.push('## Steps');
  lines.push('');
  lines.push('| Step | Status | Checks | Duration |');
  lines.push('|------|--------|--------|----------|');
  for (const step of steps) {
    const status = step.status === 'passed' ? 'PASS'
                 : step.status === 'failed' ? 'FAIL'
                 : 'SKIP';
    const checksCount = step.checks.length > 0
      ? `${step.checks.filter(ck => ck.passed).length}/${step.checks.length}`
      : '—';
    const dur = step.status === 'skipped' ? '—' : fmtDuration(step.durationMs);
    lines.push(`| ${step.label} | ${status} | ${checksCount} | ${dur} |`);
  }

  // Per-step detail with data
  for (const step of steps) {
    if (step.status === 'skipped' || step.checks.length === 0) continue;
    lines.push('');
    const statusIcon = step.status === 'passed' ? 'PASS' : 'FAIL';
    lines.push(`### ${step.label} — ${statusIcon}`);
    lines.push('');
    lines.push('| Check | Result | Data |');
    lines.push('|-------|--------|------|');
    for (const ck of step.checks) {
      const mark = ck.passed ? 'PASS' : 'FAIL';
      const detail = (ck.detail || '—').replace(/\|/g, '\\|');
      lines.push(`| ${ck.name} | ${mark} | ${truncate(detail, 120)} |`);
    }
  }

  // Failure details with inspect hints
  const allFailed = steps.flatMap(step =>
    step.checks.filter(ck => !ck.passed).map(ck => ({ step: step.label, ...ck })),
  );
  if (allFailed.length > 0) {
    lines.push('');
    lines.push(`## Failures — inspect on ${f.url}`);
    for (const fail of allFailed) {
      lines.push('');
      lines.push(`### ${fail.step} > ${fail.name}`);
      if (fail.detail) lines.push(`> ${fail.detail}`);
      if (fail.inspectHint) lines.push(`> ${fail.inspectHint}`);
    }
  }

  fs.writeFileSync(outFile, lines.join('\n'), 'utf8');
  console.log(cc('gray', `  Markdown report:  ${outFile}`));
}

export function journeyReportPath(facilityId: string, runStamp: string, ext: string): string {
  return path.resolve(__dirname, '..', 'test-results', 'journey', `${runStamp}__${facilityId}.${ext}`);
}

function truncate(s: string, n: number): string {
  if (!s) return '';
  return s.length > n ? s.slice(0, n) + '...' : s;
}
