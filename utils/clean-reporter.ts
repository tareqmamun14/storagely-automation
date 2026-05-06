import type { Reporter, FullConfig, Suite, TestCase, TestResult, FullResult } from '@playwright/test/reporter';
import * as path from 'path';

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  gray: '\x1b[90m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function extractConciseError(result: TestResult): string {
  if (!result.error?.message) return '';
  let msg = result.error.message;

  // Strip Playwright call log (everything after "Call log:" or "Logs:")
  msg = msg.replace(/\n\s*(Call log|Logs):[\s\S]*/i, '');

  // Strip "Error Context:" blocks
  msg = msg.replace(/\n\s*Error Context:[\s\S]*/i, '');

  // Strip browser/page error noise
  msg = msg.replace(/\n\s*=+ (logs|Browser) =+[\s\S]*/i, '');

  // Strip "waiting for locator(...)" multi-line details
  msg = msg.replace(/\n\s*waiting for [\s\S]*/i, '');

  // Strip stack trace lines (lines starting with "at ")
  msg = msg.replace(/\n\s+at .+/g, '');

  // Strip attachment lines
  msg = msg.replace(/\n\s*attachment .+/gi, '');

  // Take only the first meaningful line
  const lines = msg.split('\n').map(l => l.trim()).filter(Boolean);
  const first = lines[0] || '';

  // Cap length for readability
  return first.length > 120 ? first.substring(0, 117) + '...' : first;
}

function testTitle(test: TestCase): string {
  const file = path.relative(process.cwd(), test.location.file).replace(/\\/g, '/');
  return `${file} › ${test.title}`;
}

function duration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

class CleanReporter implements Reporter {
  private passed = 0;
  private failed = 0;
  private skipped = 0;
  private total = 0;
  private failures: { test: TestCase; result: TestResult }[] = [];

  onBegin(_config: FullConfig, suite: Suite) {
    this.total = suite.allTests().length;
    console.log(`\nRunning ${this.total} test${this.total !== 1 ? 's' : ''}\n`);
  }

  onTestBegin(test: TestCase) {
    process.stdout.write(`${COLORS.gray}  ◌ ${testTitle(test)}${COLORS.reset}\r`);
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const dur = duration(result.duration);
    const retryTag = result.retry > 0 ? ` ${COLORS.yellow}(retry #${result.retry})${COLORS.reset}` : '';

    if (result.status === 'passed' || result.status === 'skipped') {
      if (result.status === 'skipped') {
        this.skipped++;
        console.log(`${COLORS.yellow}  - ${testTitle(test)}${COLORS.reset}`);
      } else {
        this.passed++;
        console.log(`${COLORS.green}  ✓ ${testTitle(test)} ${COLORS.gray}(${dur})${COLORS.reset}${retryTag}`);
      }
      return;
    }

    // failed / timedOut / interrupted
    this.failed++;
    this.failures.push({ test, result });
    const concise = extractConciseError(result);
    console.log(`${COLORS.red}  ✘ ${testTitle(test)} ${COLORS.gray}(${dur})${COLORS.reset}${retryTag}`);
    if (concise) {
      console.log(`${COLORS.red}    → ${concise}${COLORS.reset}`);
    }
  }

  onStdOut(chunk: string | Buffer) {
    process.stdout.write(chunk);
  }

  onStdErr(chunk: string | Buffer) {
    const text = chunk.toString();

    // Filter out noisy Playwright/Chrome internal error lines
    const lines = text.split('\n');
    const filtered = lines.filter(line => {
      const trimmed = line.trim();
      if (!trimmed) return true;
      // Skip "Error Context:" header and its content
      if (/^Error Context:/i.test(trimmed)) return false;
      // Skip Playwright call-log lines
      if (/^(Call log|Logs):$/i.test(trimmed)) return false;
      if (/^\s*-\s*(waiting for|locator resolved|→|attempting|navigating)/i.test(trimmed)) return false;
      // Skip attachment lines
      if (/^\s*attachment\b/i.test(trimmed)) return false;
      return true;
    });

    const result = filtered.join('\n');
    if (result.trim()) {
      process.stderr.write(result);
    }
  }

  onEnd(result: FullResult) {
    console.log('');

    if (this.failures.length > 0) {
      console.log(`${COLORS.red}  ${this.failures.length} failed${COLORS.reset}`);
      for (const { test } of this.failures) {
        const project = test.parent.project()?.name;
        const tag = project ? `[${project}]` : '';
        console.log(`${COLORS.red}    ${tag} › ${testTitle(test)}${COLORS.reset}`);
      }
      console.log('');
    }

    const parts: string[] = [];
    if (this.passed) parts.push(`${COLORS.green}${this.passed} passed${COLORS.reset}`);
    if (this.failed) parts.push(`${COLORS.red}${this.failed} failed${COLORS.reset}`);
    if (this.skipped) parts.push(`${COLORS.yellow}${this.skipped} skipped${COLORS.reset}`);

    console.log(`  ${parts.join(`${COLORS.gray} | ${COLORS.reset}`)}`);
    console.log(`${COLORS.gray}  Total time: ${duration(result.duration)}${COLORS.reset}\n`);
  }
}

export default CleanReporter;
