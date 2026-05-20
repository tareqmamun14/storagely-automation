import { test } from '@playwright/test';
import { HELIX_EDITOR_URLS } from '../configs/urls';
import { HELIX_EDITOR_CREDENTIALS } from '../configs/credentials';

test.describe('Helix Editor — Watch mode', () => {
  test.setTimeout(600_000); // 10 min — browser stays open

  test('go directly to editor URL, sign in, keep browser open', async ({ page }) => {
    console.log('▶ Navigating directly to editor URL…');
    await page.goto(HELIX_EDITOR_URLS.editor, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
    console.log('   redirected to:', page.url());

    console.log('▶ Filling email + password…');
    await page.locator('input[type="email"]').first().fill(HELIX_EDITOR_CREDENTIALS.email);
    await page.locator('input[type="password"]').first().fill(HELIX_EDITOR_CREDENTIALS.password);

    console.log('▶ Clicking Sign in button…');
    await page.getByRole('button', { name: /sign\s*in/i }).click();

    await page.waitForTimeout(3000);
    console.log('   post-submit url:', page.url());

    console.log('\n⏸  Browser will stay open for 5 minutes so you can see what happened.');
    console.log('   Watch the page — error message or editor content will tell us next steps.\n');

    await page.waitForTimeout(300_000); // 5 minutes
  });
});
