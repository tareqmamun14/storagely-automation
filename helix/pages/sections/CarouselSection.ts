import { Page } from '@playwright/test';
import { ISectionDetector, SectionContext, SectionResult, check, settleImages } from './types';

/**
 * Hero image carousel section.
 *
 * Detected through accessibility hooks (aria-label "Go to slide N of M",
 * "Previous slide", "Next slide") rather than CSS classes — the editor
 * regenerates the class hashes between deploys, but the aria attributes
 * are stable.
 */
export class CarouselSection implements ISectionDetector {
  readonly id = 'carousel';
  readonly label = 'Image Carousel';

  async verify(page: Page, ctx: SectionContext): Promise<SectionResult> {
    const start = Date.now();
    const errors: string[] = [];
    const checks = [];
    const data: Record<string, unknown> = {};

    try {
      // Slide indicators: aria-label "Go to slide N of M"
      const slideTabs = page.locator('[aria-label^="Go to slide"]');
      const tabCount = await slideTabs.count();
      data.slideTabCount = tabCount;

      // Total slide count parsed from the aria-label ("Go to slide 1 of 8" → 8)
      const total = await page.evaluate(() => {
        const el = document.querySelector('[aria-label^="Go to slide"]');
        if (!el) return 0;
        const m = el.getAttribute('aria-label')?.match(/of\s+(\d+)/);
        return m ? parseInt(m[1], 10) : 0;
      });
      data.totalSlides = total;

      checks.push(check(
        'slide indicators present',
        tabCount > 0,
        `${tabCount} tab(s), total ${total}`,
      ));

      // Tab count should match the "of N" embedded in the label.
      if (tabCount > 0 && total > 0) {
        checks.push(check(
          'tab count matches advertised total',
          tabCount === total,
          `tabs=${tabCount}, advertised=${total}`,
        ));
      }

      // Prev/Next controls
      const prev = page.locator('[aria-label="Previous slide" i]');
      const next = page.locator('[aria-label="Next slide" i]');
      const hasPrev = (await prev.count()) > 0;
      const hasNext = (await next.count()) > 0;
      checks.push(check('previous slide control', hasPrev));
      checks.push(check('next slide control', hasNext));

      // Try advancing one slide — if Next is functional, an active tab changes.
      if (hasNext && tabCount > 1) {
        try {
          const before = await activeTabIndex(page);
          await next.first().click({ timeout: 5000 });
          await page.waitForTimeout(700);
          const after = await activeTabIndex(page);
          checks.push(check(
            'Next slide control advances carousel',
            after !== before && after >= 0,
            `active tab ${before} → ${after}`,
          ));
          data.activeTabAfterNext = after;
        } catch (clickErr) {
          checks.push(check('Next slide control advances carousel', false, (clickErr as Error).message));
        }
      }

      // Verify the carousel's CURRENTLY VISIBLE slide image loaded.
      //
      // IMPORTANT — false-positive avoidance: carousels lazy-preload neighbouring
      // slides offscreen (x > viewport width) with naturalWidth=0, AND unit-size
      // preview thumbnails sit at y=0 with width=0 until scrolled into view.
      // Earlier versions of this detector counted those as "broken" — a false
      // positive that wasted reviewer time. We now ONLY check the slide currently
      // in the viewport: ≥ 200px wide and horizontally on-screen.
      const viewport = page.viewportSize() || { width: 1440, height: 900 };
      // Mini Mall lays the hero slides out as a side-by-side strip, every image
      // tagged loading="lazy". On first paint a trailing strip image can still be
      // mid-fetch (naturalWidth=0) — which earlier surfaced as a scary "4/5 loaded"
      // even though nothing was broken. In-viewport lazy images DO load on their
      // own, so we poll briefly: any displayed hero that never resolves is a
      // genuinely broken image and must fail.
      const measureHeroes = (vw: number) => page.evaluate((w) => {
        return Array.from(document.querySelectorAll<HTMLImageElement>('img'))
          .filter(img => {
            const r = img.getBoundingClientRect();
            const cs = getComputedStyle(img);
            // Above the fold, on-screen, big enough to be a hero — and actually
            // DISPLAYED (not an opacity:0 / hidden stacked slide).
            return r.y < 800 && r.x >= 0 && r.x < w && r.width >= 200 && r.height >= 100
              && cs.visibility !== 'hidden' && parseFloat(cs.opacity || '1') > 0.05;
          })
          .map(img => ({
            src: (img.currentSrc || img.src || '').slice(0, 200),
            alt: img.alt,
            loaded: img.complete && img.naturalWidth > 0,
          }));
      }, vw);

      // Settle lazy hero images first (the strip tags every slide loading="lazy",
      // and a section-scoped run has no prior scroll to trigger them), then a
      // short re-poll as a final guard. This is what separates a real broken
      // hero (never resolves) from a not-yet-loaded one (a false flag).
      await settleImages(page);
      let visibleHero = await measureHeroes(viewport.width);
      for (let i = 0; i < 6 && visibleHero.some(h => !h.loaded); i++) {
        await page.waitForTimeout(400);
        visibleHero = await measureHeroes(viewport.width);
      }

      data.visibleHeroImages = visibleHero;
      const loaded = visibleHero.filter(i => i.loaded);
      const broken = visibleHero.filter(i => !i.loaded);
      checks.push(check(
        'every displayed hero image is loaded (not broken)',
        visibleHero.length > 0 && broken.length === 0,
        visibleHero.length === 0
          ? 'no hero-sized image currently in viewport'
          : broken.length === 0
            ? `${loaded.length}/${visibleHero.length} displayed hero image(s) loaded`
            : `${broken.length} broken; sample: ${broken[0]?.alt || broken[0]?.src}`,
      ));

      // Mini Mall renders a Google-Maps directions link beneath the carousel.
      if (ctx.client === 'minimall') {
        const mapLink = page.locator('a[href*="google.com/maps"], a[href*="goo.gl/maps"], a[href*="/maps/place"]').first();
        const hasMap = (await mapLink.count()) > 0;
        const mapHref = hasMap ? ((await mapLink.getAttribute('href')) || '') : '';
        data.mapLink = mapHref.slice(0, 80);
        checks.push(check('Google Maps location link present', hasMap, hasMap ? mapHref.slice(0, 60) : '(no map link)'));
      }
    } catch (err) {
      errors.push((err as Error).message);
    }

    return {
      sectionId: this.id,
      facilityId: ctx.facilityId,
      facilityName: ctx.facilityName,
      url: ctx.url,
      present: checks.some(c => c.passed),
      checks,
      data,
      durationMs: Date.now() - start,
      errors: errors.length ? errors : undefined,
    };
  }
}

async function activeTabIndex(page: Page): Promise<number> {
  return page.evaluate(() => {
    // The active slide is marked with aria-selected="true" on its tab — the
    // stable accessibility signal. (An earlier version measured tab width, but
    // every tab button is the same fixed size: only an inner <span> scales, so
    // width was always index 0 → "active tab 0 → 0" false negatives.)
    const tabs = Array.from(document.querySelectorAll<HTMLElement>('[role="tab"][aria-label^="Go to slide"]'));
    return tabs.findIndex(t => t.getAttribute('aria-selected') === 'true');
  });
}
