import { Page } from '@playwright/test';
import { ISectionDetector, SectionContext, SectionResult, check } from './types';
import { getClientProfile } from '../../configs/profiles';

/**
 * Top navigation bar.
 *
 * Layout-tolerant (semantic locators), but the EXPECTED items differ by
 * client, so they come from the client profile (helix/configs/profiles.ts):
 *
 *   • Safeguard — Blog link (→ /blog*), a Contact dropdown revealing
 *     Inquiry / Contact-Us, and a My Account portal link.
 *   • Mini Mall — no Blog (footer-only) and no Contact dropdown; menus are
 *     Find Storage / Resources / About; My Account is a dropdown BUTTON.
 *
 * Checks never navigate away — dropdowns are opened client-side and collapsed
 * again (Escape) so downstream section checks see a clean page.
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
      const nav = getClientProfile(ctx.client).nav;

      // React SPA: give the header/nav chrome a moment to hydrate before
      // inspecting, so the landmark check doesn't race a mid-render DOM
      // (observed flaking green→red on Mini Mall otherwise).
      await page.locator('header, nav, [role="navigation"]').first()
        .waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});

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

      // Collect every visible top-nav item (link OR dropdown button) with its
      // tag + href, so we can both count items AND interrogate specific ones.
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
        `has ≥ ${nav.minItems} visible nav items`,
        headerItems.length >= nav.minItems,
        `found ${headerItems.length}: ${headerItems.slice(0, 10).map(i => i.text).join(', ')}`,
      ));

      // ── 2. Blog — only for clients whose top nav ships a Blog link ────
      // Soft when absent (kept from the original behavior): only fail when the
      // item IS present but has a broken/missing href.
      if (nav.expectBlogLink) {
        const blog = headerItems.find(i => /^blog$/i.test(i.text));
        const blogOk = !blog || (blog.tag === 'a' && /blog/i.test(blog.href || ''));
        data.blog = blog ? { tag: blog.tag, href: blog.href } : null;
        checks.push(check(
          'Blog menu — if present, is a link with /blog href',
          blogOk,
          blog ? `tag=${blog.tag}, href=${blog.href || '(none)'}` : 'No Blog item in header (ok — not all clients have one)',
        ));
      }

      // ── 3. My Account — tenant-portal link OR account dropdown button ─
      if (nav.expectMyAccount) {
        const myAcct = headerItems.find(i => /my account|^account$|login|sign ?in/i.test(i.text));
        const myAcctHref = myAcct?.href || '';
        let myAcctExternal = false, myAcctHost = '';
        if (myAcctHref) {
          try {
            const dest = new URL(myAcctHref, ctx.url);
            myAcctHost = dest.host;
            myAcctExternal = /^https?:$/.test(dest.protocol) && dest.host !== new URL(ctx.url).host;
          } catch { /* not a resolvable URL (e.g. "#") */ }
        }
        const myAcctKeyword = /tenantconnect|login|account|customer|portal|tenant|sign-?in/i.test(myAcctHref);
        // Safeguard: a direct portal link. Mini Mall: a dropdown <button> that
        // opens account/login options. Either is a valid My Account entry.
        const asLink = myAcct?.tag === 'a' && (myAcctExternal || myAcctKeyword);
        const asButton = myAcct?.tag === 'button';
        const myAcctOk = !!myAcct && (asLink || asButton);
        data.myAccount = myAcct ? { tag: myAcct.tag, href: myAcct.href, host: myAcctHost, external: myAcctExternal } : null;
        checks.push(check(
          'My Account — tenant portal link or account menu',
          myAcctOk,
          myAcct
            ? (asButton ? 'account dropdown button present'
                        : `link → ${myAcctExternal ? `external portal ${myAcctHost}` : (myAcct.href || '').slice(0, 80)}`)
            : 'No My Account / Login item found in header',
        ));
      }

      // ── 4. Contact dropdown — only for clients that ship one ──────────
      if (nav.expectContactDropdown) {
        const contactBtn = page.getByRole('button', { name: /^contact$/i }).first();
        const hasContactBtn = (await contactBtn.count()) > 0;
        let contactSubmenu: Array<{ text: string; href: string }> = [];
        if (hasContactBtn) {
          await contactBtn.click().catch(() => { /* may already be open */ });
          await page.waitForTimeout(500);
          contactSubmenu = await page.evaluate(() => {
            return Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]'))
              .filter(a => /contact us|inquiry|move-?out/i.test(a.innerText || ''))
              .map(a => ({ text: (a.innerText || '').trim(), href: a.getAttribute('href') || '' }));
          });
          await page.keyboard.press('Escape').catch(() => {});
        }
        data.contactSubmenu = contactSubmenu;
        const hasInquiry = contactSubmenu.some(s => /contact us|inquiry/i.test(s.text) && /contact|inquiry/i.test(s.href));
        checks.push(check(
          'Contact dropdown opens and reveals "Contact Us" / Inquiry link',
          hasInquiry,
          hasContactBtn ? `submenu items: ${contactSubmenu.map(s => s.text).join(', ') || '(none)'}` : 'Contact button not found in header',
        ));
      }

      // ── 5. Menu dropdowns — exercise each configured trigger ──────────
      // Open each menu, note how many links it reveals, then collapse (Escape).
      // We FAIL only when a configured trigger button is missing entirely (a
      // real structural regression); the revealed-link counts are informational
      // so we don't false-fail on mega-menu/overlay rendering quirks.
      if (nav.dropdownTriggers.length > 0) {
        const report: Array<{ trigger: string; revealed: number; present: boolean }> = [];
        for (const trig of nav.dropdownTriggers) {
          const btn = page.getByRole('button', { name: trig }).first();
          const present = (await btn.count()) > 0;
          let revealed = 0;
          if (present) {
            const before = await page.locator('a:visible').count();
            await btn.click().catch(() => {});
            await page.waitForTimeout(400);
            const after = await page.locator('a:visible').count();
            await page.keyboard.press('Escape').catch(() => {});
            await page.waitForTimeout(150);
            revealed = Math.max(0, after - before);
          }
          report.push({ trigger: trig.source, revealed, present });
        }
        data.dropdowns = report;
        const missing = report.filter(d => !d.present).map(d => d.trigger);
        checks.push(check(
          'menu dropdown triggers present',
          missing.length === 0,
          missing.length
            ? `missing trigger(s): ${missing.join(', ')}`
            : report.map(d => `${d.trigger}(+${d.revealed})`).join('  '),
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
