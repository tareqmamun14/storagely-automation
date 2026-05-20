import { test } from '@playwright/test';
import { HELIX_EDITOR_URLS } from '../configs/urls';
import { HELIX_EDITOR_CREDENTIALS } from '../configs/credentials';
import * as fs from 'fs';
import * as path from 'path';

const OUT_DIR = path.join(__dirname, '..', 'test-results', 'explore');

test.describe('Helix Editor — Deep Exploration', () => {
  test.setTimeout(180_000);

  test('login, explore palette, capture component list + preview iframe', async ({ page }) => {
    fs.mkdirSync(OUT_DIR, { recursive: true });

    // Login
    await page.goto(HELIX_EDITOR_URLS.login, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.locator('input[type="email"]').fill(HELIX_EDITOR_CREDENTIALS.email);
    await page.locator('input[type="password"]').fill(HELIX_EDITOR_CREDENTIALS.password);
    await page.getByRole('button', { name: /sign\s*in/i }).click();
    await page.waitForURL(/editor/i, { timeout: 30000 });
    await page.waitForTimeout(2000);

    // Navigate to test page
    await page.goto(HELIX_EDITOR_URLS.editor, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(3000);
    console.log('   editor loaded:', page.url());

    // ── 1. Capture left sidebar — all component categories + items ──
    console.log('\n▶ Capturing component palette…');
    const palette = await page.evaluate(() => {
      const categories: Array<{ name: string; components: string[] }> = [];
      // Category headings are h3 elements, components are below them
      const sidebar = document.querySelector('[class*="sidebar"], [class*="panel"]') ||
                      document.querySelector('.flex.flex-col') ||
                      document.body;

      // Try to find all h3 headings that look like categories
      const h3s = Array.from(document.querySelectorAll('h3'));
      for (const h3 of h3s) {
        const name = h3.innerText.trim();
        if (!name || name.length > 30) continue;
        // Find sibling/following elements until next h3
        const components: string[] = [];
        let el = h3.nextElementSibling;
        while (el && el.tagName !== 'H3') {
          const text = (el as HTMLElement).innerText?.trim();
          if (text && text.length < 50 && !text.includes('\n')) {
            components.push(text);
          } else if (el.children.length) {
            // Check children for component names
            for (const child of Array.from(el.children)) {
              const ct = (child as HTMLElement).innerText?.trim();
              if (ct && ct.length < 50 && !ct.includes('\n')) components.push(ct);
            }
          }
          el = el.nextElementSibling;
        }
        if (components.length > 0) categories.push({ name, components });
      }
      return categories;
    });
    console.log('   categories found:', palette.length);
    for (const cat of palette) {
      console.log(`   [${cat.name}] ${cat.components.join(', ')}`);
    }
    fs.writeFileSync(path.join(OUT_DIR, '20-editor-palette.json'), JSON.stringify(palette, null, 2), 'utf8');

    // ── 2. Capture ALL visible text in sidebar for a raw dump ──
    const sidebarText = await page.evaluate(() => {
      // The sidebar is the narrow left panel. Find it by position.
      const allEls = Array.from(document.querySelectorAll('*'));
      const leftPanel = allEls.filter(el => {
        const r = el.getBoundingClientRect();
        return r.x < 300 && r.width > 100 && r.width < 350 && r.height > 400;
      }).sort((a, b) => b.getBoundingClientRect().height - a.getBoundingClientRect().height)[0];

      if (!leftPanel) return '(sidebar not found)';
      return (leftPanel as HTMLElement).innerText;
    });
    console.log('\n── Raw sidebar text ──');
    console.log(sidebarText);
    fs.writeFileSync(path.join(OUT_DIR, '21-sidebar-text.txt'), sidebarText, 'utf8');

    // ── 3. Capture the top toolbar icons (tabs at top of sidebar) ──
    const topTabs = await page.evaluate(() => {
      // Look for icon buttons near the top-left of the editor
      const btns = Array.from(document.querySelectorAll('button, [role="tab"]'));
      return btns.filter(b => {
        const r = b.getBoundingClientRect();
        return r.x < 280 && r.y < 120 && r.y > 40 && r.width < 50;
      }).map(b => ({
        ariaLabel: b.getAttribute('aria-label') || undefined,
        title: b.getAttribute('title') || undefined,
        text: (b as HTMLElement).innerText?.trim() || undefined,
        class: b.className?.slice(0, 100),
        active: b.className?.includes('blue') || b.className?.includes('active') || b.getAttribute('aria-selected') === 'true',
        rect: (() => { const r = b.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y) }; })(),
      }));
    });
    console.log('\n── Sidebar tab buttons ──');
    for (const t of topTabs) {
      console.log(`   ${t.active ? '●' : '○'} ${t.ariaLabel || t.title || t.text || '(no label)'} at (${t.rect.x},${t.rect.y})`);
    }
    fs.writeFileSync(path.join(OUT_DIR, '22-sidebar-tabs.json'), JSON.stringify(topTabs, null, 2), 'utf8');

    // ── 4. Capture the preview iframe content (rendered page inside editor) ──
    console.log('\n▶ Capturing preview iframe…');
    const iframes = page.frames();
    console.log('   frames:', iframes.length);
    for (const f of iframes) {
      console.log(`   - ${f.url()}`);
    }

    const previewFrame = page.frameLocator('iframe').first();
    try {
      const previewContent = await previewFrame.locator('body').first().evaluate((body: HTMLElement) => {
        const headings = Array.from(body.querySelectorAll('h1,h2,h3,h4')).map(h => ({
          tag: h.tagName, text: (h as HTMLElement).innerText?.trim().slice(0, 80),
        }));
        const allText = body.innerText;
        const tokens = allText.match(/\{[a-zA-Z0-9_.]+\}/g) || [];
        return { headings, tokenCount: tokens.length, tokens, textLength: allText.length };
      });
      console.log('   preview headings:', previewContent.headings.length);
      for (const h of previewContent.headings) console.log(`      <${h.tag}> ${h.text}`);
      console.log('   tokens in preview:', previewContent.tokenCount, previewContent.tokens.length ? JSON.stringify(previewContent.tokens) : '(none)');
      fs.writeFileSync(path.join(OUT_DIR, '23-preview-content.json'), JSON.stringify(previewContent, null, 2), 'utf8');
    } catch (e) {
      console.log('   ⚠ Could not access preview iframe (cross-origin?):', (e as Error).message?.slice(0, 100));
    }

    // ── 5. Full editor screenshot ──
    await page.screenshot({ path: path.join(OUT_DIR, '24-editor-full.png'), fullPage: true });

    console.log('\n✅ Deep editor exploration complete.');
  });
});
