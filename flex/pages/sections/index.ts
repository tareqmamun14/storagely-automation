/**
 * Section detector registry.
 *
 * Each detector is keyed by the same ID as `flex/configs/sections.ts`.
 * Tests and the all-sections orchestrator look up detectors by ID — adding
 * a new section is: add to the sections manifest, drop a new detector here.
 */
import { ISectionDetector } from './types';
import { NavSection } from './NavSection';
import { FacilityHeaderSection } from './FacilityHeaderSection';
import { CarouselSection } from './CarouselSection';
import { AmenitiesSection } from './AmenitiesSection';
import { FAQSection } from './FAQSection';
import { UnitsSection } from './UnitsSection';
import { GallerySection } from './GallerySection';
import { FooterSection } from './FooterSection';
import { FiltersSection } from './FiltersSection';
import { PromoSection } from './PromoSection';
import { ReviewsSection } from './ReviewsSection';
import { UHaulSection } from './UHaulSection';
import { SeoSection } from './SeoSection';
import { SeoHeadSection } from './SeoHeadSection';
import { DataIntegritySection } from './DataIntegritySection';
import { AnomaliesSection } from './AnomaliesSection';
import { ExploratorySection } from './ExploratorySection';

export const SECTION_DETECTORS: ISectionDetector[] = [
  new NavSection(),
  new FacilityHeaderSection(),
  new CarouselSection(),
  new AmenitiesSection(),
  new UnitsSection(),
  new FAQSection(),
  new GallerySection(),
  new FooterSection(),
  // Mini Mall additions (gated per-facility by feature flags).
  new FiltersSection(),
  new PromoSection(),
  new ReviewsSection(),
  new UHaulSection(),
  new SeoSection(),
  // Universal (all clients): page head meta + structured data + attribute tokens.
  new SeoHeadSection(),
  // Universal: cross-field data consistency (review counts, rating, phone, tokens).
  new DataIntegritySection(),
  // Universal: anomaly scan — catches unusual DATA our fixed checks miss, routes
  // by source (FMS vs product), and learns run-over-run. Runs LAST so it can read
  // the whole page after the other detectors have settled it.
  new AnomaliesSection(),
  // Universal: exploratory rotation — probes something NEW each run (info-only;
  // findings become CANDIDATE issues in the panel dashboard). Runs after the
  // anomaly scan so fixed checks + anomalies stay the authoritative gate.
  new ExploratorySection(),
];

export function getDetector(id: string): ISectionDetector {
  const d = SECTION_DETECTORS.find(x => x.id === id);
  if (!d) throw new Error(`No detector registered for section "${id}". Known: ${SECTION_DETECTORS.map(d => d.id).join(', ')}`);
  return d;
}

export * from './types';
export {
  NavSection, FacilityHeaderSection, CarouselSection, AmenitiesSection, FAQSection,
  UnitsSection, GallerySection, FooterSection,
  FiltersSection, PromoSection, ReviewsSection, UHaulSection, SeoSection, SeoHeadSection,
  DataIntegritySection, AnomaliesSection, ExploratorySection,
};
