/**
 * Section detector registry.
 *
 * Each detector is keyed by the same ID as `helix/configs/sections.ts`.
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

export const SECTION_DETECTORS: ISectionDetector[] = [
  new NavSection(),
  new FacilityHeaderSection(),
  new CarouselSection(),
  new AmenitiesSection(),
  new UnitsSection(),
  new FAQSection(),
  new GallerySection(),
  new FooterSection(),
];

export function getDetector(id: string): ISectionDetector {
  const d = SECTION_DETECTORS.find(x => x.id === id);
  if (!d) throw new Error(`No detector registered for section "${id}". Known: ${SECTION_DETECTORS.map(d => d.id).join(', ')}`);
  return d;
}

export * from './types';
export { NavSection, FacilityHeaderSection, CarouselSection, AmenitiesSection, FAQSection, UnitsSection, GallerySection, FooterSection };
