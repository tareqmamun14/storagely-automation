import { Page, expect, FrameLocator } from '@playwright/test';

export class FlexEditorPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(url: string) {
    // Local DNS for sites.apps.mystoragely.com can be flaky — retry on resolver errors.
    let lastErr: unknown;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
        await this.page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
        await this.page.waitForTimeout(2000);
        return;
      } catch (e) {
        lastErr = e;
        const msg = (e as Error).message || '';
        if (!msg.includes('ERR_NAME_NOT_RESOLVED') && !msg.includes('ERR_CONNECTION')) throw e;
        console.log(`[editor.goto] attempt ${attempt} hit ${msg.split('\n')[0]} — retrying in 4s`);
        await this.page.waitForTimeout(4000);
      }
    }
    throw lastErr;
  }

  async expectEditorLoaded() {
    await this.page.waitForURL(/editor/i, { timeout: 30_000 });
    await expect(this.page.locator('h3').first()).toBeVisible({ timeout: 15_000 });
  }

  // ── Preview iframe ──

  get previewFrame(): FrameLocator {
    return this.page.frameLocator('iframe').first();
  }

  async expectPreviewLoaded() {
    const body = this.previewFrame.locator('body');
    await expect(body).toBeVisible({ timeout: 20_000 });
  }

  async getPreviewText(): Promise<string> {
    return this.previewFrame.locator('body').innerText();
  }

  async expectNoUnresolvedTokensInPreview() {
    const text = await this.getPreviewText();
    const tokens = text.match(/\{[a-zA-Z0-9_.]+\}/g) || [];
    expect(tokens, `Unresolved tokens in preview: ${tokens.join(', ')}`).toHaveLength(0);
  }

  // ── Sidebar tabs ──

  async clickSidebarTab(tabName: string) {
    const tab = this.page.locator(`button[title="${tabName}"]`);
    await expect(tab).toBeVisible({ timeout: 10_000 });
    await tab.click();
    await this.page.waitForTimeout(500);
  }

  async getActiveSidebarTab(): Promise<string | null> {
    const tab = this.page.locator('button[class*="shadow-sm"][class*="text-blue"]').first();
    if (await tab.count() === 0) return null;
    return tab.getAttribute('title');
  }

  async getAllSidebarTabs(): Promise<string[]> {
    const tabs = this.page.locator('button[title]').filter({
      has: this.page.locator('svg'),
    });
    const count = await tabs.count();
    const names: string[] = [];
    for (let i = 0; i < count; i++) {
      const rect = await tabs.nth(i).boundingBox();
      if (rect && rect.y > 50 && rect.y < 120 && rect.x < 250) {
        const title = await tabs.nth(i).getAttribute('title');
        if (title) names.push(title);
      }
    }
    return names;
  }

  // ── Component palette ──

  async getPaletteCategories(): Promise<string[]> {
    await this.clickSidebarTab('Components');
    const h3s = this.page.locator('h3');
    const count = await h3s.count();
    const names: string[] = [];
    for (let i = 0; i < count; i++) {
      const text = (await h3s.nth(i).innerText()).trim();
      if (text && text.length < 30) names.push(text);
    }
    return names;
  }

  async getPaletteComponents(categoryName: string): Promise<string[]> {
    return this.page.evaluate((catName) => {
      const h3s = Array.from(document.querySelectorAll('h3'));
      const target = h3s.find(h => h.innerText.trim().toUpperCase() === catName.toUpperCase());
      if (!target) return [];
      const items: string[] = [];
      let el = target.nextElementSibling;
      while (el && el.tagName !== 'H3') {
        const children = Array.from(el.querySelectorAll('[class*="text-"]'));
        if (children.length) {
          for (const child of children) {
            const t = (child as HTMLElement).innerText?.trim();
            if (t && t.length < 50 && !t.includes('\n') && !items.includes(t)) items.push(t);
          }
        } else {
          const t = (el as HTMLElement).innerText?.trim();
          if (t && t.length < 50 && !t.includes('\n') && !items.includes(t)) items.push(t);
        }
        el = el.nextElementSibling;
      }
      return items;
    }, categoryName);
  }

  async getFullPalette(): Promise<Array<{ name: string; components: string[] }>> {
    const categories = await this.getPaletteCategories();
    const result: Array<{ name: string; components: string[] }> = [];
    for (const cat of categories) {
      const components = await this.getPaletteComponents(cat);
      result.push({ name: cat, components });
    }
    return result;
  }

  // ── Component interaction ──

  /**
   * Drag a palette item onto the preview canvas using manual mouse events.
   * Playwright's `dragTo` is unreliable here because Flex puts an overlay
   * shield (div.absolute.inset-0.z-10) over the iframe to capture drag events,
   * and dragTo's stability check treats the overlay as "intercepting pointer events".
   * Manual mouse.move/down/up bypasses that check while still firing the same
   * drag events the editor listens for.
   */
  async dragComponentToCanvas(componentName: string, targetOffset?: { x: number; y: number }) {
    const component = this.page.locator(`text="${componentName}"`).first();
    await expect(component).toBeVisible({ timeout: 10_000 });
    await component.scrollIntoViewIfNeeded();

    const iframe = this.page.locator('iframe').first();
    const iframeBox = await iframe.boundingBox();
    const componentBox = await component.boundingBox();
    if (!iframeBox || !componentBox) throw new Error('Could not measure drag source/target');

    const startX = componentBox.x + componentBox.width / 2;
    const startY = componentBox.y + componentBox.height / 2;
    const endX = iframeBox.x + (targetOffset?.x ?? iframeBox.width / 2);
    const endY = iframeBox.y + (targetOffset?.y ?? iframeBox.height / 2);

    await this.page.mouse.move(startX, startY);
    await this.page.mouse.down();
    // Intermediate moves so React's dragover handler registers each frame
    const steps = 25;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      await this.page.mouse.move(startX + (endX - startX) * t, startY + (endY - startY) * t);
      await this.page.waitForTimeout(15);
    }
    await this.page.mouse.up();
    await this.page.waitForTimeout(2000);
  }

  // ── Utilities ──

  async takeScreenshot(name: string): Promise<string> {
    const p = `flex/test-results/${name}.png`;
    await this.page.screenshot({ path: p, fullPage: true });
    return p;
  }
}
