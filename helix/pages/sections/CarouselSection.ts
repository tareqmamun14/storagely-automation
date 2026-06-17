import { Page } from '@playwright/test';
import { ISectionDetector, SectionContext, SectionResult, check } from './types';

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
      const visibleHero = await page.evaluate((vw) => {
        return Array.from(document.querySelectorAll<HTMLImageElement>('img'))
          .filter(img => {
            const r = img.getBoundingClientRect();
            // Above the fold, on-screen horizontally, and big enough to be a hero slide.
            return r.y < 800 && r.x >= 0 && r.x < vw && r.width >= 200 && r.height >= 100;
          })
          .map(img => ({
            src: img.src.slice(0, 200),
            alt: img.alt,
            loaded: img.complete && img.naturalWidth > 0,
          }));
      }, viewport.width);

      data.visibleHeroImages = visibleHero;
      const loaded = visibleHero.filter(i => i.loaded);
      checks.push(check(
        'currently-visible hero image is loaded',
        loaded.length > 0,
        visibleHero.length === 0
          ? 'no hero-sized image currently in viewport'
          : `${loaded.length}/${visibleHero.length} visible hero image(s) loaded`,
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
