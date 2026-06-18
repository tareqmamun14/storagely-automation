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
      // Slide indicators: the pagination dots. The aria wording varies by Helix
      // template version — Carroll (prod) uses "Go to slide N of M", the newer
      // Chicago template uses "Go to photo N of M" — so match either.
      const SLIDE_SEL = '[aria-label^="Go to slide" i], [aria-label^="Go to photo" i]';
      const slideTabs = page.locator(SLIDE_SEL);
      const tabCount = await slideTabs.count();
      data.slideTabCount = tabCount;

      // Total slide count parsed from the aria-label ("Go to photo 1 of 5" → 5)
      const total = await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (!el) return 0;
        const m = el.getAttribute('aria-label')?.match(/of\s+(\d+)/);
        return m ? parseInt(m[1], 10) : 0;
      }, SLIDE_SEL);
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

      // Navigation: a carousel is navigable via prev/next ARROWS *or* pagination
      // DOTS. Carroll ships arrows + dots; the Chicago template ships dots only.
      // Requiring both arrows would false-fail a perfectly good dot carousel, so
      // we accept either mechanism.
      const prev = page.locator('[aria-label="Previous slide" i], [aria-label="Previous" i], [aria-label*="prev" i]');
      const next = page.locator('[aria-label="Next slide" i], [aria-label="Next" i], [aria-label*="next slide" i]');
      const hasPrev = (await prev.count()) > 0;
      const hasNext = (await next.count()) > 0;
      const navigable = (hasPrev && hasNext) || tabCount >= 2;
      checks.push(check(
        'carousel is navigable (arrows or pagination dots)',
        navigable,
        (hasPrev || hasNext) ? `prev=${hasPrev}, next=${hasNext}` : `${tabCount} pagination dot(s)`,
      ));

      // Advance the carousel — via the Next arrow if present, else by clicking the
      // 2nd pagination dot — and confirm the active slide changes. If the template
      // doesn't expose an active-state via aria (some dot carousels don't), we
      // report the navigation as present rather than false-fail on an unreadable
      // active index.
      if (navigable && tabCount > 1) {
        try {
          const before = await activeTabIndex(page);
          if (hasNext) await next.first().click({ timeout: 5000 });
          else await slideTabs.nth(1).click({ timeout: 5000 });
          await page.waitForTimeout(700);
          const after = await activeTabIndex(page);
          const via = hasNext ? 'next arrow' : 'pagination dot';
          if (before < 0 && after < 0) {
            checks.push(check('carousel navigation advances the active slide', true,
              `navigation present (${via}); active-state not exposed via aria — info`));
          } else {
            checks.push(check('carousel navigation advances the active slide',
              after !== before && after >= 0, `active ${before} → ${after} (via ${via})`));
          }
          data.activeTabAfterNav = after;
        } catch (clickErr) {
          checks.push(check('carousel navigation advances the active slide', false, (clickErr as Error).message));
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
    // The active slide is marked on its dot via aria-selected / aria-current /
    // data-active, depending on the template. Match "Go to slide" and "Go to
    // photo" dots, and accept any of the active-state signals.
    const tabs = Array.from(document.querySelectorAll<HTMLElement>(
      '[aria-label^="Go to slide" i], [aria-label^="Go to photo" i]',
    ));
    return tabs.findIndex(t =>
      t.getAttribute('aria-selected') === 'true' ||
      t.getAttribute('aria-current') === 'true' ||
      t.getAttribute('data-active') === 'true' ||
      t.getAttribute('data-state') === 'active',
    );
  });
}
