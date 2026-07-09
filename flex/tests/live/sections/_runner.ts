/**
 * Shared runner used by every per-section spec under tests/live/sections/.
 *
 * Each spec is a one-line invocation:
 *
 *   runSectionSuite('nav');
 *
 * The runner handles:
 *   • iterating over all enabled facilities
 *   • skipping cleanly when this section was excluded by FLEX_SECTIONS
 *   • running the detector
 *   • printing a per-section report
 *   • asserting pass/fail in a way that surfaces *which* sub-check failed
 *
 * Why a shared runner? Specs are pure routing — the testing logic lives in
 * one place. Easier to maintain, harder to drift between sections.
 */
import { test, expect } from '@playwright/test';
import { LiveFacilityPage } from '../../../pages/LiveFacilityPage';
import { getAllFacilities, FlexFacility } from '../../../configs/facilities';
import { isSectionEnabled, getSection } from '../../../configs/sections';
import { printSectionResult } from '../../../reporters/sectionReporter';
import { sectionPassed } from '../../../pages/sections/types';

export function runSectionSuite(sectionId: string): void {
  const section = getSection(sectionId);
  const facilities = getAllFacilities();

  test.describe(`Section: ${section.label}`, () => {
    test.beforeAll(() => {
      if (!isSectionEnabled(sectionId)) {
        console.log(`[flex] section "${sectionId}" excluded by FLEX_SECTIONS env var — skipping.`);
      }
    });

    for (const facility of facilities) {
      test(`${section.label} — ${facility.name}`, async ({ page }) => {
        test.skip(!isSectionEnabled(sectionId), `Section "${sectionId}" filtered out by FLEX_SECTIONS`);
        test.skip(featureDisabled(facility, sectionId), `Facility "${facility.id}" has feature "${sectionId}" disabled`);

        const live = new LiveFacilityPage(page);
        await live.goto(facility.url);
        await live.expectPageLoaded();

        const result = await live.verifySection(sectionId, {
          facilityId: facility.id,
          facilityName: facility.name,
          url: facility.url,
          client: facility.client,
        });

        printSectionResult(result);

        // Failure message points at the first failed check — actionable, not noisy.
        if (!sectionPassed(result)) {
          const first = result.checks.find(c => !c.passed);
          const reason = first
            ? `${first.name}${first.detail ? '  — ' + first.detail : ''}`
            : (result.errors && result.errors[0]) || 'no checks ran';
          expect.soft(result.present, `Section "${sectionId}" was not detected on page`).toBe(true);
          for (const c of result.checks) {
            expect.soft(c.passed, `${section.label} check failed: ${c.name}${c.detail ? '  (' + c.detail + ')' : ''}`).toBe(true);
          }
          throw new Error(`[${section.label}] ${facility.name}: ${reason}`);
        }
      });
    }
  });
}

function featureDisabled(facility: FlexFacility, sectionId: string): boolean {
  const f = facility.features;
  if (!f) return false;
  const key =
    sectionId === 'nav'       ? 'hasNav' :
    sectionId === 'header'    ? 'hasHeader' :
    sectionId === 'carousel'  ? 'hasCarousel' :
    sectionId === 'amenities' ? 'hasAmenities' :
    sectionId === 'faq'       ? 'hasFaq' :
    sectionId === 'units'     ? 'hasUnits' :
    sectionId === 'gallery'   ? 'hasGallery' :
    sectionId === 'footer'    ? 'hasFooter' :
    sectionId === 'filters'   ? 'hasFilters' :
    sectionId === 'promo'     ? 'hasPromo' :
    sectionId === 'reviews'   ? 'hasReviews' :
    sectionId === 'uhaul'     ? 'hasUhaul' :
    sectionId === 'seo'       ? 'hasSeo' :
    null;
  if (!key) return false;
  // If a feature flag is explicitly set to false, skip. If unset, run.
  return f[key as keyof typeof f] === false;
}
