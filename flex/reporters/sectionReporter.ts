/**
 * Section reporter — formats section results into a human-readable terminal
 * report and persists both a JSON artifact and a Markdown summary.
 *
 * Surfaces:
 *   printSectionResult(r)       single-section print (used by individual specs)
 *   printFacilityRollup(rs)     per-facility "what was found" + pass/fail
 *   printGrandRollup(all)       cross-facility totals
 *   writeReport(rs, path)       JSON artifact (machine-readable)
 *   writeMarkdownReport(rs, p)  Markdown artifact (human-readable, easy to skim)
 */
import * as fs from 'fs';
import * as path from 'path';
import { SectionResult, sectionPassed } from '../pages/sections/types';

const COLORS = {
  reset: '\x1b[0m',
  bold:  '\x1b[1m',
  dim:   '\x1b[2m',
  red:   '\x1b[31m',
  green: '\x1b[32m',
  yellow:'\x1b[33m',
  blue:  '\x1b[34m',
  cyan:  '\x1b[36m',
  gray:  '\x1b[90m',
};
const COLOR_ENABLED = process.env.FLEX_NO_COLOR == null && process.stdout.isTTY !== false;
function c(name: keyof typeof COLORS, text: string): string {
  return COLOR_ENABLED ? `${COLORS[name]}${text}${COLORS.reset}` : text;
}
const PASS = () => c('green', '✓');
const FAIL = () => c('red',   '✗');
const WARN = () => c('yellow', '!');

/** Single-section print (used by per-section specs). */
export function printSectionResult(r: SectionResult): void {
  const ok = sectionPassed(r);
  const head = ok ? c('green', `[${r.sectionId.toUpperCase()}] PASS`)
                  : c('red',   `[${r.sectionId.toUpperCase()}] FAIL`);
  console.log('');
  console.log(`${head} ${c('bold', r.facilityName)}  ${c('gray', '(' + r.durationMs + 'ms)')}`);
  console.log(c('gray', `  url: ${r.url}`));
  for (const ck of r.checks) {
    const mark = ck.passed ? PASS() : FAIL();
    const detail = ck.detail ? c('gray', `  — ${ck.detail}`) : '';
    console.log(`  ${mark} ${ck.name}${detail}`);
  }
  if (r.errors && r.errors.length) {
    for (const e of r.errors) console.log(`  ${WARN()} ${c('yellow', 'error')}: ${e}`);
  }
  const found = formatFindings(r);
  if (found) console.log(c('cyan', `  found: ${found}`));
}

/**
 * Per-facility rollup. The header shows pass/fail; each section row shows
 * "what was actually found" (extracted data) so the reader can see the data
 * the test asserted against, not just an opaque "pass."
 */
export function printFacilityRollup(results: SectionResult[]): void {
  if (results.length === 0) {
    console.log(c('yellow', '\n(no section results)'));
    return;
  }
  const facility = results[0].facilityName;
  const url = results[0].url;
  const total = results.length;
  const passed = results.filter(sectionPassed).length;
  const failed = total - passed;

  console.log('');
  console.log(c('cyan', '╭─────────────────────────────────────────────────────────────────────────'));
  console.log(c('cyan', `│ Flex Section Report  —  ${c('bold', facility)}`));
  console.log(c('cyan', `│ ${c('gray', url)}`));
  console.log(c('cyan', `│ ${passed}/${total} sections passed` + (failed ? c('red', `  •  ${failed} failed`) : '')));
  console.log(c('cyan', '╰─────────────────────────────────────────────────────────────────────────'));

  for (const r of results) {
    const ok = sectionPassed(r);
    const mark = ok ? PASS() : FAIL();
    const status = ok ? c('green', 'PASS') : c('red', 'FAIL');
    const passedChecks = r.checks.filter(ck => ck.passed).length;
    const totalChecks = r.checks.length;
    const summary = formatFindings(r);

    console.log(
      `  ${mark} ${c('bold', r.sectionId.padEnd(10))} ${status}  ` +
      c('gray', `${passedChecks}/${totalChecks} checks  •  ${r.durationMs}ms`),
    );
    if (summary) console.log(c('cyan', `       └─ found: ${summary}`));
    if (!ok) {
      for (const ck of r.checks.filter(c => !c.passed)) {
        console.log(c('red', `       └─ ✗ ${ck.name}${ck.detail ? '  — ' + ck.detail : ''}`));
      }
      if (r.errors) for (const e of r.errors) console.log(c('yellow', `       └─ ! ${e}`));
    }
  }
  console.log('');
}

