import { Page } from '@playwright/test';
import { ISectionDetector, SectionContext, SectionResult, check, settleImages } from './types';

/**
 * Bottom Facility Gallery section.
 *
 * Distinct from the top hero carousel — this is the larger image grid that
 * appears further down the page.
 */
export class GallerySection implements ISectionDetector {
  readonly id = 'gallery';
  readonly label = 'Facility Gallery';

  async verify(page: Page, ctx: SectionContext): Promise<SectionResult> {
    const start = Date.now();
    const errors: string[] = [];
    const checks = [];
    const data: Record<string, unknown> = {};

    try {
      const heading = page.getByRole('heading', { name: /facility gallery|photo gallery|gallery/i }).first();
      const hasHeading = (await heading.count()) > 0;

      if (hasHeading) {
        try {
          await heading.scrollIntoViewIfNeeded({ timeout: 3000 });
          await page.waitForTimeout(300);
        } catch { /* fine */ }
      }

      // Settle lazy gallery images so "no broken images" reflects real load
      // failures, not below-the-fold images that simply hadn't fetched yet.
      await settleImages(page);

      // Count + load-verify images beneath the gallery heading.
      // Broken gallery images are a top customer-visible regression so we
      // surface them per-URL rather than just counting slots.
      const galleryImgs = await page.evaluate(() => {
        const anchor = Array.from(document.querySelectorAll<HTMLElement>('h1, h2, h3, h4'))
          .find(h => /facility gallery|^gallery$|photo gallery/i.test(h.innerText?.trim() || ''));
        if (!anchor) return [];
        const r0 = anchor.getBoundingClientRect();
        return Array.from(document.querySelectorAll<HTMLImageElement>('img'))
          .filter(img => {
            const r = img.getBoundingClientRect();
            return r.y > r0.bottom - 50 && r.y < r0.bottom + 800 && r.width > 50 && r.height > 50;
          })
          .map(img => ({
            src: (img.src || '').slice(0, 200),
            loaded: img.complete && img.naturalWidth > 0,
          }));
      });

      data.imageCount = galleryImgs.length;
      data.brokenImages = galleryImgs.filter(i => !i.loaded).map(i => i.src.split('/').pop()).slice(0, 5);

      // A dedicated bottom gallery is OPTIONAL — some facilities/templates ship
      // their photos only in the hero carousel. Treat "no gallery at all" as a
      // clean skip; only assert load-health when a gallery IS present.
      if (!hasHeading && galleryImgs.length === 0) {
        checks.push(check('Facility Gallery (optional)', true, 'no dedicated gallery section on this facility — skipped'));
      } else {
        checks.push(check('Gallery heading visible', hasHeading));
        checks.push(check(
          'gallery has at least 1 image',
          galleryImgs.length >= 1,
          `${galleryImgs.length} image(s) detected beneath the gallery heading`,
        ));
        const broken = galleryImgs.filter(i => !i.loaded);
        checks.push(check(
          'no broken gallery images',
          broken.length === 0,
          broken.length === 0 ? 'all OK' : `${broken.length}/${galleryImgs.length} broken`,
        ));
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
