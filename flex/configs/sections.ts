/**
 * Flex v4 — testable section manifest.
 *
 * The shape of a Flex facility page broken into independently testable
 * sections. Both the section specs (`flex/tests/live/sections/*.spec.ts`)
 * and the control-panel checkboxes are driven from this list, so adding a
 * new section means:
 *   1. Add an entry below
 *   2. Drop a detector under `flex/pages/sections/`
 *   3. Drop a spec under `flex/tests/live/sections/`
 * Everything else (control-panel toggle, all-sections orchestration,
 * reporter aggregation) updates from this manifest automatically.
 */
export interface SectionDef {
  id: string;          // env-var-safe slug ("nav", "header", "faq", ...)
  label: string;       // human-readable name shown in control panel + reports
  description: string; // one-line "what does this section verify"
  order: number;       // visual order top → bottom (matches the page layout)
  /** Optional — if true, section can intentionally not appear (don't fail when absent). */
  optional?: boolean;
}

export const SECTIONS: SectionDef[] = [
  {
    id: 'nav',
    label: 'Top Navigation',
    description: 'Expect: nav landmark with ≥3 items, a Blog link (→ /blog*), a My Account link (→ tenant portal/login), and a Contact dropdown that opens to reveal Inquiry / Contact-Us.',
    order: 1,
  },
  {
    id: 'header',
    label: 'Facility Header',
    description: 'Expect: facility name heading, rating/reviews badge, office + access hours, a tel: phone number, and a street address.',
    order: 2,
  },
  {
    id: 'carousel',
    label: 'Image Carousel',
    description: 'Expect: hero carousel with ≥1 slide, working prev/next controls and pagination, and slide images that actually load (no broken/placeholder images).',
    order: 3,
  },
  {
    id: 'amenities',
    label: 'Amenities',
    description: 'Expect: an amenities section listing ≥1 amenity (Climate-Controlled, Drive Up, 24-Hour Access, etc.).',
    order: 4,
  },
  {
    id: 'units',
    label: 'Unit List + Rent / Reserve',
    description: 'Expect: ≥1 unit card with dimensions, features, promo, two prices (web/intro ≤ standard), a Rent link → valid checkout handoff (Safeguard /step-four?unit_id · Mini Mall /yardi/start?unit&type=rent), a Reserve button, and unique unit ids across cards.',
    order: 5,
  },
  {
    id: 'faq',
    label: 'FAQ',
    description: 'Expect: a FAQ section with collapsible questions that expand to reveal answers.',
    order: 6,
  },
  {
    id: 'gallery',
    label: 'Facility Gallery',
    description: 'Expect: a bottom image/gallery section with images that load successfully.',
    order: 7,
  },
  {
    id: 'footer',
    label: 'Footer',
    description: 'Expect: footer with logo + phone, social links, the Storage Types / Resources / About / Contact link columns, and a copyright line.',
    order: 8,
  },

  // ── Mini Mall additions ─────────────────────────────────────────────────
  // Sections present on the Mini Mall template but not the Safeguard baseline.
  // Gated per-facility by feature flags (hasFilters / hasPromo / hasReviews /
  // hasUhaul / hasSeo) so they are skipped cleanly on facilities that lack them.
  // Listed after the baseline sections (order 9-13); the baseline orders are
  // left untouched, and the control-panel section parser keys on integer order.
  {
    id: 'filters',
    label: 'Unit Filters',
    description: 'Expect: a filter sidebar — Group-by tabs (Sm·Md·Lg / Unit Feature / Exact Size), Unit Feature + Unit Size checkboxes with live (N) counts, Storage Usage options, a Card/Row layout toggle, and quick-filter chips above the grid.',
    order: 9,
  },
  {
    id: 'promo',
    label: 'Promotions',
    description: 'Expect: a promo banner image that loads (no broken/token alt), a Featured / Limited-time deal rail, ≥1 "Weeks Free" badge on a unit card, and the pricing disclaimer footnote.',
    order: 10,
  },
  {
    id: 'uhaul',
    label: 'U-Haul Rental',
    description: 'Expect: a U-Haul Rental block with a loaded truck image, a "Starting at $X" price, and a "Reserve Now" CTA.',
    order: 11,
  },
  {
    id: 'reviews',
    label: 'Customer Reviews',
    description: 'Expect: a Customer Reviews block with an aggregate rating + count and ≥1 reviewer card (name + star rating). Review body text is reported (info) — see ReviewsSection note on the Atlas reviews-API 403 under automation.',
    order: 12,
  },
  {
    id: 'seo',
    label: 'SEO Content',
    description: 'Expect: the bottom long-form copy — ≥2 headed prose sections, ≥1 substantial paragraph, internal links, and no unresolved {tokens}.',
    order: 13,
  },

  // ── Universal (all clients) ─────────────────────────────────────────────
  {
    id: 'seohead',
    label: 'Page Meta & Structured Data',
    description: 'Expect: <title> + meta description, canonical URL, Open Graph (og:title/og:image), viewport, html lang, exactly one <h1>, valid JSON-LD (SelfStorage/LocalBusiness + name/address, FAQ, breadcrumbs), and NO unresolved {tokens} in element attributes (alt/title/aria-label/src/href).',
    order: 14,
  },
  {
    id: 'integrity',
    label: 'Data Integrity',
    description: 'Expect: review count + star rating agree everywhere on the page, no placeholder (555-01xx) phone numbers, and no unresolved {template.token}/{{token}} in visible text.',
    order: 15,
  },
];

/** All section IDs in display order — convenience for tests + the reporter. */
export const SECTION_IDS = SECTIONS.map(s => s.id).sort(
  (a, b) => (SECTIONS.find(s => s.id === a)!.order) - (SECTIONS.find(s => s.id === b)!.order),
);

export function getSection(id: string): SectionDef {
  const s = SECTIONS.find(x => x.id === id);
  if (!s) throw new Error(`Unknown section: ${id}. Known: ${SECTION_IDS.join(', ')}`);
  return s;
}

/**
 * Honor an env-var allow-list ("FLEX_SECTIONS=nav,header,units") for opt-in
 * filtering from the control panel. Empty/unset = run every section.
 *
 * Sections are returned in display order so reports read top → bottom.
 */
export function getEnabledSections(): SectionDef[] {
  const raw = (process.env.FLEX_SECTIONS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (raw.length === 0) return [...SECTIONS].sort((a, b) => a.order - b.order);
  const allowed = new Set(raw);
  return SECTIONS.filter(s => allowed.has(s.id)).sort((a, b) => a.order - b.order);
}

export function isSectionEnabled(id: string): boolean {
  const raw = (process.env.FLEX_SECTIONS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (raw.length === 0) return true;
  return raw.includes(id);
}
