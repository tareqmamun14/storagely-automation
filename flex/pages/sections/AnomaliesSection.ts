import { Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { ISectionDetector, SectionContext, SectionResult, check } from './types';
import { getRentHandoff } from '../../configs/profiles';
import {
  Anomaly, ANOMALY_THRESHOLDS, sourceForCode, anomalySignature, matchKnown, KnownAnomaly,
} from '../../configs/anomalyPolicy';
import { loadBaseline, isNewSignature, fingerprintDrift, updateBaseline, Fingerprint } from '../../reporters/anomalyStore';

/**
 * Anomaly Scan — the "catch unusual things + learn each run" layer. FLEX-ONLY.
 *
 * Complements the expectation-based section detectors: it flags DATA that is
 * implausible/unusual even when it renders (a $0 web rate, a 20'×141' "unit", a
 * rate 20× the median, a web>standard inversion), routes each by likely SOURCE
 * (fms data vs Storagely product vs unknown), and LEARNS — a curated known-list
 * quiets acknowledged quirks to INFO, a local baseline marks each finding
 * new-vs-recurring, and fingerprint drift is surfaced. Only a NEW, unacknowledged
 * PRODUCT-source anomaly fails the run (FMS/unknown are surfaced as info), so the
 * Storagely run stays green on FMS data it doesn't control while still catching
 * genuinely new issues our fixed checks don't cover.
 */
export class AnomaliesSection implements ISectionDetector {
  readonly id = 'anomalies';
  readonly label = 'Anomaly Scan';

  async verify(page: Page, ctx: SectionContext): Promise<SectionResult> {
    const start = Date.now();
    const errors: string[] = [];
    const checks = [];
    const data: Record<string, unknown> = {};

    try {
      const handoff = ctx.handoff ?? getRentHandoff(ctx.client);

      // ── Extract per-unit numbers (dims + web/standard rate) from the grid ──
      const facts = await page.evaluate(({ hrefContains }) => {
        const clean = (t: string) => (t || '').replace(/\s+/g, ' ').trim();
        const num = (s: string) => parseFloat((s || '').replace(/[^0-9.]/g, ''));
        // Real Rent CTAs only (skip the invisible full-card aria-hidden overlay).
        const links = Array.from(document.querySelectorAll<HTMLAnchorElement>(`a[href*="${hrefContains}"]:not([aria-hidden="true"])`));
        const seen = new Set<HTMLElement>();
        const units: Array<{ size: string; w: number; h: number; sqft: number | null; web: number | null; standard: number | null }> = [];
        for (const link of links) {
          // Climb to the card root (holds a $ and a dimension; stop before spanning cards).
          let cur: HTMLElement | null = link, root: HTMLElement | null = null;
          for (let i = 0; i < 15 && cur; i++) {
            const t = cur.innerText || '';
            if (/\$\s*\d/.test(t) && /\d{1,3}\s*['′]?\s*[x×]\s*\d{1,3}/i.test(t)) root = cur;
            if (Array.from(cur.querySelectorAll(`a[href*="${hrefContains}"]:not([aria-hidden="true"])`)).length > 1) break;
            cur = cur.parentElement;
          }
          if (!root || seen.has(root)) continue;
          seen.add(root);
          const txt = clean(root.innerText);
          const dimM = txt.match(/(\d{1,3})\s*['′]?\s*[x×]\s*(\d{1,3})/i);
          const w = dimM ? parseInt(dimM[1], 10) : 0;
          const h = dimM ? parseInt(dimM[2], 10) : 0;
          const sqM = txt.match(/(\d{2,6})\s*sq\.?\s*ft/i);
          // Prefer LABELED rates ("WEB RATE $X" / "STANDARD RATE $Y").
          const webM = txt.match(/web rate\s*\$?\s*([\d,]+(?:\.\d{2})?)/i);
          const stdM = txt.match(/standard rate\s*\$?\s*([\d,]+(?:\.\d{2})?)/i);
          let web: number | null = webM ? num(webM[1]) : null;
          let standard: number | null = stdM ? num(stdM[1]) : null;
          // Fallback: struck price = standard (regular), first non-struck = web.
          if (web == null || standard == null) {
            const leaves = Array.from(root.querySelectorAll<HTMLElement>('*'))
              .filter(e => e.children.length === 0 && /\$\s?\d/.test(e.textContent || ''));
            for (const e of leaves) {
              const m = (e.textContent || '').match(/\$\s?([\d,]+(?:\.\d{2})?)/);
              if (!m) continue;
              const v = num(m[1]);
              const struck = (getComputedStyle(e).textDecorationLine || '').includes('line-through') || e.tagName === 'DEL' || e.tagName === 'S';
              if (struck && standard == null) standard = v;
              else if (!struck && web == null) web = v;
            }
          }
          units.push({ size: dimM ? `${w}x${h}` : '?', w, h, sqft: sqM ? parseInt(sqM[1], 10) : null, web, standard });
        }
        return { units };
      }, { hrefContains: handoff.hrefContains });

      const units = facts.units;
      data.unitCount = units.length;
      data.units = units.slice(0, 8);

      const found: Anomaly[] = [];
      const push = (code: string, message: string, context: string) =>
        found.push({ code, message, context, source: sourceForCode(code), status: 'new' });

      // ── Intrinsic plausibility rules ──
      const T = ANOMALY_THRESHOLDS;
      for (const u of units) {
        if (u.web != null && u.web <= 0) push('zero-price', `${u.size}: web rate is $${u.web}/mo`, u.size);
        if (u.standard != null && u.standard <= 0) push('zero-price', `${u.size}: standard rate is $${u.standard}/mo`, u.size);
        if (u.web != null && u.web < 0) push('negative-price', `${u.size}: negative web rate $${u.web}`, u.size);
        if (u.standard != null && u.standard > T.maxMonthlyRate) push('extreme-price', `${u.size}: standard rate $${u.standard}/mo exceeds $${T.maxMonthlyRate}`, u.size);
        if (u.web != null && u.standard != null && u.web > 0 && u.standard > 0 && u.web > u.standard)
          push('price-inversion', `${u.size}: web $${u.web} > standard $${u.standard}`, u.size);
        if ((u.w > T.maxUnitSideFt || u.h > T.maxUnitSideFt || (u.w * u.h) > T.maxUnitAreaSqFt) && u.w > 0 && u.h > 0)
          push('extreme-dimensions', `${u.size}: implausible unit size (${u.w}'×${u.h}' = ${u.w * u.h} sq ft)`, u.size);
      }
      // Statistical price outliers (relative to the run's own median).
      const stds = units.map(u => u.standard).filter((v): v is number => v != null && v > 0).sort((a, b) => a - b);
      if (stds.length >= T.minUnitsForOutlier) {
        const median = stds[Math.floor(stds.length / 2)];
        for (const u of units) {
          if (u.standard != null && median > 0 && u.standard > median * T.priceOutlierFactor)
            push('price-outlier', `${u.size}: standard $${u.standard} is ${(u.standard / median).toFixed(1)}× the median $${median}`, u.size);
        }
      }
      if (units.length === 0 && ctx.client) push('empty-inventory', 'no unit cards detected on the page', '');

      // De-dupe identical (code+context) findings.
      const uniq = new Map<string, Anomaly>();
      for (const a of found) uniq.set(`${a.code}:${a.context}`, a);
      const anomalies = [...uniq.values()];

      // ── Classify: known-list (acknowledged) → else new/recurring via baseline ──
      const known = loadKnownAnomalies();
      const baseline = loadBaseline(ctx.facilityId);
      const signatures: string[] = [];
      for (const a of anomalies) {
        const sig = anomalySignature(ctx.client, a.code, a.context);
        signatures.push(sig);
        const ack = matchKnown(known, ctx.client, a.code);
        if (ack) {
          a.status = 'acknowledged';
          a.source = ack.source || a.source;
          a.note = ack.note;
        } else {
          a.status = isNewSignature(baseline, sig) ? 'new' : 'recurring';
        }
      }

      // ── Drift vs prior runs (info) ──
      const fingerprint: Fingerprint = {
        unitCount: units.length,
        medianStandard: stds.length ? stds[Math.floor(stds.length / 2)] : null,
        at: new Date().toISOString(),
      };
      const drift = fingerprintDrift(baseline, fingerprint, T.countDriftFraction);

      data.anomalies = anomalies;
      data.drift = drift || undefined;

      // ── Report ──
      const byStatus = (s: string) => anomalies.filter(a => a.status === s);
      const fmt = (a: Anomaly) => `[${a.source}${a.status === 'acknowledged' ? '/known' : a.status === 'new' ? '/NEW' : ''}] ${a.message}`;

      // Gate: only a NEW-or-recurring, UNACKNOWLEDGED, PRODUCT-source anomaly fails.
      // FMS + unknown are surfaced as info (Storagely doesn't own FMS data; unknown
      // needs human triage, not an auto-fail that would nag as a false flag).
      const blocking = anomalies.filter(a => a.source === 'product' && a.status !== 'acknowledged');
      checks.push(check(
        'no NEW unexplained product-side anomalies',
        blocking.length === 0,
        blocking.length ? blocking.map(fmt).join('; ') : 'none',
        blocking.length ? 'A data anomaly looks Storagely-side and isn’t acknowledged — triage it, then fix or add to flex/configs/known-anomalies.json' : undefined,
      ));

      // Everything else: informational, categorized (surfaced so the team sees it).
      const info = anomalies.filter(a => !blocking.includes(a));
      const newInfo = info.filter(a => a.status === 'new');
      checks.push(check(
        'data anomalies surfaced (info — categorized by source)',
        true,
        anomalies.length === 0
          ? 'no anomalies detected'
          : `${anomalies.length} anomaly(ies): ${info.slice(0, 8).map(fmt).join('; ')}${info.length > 8 ? ` … +${info.length - 8}` : ''}`
            + (newInfo.length ? `  ·  ${newInfo.length} NEW (triage)` : ''),
      ));
      if (drift) {
        checks.push(check('facility fingerprint drift (info)', true, drift));
      }

      // ── Learn: persist this run's signatures + fingerprint (best-effort) ──
      updateBaseline(baseline, signatures, fingerprint);
    } catch (err) {
      errors.push((err as Error).message);
    }

    return {
      sectionId: this.id,
      facilityId: ctx.facilityId,
      facilityName: ctx.facilityName,
      url: ctx.url,
      present: true,
      checks,
      data,
      durationMs: Date.now() - start,
      errors: errors.length ? errors : undefined,
    };
  }
}

/** Load the committed, curated known-anomalies list (best-effort). */
function loadKnownAnomalies(): KnownAnomaly[] {
  try {
    const file = path.resolve(__dirname, '..', '..', 'configs', 'known-anomalies.json');
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    return Array.isArray(parsed.acknowledged) ? parsed.acknowledged : [];
  } catch {
    return [];
  }
}
