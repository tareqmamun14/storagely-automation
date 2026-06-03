/**
 * Visual baseline tests — image regions.
 *
 * Captures element-scoped screenshots of key visual areas on each Helix
 * facility page and compares them to a committed baseline. Tuned to survive
 * normal pixel-level noise (anti-aliasing, font rendering, JPEG re-encoding)
 * while catching meaningful regressions like "wrong photo bound to this
 * facility" or "carousel asset replaced with a placeholder."
 *
 * ## False-positive controls
 *
 *   maxDiffPixelRatio: 0.02   — allow up to 2% of pixels to differ
 *   threshold:         0.2    — per-pixel YIQ color distance tolerance
 *   animations:        'disabled'  — pause CSS animations during snapshot
 *   element-scoped     — snapshots one component, not the full page
 *
 * ## Baseline workflow
 *
 *   First run:                    → baselines auto-generated, test "passes"
 *   Review the PNGs:              → open the *-snapshots/ folder, eyeball each one
 *   Commit baselines to git:      → `git add helix/tests/live/visual/baseline.spec.ts-snapshots/`
 *   Subsequent runs:              → compare against committed baselines
 *   Designer ships new photos:    → `npx playwright test --update-snapshots <path>` then re-review + commit
 *
 * ## Cross-platform note
 *
 *   Playwright stores baselines per-OS (-darwin, -linux, -win32 suffix).
 *   Generate baselines on the same OS where CI will run them, OR generate
 *   per-OS baselines and commit all of them. For now we run locally on Windows.
 */
import { test, expect, Page } from '@playwright/test';
import { getAllFacilities } from '../../../configs/facilities';

const facilities = getAllFacilities();

// Sensible defaults for "image content has changed meaningfully" detection.
// Looser than Playwright's defaults so CDN re-encoding doesn't trigger flake;
// tight enough to catch a wrong-image swap or a missing-asset placeholder.
const SCREENSHOT_OPTS = {
  maxDiffPixelRatio: 0.02,   // 2% of pixels may differ
  threshold:         0.2,    // moderate per-pixel color tolerance
  animations:        'disabled' as const,
  caret:             'hide'  as const,
};

test.describe('Visual baseline — image regions', () => {
  // These tests can run in parallel — no shared state.
  test.describe.configure({ retries: 0 });

  for (const facility of facilities) {
    test.describe(facility.name, () => {

      test('hero carousel — slide 1 image matches baseline', async ({ page }) => {
        await page.goto(facility.url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});

        // Pin the carousel to slide 1 so the comparison is reproducible. The
        // tab indicators use stable aria-labels ("Go to slide 1 of 8") even
        // though the slide *order* is config-driven per facility.
        const slide1Tab = page.getByRole('tab', { name: /Go to slide 1/i }).first();
        if ((await slide1Tab.count()) > 0) {
          await slide1Tab.click({ timeout: 5000 }).catch(() => {});
          await page.waitForTimeout(800); // let the transition settle
        }

        // Wait for the visible hero image to be fully loaded — never snapshot
        // a 0×0 lazy placeholder; that's a guaranteed false-positive.
        await waitForVisibleHeroLoaded(page);

        // Snapshot the largest currently-visible hero image element (just the
        // <img>, not the surrounding layout — surrounding text changes between
        // runs and would cause noisy false-positives).
        const hero = await getVisibleHeroLocator(page);
        await expect(hero).toHaveScreenshot(
          `carousel-${facility.id}-slide1.png`,
          SCREENSHOT_OPTS,
        );
      });

      test('facility gallery — bottom image row matches baseline', async ({ page }) => {
        await page.goto(facility.url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});

        // Gallery sits further down the page — scroll into view to trigger
        // lazy-load, then settle.
        const galleryHeading = page.getByRole('heading', { name: /facility gallery|photo gallery|^gallery$/i }).first();
        await galleryHeading.scrollIntoViewIfNeeded({ timeout: 10_000 }).catch(() => {});
        await page.waitForTimeout(1200);

        // Wait for every gallery image directly below the heading to load.
        await page.waitForFunction(() => {
          const heading = Array.from(document.querySelectorAll<HTMLElement>('h1, h2, h3, h4'))
            .find(h => /facility gallery|photo gallery|^gallery$/i.test(h.innerText?.trim() || ''));
          if (!heading) return false;
          const r0 = heading.getBoundingClientRect();
          const imgs = Array.from(document.querySelectorAll<HTMLImageElement>('img'))
            .filter(img => {
              const r = img.getBoundingClientRect();
              return r.y > r0.bottom - 50 && r.y < r0.bottom + 800 && r.width > 50 && r.height > 50;
            });
          return imgs.length > 0 && imgs.every(img => img.complete && img.naturalWidth > 0);
        }, undefined, { timeout: 10_000 }).catch(() => { /* best-effort */ });

        // Scope the screenshot to the gallery row ancestor of the heading —
        // captures the images, not the heading text or surrounding decoration.
        const galleryContainer = galleryHeading.locator(
          'xpath=ancestor::*[descendant::img and count(.//img) >= 3][1]',
        ).first();

        await expect(galleryContainer).toHaveScreenshot(
          `gallery-${facility.id}.png`,
          SCREENSHOT_OPTS,
        );
      });

    });
  }
});

// ── Helpers ──────────────────────────────────────────────────────────────

/** Wait until the largest above-the-fold in-viewport hero image is loaded. */
async function waitForVisibleHeroLoaded(page: Page): Promise<void> {
  await page.waitForFunction((vw) => {
    const imgs = Array.from(document.querySelectorAll<HTMLImageElement>('img'))
      .filter(img => {
        const r = img.getBoundingClientRect();
        return r.y < 800 && r.x >= 0 && r.x < vw && r.width >= 200 && r.height >= 100;
      });
    return imgs.length > 0 && imgs.every(img => img.complete && img.naturalWidth > 0);
  }, page.viewportSize()?.width ?? 1440, { timeout: 10_000 }).catch(() => { /* best-effort */ });
}

/**
 * Tag the largest currently-visible above-the-fold image with a unique data
 * attribute, then return a Playwright Locator selecting that element.
 *
 * We mark instead of returning an ElementHandle because `toHaveScreenshot`
 * only works on Page / Locator objects. This pattern stays compatible.
 */
async function getVisibleHeroLocator(page: Page) {
  const tagged = await page.evaluate((vw) => {
    // Clean any stale tag from prior runs first.
    document.querySelectorAll('[data-helix-hero]').forEach(el => el.removeAttribute('data-helix-hero'));

    const imgs = Array.from(document.querySelectorAll<HTMLImageElement>('img'))
      .filter(img => {
        const r = img.getBoundingClientRect();
        return r.y < 800 && r.x >= 0 && r.x < vw && r.width >= 200 && r.height >= 100;
      })
      .sort((a, b) => {
        const ar = a.getBoundingClientRect();
        const br = b.getBoundingClientRect();
        return (br.width * br.height) - (ar.width * ar.height); // largest first
      });

    if (imgs.length === 0) return false;
    imgs[0].setAttribute('data-helix-hero', 'true');
    return true;
  }, page.viewportSize()?.width ?? 1440);

  if (!tagged) {
    throw new Error('No visible hero image found to snapshot. Carousel may not have rendered.');
  }
  return page.locator('img[data-helix-hero="true"]');
}
