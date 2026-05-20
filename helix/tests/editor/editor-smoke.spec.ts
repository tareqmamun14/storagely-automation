import { test, expect } from '@playwright/test';
import { HelixEditorPage } from '../../pages/HelixEditorPage';
import { HELIX_EDITOR_URLS } from '../../configs/urls';
import { EDITOR_PALETTE, TOTAL_COMPONENT_COUNT, SIDEBAR_TABS } from '../../configs/components';

test.describe('Editor — Smoke', () => {

  test('editor loads and palette categories are visible', async ({ page }) => {
    const editor = new HelixEditorPage(page);
    await editor.goto(HELIX_EDITOR_URLS.editor);
    await editor.expectEditorLoaded();

    const categories = await editor.getPaletteCategories();
    expect(categories).toEqual(EDITOR_PALETTE.map(c => c.name));
  });

  test(`all ${TOTAL_COMPONENT_COUNT} components present in palette`, async ({ page }) => {
    const editor = new HelixEditorPage(page);
    await editor.goto(HELIX_EDITOR_URLS.editor);
    await editor.expectEditorLoaded();

    const palette = await editor.getFullPalette();
    for (const expected of EDITOR_PALETTE) {
      const actual = palette.find(p => p.name === expected.name);
      expect(actual, `Category "${expected.name}" not found in palette`).toBeTruthy();
      expect(actual!.components).toEqual(expected.components);
    }
  });

  test('preview iframe loads and renders content', async ({ page }) => {
    const editor = new HelixEditorPage(page);
    await editor.goto(HELIX_EDITOR_URLS.editor);
    await editor.expectPreviewLoaded();

    const text = await editor.getPreviewText();
    expect(text.length).toBeGreaterThan(0);
  });

  test('all sidebar tabs are accessible', async ({ page }) => {
    const editor = new HelixEditorPage(page);
    await editor.goto(HELIX_EDITOR_URLS.editor);
    await editor.expectEditorLoaded();

    const tabs = await editor.getAllSidebarTabs();
    for (const expected of SIDEBAR_TABS) {
      expect(tabs, `Tab "${expected}" not found`).toContain(expected);
    }
  });

  test('sidebar tabs are clickable and switch content', async ({ page }) => {
    const editor = new HelixEditorPage(page);
    await editor.goto(HELIX_EDITOR_URLS.editor);
    await editor.expectEditorLoaded();

    for (const tab of SIDEBAR_TABS) {
      await editor.clickSidebarTab(tab);
      await page.waitForTimeout(300);
    }

    await editor.clickSidebarTab('Components');
    const categories = await editor.getPaletteCategories();
    expect(categories.length).toBeGreaterThan(0);
  });

  test('no unresolved tokens in editor preview', async ({ page }) => {
    const editor = new HelixEditorPage(page);
    await editor.goto(HELIX_EDITOR_URLS.editor);
    await editor.expectPreviewLoaded();
    await editor.expectNoUnresolvedTokensInPreview();
  });

});
