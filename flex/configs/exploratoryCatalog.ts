/**
 * Flex EXPLORATORY PROBE CATALOG. FLEX-ONLY.
 *
 * Fixed checks verify what we already know matters. Exploratory probes widen
 * the net: each run picks a few probes from this catalog (least-recently-run
 * first — see ExploratorySection) and inspects the live page for the
 * nitty-gritty UI / functional / data issues a storage-industry reviewer
 * would look for: click-to-call, rating sanity, local-SEO city matching,
 * teaser-price truth, size/price ladder, mixed content, duplicate meta…
 *
 * POLICY: probes are INFO-ONLY — a probe NEVER fails a run. A probe that
 * spots something returns a `finding`; the reporter prints it as
 * "FINDING: …" and the control panel's Issues dashboard picks it up as a
 * CANDIDATE issue for human triage (real bug → 'informed', bad probe →
 * 'false-flag'). Confirmed repeat offenders graduate into fixed checks.
 * Probes are read-only DOM inspections — they must never click, navigate,
 * or mutate the page (the journey continues on the same tab).
 */
import { Page } from '@playwright/test';

export interface ProbeContext {
  client: string;
  url: string;
  /** Rent-CTA href fragment (from the client profile) — anchors unit-card extraction. */
  hrefContains: string;
}

export interface ProbeResult {
  /** Human sentence when something looks off; null = clean. */
  finding: string | null;
  /** What was inspected / the values seen (always reported). */
  detail: string;
}

export interface ExploratoryProbe {
  id: string;
  title: string;
  /** The industry rationale — WHY this matters on a storage location page. */
  why: string;
  /**
   * GRADUATION, step 1: a probe that proved its worth (caught a real issue /
   * guards something important) runs on EVERY journey instead of rotating.
   * Still info-only. Step 2 (full graduation) = port the logic into the
   * relevant section detector as a hard-fail check and remove it here —
   * that's how the FIXED test pool grows from exploratory findings.
   */
  alwaysRun?: boolean;
  run(page: Page, ctx: ProbeContext): Promise<ProbeResult>;
}

