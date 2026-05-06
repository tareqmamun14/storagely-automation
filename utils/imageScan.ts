// ============================================
// Shared Image / Carousel Scan Utility
// ============================================
// Used by:
//   • tests/uiComponents-validation.spec.ts (Module 8 — one-per-FMS smoke)
//   • tests/miniMallFullScan.spec.ts        (per-facility check inside the scan)
//   • tests/allLocationsScan.spec.ts        (all-clients all-locations sweep)
//
// Detects three kinds of broken images on a Storagely location page:
//   1. NETWORK / DECODE FAILURE — img.complete && img.naturalWidth === 0
//        → 404, CORS, network timeout, corrupt response.
//   2. PLACEHOLDER FALLBACK    — loaded successfully but src matches a known
//        "No Image Available" / generic-default URL. The bytes decoded fine
//        (so check #1 passes) but the user actually sees a generic graphic
//        because the real unit/carousel image was missing on the backend.
//        This is the Storage Star prod bug class — see PLACEHOLDER_IMAGE_PATTERNS.
//   3. STRUCTURE REGRESSION    — .listviewrows / tr.shortableClass exists in
//        the DOM but the unit-image selectors found 0 images inside (markup
//        was restructured and our selectors need updating).
//
// To add a new placeholder pattern: append to PLACEHOLDER_IMAGE_PATTERNS below.
// ============================================

import type { Page } from '@playwright/test';

// Loaded images whose src contains any of these substrings (case-insensitive)
// are flagged as PLACEHOLDER fallbacks. Append new ones whenever a new "No
// Image Available" graphic is spotted in production.
export const PLACEHOLDER_IMAGE_PATTERNS: string[] = [
  'no-storage-available',     // Storage Star + others — observed in prod
  'no-image-available',
  'no_image_available',
  'noimage',
  'image-not-available',
  'image-unavailable',
  'unit-placeholder',
  'unit_placeholder',
  'default-unit',
  'default_unit',
  'placeholder.png',
  'placeholder.jpg',
  'placeholder.jpeg',
  'placeholder.webp',
  'default-image',
];

export interface ImageInfo {
  src:    string;
  alt:    string;
  loaded: boolean;
  width:  number;
  height: number;
}
export interface DimStats {
  minW: number; maxW: number; avgW: number;
  minH: number; maxH: number; avgH: number;
}
export interface SectionScan {
  total:        number;
  loaded:       number;        // bytes decoded — note: includes placeholders
  failed:       ImageInfo[];   // 404 / network / decode errors
  placeholders: ImageInfo[];   // loaded but URL matches a placeholder pattern
  dims:         DimStats | null;
  tiny:         ImageInfo[];   // loaded but suspiciously small (<30×30)
}
export interface PageImageScan {
  top:         SectionScan;
  units:       SectionScan;
  bottom:      SectionScan;
  hasUnitRows: boolean;        // .listviewrows / tr.shortableClass in DOM
}

/** Trim long URLs for log output. */
export function shortSrc(src: string): string {
  if (src.length <= 90) return src;
  return src.slice(0, 60) + '…' + src.slice(-25);
}

/** True iff this section has a structure regression (page has unit rows but 0 unit images detected). */
export function hasUnitsStructureRegression(scan: PageImageScan): boolean {
  return scan.hasUnitRows && scan.units.total === 0;
}

/** Total number of broken images = network failures + placeholder fallbacks. */
export function countTotalBroken(scan: PageImageScan): number {
  return (
    scan.top.failed.length    + scan.top.placeholders.length    +
    scan.units.failed.length  + scan.units.placeholders.length  +
    scan.bottom.failed.length + scan.bottom.placeholders.length
  );
}

/**
 * Scrolls the page to trigger lazy-loaders, waits for images to settle, then
 * inspects every <img> for load status, placeholder URLs, dims, and tiny size.
 * Page must already be navigated.
 */
