/**
 * Discovery spec for Modern Unit Card.
 *
 * Assumes MUC is ALREADY placed on /test (user does this manually).
 * Opens editor, finds the MUC by distinguishing text ("SELF-STORAGE UNIT" +
 * "WEB RATE"), clicks it, and dumps the properties panel contents
 * (controls, labels, values) + the rendered HTML. Used to design the schema.
 *
 * Run: npx playwright test --config=helix/playwright.config.ts --project=discovery
 *      helix/tests/editor/_discovery/modern-unit-card.spec.ts
 */
import { test, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { HelixEditorPage } from '../../../pages/HelixEditorPage';
import { HELIX_EDITOR_URLS } from '../../../configs/urls';

const OUTPUT_DIR = path.join(__dirname, '../../../fixtures/components/discovery');

interface Control {
  tag: string;
  type: string;
  placeholder: string;
  value: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

async function captureRightPanelControls(page: Page, xMin = 900): Promise<Control[]> {
  return page.evaluate((xm) => {
    const labelFor = (el: Element): string => {
      const aria = el.getAttribute('aria-label');
      if (aria) return aria;
      const id = el.getAttribute('id');
      if (id) {
        const lbl = document.querySelector(`label[for="${CSS.escape(id)}"]`);
        if (lbl) return (lbl as HTMLElement).innerText?.trim() || '';
      }
      let walker: HTMLElement | null = el.parentElement;
      let hops = 0;
      while (walker && walker.tagName !== 'BODY' && hops < 6) {
        const lbl = walker.querySelector('label, [class*="label"]');
        if (lbl && lbl !== el) {
          const t = (lbl as HTMLElement).innerText?.trim();
          if (t) return t;
        }
        const firstText = walker.firstChild?.textContent?.trim();
        if (firstText && firstText.length < 80) return firstText;
        walker = walker.parentElement;
        hops++;
      }
      return '';
    };
    const sel = [
      'input', 'select', 'textarea',
      '[role="combobox"]', '[role="switch"]', '[role="slider"]', '[role="tab"]',
      '[contenteditable="true"]',
      'button[aria-haspopup]', 'button[role="checkbox"]',
    ].join(', ');
    const controls = Array.from(document.querySelectorAll(sel));
    const out: any[] = [];
    for (const el of controls) {
      const rect = (el as HTMLElement).getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      if (rect.x < xm) continue;
      out.push({
        tag: el.tagName.toLowerCase(),
        type: (el as HTMLInputElement).type || el.getAttribute('role') || '',
        placeholder: el.getAttribute('placeholder') || '',
        value: (((el as HTMLInputElement).value || (el as HTMLElement).innerText || '') as string).trim().slice(0, 120),
        label: labelFor(el).slice(0, 120),
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        w: Math.round(rect.width),
        h: Math.round(rect.height),
      });
    }
    return out;
  }, xMin);
}

async function captureRightPanelText(page: Page, xMin = 900): Promise<Array<{ text: string; x: number; y: number; tag: string }>> {
  return page.evaluate((xm) => {
    const out: any[] = [];
    const all = Array.from(document.querySelectorAll('label, h2, h3, h4, h5, p, button, span'));
    for (const el of all) {
      const rect = (el as HTMLElement).getBoundingClientRect();
      if (rect.x < xm) continue;
      if (rect.width === 0 || rect.height === 0) continue;
      const txt = (el as HTMLElement).innerText?.trim() || '';
      if (!txt || txt.length > 100 || txt.includes('\n')) continue;
      out.push({ text: txt, x: Math.round(rect.x), y: Math.round(rect.y), tag: el.tagName.toLowerCase() });
    }
    return out;
  }, xMin);
}

test('discovery: Modern Unit Card properties (assumes MUC pre-placed on /test)', async ({ page }) => {
  test.setTimeout(180_000);
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const editor = new HelixEditorPage(page);

  // 1. Open editor on /test page (MUC already placed by user)
  await editor.goto(HELIX_EDITOR_URLS.editor);
  await editor.expectEditorLoaded();
  await editor.expectPreviewLoaded();
  await page.waitForTimeout(2500);

  await page.screenshot({ path: path.join(OUTPUT_DIR, 'muc-01-page-loaded.png'), fullPage: true });

  // 2. Find the MUC's "Rent Now" button — distinct from nav's "Reserve Now".
  //    Per user hint: MUC has both "Rent Now" + "Reserve" buttons.
  //    Clicking the button in the editor preview triggers Helix's section selection.
  const rentNowBtn = editor.previewFrame.getByRole('button', { name: /^rent now$/i }).first();

  const rentCount = await rentNowBtn.count();
  console.log(`\n[discovery] "Rent Now" buttons found in preview: ${rentCount}`);
  if (rentCount === 0) {
    throw new Error(
      'No "Rent Now" button found on /test page — MUC may not be placed. ' +
      'Place it manually then re-run.'
    );
  }

  // Walk up from the button to its data-section-id ancestor — that's the MUC wrapper
  const mucInfo = await rentNowBtn.evaluate(el => {
    let walker: HTMLElement | null = el as HTMLElement;
    while (walker && !walker.getAttribute('data-section-id')) walker = walker.parentElement;
    if (!walker) return null;
    return {
      sectionId: walker.getAttribute('data-section-id'),
      classes: walker.className,
      tag: walker.tagName,
      outerHtmlSnippet: walker.outerHTML.slice(0, 6000),
    };
  });
  console.log(`[discovery] MUC section ID (via Rent Now button ancestor): ${mucInfo?.sectionId}`);

  // 3. Click the Rent Now button to select the MUC.
  //    force: true because Helix's outer overlay (div.absolute.inset-0.z-10)
  //    intercepts pointer events — Playwright's actionability check would otherwise fail.
  await rentNowBtn.scrollIntoViewIfNeeded();
  await rentNowBtn.click({ force: true });
  await page.waitForTimeout(2500);

  await page.screenshot({ path: path.join(OUTPUT_DIR, 'muc-02-selected.png'), fullPage: true });

  // 4. Capture properties panel — all controls + visible text in right region
  const controls = await captureRightPanelControls(page);
  const texts = await captureRightPanelText(page);

  // Dedupe text by y-bucket
  const textByY: Record<number, { text: string; x: number; tag: string }> = {};
  for (const t of texts) {
    const bucket = Math.floor(t.y / 8) * 8;
    if (!textByY[bucket] || t.text.length < textByY[bucket].text.length) {
      textByY[bucket] = { text: t.text, x: t.x, tag: t.tag };
    }
  }
  const dedupedTexts = Object.entries(textByY)
    .map(([y, v]) => ({ y: Number(y), ...v }))
    .sort((a, b) => a.y - b.y);

  // 5. Capture full innerText of the right panel (for layout overview)
  const rightPanelInnerText = await page.evaluate(() => {
    const out: string[] = [];
    const all = Array.from(document.querySelectorAll('*'));
    for (const el of all) {
      const rect = (el as HTMLElement).getBoundingClientRect();
      if (rect.x < 900 || rect.x > 1440) continue;
      if (rect.width === 0 || rect.height === 0) continue;
      if (el.children.length === 0) {
        const t = (el as HTMLElement).innerText?.trim();
        if (t && t.length < 100 && !out.includes(t)) out.push(t);
      }
    }
    return out;
  });

  // 6. Dump
  const summary = {
    timestamp: new Date().toISOString(),
    componentName: 'Modern Unit Card',
    viewport: page.viewportSize(),
    mucIdentity: mucInfo,
    counts: {
      controls: controls.length,
      texts: dedupedTexts.length,
      rightPanelLeafText: rightPanelInnerText.length,
    },
    rightPanelControls: controls,
    rightPanelTexts: dedupedTexts,
    rightPanelLeafText: rightPanelInnerText,
  };

  const jsonPath = path.join(OUTPUT_DIR, 'modern-unit-card.discovery.json');
  fs.writeFileSync(jsonPath, JSON.stringify(summary, null, 2));

  console.log(`[discovery] Wrote ${jsonPath}`);
  console.log(`[discovery] Properties panel: ${controls.length} controls, ${dedupedTexts.length} text labels\n`);
});
