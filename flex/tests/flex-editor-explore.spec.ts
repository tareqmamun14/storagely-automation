import { test, expect } from '@playwright/test';
import { FLEX_EDITOR_URLS } from '../configs/urls';
import { FLEX_EDITOR_CREDENTIALS } from '../configs/credentials';
import * as fs from 'fs';
import * as path from 'path';

const OUT_DIR = path.join(__dirname, '..', 'test-results', 'explore');

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

test.describe('Flex Editor — Exploration', () => {
  test.setTimeout(180_000);

  test('login + capture editor structure', async ({ page }) => {
    if (!FLEX_EDITOR_CREDENTIALS.password) {
      throw new Error('FLEX_PASSWORD not set — enter password in control panel and re-run.');
    }
    ensureDir(OUT_DIR);

    // 1. Navigate to the login page
    console.log('▶ Step 1: navigating to login page');
    await page.goto(FLEX_EDITOR_URLS.login, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(OUT_DIR, '01-login-page.png'), fullPage: true });
    fs.writeFileSync(path.join(OUT_DIR, '01-login-page.html'), await page.content(), 'utf8');
    console.log('   url:', page.url());
    console.log('   title:', await page.title());

    // 2. Try to identify login form elements with a wide net
    const allInputs = await page.locator('input').all();
    console.log(`   found ${allInputs.length} input(s) on login page:`);
    for (let i = 0; i < allInputs.length; i++) {
      const input = allInputs[i];
      const info = await input.evaluate((el: HTMLInputElement) => ({
        type: el.type, name: el.name, id: el.id,
        placeholder: el.placeholder, ariaLabel: el.getAttribute('aria-label'),
        visible: el.offsetParent !== null,
      }));
      console.log(`     [${i}]`, JSON.stringify(info));
    }
    const allButtons = await page.locator('button, input[type="submit"]').all();
    console.log(`   found ${allButtons.length} button(s):`);
    for (let i = 0; i < allButtons.length; i++) {
      const btn = allButtons[i];
      const info = await btn.evaluate((el: HTMLElement) => ({
        tag: el.tagName, type: (el as HTMLInputElement).type, id: el.id,
        text: (el.innerText || '').trim().slice(0, 60),
        ariaLabel: el.getAttribute('aria-label'),
        visible: el.offsetParent !== null,
      }));
      console.log(`     [${i}]`, JSON.stringify(info));
    }

    // 3. Attempt login using multiple fallback strategies
    console.log('▶ Step 2: filling login form');
    const emailSelectors = [
      'input[type="email"]',
      'input[name="email"]',
      'input[id*="email" i]',
      'input[placeholder*="email" i]',
      'input[autocomplete="username"]',
      'input[autocomplete="email"]',
    ];
    let emailFilled = false;
    for (const sel of emailSelectors) {
      const loc = page.locator(sel).first();
      if (await loc.count() && await loc.isVisible().catch(() => false)) {
        await loc.fill(FLEX_EDITOR_CREDENTIALS.email);
        console.log('   email filled via:', sel);
        emailFilled = true;
        break;
      }
    }
    if (!emailFilled) {
      // fallback: first text/email input
      const first = page.locator('input').filter({ hasNot: page.locator('[type="hidden"]') }).first();
      await first.fill(FLEX_EDITOR_CREDENTIALS.email);
      console.log('   email filled via fallback (first visible input)');
    }

    // Some apps have a 2-step login: email first, then submit/continue button reveals password
    await page.waitForTimeout(500);

    const passwordSelectors = [
      'input[type="password"]',
      'input[name="password"]',
      'input[autocomplete="current-password"]',
    ];
    let passwordFilled = false;
    for (const sel of passwordSelectors) {
      const loc = page.locator(sel).first();
      if (await loc.count() && await loc.isVisible().catch(() => false)) {
        await loc.fill(FLEX_EDITOR_CREDENTIALS.password);
        console.log('   password filled via:', sel);
        passwordFilled = true;
        break;
      }
    }
    if (!passwordFilled) {
      // Maybe 2-step. Click "next/continue" first.
      console.log('   no password field visible — looking for continue button (2-step login?)');
      const continueBtn = page.getByRole('button', { name: /continue|next|submit/i }).first();
      if (await continueBtn.count()) {
        await continueBtn.click();
        await page.waitForTimeout(2000);
        for (const sel of passwordSelectors) {
          const loc = page.locator(sel).first();
          if (await loc.count() && await loc.isVisible().catch(() => false)) {
            await loc.fill(FLEX_EDITOR_CREDENTIALS.password);
            console.log('   password filled (2-step) via:', sel);
            passwordFilled = true;
            break;
          }
        }
      }
    }
    if (!passwordFilled) {
      throw new Error('Could not find password input — see 01-login-page.html for DOM');
    }

    await page.screenshot({ path: path.join(OUT_DIR, '02-login-filled.png'), fullPage: true });

    // 4. Submit
    console.log('▶ Step 3: submitting login form');
    const submitCandidates = [
      page.getByRole('button', { name: /^submit$/i }),
      page.getByRole('button', { name: /log\s*in/i }),
      page.getByRole('button', { name: /sign\s*in/i }),
      page.locator('button[type="submit"]'),
      page.locator('input[type="submit"]'),
    ];
    let submitted = false;
    for (const cand of submitCandidates) {
      if (await cand.count() && await cand.first().isVisible().catch(() => false)) {
        await cand.first().click();
        console.log('   submit clicked');
        submitted = true;
        break;
      }
    }
    if (!submitted) throw new Error('Could not find submit button');

    // 5. Wait for login to complete
    console.log('▶ Step 4: waiting for login redirect');
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(3000);
    console.log('   post-login url:', page.url());
    console.log('   post-login title:', await page.title());

    await page.screenshot({ path: path.join(OUT_DIR, '03-after-login.png'), fullPage: true });
    fs.writeFileSync(path.join(OUT_DIR, '03-after-login.html'), await page.content(), 'utf8');

    // If we landed somewhere generic, navigate to the editor URL
    if (!/editor|dashboard|websites/i.test(page.url())) {
      console.log('▶ Step 5: navigating directly to editor');
      await page.goto(FLEX_EDITOR_URLS.editor, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(3000);
    } else {
      console.log('▶ Step 5: navigating from dashboard to editor');
      await page.goto(FLEX_EDITOR_URLS.editor, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(3000);
    }

    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(2000);
    console.log('   editor url:', page.url());
    console.log('   editor title:', await page.title());

    await page.screenshot({ path: path.join(OUT_DIR, '04-editor.png'), fullPage: true });
    fs.writeFileSync(path.join(OUT_DIR, '04-editor.html'), await page.content(), 'utf8');

    // 6. Dump editor structure summary
    console.log('▶ Step 6: capturing editor structure');
    const summary = await page.evaluate(() => {
      function describe(el: Element): any {
        const r = el.getBoundingClientRect();
        return {
          tag: el.tagName.toLowerCase(),
          id: el.id || undefined,
          class: el.className && typeof el.className === 'string' ? el.className.slice(0, 100) : undefined,
          role: el.getAttribute('role') || undefined,
          ariaLabel: el.getAttribute('aria-label') || undefined,
          dataTestId: el.getAttribute('data-testid') || el.getAttribute('data-test') || undefined,
          text: (el as HTMLElement).innerText ? (el as HTMLElement).innerText.trim().slice(0, 80) : undefined,
          visible: r.width > 0 && r.height > 0,
        };
      }
      const buttons = Array.from(document.querySelectorAll('button')).slice(0, 50).map(describe);
      const links = Array.from(document.querySelectorAll('a')).slice(0, 50).map(a => ({
        ...describe(a),
        href: (a as HTMLAnchorElement).href,
      }));
      const navs = Array.from(document.querySelectorAll('nav, [role="navigation"], aside, header')).slice(0, 20).map(describe);
      const headings = Array.from(document.querySelectorAll('h1, h2, h3')).slice(0, 30).map(describe);
      const iframes = Array.from(document.querySelectorAll('iframe')).map(f => ({
        src: (f as HTMLIFrameElement).src,
        id: f.id, name: f.getAttribute('name'),
      }));
      return { url: location.href, title: document.title, buttons, links, navs, headings, iframes };
    });
    fs.writeFileSync(path.join(OUT_DIR, '05-editor-structure.json'), JSON.stringify(summary, null, 2), 'utf8');
    console.log('   buttons:', summary.buttons.length, 'links:', summary.links.length, 'iframes:', summary.iframes.length);
    console.log('   structure dumped to: flex/test-results/explore/05-editor-structure.json');

    console.log('\n✅ Exploration complete. Artifacts in:', OUT_DIR);
  });
});