export async function scanPageImages(page: Page): Promise<PageImageScan> {
  // Trigger lazy-loaders — most carousels and bottom sections only fetch
  // images once they enter the viewport.
  try {
    await page.evaluate(async () => {
      await new Promise<void>(resolve => {
        let y = 0;
        const step = 400;
        const id = setInterval(() => {
          window.scrollBy(0, step);
          y += step;
          if (y >= document.body.scrollHeight + window.innerHeight) {
            clearInterval(id);
            window.scrollTo(0, 0);
            resolve();
          }
        }, 100);
      });
    });
  } catch { /* scroll failed — proceed anyway */ }

  // Force every lazy <img> to eager + nudge a reload, then wait. Some carousels
  // keep slides display:none which blocks lazy-loading even after scroll.
  // CRITICAL: prefer the literal src ATTRIBUTE for the reload, not currentSrc.
  // For srcset images whose srcset variants 404 (the Bluebird unit_3d pattern),
  // currentSrc points at the failed variant — using it overwrites the working
  // src attribute and locks the image into a permanently-broken state. Stash
  // the original src attribute so later passes can recover it.
  try {
    await page.evaluate(() => {
      document.querySelectorAll('img').forEach((img: HTMLImageElement) => {
        if (img.loading === 'lazy') img.loading = 'eager';
        const ds = img.getAttribute('data-src');
        if (ds && !img.src) img.src = ds;
        if (!img.hasAttribute('data-original-src')) {
          const orig = img.getAttribute('src') || '';
          if (orig) img.setAttribute('data-original-src', orig);
        }
        if (!img.complete || img.naturalWidth === 0) {
          const orig = img.getAttribute('data-original-src') || img.getAttribute('src') || img.currentSrc;
          if (orig) { img.src = ''; img.src = orig; }
        }
      });
    });
  } catch { /* ignore */ }
  await page.waitForTimeout(2000);

  // Wait for every <img> to finish loading (or fail definitively) before we
  // inspect naturalWidth — otherwise images still in-flight at scan time
  // get flagged as MISSING (network) when in reality they would have loaded
  // a few hundred ms later. This was the Bluebird Calgary false-positive class.
  try {
    await page.evaluate(async () => {
      const imgs = Array.from(document.querySelectorAll('img')) as HTMLImageElement[];
      const waiters = imgs.map(img => new Promise<void>(resolve => {
        if (img.complete) return resolve();
        const done = () => {
          img.removeEventListener('load',  done);
          img.removeEventListener('error', done);
          resolve();
        };
        img.addEventListener('load',  done, { once: true });
        img.addEventListener('error', done, { once: true });
        // hard cap: 6s per image
        setTimeout(done, 6000);
      }));
      await Promise.all(waiters);
    });
  } catch { /* ignore */ }
  await page.waitForTimeout(500);

  // Second-chance retry: any <img> that finished loading but has naturalWidth
  // === 0 may be a srcset variant that 404s while the unoptimized `src`
  // attribute is actually fine (this is the Bluebird unit_3d image pattern —
  // every srcset variant is a 404 but the `src` URL is a 200 OK; the page's
  // own onerror handler `handleResponsiveImageError` strips srcset to force
  // src fallback, but the timing races our scan).
  //
  // Mimic that fallback ourselves: for any broken img, strip srcset+sizes
  // and reload via the `src` attribute. Wait for load/error before scanning.
  try {
    await page.evaluate(async () => {
      const broken = Array.from(document.querySelectorAll('img'))
        .filter((img: HTMLImageElement) => img.complete && img.naturalWidth === 0) as HTMLImageElement[];
      const retried = broken.map(img => new Promise<void>(resolve => {
        // Prefer the literal src attribute (the unoptimized fallback URL)
        // over currentSrc (which points at the failed srcset variant).
        const srcAttr  = img.getAttribute('src') || '';
        const fallback = srcAttr || img.currentSrc || img.getAttribute('data-src') || '';
        if (!fallback || !/^https?:\/\//i.test(fallback)) return resolve();
        // Stash the ORIGINAL src attribute (pre-cache-bust) so the inspect
        // pass can report its true identity for cross-listing dedup. Without
        // this, Bluebird's shared unit_3d_*.webp images get a unique cache-
        // bust query param after retry and stop matching their loaded twins.
        if (!img.hasAttribute('data-original-src')) {
          img.setAttribute('data-original-src', srcAttr || fallback);
        }
        // Strip srcset / sizes so the browser uses src on reload (mimics the
        // page's own handleResponsiveImageError onerror handler).
        if (img.hasAttribute('srcset')) img.removeAttribute('srcset');
        if (img.hasAttribute('sizes'))  img.removeAttribute('sizes');
        // Cache-bust the retry so the CDN serves a fresh response (CloudFront
        // ignores unknown query params and forwards to origin on cache miss).
        const sep = fallback.includes('?') ? '&' : '?';
        const retryUrl = `${fallback}${sep}_imgscan_retry=${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const done = () => {
          img.removeEventListener('load',  done);
          img.removeEventListener('error', done);
          resolve();
        };
        // Attach listeners FIRST, then set src — otherwise an empty-src step
        // would fire error and resolve before the real reload begins.
        img.addEventListener('load',  done, { once: true });
        img.addEventListener('error', done, { once: true });
        img.src = retryUrl;
        setTimeout(done, 6000);
      }));
      await Promise.all(retried);
    });
  } catch { /* ignore */ }
  await page.waitForTimeout(500);

  return await page.evaluate((placeholderPatterns: string[]) => {
    const isHttpSrc = (s: string) => /^https?:\/\//i.test(s);
    const TINY_DIM_THRESHOLD = 30;

    const lowerPatterns = placeholderPatterns.map(p => p.toLowerCase());
    function isPlaceholderSrc(src: string): boolean {
      const lower = src.toLowerCase();
      return lowerPatterns.some(p => lower.includes(p));
    }

    function inspect(img: HTMLImageElement) {
      const currentSrc = img.currentSrc || '';
      // Literal src attribute — for srcset images this is the unoptimized
      // fallback URL, often shared between multiple unit-listings (e.g.
      // Bluebird reuses unit_3d_926163413.webp across 5x10, 10x5, 7x10, ...)
      // and is what the dedup logic uses to recognize "same image".
      // The retry phase stashes pre-cache-bust src in data-original-src,
      // so prefer that when present (otherwise retried imgs would have a
      // unique query param and stop matching their loaded twins).
      const origSrc   = img.getAttribute('data-original-src') || '';
      const srcAttr   = origSrc || img.getAttribute('src') || '';
      const dataSrc   = img.getAttribute('data-src') || '';
      const src       = currentSrc || srcAttr || dataSrc;
      return {
        src,
        srcAttr,                                                // for dedup
        alt: (img.alt || '').slice(0, 80),
        loaded: img.complete && img.naturalWidth > 0 && img.naturalHeight > 0,
        width:  img.naturalWidth,
        height: img.naturalHeight,
      };
    }

    // True iff the img is effectively invisible to the user. Catches:
    //  • display:none / visibility:hidden / opacity:0 ancestors  (Bootstrap carousel non-active slides)
    //  • aria-hidden="true" ancestors                              (carousel inactive slides, modals, etc.)
    //  • slick/swiper non-active slide classes                     (translate-based carousels)
    //  • bounding rect off-screen due to translate transforms     (Slick / Owl carousel slides slid out of view)
    //  • zero rendered dimensions
    function isHidden(img: HTMLImageElement): boolean {
      let node: HTMLElement | null = img;
      while (node && node !== document.body) {
        const cs = window.getComputedStyle(node);
        if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return true;
        if (node.getAttribute('aria-hidden') === 'true') return true;
        const cls = (node.className && typeof node.className === 'string') ? node.className.toLowerCase() : '';
        // Bootstrap-style: carousel-item hidden unless .active. Slick: .slick-slide hidden unless .slick-active.
        if (cls.includes('carousel-item') && !cls.includes('active')) return true;
        if (cls.includes('slick-slide')   && !cls.includes('slick-active') && !cls.includes('slick-current')) return true;
        if (cls.includes('swiper-slide')  && cls.includes('swiper-slide-duplicate')) return true;
        node = node.parentElement;
      }
      // Off-screen via transforms (Slick/Owl slides translated out of viewport).
      // Bounding rect honors transforms, so a translated-off slide will read
      // rect.right <= 0 or rect.left >= viewport width.
      const rect = img.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return true;
      const docW = document.documentElement.clientWidth || window.innerWidth;
      if (rect.right <= 0 || rect.left >= docW + 50) return true;
      return false;
    }

    function isInChrome(img: HTMLImageElement): boolean {
      let node: HTMLElement | null = img;
      while (node && node !== document.body) {
        const tag = node.tagName?.toLowerCase();
        if (tag === 'header' || tag === 'nav' || tag === 'footer') return true;
        const cls = (node.className && typeof node.className === 'string') ? node.className.toLowerCase() : '';
        if (cls.includes('logo') || cls.includes('navbar') || cls.includes('header') || cls.includes('footer')) {
          return true;
        }
        node = node.parentElement;
      }
      return false;
    }

    // ── TOP CAROUSEL / HERO selectors ─────────────────────────────────────
    const topSelectors = [
      '.carousel img', '[class*="carousel"] img',
      '.swiper img', '[class*="swiper"] img',
      '.slick-slider img', '.slick-slide img',
      '[class*="slider"] img',
      '.hero img', '[class*="hero"] img',
      '[class*="banner"] img:not(footer img):not(header img)',
      '#topSection img', '.top-section img',
      '.topPagePictures img',
    ];
    const topSet = new Set<HTMLImageElement>();
    for (const sel of topSelectors) {
      try { document.querySelectorAll<HTMLImageElement>(sel).forEach(el => topSet.add(el)); } catch {}
    }

    // ── UNIT IMAGES selectors ─────────────────────────────────────────────
    const unitSelectors = [
      '.listviewrows img', 'tr.shortableClass img',
      '[class*="unit-type"] img', '[class*="unitType"] img',
      '.unit-listing img',
      '.unit_mockup',                     // Storagely unit-image class — matches the .unit_mockup img in the prod bug example
      'img.unit_mockup',
      '[class*="unit_3d"] img', '[class*="3dimages"] img', // sh_3dimages_* custom-element wrappers
    ];
    const unitSet = new Set<HTMLImageElement>();
    for (const sel of unitSelectors) {
      try { document.querySelectorAll<HTMLImageElement>(sel).forEach(el => unitSet.add(el)); } catch {}
    }

    // Position-based TOP fallback — any visible <img> above the first unit
    // row that isn't already a unit image and isn't in chrome → TOP.
    // Catches future carousel-class renames.
    const firstUnitRow = document.querySelector('.listviewrows, tr.shortableClass') as HTMLElement | null;
    const unitRowTop = firstUnitRow
      ? firstUnitRow.getBoundingClientRect().top + window.scrollY
      : Math.max(window.innerHeight * 0.4, 400);
    const allImgs = Array.from(document.querySelectorAll('img')) as HTMLImageElement[];
    for (const img of allImgs) {
      if (topSet.has(img) || unitSet.has(img)) continue;
      if (isInChrome(img)) continue;
      const rect = img.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) continue;
      const imgTop = rect.top + window.scrollY;
      if (imgTop < unitRowTop) topSet.add(img);
    }

    // BOTTOM = catch-all (every remaining img not in chrome)
    const bottomList: HTMLImageElement[] = [];
    for (const img of allImgs) {
      if (topSet.has(img) || unitSet.has(img)) continue;
      if (!isInChrome(img)) bottomList.push(img);
    }

    function summarize(imgs: HTMLImageElement[]) {
      // Drop hidden imgs (e.g. inactive Bootstrap carousel slides) — they
      // aren't visible to the user and routinely fail the loaded check
      // because lazy-loading never fires on display:none ancestors.
      const visibleImgs = imgs.filter(img => !isHidden(img));
      const inspected = visibleImgs.map(inspect).filter(i => isHttpSrc(i.src));
      const failed = inspected.filter(i => !i.loaded);
      const ok     = inspected.filter(i =>  i.loaded);
      const placeholders = ok.filter(i => isPlaceholderSrc(i.src));
      const tiny = ok.filter(i =>
        i.width  > 0 && i.width  < TINY_DIM_THRESHOLD &&
        i.height > 0 && i.height < TINY_DIM_THRESHOLD
      );

      let dims: DimStats | null = null;
      if (ok.length > 0) {
        const widths  = ok.map(i => i.width);
        const heights = ok.map(i => i.height);
        const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
        dims = {
          minW: Math.min(...widths), maxW: Math.max(...widths), avgW: Math.round(sum(widths)  / widths.length),
          minH: Math.min(...heights), maxH: Math.max(...heights), avgH: Math.round(sum(heights) / heights.length),
        };
      }
      return {
        total:  inspected.length,
        loaded: ok.length,
        failed,
        placeholders,
        dims,
        tiny,
      };
    }

    const top    = summarize(Array.from(topSet));
    const units  = summarize(Array.from(unitSet));
    const bottom = summarize(bottomList);

    // ── Cross-section dedup ─────────────────────────────────────────────
    // If a unit listing in the waitlist section has a placeholder image but
    // the SAME unit (same alt, e.g. "10 x 18 storage image") has a real
    // working image elsewhere on the page (top section, available section,
    // or another row), the user perceives the image as available — flagging
    // is a false-positive. Same logic applies to carousel slides whose
    // duplicates load fine in the active slide.
    //
    // Rule: any failed/placeholder whose normalized alt OR src matches a
    // successfully-loaded NON-placeholder image (anywhere on the page) is
    // dropped from the broken list.
    function normalizeAlt(a: string): string {
      return (a || '').toLowerCase().replace(/\s+/g, ' ').trim();
    }
    // Build the global "good image" registry: loaded, not a placeholder.
    // We track BOTH currentSrc and the literal src attribute. The literal
    // src attribute is what dedupes Bluebird's shared unit_3d_*.webp images
    // across different sizes — one loaded twin of the underlying image is
    // enough to consider all of its dimensional re-uses fine.
    const goodAlts = new Set<string>();
    const goodSrcs = new Set<string>();
    function harvestGood(imgs: HTMLImageElement[]) {
      const visible = imgs.filter(img => !isHidden(img));
      const inspected = visible.map(inspect).filter(i => isHttpSrc(i.src));
      for (const i of inspected) {
        if (i.loaded && !isPlaceholderSrc(i.src)) {
          const a = normalizeAlt(i.alt);
          if (a) goodAlts.add(a);
          if (i.src)     goodSrcs.add(i.src);
          if (i.srcAttr) goodSrcs.add(i.srcAttr);
        }
      }
    }
    harvestGood(Array.from(topSet));
    harvestGood(Array.from(unitSet));
    harvestGood(bottomList);

    type Inspected = ReturnType<typeof inspect>;
    function dedup(section: ReturnType<typeof summarize>) {
      const keep = (i: Inspected) => {
        const a = normalizeAlt(i.alt);
        if (a && goodAlts.has(a))         return false; // a working twin (same alt) exists
        if (i.src     && goodSrcs.has(i.src))     return false;
        if (i.srcAttr && goodSrcs.has(i.srcAttr)) return false; // shared underlying image loaded elsewhere
        return true;
      };
      return {
        ...section,
        failed:       section.failed.filter(keep),
        placeholders: section.placeholders.filter(keep),
      };
    }

    return {
      top:         dedup(top),
      units:       dedup(units),
      bottom:      dedup(bottom),
      hasUnitRows: !!firstUnitRow,
    };
  }, PLACEHOLDER_IMAGE_PATTERNS);
}
