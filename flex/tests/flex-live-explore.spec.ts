import { test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const LIVE_URL = 'https://safeguard.test.getstoragely.com/storage-units/illinois/bridgeview/harlem-avenue';
const OUT_DIR = path.join(__dirname, '..', 'test-results', 'explore');

test.describe('Flex Live Site — Exploration', () => {
  test.setTimeout(120_000);

  test('capture Safeguard live page structure', async ({ page }) => {
    fs.mkdirSync(OUT_DIR, { recursive: true });

    console.log('▶ Navigating to live Safeguard page…');
    await page.goto(LIVE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(3000);
    console.log('   url:', page.url());
    console.log('   title:', await page.title());

    // Full-page screenshot
    await page.screenshot({ path: path.join(OUT_DIR, '10-live-full.png'), fullPage: true });

    // Capture page structure
    const structure = await page.evaluate(() => {
      function descEl(el: Element) {
        const r = el.getBoundingClientRect();
        return {
          tag: el.tagName.toLowerCase(),
          id: el.id || undefined,
          class: el.className && typeof el.className === 'string' ? el.className.slice(0, 120) : undefined,
          role: el.getAttribute('role') || undefined,
          ariaLabel: el.getAttribute('aria-label') || undefined,
          dataTestId: el.getAttribute('data-testid') || el.getAttribute('data-test') || undefined,
          text: (el as HTMLElement).innerText ? (el as HTMLElement).innerText.trim().slice(0, 100) : undefined,
          visible: r.width > 0 && r.height > 0,
          rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
        };
      }

      // Headings — page structure
      const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4')).map(descEl);

      // Buttons — especially Rent Now / Reserve
      const buttons = Array.from(document.querySelectorAll('button, a[role="button"], [class*="btn"], [class*="button"]')).slice(0, 60).map(descEl);

      // Links — navigation and CTAs
      const links = Array.from(document.querySelectorAll('a[href]')).slice(0, 60).map(a => ({
        ...descEl(a),
        href: (a as HTMLAnchorElement).href,
      }));

      // Unit cards — storage units with prices
      const unitCards = Array.from(document.querySelectorAll('[class*="unit"], [class*="card"], [data-testid*="unit"]')).slice(0, 30).map(el => ({
        ...descEl(el),
        innerHTML: (el as HTMLElement).innerHTML.slice(0, 300),
      }));

      // Price elements
      const prices = Array.from(document.querySelectorAll('[class*="price"], [class*="rate"], [class*="cost"]')).slice(0, 30).map(descEl);

      // Images
      const images = Array.from(document.querySelectorAll('img')).slice(0, 20).map(img => ({
        src: (img as HTMLImageElement).src.slice(0, 200),
        alt: (img as HTMLImageElement).alt,
        visible: img.getBoundingClientRect().width > 0,
      }));

      // Forms
      const forms = Array.from(document.querySelectorAll('form')).map(f => ({
        action: (f as HTMLFormElement).action,
        method: (f as HTMLFormElement).method,
        inputs: Array.from(f.querySelectorAll('input, select, textarea')).map(i => ({
          tag: i.tagName.toLowerCase(),
          type: (i as HTMLInputElement).type,
          name: (i as HTMLInputElement).name,
          placeholder: (i as HTMLInputElement).placeholder,
        })),
      }));

      // All text containing template tokens (unresolved bindings)
      const allText = document.body.innerText;
      const unresolvedTokens = allText.match(/\{[a-zA-Z0-9_.]+\}/g) || [];

      // Sections / semantic landmarks
      const sections = Array.from(document.querySelectorAll('section, [role="region"], main, nav, footer, header')).map(descEl);

      // Rent Now / Reserve links specifically
      const rentLinks = Array.from(document.querySelectorAll('a')).filter(a =>
        /rent|reserve|checkout/i.test(a.textContent || '') || /rent|reserve|checkout/i.test(a.href)
      ).map(a => ({
        text: (a as HTMLElement).innerText?.trim().slice(0, 60),
        href: (a as HTMLAnchorElement).href,
        class: a.className?.slice(0, 100),
      }));

      return {
        url: location.href,
        title: document.title,
        headings,
        buttons,
        links,
        unitCards,
        prices,
        images,
        forms,
        unresolvedTokens,
        sections,
        rentLinks,
        totalElements: document.querySelectorAll('*').length,
      };
    });

    fs.writeFileSync(path.join(OUT_DIR, '11-live-structure.json'), JSON.stringify(structure, null, 2), 'utf8');

    console.log('\n── Live Page Summary ──');
    console.log('   headings:', structure.headings.length);
    console.log('   buttons:', structure.buttons.length);
    console.log('   links:', structure.links.length);
    console.log('   unit cards:', structure.unitCards.length);
    console.log('   prices:', structure.prices.length);
    console.log('   images:', structure.images.length);
    console.log('   forms:', structure.forms.length);
    console.log('   unresolved tokens:', structure.unresolvedTokens.length, structure.unresolvedTokens.length > 0 ? JSON.stringify(structure.unresolvedTokens) : '(clean)');
    console.log('   rent/reserve links:', structure.rentLinks.length);
    console.log('   sections:', structure.sections.length);
    console.log('   total DOM elements:', structure.totalElements);

    if (structure.rentLinks.length) {
      console.log('\n── Rent/Reserve Links ──');
      for (const rl of structure.rentLinks) {
        console.log(`   [${rl.text}] → ${rl.href}`);
      }
    }

    if (structure.headings.length) {
      console.log('\n── Headings ──');
      for (const h of structure.headings) {
        console.log(`   <${h.tag}> ${h.text}`);
      }
    }

    console.log('\n✅ Live site exploration complete. Artifacts in:', OUT_DIR);
  });
});
