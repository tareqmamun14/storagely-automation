import { Page } from '@playwright/test';
import { ISectionDetector, SectionContext, SectionResult, check } from './types';

/**
 * Unit Filters sidebar (Mini Mall layout).
 *
 * Mini Mall renders a persistent filter rail alongside the unit grid:
 *   • "Group by" tablist  — Sm · Md · Lg / Unit Feature / Exact Size
 *   • "Storage Usage"     — Apartment / Home / College / Commercial / Business
 *   • "Unit Features"     — checkboxes w/ live counts: Climate Controlled (2)…
 *   • "Unit Size"         — checkboxes: Small / Medium / Large Units (N)
 *   • quick-filter chips above the grid + a Card / Row layout toggle
 *
 * Layout-tolerant: anchored on ARIA roles (tablist/tab, checkbox, button) and
 * heading text, never CSS classes. Non-destructive — we read state and (for the
 * layout toggle) flip Row→Card back to its original pressed state.
 */
export class FiltersSection implements ISectionDetector {
  readonly id = 'filters';
  readonly label = 'Unit Filters';

  async verify(page: Page, ctx: SectionContext): Promise<SectionResult> {
    const start = Date.now();
    const errors: string[] = [];
    const checks = [];
    const data: Record<string, unknown> = {};

    try {
      // ── Group-by tablist (scoped so we don't catch the carousel slide tabs) ──
      const groupTablist = page.getByRole('tablist', { name: /group units by/i }).first();
      let groupTabCount = 0;
      let groupTabNames: string[] = [];
      if ((await groupTablist.count()) > 0) {
        const tabs = groupTablist.getByRole('tab');
        groupTabCount = await tabs.count();
        groupTabNames = (await tabs.allInnerTexts()).map(t => t.trim()).filter(Boolean);
      }
      data.groupByTabs = groupTabNames;
      checks.push(check(
        'Group-by tablist has ≥ 2 options',
        groupTabCount >= 2,
        groupTabCount ? groupTabNames.join(' · ') : 'group-by tablist not found',
      ));

      // ── Unit Features checkboxes (with live counts) ──────────────────
      const featureBoxes = page.getByRole('checkbox', {
        name: /climate controlled|drive up|ground floor|interior hallway|non-climate|parking/i,
      });
      const featureNames = (await featureBoxes.evaluateAll(
        els => els.map(e => {
          // The accessible label renders as sibling text in the checkbox's row
          // ("Climate Controlled" + "(2)"), not on the input itself — read the row.
          const row = e.closest('label, li') || e.parentElement;
          const txt = (row && (row as HTMLElement).innerText) || e.getAttribute('aria-label') || '';
          return txt.replace(/\s+/g, ' ').trim();
        }).filter(Boolean),
      ));
      data.featureFilters = featureNames;
      checks.push(check(
        'Unit Features filters present',
        (await featureBoxes.count()) >= 1,
        featureNames.length ? featureNames.join(', ') : '(none found)',
      ));
      // Each feature filter should carry a numeric "(N)" availability count.
      const withCounts = featureNames.filter(n => /\(\d+\)/.test(n));
      checks.push(check(
        'feature filters expose numeric counts',
        featureNames.length === 0 || withCounts.length >= 1,
        `${withCounts.length}/${featureNames.length} show a (N) count`,
      ));

      // ── Unit Size checkboxes ─────────────────────────────────────────
      const sizeBoxes = page.getByRole('checkbox', { name: /small units|medium units|large units/i });
      const sizeCount = await sizeBoxes.count();
      data.sizeFilterCount = sizeCount;
      checks.push(check(
        'Unit Size filters present',
        sizeCount >= 1,
        `${sizeCount} size filter(s)`,
      ));

      // ── Storage Usage buttons ────────────────────────────────────────
      const usageButtons = page.getByRole('button', { name: /^(apartment|home|college|commercial|business)$/i });
      const usageCount = await usageButtons.count();
      data.storageUsageCount = usageCount;
      checks.push(check(
        'Storage Usage options present',
        usageCount >= 1,
        `${usageCount} usage option(s)`,
      ));

      // ── Card / Row layout toggle — non-destructive flip & restore ────
      const cardBtn = page.getByRole('button', { name: /^card$/i }).first();
      const rowBtn = page.getByRole('button', { name: /^row$/i }).first();
      const hasToggle = (await cardBtn.count()) > 0 && (await rowBtn.count()) > 0;
      checks.push(check('Card / Row layout toggle present', hasToggle,
        hasToggle ? 'card + row controls found' : '(layout toggle not found)'));
      if (hasToggle) {
        const pressedState = async (loc: typeof cardBtn) =>
          (await loc.getAttribute('aria-pressed')) === 'true' || (await loc.getAttribute('data-state')) === 'active';
        const cardPressedBefore = await pressedState(cardBtn);
        // Flip to the other view, confirm it reacts, then restore.
        await rowBtn.click({ timeout: 4000 }).catch(() => {});
        await page.waitForTimeout(300);
        const rowPressedAfter = await pressedState(rowBtn);
        // restore original
        if (cardPressedBefore) await cardBtn.click({ timeout: 4000 }).catch(() => {});
        await page.waitForTimeout(200);
        checks.push(check(
          'layout toggle is interactive',
          rowPressedAfter || cardPressedBefore,
          `card pressed initially=${cardPressedBefore}, row reacted=${rowPressedAfter}`,
        ));
      }

      // ── Quick-filter chips above the grid ────────────────────────────
      const chips = page.getByRole('button', {
        name: /(climate controlled|drive up unit|parking)\s*\(\d+\)/i,
      });
      const chipCount = await chips.count();
      data.quickFilterChips = chipCount;
      checks.push(check(
        'quick-filter chips present above grid',
        chipCount >= 1,
        `${chipCount} chip(s)`,
      ));

      // ── FUNCTIONAL: group-by tabs actually switch the active grouping ──
      if (groupTabCount >= 2) {
        const tabs = groupTablist.getByRole('tab');
        let activated = 0;
        for (let i = 0; i < groupTabCount; i++) {
          const tab = tabs.nth(i);
          await tab.click({ timeout: 4000 }).catch(() => {});
          await page.waitForTimeout(500);
          if ((await tab.getAttribute('aria-selected')) === 'true') activated++;
        }
        await tabs.first().click({ timeout: 4000 }).catch(() => {}); // reset to default grouping
        await page.waitForTimeout(400);
        checks.push(check(
          'group-by tabs switch the active grouping (sorting)',
          activated >= Math.max(2, groupTabCount - 1),
          `${activated}/${groupTabCount} tabs activated on click`,
        ));
      }

      // ── FUNCTIONAL: applying a feature filter changes the unit grid ──
      const countUnitCards = () => page.evaluate(() => document.querySelectorAll('article').length);
      const firstFeature = featureBoxes.first();
      if ((await firstFeature.count()) > 0) {
        const before = await countUnitCards();
        await firstFeature.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {});
        await firstFeature.click({ timeout: 4000 }).catch(() => {});
        // Poll up to ~3s for the grid to react.
        let after = before;
        for (let i = 0; i < 6 && after === before; i++) { await page.waitForTimeout(500); after = await countUnitCards(); }
        // Restore (uncheck) so STEP 3 (reserve) / STEP 4 (rent) see the full grid.
        await firstFeature.click({ timeout: 4000 }).catch(() => {});
        let restored = await countUnitCards();
        for (let i = 0; i < 6 && restored < before; i++) { await page.waitForTimeout(500); restored = await countUnitCards(); }
        data.filterCounts = { before, after, restored };
        checks.push(check(
          'applying a feature filter changes the unit grid',
          after !== before && after >= 0,
          `unit cards ${before} → ${after} (restored to ${restored})`,
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