/** Aggregate stats across many facilities. */
export function printGrandRollup(allResults: SectionResult[]): void {
  if (allResults.length === 0) return;
  const byFacility = new Map<string, SectionResult[]>();
  for (const r of allResults) {
    if (!byFacility.has(r.facilityId)) byFacility.set(r.facilityId, []);
    byFacility.get(r.facilityId)!.push(r);
  }

  console.log('');
  console.log(c('cyan', '╔══════════════════════════════════════════════════════════════════╗'));
  console.log(c('cyan', '║                  FLEX SECTION RUN  —  GRAND TOTAL               ║'));
  console.log(c('cyan', '╚══════════════════════════════════════════════════════════════════╝'));
  for (const [facilityId, rs] of byFacility) {
    const passed = rs.filter(sectionPassed).length;
    const total = rs.length;
    const status = passed === total ? c('green', 'ALL PASS') : c('red', `${total - passed} FAIL`);
    console.log(`  ${c('bold', facilityId.padEnd(38))} ${passed}/${total} sections  ${status}`);
  }
  const totalSections = allResults.length;
  const passedSections = allResults.filter(sectionPassed).length;
  console.log('');
  console.log(c('cyan', `  Grand total: ${passedSections}/${totalSections} section verifications passed`));
  console.log('');
}

/** Persist JSON artifact (machine-readable, used by CI / dashboards later). */
export function writeReport(results: SectionResult[], outFile: string): void {
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  const payload = {
    generatedAt: new Date().toISOString(),
    facility: results[0]?.facilityName || '(unknown)',
    url: results[0]?.url || '',
    summary: {
      total: results.length,
      passed: results.filter(sectionPassed).length,
      failed: results.length - results.filter(sectionPassed).length,
    },
    sections: results,
  };
  fs.writeFileSync(outFile, JSON.stringify(payload, null, 2), 'utf8');
  console.log(c('gray', `  📄 JSON: ${outFile}`));
}

/** Persist a human-readable Markdown summary alongside the JSON artifact. */
export function writeMarkdownReport(results: SectionResult[], outFile: string): void {
  if (results.length === 0) return;
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  const facility = results[0].facilityName;
  const url = results[0].url;
  const total = results.length;
  const passed = results.filter(sectionPassed).length;
  const failed = total - passed;
  const stamp = new Date().toISOString();

  const lines: string[] = [];
  lines.push(`# Flex Section Report — ${facility}`);
  lines.push('');
  lines.push(`- URL: ${url}`);
  lines.push(`- Generated: ${stamp}`);
  lines.push(`- Sections: **${passed}/${total} passed**${failed ? ` • **${failed} failed**` : ''}`);
  lines.push('');
  lines.push('| Section | Status | Checks | Found |');
  lines.push('|---|---|---|---|');
  for (const r of results) {
    const ok = sectionPassed(r);
    const status = ok ? '✓ PASS' : '✗ FAIL';
    const checks = `${r.checks.filter(ck => ck.passed).length}/${r.checks.length}`;
    const found = (formatFindings(r) || '').replace(/\|/g, '\\|');
    lines.push(`| ${r.sectionId} | ${status} | ${checks} | ${found} |`);
  }

  // If any section failed, expand the failures with sub-check detail.
  const failures = results.filter(r => !sectionPassed(r));
  if (failures.length) {
    lines.push('');
    lines.push('## Failures');
    for (const r of failures) {
      lines.push('');
      lines.push(`### ${r.sectionId} — ${r.facilityName}`);
      for (const ck of r.checks.filter(c => !c.passed)) {
        lines.push(`- ✗ **${ck.name}**${ck.detail ? ` — ${ck.detail}` : ''}`);
      }
      if (r.errors) for (const e of r.errors) lines.push(`- ! error: ${e}`);
    }
  }
  fs.writeFileSync(outFile, lines.join('\n'), 'utf8');
  console.log(c('gray', `  📝 Markdown: ${outFile}`));
}

// ── Findings formatter — section-specific extraction summary ──────────
//
// This is the "what was actually found" string. Keep it short (one line)
// and section-aware so reviewers can spot regressions at a glance.

