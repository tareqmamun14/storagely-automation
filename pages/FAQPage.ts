import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export interface FAQTestResult {
  hasFaqPage: boolean;
  hasAccordion: boolean;
  totalQuestions: number;
  clickedQuestion: string;
  expanded: boolean;
  accordionType: string;
  error?: string;
}

export class FAQPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Try multiple FAQ URL patterns; return the one that works.
  async navigateToFAQPage(baseUrl: string): Promise<void> {
    const base = baseUrl.replace(/\/$/, '');
    const candidates = [
      base + '/self-storage-faq',
      base + '/storage-faqs',
      base + '/pages/self-storage-faq',
    ];

    for (const faqUrl of candidates) {
      console.log(`📞 Trying FAQ page: ${faqUrl}`);
      const resp = await this.page.goto(faqUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await this.page.waitForTimeout(2000);

      const title = await this.page.title();
      const status = resp?.status() ?? 0;

      // Accept if title contains FAQ or status is OK and body has FAQ text
      if (/faq/i.test(title) && status < 400) {
        console.log(`   ✓ Found FAQ page at: ${faqUrl}`);
        return;
      }

      // Also check H1 for FAQ mention
      const h1 = await this.page.locator('h1').first().textContent().catch(() => '');
      if (h1 && /faq/i.test(h1) && status < 400) {
        console.log(`   ✓ Found FAQ page at: ${faqUrl} (H1 match)`);
        return;
      }
    }

    // Last resort: look for FAQ link on the main site and follow it
    console.log(`   ⚠️ No standard FAQ URL worked, checking main site for FAQ link...`);
    await this.page.goto(base, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await this.page.waitForTimeout(1500);
    const faqLink = this.page.locator('a').filter({ hasText: /faq/i }).first();
    if (await faqLink.count() > 0) {
      const href = await faqLink.getAttribute('href');
      if (href) {
        const resolvedUrl = new URL(href, base).toString();
        console.log(`   📎 Found FAQ link: ${resolvedUrl}`);
        await this.page.goto(resolvedUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await this.page.waitForTimeout(2000);
        return;
      }
    }

    // Navigate back to the first candidate so verifyFAQAccordion can report 404
    await this.page.goto(candidates[0], { waitUntil: 'domcontentloaded', timeout: 20000 });
    await this.page.waitForTimeout(1000);
  }

  async verifyFAQAccordion(): Promise<FAQTestResult> {
    const result: FAQTestResult = {
      hasFaqPage: false,
      hasAccordion: false,
      totalQuestions: 0,
      clickedQuestion: '',
      expanded: false,
      accordionType: 'unknown',
    };

    // Check if FAQ page loaded
    const title = await this.page.title();
    const is404 = /not found|404|page doesn't exist/i.test(title);
    if (is404) {
      result.error = 'FAQ page returned 404';
      return result;
    }

    const hasTitle = /faq/i.test(title);
    if (!hasTitle) {
      const h1Text = await this.page.locator('h1').first().textContent().catch(() => '');
      if (!h1Text || !/faq/i.test(h1Text)) {
        result.error = 'FAQ page not found or title does not contain "FAQ"';
        return result;
      }
    }
    result.hasFaqPage = true;
    console.log(`   ✓ FAQ page loaded: "${title}"`);

    // Detect accordion type
    const accordionType = await this.detectAccordionType();
    result.accordionType = accordionType;
    console.log(`   🔍 Accordion type: ${accordionType}`);

    if (accordionType === 'unknown') {
      result.error = 'No recognizable accordion structure found on the page';
      return result;
    }

    result.hasAccordion = true;

    if (accordionType === 'brizy') {
      return await this.testBrizyAccordion(result);
    } else if (accordionType === 'bootstrap') {
      return await this.testBootstrapAccordion(result);
    } else if (accordionType === 'details-summary') {
      return await this.testDetailsSummaryAccordion(result);
    } else {
      return await this.testGenericAccordion(result);
    }
  }

  private async detectAccordionType(): Promise<string> {
    const brzCount = await this.page.locator('.brz-accordion__item').count();
    if (brzCount > 0) return 'brizy';

    // Bootstrap accordion (native Storagely FAQ pages)
    const bsCount = await this.page.locator('.accordion-item').count();
    if (bsCount > 0) return 'bootstrap';

    const detailsCount = await this.page.locator('details').count();
    if (detailsCount > 0) return 'details-summary';

    const genericCount = await this.page.locator(
      '[class*="accordion-item"], [class*="accordion__item"], .faq-item, [class*="faq-item"], [data-toggle="collapse"]'
    ).count();
    if (genericCount > 0) return 'generic';

    return 'unknown';
  }

  // ── Brizy Accordion ──────────────────────────────────────────────────────

  private async testBrizyAccordion(result: FAQTestResult): Promise<FAQTestResult> {
    const items = this.page.locator('.brz-accordion__item');
    const count = await items.count();
    result.totalQuestions = count;

    if (count === 0) {
      result.error = 'No Brizy accordion items found';
      return result;
    }
    console.log(`   ✓ Found ${count} accordion question(s)`);

    // Find first CLOSED item
    let targetIndex = -1;
    for (let i = 0; i < count; i++) {
      const item = items.nth(i);
      const isActive = await item.evaluate(el => el.classList.contains('brz-accordion__item--active'));
      const headerText = await item.locator('.brz-accordion__nav').first().textContent().catch(() => null)
        ?? await item.locator('[class*="accordion__nav"], [class*="accordion__header"]').first().textContent().catch(() => '');
      const label = (headerText || '').trim().substring(0, 70);
      console.log(`   ${isActive ? '📖' : '📕'} Q${i + 1}: "${label}" ${isActive ? '(OPEN)' : '(CLOSED)'}`);
      if (!isActive && targetIndex === -1) {
        targetIndex = i;
      }
    }

    // If all are open, click the 2nd item (or 1st if only one)
    if (targetIndex === -1) {
      targetIndex = count > 1 ? 1 : 0;
      console.log(`   ⚠️ All items appear open — clicking item ${targetIndex + 1} anyway`);
    }

    const targetItem = items.nth(targetIndex);
    const header = targetItem.locator('.brz-accordion__nav').first();
    const headerExists = await header.count();
    const clickTarget = headerExists > 0
      ? header
      : targetItem.locator('[class*="accordion__nav"], [class*="accordion__header"]').first();

    const qText = await clickTarget.textContent().catch(() => '');
    result.clickedQuestion = (qText || '').trim().substring(0, 80) || `Question ${targetIndex + 1}`;
    console.log(`   🖱️  Clicking: "${result.clickedQuestion}"`);

    await clickTarget.click({ force: true });
    await this.page.waitForTimeout(600);

    const isNowActive = await targetItem.evaluate(el => el.classList.contains('brz-accordion__item--active'));
    const contentVisible = await targetItem.locator('.brz-accordion__content, [class*="accordion__content"]')
      .first().isVisible().catch(() => false);

    result.expanded = isNowActive || contentVisible;

    if (result.expanded) {
      console.log(`   ✅ Accordion item expanded successfully`);
    } else {
      console.log(`   ❌ Accordion item did NOT expand after click`);
      result.error = 'Clicked question but it did not expand';
    }

    return result;
  }

  // ── Bootstrap Accordion (native Storagely FAQ pages) ──────────────────────

  private async testBootstrapAccordion(result: FAQTestResult): Promise<FAQTestResult> {
    const items = this.page.locator('.accordion-item');
    const count = await items.count();
    result.totalQuestions = count;

    if (count === 0) {
      result.error = 'No Bootstrap accordion items found';
      return result;
    }
    console.log(`   ✓ Found ${count} Bootstrap accordion question(s)`);

    // Find first COLLAPSED button
    let targetIndex = -1;
    const buttons = this.page.locator('.accordion-button');
    const btnCount = await buttons.count();
    for (let i = 0; i < Math.min(btnCount, 15); i++) {
      const btn = buttons.nth(i);
      const isCollapsed = await btn.evaluate(el => el.classList.contains('collapsed'));
      const text = await btn.textContent().catch(() => '');
      const label = (text || '').trim().substring(0, 70);
      console.log(`   ${isCollapsed ? '📕' : '📖'} Q${i + 1}: "${label}" ${isCollapsed ? '(CLOSED)' : '(OPEN)'}`);
      if (isCollapsed && targetIndex === -1) {
        targetIndex = i;
      }
    }
    if (btnCount > 15) {
      console.log(`   ... and ${btnCount - 15} more questions`);
    }

    if (targetIndex === -1) {
      targetIndex = btnCount > 1 ? 1 : 0;
      console.log(`   ⚠️ All items appear open — clicking item ${targetIndex + 1} anyway`);
    }

    const targetBtn = buttons.nth(targetIndex);
    const qText = await targetBtn.textContent().catch(() => '');
    result.clickedQuestion = (qText || '').trim().substring(0, 80) || `Question ${targetIndex + 1}`;
    console.log(`   🖱️  Clicking: "${result.clickedQuestion}"`);

    await targetBtn.click({ force: true });
    await this.page.waitForTimeout(600);

    // Verify: the button should now NOT have 'collapsed' class,
    // and the corresponding .accordion-collapse should have 'show' class
    const isNowCollapsed = await targetBtn.evaluate(el => el.classList.contains('collapsed'));
    const targetItem = items.nth(targetIndex);
    const collapseDiv = targetItem.locator('.accordion-collapse');
    const hasShow = await collapseDiv.evaluate(el => el.classList.contains('show')).catch(() => false);

    result.expanded = !isNowCollapsed || hasShow;

    if (result.expanded) {
      console.log(`   ✅ Bootstrap accordion item expanded successfully`);
    } else {
      console.log(`   ❌ Bootstrap accordion item did NOT expand after click`);
      result.error = 'Clicked question but it did not expand';
    }

    return result;
  }

  // ── HTML5 <details>/<summary> ─────────────────────────────────────────────

  private async testDetailsSummaryAccordion(result: FAQTestResult): Promise<FAQTestResult> {
    const items = this.page.locator('details');
    const count = await items.count();
    result.totalQuestions = count;

    if (count === 0) {
      result.error = 'No <details> elements found';
      return result;
    }
    console.log(`   ✓ Found ${count} <details> question(s)`);

    let targetIndex = -1;
    for (let i = 0; i < count; i++) {
      const isOpen = await items.nth(i).evaluate(el => (el as HTMLDetailsElement).open);
      const summaryText = await items.nth(i).locator('summary').textContent().catch(() => '');
      const label = (summaryText || '').trim().substring(0, 70);
      console.log(`   ${isOpen ? '📖' : '📕'} Q${i + 1}: "${label}" ${isOpen ? '(OPEN)' : '(CLOSED)'}`);
      if (!isOpen && targetIndex === -1) {
        targetIndex = i;
      }
    }

    if (targetIndex === -1) {
      targetIndex = count > 1 ? 1 : 0;
    }

    const targetItem = items.nth(targetIndex);
    const summary = targetItem.locator('summary');
    const qText = await summary.textContent().catch(() => '');
    result.clickedQuestion = (qText || '').trim().substring(0, 80) || `Question ${targetIndex + 1}`;
    console.log(`   🖱️  Clicking: "${result.clickedQuestion}"`);

    await summary.click();
    await this.page.waitForTimeout(400);

    const isNowOpen = await targetItem.evaluate(el => (el as HTMLDetailsElement).open);
    result.expanded = isNowOpen;

    if (result.expanded) {
      console.log(`   ✅ <details> element expanded successfully`);
    } else {
      result.error = 'Clicked <summary> but <details> did not open';
    }

    return result;
  }

  // ── Generic / aria-expanded fallback ──────────────────────────────────────

  private async testGenericAccordion(result: FAQTestResult): Promise<FAQTestResult> {
    const selectors = [
      '[class*="accordion-item"]',
      '[class*="accordion__item"]',
      '.faq-item',
      '[class*="faq-item"]',
    ];

    let itemsLocator = null;
    let count = 0;
    for (const sel of selectors) {
      const loc = this.page.locator(sel);
      const c = await loc.count();
      if (c > 0) {
        itemsLocator = loc;
        count = c;
        break;
      }
    }

    // Fallback: look for elements with aria-expanded
    if (!itemsLocator || count === 0) {
      const ariaButtons = this.page.locator('[role="button"][aria-expanded], button[aria-expanded]');
      count = await ariaButtons.count();
      if (count > 0) {
        result.totalQuestions = count;
        let targetIndex = -1;
        for (let i = 0; i < count; i++) {
          const expanded = await ariaButtons.nth(i).getAttribute('aria-expanded');
          const text = await ariaButtons.nth(i).textContent().catch(() => '');
          const label = (text || '').trim().substring(0, 70);
          const isOpen = expanded === 'true';
          console.log(`   ${isOpen ? '📖' : '📕'} Q${i + 1}: "${label}" ${isOpen ? '(OPEN)' : '(CLOSED)'}`);
          if (!isOpen && targetIndex === -1) targetIndex = i;
        }
        if (targetIndex === -1) targetIndex = count > 1 ? 1 : 0;

        const target = ariaButtons.nth(targetIndex);
        const qText = await target.textContent().catch(() => '');
        result.clickedQuestion = (qText || '').trim().substring(0, 80) || `Question ${targetIndex + 1}`;
        console.log(`   🖱️  Clicking: "${result.clickedQuestion}"`);
        await target.click();
        await this.page.waitForTimeout(600);

        const newExpanded = await target.getAttribute('aria-expanded');
        result.expanded = newExpanded === 'true';
        if (result.expanded) {
          console.log(`   ✅ Accordion expanded (aria-expanded=true)`);
        } else {
          result.error = 'Clicked button but aria-expanded did not become true';
        }
        return result;
      }

      result.error = 'No recognizable accordion items found with any selector';
      return result;
    }

    result.totalQuestions = count;
    console.log(`   ✓ Found ${count} generic accordion item(s)`);

    const firstItem = itemsLocator.nth(count > 1 ? 1 : 0);
    const clickable = firstItem.locator('button, [role="button"], [class*="header"], [class*="title"], h3, h4, h5, h6').first();
    const qText = await clickable.textContent().catch(() => '');
    result.clickedQuestion = (qText || '').trim().substring(0, 80) || 'Question';
    console.log(`   🖱️  Clicking: "${result.clickedQuestion}"`);

    await clickable.click();
    await this.page.waitForTimeout(600);

    const content = firstItem.locator('[class*="content"], [class*="body"], [class*="answer"], p').first();
    result.expanded = await content.isVisible().catch(() => false);

    if (result.expanded) {
      console.log(`   ✅ Generic accordion expanded`);
    } else {
      result.error = 'Clicked item but content did not become visible';
    }

    return result;
  }
}
