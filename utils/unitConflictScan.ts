// ============================================
// Shared Unit-Feature Conflict Scan Utility
// ============================================
// Used by:
//   • tests/miniMallFullScan.spec.ts        (per-facility check)
//   • tests/allLocationsScan.spec.ts        (per-facility across all clients)
//
// uiComponents-validation.spec.ts has its own targeted Module 6 that uses
// the same pair list inline; keeping that intact for now to avoid churning a
// passing module — extend this util later if it's worth converging.
// ============================================

import type { Page } from '@playwright/test';

export interface ConflictPair {
  a:    string;
  b:    string;
  note: string;
}

// pair.b MUST be the string that contains pair.a as a substring (or be fully
// independent). The masking logic strips pair.b from the row text BEFORE
// checking for pair.a, preventing "Non-X" from triggering a false "X" hit.
export const CONFLICTING_FEATURE_PAIRS: ConflictPair[] = [
  { a: 'Climate Controlled', b: 'Non-Climate Controlled',
    note: 'A unit cannot be both climate-controlled AND non-climate-controlled' },
  { a: 'Covered',            b: 'Uncovered',
    note: 'A unit cannot be both covered AND uncovered' },
  { a: 'Drive Up',           b: 'Interior Hallway',
    note: 'A unit cannot have both drive-up and interior hallway access' },
  { a: 'Heated',             b: 'Non-Heated',
    note: 'A unit cannot be both heated and non-heated' },
];

export interface ConflictScanResult {
  status: 'passed' | 'failed' | 'skipped';
  conflicts: string[];
  unitsChecked: number;
}

/**
 * Inspects every .listviewrows on the currently-loaded page for contradictory
 * feature labels. Caller is responsible for navigation + page settling.
 */
export async function scanUnitConflicts(page: Page): Promise<ConflictScanResult> {
  await page.waitForSelector('.listviewrows', { timeout: 10_000 }).catch(() => {});
  await page.waitForTimeout(500);

  const unitRows = page.locator('.listviewrows');
  const rowCount = await unitRows.count();
  if (rowCount === 0) {
    return { status: 'skipped', conflicts: [], unitsChecked: 0 };
  }

  const conflicts: string[] = [];

  for (let i = 0; i < rowCount; i++) {
    const row = unitRows.nth(i);
    const rowText = await row.innerText();

    // Build a short identifier for readable error messages
    const dimsEl = row.locator('h2.widthHeight');
    const nameEl = row.locator('.unit-type-listing-name');
    const dims = (await dimsEl.count() > 0)
      ? (await dimsEl.first().innerText()).replace(/WIDTH|DEPTH/gi, '').replace(/\s+/g, ' ').trim()
      : '';
    const name = (await nameEl.count() > 0)
      ? (await nameEl.first().innerText()).replace(/\d{4,}/g, '').trim()
      : '';
    const unitLabel = [dims, name].filter(Boolean).join(' ').trim() || `Row ${i + 1}`;

    for (const pair of CONFLICTING_FEATURE_PAIRS) {
      const escapedB = pair.b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const masked = rowText.replace(new RegExp(escapedB, 'gi'), '[MASKED]');
      if (masked.includes(pair.a) && rowText.includes(pair.b)) {
        conflicts.push(`${unitLabel} — shows "${pair.a}" AND "${pair.b}" simultaneously`);
      }
    }
  }

  return {
    status: conflicts.length > 0 ? 'failed' : 'passed',
    conflicts,
    unitsChecked: rowCount,
  };
}