export function formatFindings(r: SectionResult): string {
  const d = (r.data || {}) as Record<string, any>;
  switch (r.sectionId) {
    case 'nav': {
      const items = Array.isArray(d.items) ? d.items.slice(0, 6).join(', ') : '';
      const parts = [`${d.itemCount || 0} items`];
      if (items) parts.push(`(${items}${(d.items?.length || 0) > 6 ? '…' : ''})`);
      if (d.blog)      parts.push(`blog→${d.blog.href || '(none)'}`);
      if (d.myAccount) parts.push(`my-account→${(d.myAccount.href || '').slice(0, 40)}`);
      if (Array.isArray(d.contactSubmenu) && d.contactSubmenu.length) {
        parts.push(`contact-submenu=[${(d.contactSubmenu as any[]).map((s: any) => s.text).join(', ')}]`);
      }
      return parts.join('  •  ');
    }
    case 'header': {
      const parts: string[] = [];
      if (d.heading) parts.push(`heading="${truncate(d.heading, 40)}"`);
      if (d.rating)  parts.push(`rating=${d.rating.rating}(${d.rating.reviewCount})`);
      if (d.phone)   parts.push(`phone=${d.phone}`);
      if (d.hours && Array.isArray(d.hours) && d.hours.length) parts.push(`hours=${d.hours.length} label(s)`);
      if (d.address) parts.push(`address="${truncate(d.address, 40)}"`);
      return parts.join('  •  ');
    }
    case 'carousel': {
      const total = d.totalSlides || d.slideTabCount || 0;
      const visible = Array.isArray(d.visibleHeroImages) ? d.visibleHeroImages.length : 0;
      const visibleLoaded = Array.isArray(d.visibleHeroImages)
        ? d.visibleHeroImages.filter((i: any) => i.loaded).length : 0;
      return `slides=${total}  visible-image=${visibleLoaded}/${visible} loaded`;
    }
    case 'amenities': {
      const items = Array.isArray(d.items) ? d.items.slice(0, 5).join(', ') : '';
      return `${d.count || 0} items` + (items ? `  (${items}${(d.items?.length || 0) > 5 ? '…' : ''})` : '');
    }
    case 'units': {
      const u = (d.units && d.units[0]) || {};
      const dualPriced = Array.isArray(d.units) ? d.units.filter((c: any) => c.prices && c.prices.length >= 2).length : 0;
      const total = d.unitCount || 0;
      const parts = [
        `units=${total}`,
        `dual-priced≈${dualPriced}/${Math.min(5, total)}`,
        `sort=${d.hasSortButton ? '✓' : '✗'}`,
        `filter=${d.hasFilterButton ? '✓' : '✗'}`,
      ];
      if (u.dimensions && u.prices) {
        parts.push(`sample: ${u.dimensions} ${u.sqft} → ${u.prices.join(' / ')}${u.promo ? '  promo="' + truncate(u.promo, 30) + '"' : ''}`);
      }
      return parts.join('  •  ');
    }
    case 'faq': {
      const qs = Array.isArray(d.questions) ? d.questions.slice(0, 3).map((q: string) => truncate(q, 50)).join(' | ') : '';
      return `questions=${d.count || 0}` + (qs ? `  (${qs}${(d.questions?.length || 0) > 3 ? '…' : ''})` : '');
    }
    case 'gallery': {
      const broken = (d.brokenImages || []).length;
      return `images=${d.imageCount || 0}` + (broken ? `  broken=${broken}` : '');
    }
    case 'footer': {
      const cols = (d.columnHeadings || []).join(', ');
      return `columns=${(d.columnHeadings || []).length}` +
        `  links=${d.linkCount || 0}` +
        `  social=${(d.socialPlatforms || []).join(',')}` +
        (cols ? `  (${truncate(cols, 60)})` : '');
    }
    case 'anomalies': {
      const list = Array.isArray(d.anomalies) ? d.anomalies : [];
      if (list.length === 0) return `${d.unitCount || 0} units · no anomalies`;
      const tag = (a: any) => `[${a.source}${a.status === 'acknowledged' ? '/known' : a.status === 'new' ? '/NEW' : ''}]`;
      const summary = list.slice(0, 6).map((a: any) => `${tag(a)} ${a.code}${a.context ? ' ' + a.context : ''}`).join(' · ');
      const newCount = list.filter((a: any) => a.status === 'new').length;
      return `${list.length} anomaly(ies): ${summary}${list.length > 6 ? ` …+${list.length - 6}` : ''}`
        + (newCount ? `  •  ${newCount} NEW` : '')
        + (d.drift ? `  •  drift: ${d.drift}` : '');
    }
    case 'exploratory': {
      const probes = Array.isArray(d.probes) ? d.probes : [];
      const findings = typeof d.findings === 'number' ? d.findings : 0;
      return `probed: ${probes.join(', ') || '(none)'}${findings ? `  •  ${findings} FINDING(s) → candidates for triage` : '  •  all clean'}`;
    }
    default: return '';
  }
}

function truncate(s: string, n: number): string {
  if (!s) return '';
  return s.length > n ? s.slice(0, n) + '…' : s;
}

/** Stable report path: flex/test-results/sections/<stamp>__<facility>.<ext> */
export function reportPath(facilityId: string, runStamp: string = stamp(), ext = 'json'): string {
  return path.resolve(__dirname, '..', 'test-results', 'sections', `${runStamp}__${facilityId}.${ext}`);
}

function stamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
}
