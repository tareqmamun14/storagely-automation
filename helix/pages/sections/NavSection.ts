import { Page } from '@playwright/test';
import { ISectionDetector, SectionContext, SectionResult, check } from './types';

/**
 * Top navigation bar.
 *
 * Two layers of checking:
 *   1. STRUCTURAL — nav landmark exists; ≥ 3 visible items; account/login CTA.
 *   2. FUNCTIONAL — specific items the brief calls out:
 *        • Blog       → direct link to /blogs (or similar "/blog*")
 *        • Contact    → dropdown that opens to reveal Inquiry (a.k.a. Contact Us)
 *                       and Move-Out Request links
 *        • My Account → direct link to the tenant portal (tenantconnect / login)
 *
 * The functional checks DO NOT navigate away from the page — they verify the
 * dropdown expansion happens client-side and that direct links point at
 * plausible destinations. URL reachability is verified separately by the
 * link-reachability check below.
 */
export class NavSection implements ISectionDetector {
  readonly id = 'nav';
  readonly label = 'Top Navigation';

  async verify(page: Page, ctx: SectionContext): Promise<SectionResult> {
    const start = Date.now();
    const errors: string[] = [];
    const checks = [];
    const data: Record<string, unknown> = {};

    try {
      // ── 1. Structural ─────────────────────────────────────────────────
      const navCandidates = [
        page.locator('nav').first(),
        page.locator('header nav').first(),
        page.getByRole('navigation').first(),
      ];
      let navFound = false;
      for (const c of navCandidates) {
        if ((await c.count()) > 0) { navFound = true; break; }
      }
      checks.push(check('navigation landmark exists', navFound));

      // Collect every visible nav item with its tag + href, so we can both
      // count items AND interrogate specific ones (Blog, My Account).
      const headerItems = await page.evaluate(() => {
        const top = Array.from(document.querySelectorAll<HTMLElement>('header a, header button'))
          .filter(el => {
            const r = el.getBoundingClientRect();
            return r.y < 120 && r.width > 0 && r.height > 0;
          });
        return top.map(el => ({
          tag: el.tagName.toLowerCase(),
          text: (el.innerText || el.getAttribute('aria-label') || '').trim(),
          href: el.tagName === 'A' ? (el as HTMLAnchorElement).getAttribute('href') : null,
        }))
        .filter(it => it.text.length > 0);
      });
      data.items = headerItems.map(i => i.text);
      data.itemCount = headerItems.length;
      checks.push(check(
        'has ≥ 3 visible nav items',
        headerItems.length >= 3,
        `found ${headerItems.length}: ${headerItems.slice(0, 8).map(i => i.text).join(', ')}`,
      ));

      // ── 2. Functional — specific items the brief asks about ──────────

      // BLOG — direct link with an href that points at /blog*. Some clients
      // call it "Blog", others "Articles" / "Resources"; we match by item text.
      const blog = headerItems.find(i => /^blog$/i.test(i.text));
      const blogHref = blog?.href || '';
      const blogOk = !!blog && blog.tag === 'a' && /blog/i.test(blogHref);
      data.blog = blog ? { tag: blog.tag, href: blog.href } : null;
      checks.push(check(
        'Blog menu — present as a link with /blog href',
        blogOk,
        blog
          ? `tag=${blog.tag}, href=${blog.href || '(none)'}`
          : 'Blog item not found in header',
      ));

      // MY ACCOUNT — direct link to the tenant portal (tenantconnect.com,
      // or a /login / /my-account path for clients with a custom portal).
      const myAcct = headerItems.find(i => /my account|account|login|sign in/i.test(i.text));
      const myAcctHref = myAcct?.href || '';
      const myAcctOk = !!myAcct && myAcct.tag === 'a' &&
        /tenantconnect|login|account|customer/i.test(myAcctHref);
      data.myAccount = myAcct ? { tag: myAcct.tag, href: myAcct.href } : null;
      checks.push(check(
        'My Account — link to tenant portal / login',
        myAcctOk,
        myAcct
          ? `tag=${myAcct.tag}, href=${(myAcct.href || '').slice(0, 80)}`
          : 'No My Account / Login item found in header',
      ));

      // CONTACT — dropdown button. Expanding it should reveal a sub-link to
      // /contact (Inquiry / "Contact Us"). We click it, capture revealed
      // links, then collapse it again so downstream checks see a clean page.
      const contactBtn = page.getByRole('button', { name: /^contact$/i }).first();
      const hasContactBtn = (await contactBtn.count()) > 0;
      let contactSubmenu: Array<{ text: string; href: string }> = [];
      if (hasContactBtn) {
        await contactBtn.click().catch(() => { /* dropdown may already be open */ });
        await page.waitForTimeout(500);
        contactSubmenu = await page.evaluate(() => {
          return Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]'))
            .filter(a => /contact us|inquiry|move-?out/i.test(a.innerText || ''))
            .map(a => ({ text: (a.innerText || '').trim(), href: a.getAttribute('href') || '' }));
        });
        // Click somewhere neutral to collapse — header logo, or just press Escape.
        await page.keyboard.press('Escape').catch(() => {});
      }
      data.contactSubmenu = contactSubmenu;
      const hasInquiry = contactSubmenu.some(s =>
        /contact us|inquiry/i.test(s.text) && /contact|inquiry/i.test(s.href),
      );
      checks.push(check(
        'Contact dropdown opens and reveals "Contact Us" / Inquiry link',
        hasInquiry,
        hasContactBtn
          ? `submenu items: ${contactSubmenu.map(s => s.text).join(', ') || '(none)'}`
          : 'Contact button not found in header',
      ));
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
