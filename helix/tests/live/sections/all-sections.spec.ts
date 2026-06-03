/**
 * Run every enabled section against every facility in one navigation.
 *
 * This is the "all at once" mode requested by the brief. Per-section specs
 * (nav, header, faq, etc.) are independently runnable; this orchestrator
 * groups them so the user gets a single top-to-bottom report per facility
 * AND a grand total at the end of the run.
 *
 * Notes:
 *   • One test per facility (not one test per section) — this keeps the run
 *     short (one navigation) and the report cohesive.
 *   • The combined test does NOT short-circuit on a failing section — every
 *     enabled section runs, so the report shows the full picture.
 *   • A JSON artifact is written per facility to
 *     `helix/test-results/sections/<stamp>__<facility>.json`.
 */
import { test, expect } from '@playwright/test';
import { LiveFacilityPage } from '../../../pages/LiveFacilityPage';
import { getAllFacilities } from '../../../configs/facilities';
import { getEnabledSections } from '../../../configs/sections';
import {
  printFacilityRollup,
  printGrandRollup,
  writeReport,
  writeMarkdownReport,
  reportPath,
} from '../../../reporters/sectionReporter';
import { SectionResult, sectionPassed } from '../../../pages/sections/types';

const facilities = getAllFacilities();
const enabledSections = getEnabledSections();
const runStamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);

// Cross-test grand-roll-up accumulator. Playwright runs tests in workers, so
// each worker sees its own copy of this array. That's fine for our purposes —
// we want per-worker rollups in the log; the JSON artifact captures the full
// picture.
const allResults: SectionResult[] = [];

test.describe('Helix — All Sections (single navigation per facility)', () => {
  for (const facility of facilities) {
    test(`every enabled section on ${facility.name}`, async ({ page }) => {
      const live = new LiveFacilityPage(page);
      await live.goto(facility.url);
      await live.expectPageLoaded();

      const ids = enabledSections.map(s => s.id).filter(id => {
        const f = facility.features;
        if (!f) return true;
        const key = ('has' + id[0].toUpperCase() + id.slice(1)) as keyof NonNullable<typeof f>;
        // Skip a section if the facility explicitly opted out (feature flag === false).
        return f[key] !== false;
      });

      const results = await live.verifyAllSections({
        facilityId: facility.id,
        facilityName: facility.name,
        url: facility.url,
      }, ids);

      allResults.push(...results);

      printFacilityRollup(results);
      writeReport(results, reportPath(facility.id, runStamp, 'json'));
      writeMarkdownReport(results, reportPath(facility.id, runStamp, 'md'));

      // Soft-assert each section so all failures surface; then a hard assert
      // for the rollup so the test correctly reports as failed.
      for (const r of results) {
        const ok = sectionPassed(r);
        expect.soft(ok, `Section [${r.sectionId}] failed for ${facility.name}: ${
          r.checks.filter(c => !c.passed).map(c => c.name).join('; ')
        }`).toBe(true);
      }
      const failed = results.filter(r => !sectionPassed(r));
      expect(failed.length, `${failed.length} of ${results.length} section(s) failed`).toBe(0);
    });
  }

  test.afterAll(() => {
    if (allResults.length === 0) return;
    printGrandRollup(allResults);
  });
});