/** Unit-card extraction shared by price/CTA probes (same anchor contract as the Anomaly Scan). */
async function extractUnitCards(page: Page, hrefContains: string): Promise<Array<{
  text: string; rate: number | null; w: number | null; l: number | null;
}>> {
  const texts: string[] = await page.evaluate((frag) => {
    const anchors = Array.from(document.querySelectorAll(`a[href*="${frag}"]:not([aria-hidden="true"])`));
    const roots = new Set<Element>();
    for (const a of anchors) {
      let el: Element | null = a;
      for (let i = 0; i < 8 && el; i++) {
        const t = (el.textContent || '').trim();
        if (t.length > 40 && t.includes('$')) break;
        el = el.parentElement;
      }
      if (el) roots.add(el);
    }
    return Array.from(roots).map(r => (r.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 400));
  }, hrefContains);

  return texts.map(text => {
    const dims = text.match(/(\d+(?:\.\d+)?)\s*['′]?\s*[x×]\s*(\d+(?:\.\d+)?)/i);
    const web = text.match(/web\s*rate\s*\$?\s*([\d,]+(?:\.\d+)?)/i);
    const anyPrice = text.match(/\$\s*([\d,]+(?:\.\d+)?)/);
    const rateRaw = web?.[1] ?? anyPrice?.[1] ?? null;
    return {
      text,
      rate: rateRaw ? parseFloat(rateRaw.replace(/,/g, '')) : null,
      w: dims ? parseFloat(dims[1]) : null,
      l: dims ? parseFloat(dims[2]) : null,
    };
  });
}

function median(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
}

/** /storage-units/<state>/<city>/<street> → { state, city } (dashes → spaces). */
function placeFromUrl(url: string): { state: string | null; city: string | null } {
  try {
    const parts = new URL(url).pathname.split('/').filter(Boolean);
    const i = parts.indexOf('storage-units');
    const state = i >= 0 && parts[i + 1] ? parts[i + 1].replace(/-/g, ' ') : null;
    const city = i >= 0 && parts[i + 2] ? parts[i + 2].replace(/-/g, ' ') : null;
    return { state, city };
  } catch { return { state: null, city: null }; }
}

const STATE_ABBREV: Record<string, string> = {
  'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR', 'california': 'CA',
  'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE', 'florida': 'FL', 'georgia': 'GA',
  'hawaii': 'HI', 'idaho': 'ID', 'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA',
  'kansas': 'KS', 'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
  'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS', 'missouri': 'MO',
  'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ',
  'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH',
  'oklahoma': 'OK', 'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT', 'vermont': 'VT',
  'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV', 'wisconsin': 'WI', 'wyoming': 'WY',
};

export const EXPLORATORY_CATALOG: ExploratoryProbe[] = [
  {
    id: 'phone-click-to-call',
    title: 'Phone is click-to-call',
    why: 'Storage renters convert by phone — a rendered number without tel: loses mobile calls.',
    async run(page) {
      const telCount = await page.locator('a[href^="tel:"]').count();
      const body = await page.locator('body').innerText().catch(() => '');
      const rendered = /\(\d{3}\)\s*\d{3}[-.\s]?\d{4}|\d{3}[-.\s]\d{3}[-.\s]\d{4}/.test(body);
      if (telCount > 0) {
        const href = await page.locator('a[href^="tel:"]').first().getAttribute('href').catch(() => null);
        const digits = (href || '').replace(/\D/g, '');
        const sane = digits.length >= 10 && digits.length <= 11;
        return {
          finding: sane ? null : `tel: link present but number looks malformed (${href})`,
          detail: `${telCount} tel: link(s); first = ${href}`,
        };
      }
      return {
        finding: rendered ? 'phone number rendered as plain text — no tel: click-to-call link' : null,
        detail: rendered ? 'phone text found, 0 tel: anchors' : 'no phone text rendered (n/a)',
      };
    },
  },
  {
    id: 'rating-consistency',
    title: 'Star rating sane + consistent',
    why: 'Ratings drive trust; a rating >5, or two widgets disagreeing, reads as broken data.',
    async run(page) {
      const body = await page.locator('body').innerText().catch(() => '');
      const seen: Array<{ r: number; n: number }> = [];
      for (const m of body.matchAll(/(\d(?:\.\d)?)\s*\(\s*(\d[\d,]*)\s*(?:reviews?|Google reviews?)?\s*\)/gi)) {
        const r = parseFloat(m[1]); const n = parseInt(m[2].replace(/,/g, ''), 10);
        if (r >= 0 && r <= 9 && n >= 0 && n < 1_000_000) seen.push({ r, n });
      }
      if (!seen.length) return { finding: null, detail: 'no rating(count) pattern rendered (n/a)' };
      const bad = seen.filter(s => s.r > 5 || s.r < 0);
      const ratings = [...new Set(seen.map(s => s.r))];
      const spread = Math.max(...ratings) - Math.min(...ratings);
      if (bad.length) return { finding: `rating out of 0–5 bounds: ${bad.map(b => b.r).join(', ')}`, detail: JSON.stringify(seen.slice(0, 4)) };
      if (ratings.length > 1 && spread > 0.31) {
        return { finding: `page shows disagreeing ratings: ${ratings.join(' vs ')}`, detail: JSON.stringify(seen.slice(0, 4)) };
      }
      return { finding: null, detail: `rating=${ratings[0]} · ${seen.length} display(s) agree` };
    },
  },
  {
    id: 'h1-single',
    title: 'Exactly one <h1>',
    why: 'Location pages live on local SEO; multiple/missing h1 dilutes the page topic.',
    async run(page) {
      const n = await page.locator('h1').count();
      return { finding: n === 1 ? null : `${n} <h1> elements (expected exactly 1)`, detail: `h1 count = ${n}` };
    },
  },
  {
    id: 'canonical-url',
    title: 'Canonical tag matches page',
    why: 'A missing/mismatched canonical splits ranking signal across duplicate URLs.',
    async run(page, ctx) {
      const href = await page.locator('link[rel="canonical"]').first().getAttribute('href').catch(() => null);
      if (!href) return { finding: 'no <link rel="canonical"> on the page', detail: 'canonical missing' };
      const norm = (u: string) => { try { const x = new URL(u, ctx.url); return (x.host + x.pathname).replace(/\/$/, '').toLowerCase(); } catch { return u; } };
      const match = norm(href) === norm(ctx.url);
      return { finding: match ? null : `canonical points elsewhere: ${href}`, detail: `canonical = ${href}` };
    },
  },
  {
    id: 'meta-description',
    title: 'Meta description present + sized',
    why: 'The SERP snippet for “storage units in <city>” comes from this tag; too short/long gets rewritten.',
    async run(page) {
      const content = await page.locator('meta[name="description"]').first().getAttribute('content').catch(() => null);
      if (!content) return { finding: 'meta description missing', detail: 'no <meta name="description">' };
      const len = content.trim().length;
      const ok = len >= 50 && len <= 170;
      return { finding: ok ? null : `meta description length ${len} (healthy: 50–170)`, detail: `${len} chars: "${content.trim().slice(0, 80)}…"` };
    },
  },
  {
    id: 'title-city-match',
    title: 'Title/H1 name the city',
    why: 'Renters search “storage units <city>” — the city must appear in title or H1 to rank locally.',
    async run(page, ctx) {
      const { city } = placeFromUrl(ctx.url);
      if (!city) return { finding: null, detail: 'no city segment in URL (n/a)' };
      const title = (await page.title().catch(() => '')) || '';
      const h1 = (await page.locator('h1').first().innerText().catch(() => '')) || '';
      const hay = `${title} ${h1}`.toLowerCase();
      const hit = hay.includes(city.toLowerCase());
      return {
        finding: hit ? null : `city "${city}" (from URL) appears in neither <title> nor <h1>`,
        detail: `city="${city}" · title="${title.slice(0, 60)}" · h1="${h1.slice(0, 40)}"`,
      };
    },
  },
  {
    id: 'address-state-consistency',
    title: 'Address matches URL state',
    why: 'URL says one state, page shows another → wrong-facility data wiring (real incidents happen on migrations).',
    async run(page, ctx) {
      const { state } = placeFromUrl(ctx.url);
      if (!state) return { finding: null, detail: 'no state segment in URL (n/a)' };
      const abbrev = STATE_ABBREV[state.toLowerCase()];
      const body = await page.locator('body').innerText().catch(() => '');
      const hit = body.toLowerCase().includes(state.toLowerCase()) ||
        (abbrev ? new RegExp(`\\b${abbrev}\\b`).test(body) : false);
      return {
        finding: hit ? null : `URL state "${state}" (${abbrev || '?'}) not found anywhere in the page text`,
        detail: `state="${state}" abbrev=${abbrev || '—'} present=${hit}`,
      };
    },
  },
  {
    id: 'teaser-price-truth',
    title: '“From $X” teaser is honest',
    why: 'A “From $29” hero above units that start at $60 is a bait complaint (and often a stale cache).',
    async run(page, ctx) {
      // HERO-scoped only: unit CARDS legitimately carry their own
      // "Starting at $X" (that price is unit-scoped, not a page claim) —
      // observed false-positive on Mini Mall Carroll (2026-07-17). Only a
      // teaser in the top-of-page hero region makes a page-level promise.
      const teaser = await page.evaluate(() => {
        for (const el of Array.from(document.querySelectorAll<HTMLElement>('h1, h2, h3, h4, p, span, div'))) {
          if (el.childElementCount > 0) continue; // leaf text nodes only
          const t = (el.innerText || '').trim();
          const m = t.match(/(?:from|starting at)\s*\$\s*(\d[\d,]*(?:\.\d+)?)/i);
          if (!m) continue;
          // Skip prices INSIDE a unit card (ancestor holding dims + $) — those
          // are unit-scoped, even when a featured card sits in the hero.
          let anc = el.parentElement; let inCard = false;
          for (let i = 0; i < 6 && anc; i++) {
            const at = anc.innerText || '';
            if (/\d{1,3}\s*['′]?\s*[x×]\s*\d{1,3}/.test(at) && at.includes('$')) { inCard = true; break; }
            anc = anc.parentElement;
          }
          if (inCard) continue;
          const top = el.getBoundingClientRect().top + window.scrollY;
          if (top < 1200) return { amount: m[1], top: Math.round(top), text: t.slice(0, 60) };
        }
        return null;
      });
      if (!teaser) return { finding: null, detail: 'no page-level From-$ teaser in the hero region (per-card "Starting at" prices are unit-scoped — n/a)' };
      const t = parseFloat(teaser.amount.replace(/,/g, ''));
      const rates = (await extractUnitCards(page, ctx.hrefContains)).map(c => c.rate).filter((r): r is number => r != null && r > 0);
      if (!rates.length) return { finding: null, detail: `teaser $${t} but no unit rates extracted (n/a)` };
      const min = Math.min(...rates);
      const ok = Math.abs(min - t) <= 1 || t <= min;
      return {
        finding: ok ? null : `teaser says From $${t} but cheapest listed unit is $${min}`,
        detail: `teaser=$${t} · cheapest listed=$${min} · ${rates.length} priced units`,
      };
    },
  },
  {
    id: 'unit-cta-coverage',
    title: 'Every unit card has a CTA',
    why: 'A card with no Rent/Reserve/Call path is dead inventory — renters bounce.',
    async run(page, ctx) {
      const cards = await extractUnitCards(page, ctx.hrefContains);
      if (!cards.length) return { finding: null, detail: 'no unit cards extracted (n/a)' };
      const missing = cards.filter(c => !/rent|reserve|waitlist|call|hold/i.test(c.text));
      return {
        finding: missing.length ? `${missing.length}/${cards.length} unit card(s) show no Rent/Reserve/Call CTA text` : null,
        detail: `${cards.length} cards · ${cards.length - missing.length} with CTA`,
      };
    },
  },
  {
    id: 'image-alt-coverage',
    title: 'Content images carry alt text',
    why: 'Alt text is image-SEO + accessibility; template imgs missing alt usually means a binding gap.',
    async run(page) {
      const r = await page.evaluate(() => {
        const imgs = Array.from(document.querySelectorAll('img')).filter(im => {
          const b = im.getBoundingClientRect();
          return b.width >= 80 && b.height >= 80 && !im.closest('[aria-hidden="true"]');
        }).slice(0, 20);
        const missing = imgs.filter(im => !(im.getAttribute('alt') || '').trim());
        return { total: imgs.length, missing: missing.length, sample: missing[0]?.getAttribute('src')?.slice(-60) || '' };
      });
      if (!r.total) return { finding: null, detail: 'no content-size images sampled (n/a)' };
      return {
        finding: r.missing ? `${r.missing}/${r.total} sampled content images have empty/missing alt (e.g. …${r.sample})` : null,
        detail: `sampled ${r.total} images ≥80px · ${r.total - r.missing} with alt`,
      };
    },
  },
  {
    id: 'mixed-content',
    title: 'No http:// assets on https page',
    why: 'Mixed content gets blocked by the browser — images/scripts silently vanish for customers.',
    async run(page) {
      const r = await page.evaluate(() => {
        if (location.protocol !== 'https:') return { n: 0, first: '' };
        const bad = Array.from(document.querySelectorAll('img[src^="http://"], script[src^="http://"], link[href^="http://"], iframe[src^="http://"]'));
        return { n: bad.length, first: (bad[0]?.getAttribute('src') || bad[0]?.getAttribute('href') || '').slice(0, 80) };
      });
      return { finding: r.n ? `${r.n} insecure http:// asset reference(s), e.g. ${r.first}` : null, detail: r.n ? `${r.n} found` : 'clean' };
    },
  },
  {
    id: 'duplicate-meta',
    title: 'No duplicate SEO meta tags',
    why: 'Two og:titles / two canonicals = scrapers and Google pick one at random — usually the wrong one.',
    async run(page) {
      const r = await page.evaluate(() => ({
        desc: document.querySelectorAll('meta[name="description"]').length,
        canonical: document.querySelectorAll('link[rel="canonical"]').length,
        ogTitle: document.querySelectorAll('meta[property="og:title"]').length,
      }));
      const dups = Object.entries(r).filter(([, n]) => n > 1);
      return {
        finding: dups.length ? `duplicate meta tags: ${dups.map(([k, n]) => `${k}×${n}`).join(', ')}` : null,
        detail: `description×${r.desc} canonical×${r.canonical} og:title×${r.ogTitle}`,
      };
    },
  },
  {
    id: 'section-order-integrity',
    title: 'No content renders below the footer',
    why: 'Real incidents (user-reported 2026-07-17): the Google-reviews section rendered UNDER the footer on Elizabethton TN and vanished on Etna OH. Any component drifting below the footer means the page composition broke.',
    alwaysRun: true, // graduated immediately — user-reported bug class, applies to every client
    async run(page) {
      const r = await page.evaluate(() => {
        const footer = (document.querySelector('footer') as HTMLElement | null)
          || Array.from(document.querySelectorAll<HTMLElement>('[class*="footer" i]')).filter(e => e.offsetHeight > 60).pop()
          || null;
        if (!footer) return { hasFooter: false, offenders: [] as string[] };
        // Everything AFTER the footer in document order: later siblings of the
        // footer and of each of its ancestors.
        const queue: Element[] = [];
        let cur: Element | null = footer;
        while (cur && cur.tagName !== 'HTML') {
          let sib = cur.nextElementSibling;
          while (sib) { queue.push(sib); sib = sib.nextElementSibling; }
          cur = cur.parentElement;
        }
        const offenders: string[] = [];
        for (const q of queue) {
          const h = q as HTMLElement;
          const st = getComputedStyle(h);
          // Overlays that legitimately live after the footer (chat widgets,
          // cookie banners) are fixed/sticky — only in-flow CONTENT counts.
          if (st.position === 'fixed' || st.position === 'sticky' || st.display === 'none' || st.visibility === 'hidden') continue;
          if (h.offsetHeight < 80) continue;
          const text = (h.innerText || '').trim();
          if (text.length < 40) continue;
          offenders.push(`<${h.tagName.toLowerCase()}${h.className ? ' .' + String(h.className).split(' ')[0] : ''}> "${text.slice(0, 60)}…" (${h.offsetHeight}px tall)`);
        }
        return { hasFooter: true, offenders: offenders.slice(0, 3) };
      });
      if (!r.hasFooter) return { finding: null, detail: 'no footer element found (n/a — the footer detector owns that)' };
      return {
        finding: r.offenders.length
          ? `${r.offenders.length} content block(s) render BELOW the footer: ${r.offenders.join(' · ')}`
          : null,
        detail: r.offenders.length ? 'page composition/order broke' : 'nothing renders below the footer',
      };
    },
  },
  {
    id: 'size-price-ladder',
    title: 'Bigger units are not cheaper',
    why: 'A 10x10 median under a 5x5 median almost always means a rate-feed mixup, not a promo.',
    async run(page, ctx) {
      const cards = await extractUnitCards(page, ctx.hrefContains);
      const small: number[] = []; const large: number[] = [];
      for (const c of cards) {
        if (c.rate == null || c.rate <= 0 || c.w == null || c.l == null) continue;
        const area = c.w * c.l;
        if (area <= 30) small.push(c.rate);
        else if (area >= 90 && area <= 400) large.push(c.rate);
      }
      if (small.length < 2 || large.length < 2) {
        return { finding: null, detail: `not enough units to compare (small=${small.length}, large=${large.length})` };
      }
      const ms = median(small); const ml = median(large);
      return {
        finding: ms > ml ? `size/price ladder inverted: median small-unit rate $${ms} > median large-unit rate $${ml}` : null,
        detail: `median ≤30sqft = $${ms} (n=${small.length}) · median 90–400sqft = $${ml} (n=${large.length})`,
      };
    },
  },
];
