import { Page } from '@playwright/test';
import { ISectionDetector, SectionContext, SectionResult, check, settleImages } from './types';
import { getRentHandoff } from '../../configs/profiles';

/**
 * Unit list — the highest-value section to test, since it owns the conversion
 * funnel. For each visible unit card we capture:
 *   • dimensions ("5'x5'" / "10' × 10'") and square footage ("25 sq ft")
 *   • features ("Climate-Controlled", "Drive Up Unit")
 *   • promo text ("50% Off 2 Months", "4 Weeks Free")
 *   • the TWO prices (web/intro rate ≤ standard rate)
 *   • Rent CTA target, validated against the client's checkout-handoff contract
 *   • Reserve button presence
 *
 * The Rent CTA + handoff contract are client-specific (see profiles.ts):
 *   • Safeguard → link "Rent Now" → /step-four?unit_id=<int>
 *   • Mini Mall → link "Rent"     → /yardi/start?unit=<int>&type=rent
 *
 * Critical: we DO NOT click the Rent CTA in this section — the checkout flow
 * has its own dedicated test. We verify the V4 → checkout URL contract only.
 */
export class UnitsSection implements ISectionDetector {
  readonly id = 'units';
  readonly label = 'Unit List';

  async verify(page: Page, ctx: SectionContext): Promise<SectionResult> {
    const start = Date.now();
    const errors: string[] = [];
    const checks = [];
    const data: Record<string, unknown> = {};

    try {
      const handoff = ctx.handoff ?? getRentHandoff(ctx.client);

      // Wait until at least one Rent CTA appears — guards against lazy-rendered grids.
      await page.getByRole('link', { name: handoff.rentLinkText }).first()
        .waitFor({ state: 'visible', timeout: 15_000 })
        .catch(() => { /* unit grid may legitimately be empty — keep going */ });

      // Trigger every lazy unit-card image to fetch and wait for it to settle,
      // so the per-card "image loaded" check below doesn't false-flag below-the-
      // fold cards that simply hadn't loaded yet.
      await settleImages(page);

      const parsed = await page.evaluate(({ textSrc, textFlags, pathSrc, pathFlags }) => {
        const rentTextRe = new RegExp(textSrc, textFlags);
        const rentPathRe = new RegExp(pathSrc, pathFlags);
        // A real Rent CTA matches BOTH the client's link text AND its checkout
        // path — the path filter keeps a stray top-nav "Rent Unit" link
        // (href="#") out of the card set.
        const matchesRentCta = (a: HTMLAnchorElement) => {
          if (!rentTextRe.test((a.innerText || '').trim())) return false;
          try { return rentPathRe.test(new URL(a.href).pathname); } catch { return false; }
        };
        // Anchor the unit list off the Rent CTAs — every card has one.
        // Responsive layouts often render TWO copies of each card (mobile + desktop
        // variant), each with its own Rent link + Reserve button. We dedupe by
        // rentHref since the same unit always points at the same checkout URL.
        const rentLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('a'))
          .filter(matchesRentCta);
        const seen = new Set<HTMLElement>();
        const byHref = new Map<string, number>(); // rentHref → index in `out`
        const out: Array<{
          dimensions: string;
          sqft: string;
          features: string[];
          promo: string;
          prices: string[];
          struckPrice: number | null;
          currentPrice: number | null;
          rentHref: string;
          unitId: string;
          hasReserveButton: boolean;
          imgLoaded: boolean | null;
        }> = [];

        function findCardRoot(el: HTMLElement): HTMLElement {
          // Climb until the ancestor's innerText contains BOTH a price ($N) AND a
          // dimension (NxN). That guarantees the chosen root is large enough to
          // include the unit's full metadata, rather than a tight Rent Now wrapper.
          // Stop early if the ancestor contains more than one Rent Now link — that
          // means we've gone too high and are now spanning multiple cards.
          let cur: HTMLElement | null = el;
          let lastGood: HTMLElement | null = null;
          for (let i = 0; i < 15 && cur; i++) {
            const text = cur.innerText || '';
            const hasPrice = /\$\s*\d/.test(text);
            const hasDim   = /\d{1,3}\s*['′]?\s*[x×]\s*\d{1,3}/i.test(text);
            const rentLinkCount = Array.from(cur.querySelectorAll('a')).filter(matchesRentCta).length;
            const reserveCount  = (text.match(/\breserve\b/gi) || []).length;
            // Crossed into the neighbour card — back off to the previous-good level.
            // Each unit card may have at most 2 Rent Now occurrences (mobile +
            // desktop variants of the same unit) AND at most 2 Reserve occurrences.
            if (rentLinkCount > 2 || reserveCount > 2) return lastGood || cur;
            if (hasPrice && hasDim) lastGood = cur;
            cur = cur.parentElement;
          }
          return lastGood || (el.closest('[class*="card"], [class*="unit"], li, article, section') as HTMLElement) || el;
        }

        for (const link of rentLinks) {
          const root = findCardRoot(link);
          if (!root || seen.has(root)) continue;
          seen.add(root);

          const text = (root.innerText || '').trim();

          // Dimensions like 5'x5', 10'x20', 10x15, 10' × 10' — apostrophes
          // optional, separator may be "x" or the "×" multiplication sign.
          const dimM = text.match(/(\d{1,3})['′]?\s*[x×]\s*(\d{1,3})['′]?/i);
          // Square footage like "25 sq ft"
          const sqM  = text.match(/(\d{2,5})\s*sq\.?\s*ft/i);
          // Promo — first line containing "Off" or "Free" or percentage
          const promoLine = text.split('\n').find(line =>
            /off|free|promo|deal|save|months?/i.test(line) && /(\d+%|months?|\$)/i.test(line)
          ) || '';
          // Prices — capture every $X / $X.XX in the card.
          const priceMatches = Array.from(text.matchAll(/\$\d{1,4}(?:\.\d{2})?/g)).map(m => m[0]);
          // Features — words like "Climate-Controlled", "Elevator Access", "Drive Up" near top of card.
          const featureKeywords = ['climate', 'elevator', 'drive', 'indoor', 'outdoor', '24', 'access', 'parking', 'temperature'];
          const features = Array.from(new Set(
            text.split(/\n+/)
              .map(s => s.trim())
              .filter(s => s.length > 0 && s.length < 60)
              .filter(s => featureKeywords.some(k => s.toLowerCase().includes(k)))
              .filter(s => !/\$/.test(s) && !/^rent/i.test(s) && !/^reserve/i.test(s))
          ));

          const hasReserve = !!Array.from(root.querySelectorAll<HTMLElement>('button'))
            .find(b => /^reserve$/i.test((b.innerText || '').trim()));

          // Struck ("regular") vs current ("intro/discounted") price, by the
          // line-through style. The discounted price MUST be lower than the
          // struck one — a card showing current $69 over a struck $21 is an
          // inverted/mis-bound promo.
          let struckPrice: number | null = null;
          let currentPrice: number | null = null;
          const pricedEls = Array.from(root.querySelectorAll<HTMLElement>('*'))
            .filter(e => e.children.length === 0 && /\$\s?\d/.test(e.textContent || ''));
          for (const e of pricedEls) {
            const cs = getComputedStyle(e);
            const isStruck = (cs.textDecorationLine || '').includes('line-through') || e.tagName === 'DEL' || e.tagName === 'S';
            const m = (e.textContent || '').match(/\$\s?(\d{1,4}(?:\.\d{2})?)/);
            if (!m) continue;
            const val = parseFloat(m[1]);
            if (isStruck) { if (struckPrice == null) struckPrice = val; }
            else if (currentPrice == null) currentPrice = val;
          }

          // Unit-card image: the largest <img> in the card; loaded = naturalWidth>0.
          const cardImg = Array.from(root.querySelectorAll('img'))
            .sort((a, b) => (b.naturalWidth || 0) - (a.naturalWidth || 0))[0] as HTMLImageElement | undefined;
          const imgLoaded = cardImg ? (cardImg.complete && cardImg.naturalWidth > 0) : null;

          let unitId = '';
          try { unitId = new URL(link.href).searchParams.get('unit') || new URL(link.href).searchParams.get('unit_id') || ''; } catch { /* */ }

          const entry = {
            dimensions: dimM ? `${dimM[1]}'x${dimM[2]}'` : '',
            sqft: sqM ? `${sqM[1]} sq ft` : '',
            features,
            promo: promoLine,
            prices: priceMatches,
            struckPrice,
            currentPrice,
            rentHref: link.href || '',
            unitId,
            hasReserveButton: hasReserve,
            imgLoaded,
          };

          // Dedupe by rentHref. When the same unit appears in both mobile + desktop
          // variants of the DOM, prefer the entry with the richer data (more prices,
          // more features) so the assertions see the fullest version.
          const existingIdx = byHref.get(entry.rentHref);
          if (existingIdx == null) {
            byHref.set(entry.rentHref, out.length);
            out.push(entry);
          } else {
            const prev = out[existingIdx];
            const richer = entry.prices.length + entry.features.length;
            const prevRichness = prev.prices.length + prev.features.length;
            if (richer > prevRichness) out[existingIdx] = entry;
          }
        }

        // VISIBLE-only counts. Responsive templates (Safeguard) render each unit
        // TWICE — a mobile + a desktop variant, one hidden via CSS — so counting
        // raw DOM nodes would miscount cards. We only count elements actually
        // displayed (offsetParent or a client rect), which collapses the hidden
        // responsive twin.
        const isVis = (el: Element) => (el as HTMLElement).offsetParent !== null || el.getClientRects().length > 0;
        const visibleRent = rentLinks.filter(isVis);
        const rentLinkCount = visibleRent.length;
        const reserveCount = Array.from(document.querySelectorAll('button')).filter(b => /^reserve$/i.test((b.innerText || '').trim()) && isVis(b)).length;
        const allUnitIds = visibleRent.map(a => { try { const u = new URL(a.href); return u.searchParams.get('unit') || u.searchParams.get('unit_id') || ''; } catch { return ''; } }).filter(Boolean);

        // Assign each VISIBLE Rent CTA to its list/track = the CLOSEST ancestor
        // that holds 2+ Rent CTAs (a carousel track / grid). Grouped + featured
        // layouts (Mini Mall) intentionally show a unit in MORE THAN ONE list — a
        // featured strip AND its size-category carousel — so a real "duplicate
        // listing" only counts when a unit appears twice within the SAME list.
        // A flat grid (Safeguard) is a single list, so genuine in-grid duplicates
        // still surface.
        const trackEls: HTMLElement[] = [];
        let soloSeq = 0;
        const listKeyFor = (el: HTMLElement): string => {
          let cur: HTMLElement | null = el.parentElement;
          for (let i = 0; i < 15 && cur; i++) {
            const n = Array.from(cur.querySelectorAll('a')).filter(matchesRentCta).length;
            if (n >= 2) {
              let idx = trackEls.indexOf(cur);
              if (idx < 0) { idx = trackEls.length; trackEls.push(cur); }
              return 'T' + idx;
            }
            cur = cur.parentElement;
          }
          return 'S' + (soloSeq++); // card alone in its track — cannot self-duplicate
        };
        const visibleUnits = visibleRent.map(a => {
          let id = '';
          try { const u = new URL(a.href); id = u.searchParams.get('unit') || u.searchParams.get('unit_id') || ''; } catch { /* */ }
          return { id, list: listKeyFor(a as unknown as HTMLElement) };
        }).filter(x => x.id);

        return { units: out, rentLinkCount, reserveCount, allUnitIds, visibleUnits };
      }, {
        textSrc: handoff.rentLinkText.source, textFlags: handoff.rentLinkText.flags,
        pathSrc: handoff.pathPattern.source, pathFlags: handoff.pathPattern.flags,
      });

      const cards = parsed.units;
      data.unitCount = cards.length;
      data.units = cards.slice(0, 5); // keep the first 5 in the report to avoid log spam
      data.totalUnitsDetected = cards.length;
      data.rawCounts = { visibleRentLinks: parsed.rentLinkCount, visibleReserve: parsed.reserveCount, uniqueUnitIds: new Set(parsed.allUnitIds).size };

      checks.push(check(
        'at least 1 unit card rendered',
        cards.length >= 1,
        `${cards.length} unit card(s) detected`,
      ));

      // Sort + Filter buttons sit above the unit grid. Filter is universal
      // across Flex v4 facilities (hard check). Sort is config-dependent —
      // smaller facilities don't ship it — so we record its presence as info
      // but don't fail when it's missing.
      const sortButton  = page.getByRole('button', { name: /price|sort/i }).first();
      const filterButton = page.getByRole('button', { name: /^filters?$/i }).first();
      const hasSort   = (await sortButton.count())   > 0;
      const hasFilter = (await filterButton.count()) > 0;
      data.hasSortButton   = hasSort;
      data.hasFilterButton = hasFilter;
      // Soft observation — surfaces in the report findings but never fails.
      checks.push(check(
        'Sort control (optional — config dependent)',
        true,
        hasSort ? 'sort button visible' : 'not configured for this facility',
      ));
      // Safeguard renders a "Filters" button above the grid (hard check). Mini
      // Mall uses a persistent filter sidebar instead — covered by the dedicated
      // Filters section — so the button is informational there.
      const filterButtonExpected = ctx.client !== 'minimall';
      checks.push(check(
        'Filter control present above unit list',
        filterButtonExpected ? hasFilter : true,
        filterButtonExpected
          ? (hasFilter ? 'filter button visible' : '(missing)')
          : (hasFilter ? 'filter button visible' : 'sidebar filters — see Filters section'),
      ));

      if (cards.length > 0) {
        // Every card should expose a Rent CTA href.
        const missingHref = cards.filter(c => !c.rentHref);
        checks.push(check(
          'every card has a Rent link',
          missingHref.length === 0,
          missingHref.length ? `${missingHref.length} cards missing href` : 'ok',
        ));

        // Checkout-handoff URL contract (client-specific):
        //   Safeguard → /step-four?unit_id=<positive int>
        //   Mini Mall → /yardi/start?unit=<positive int>&type=rent
        const badRent = cards.filter(c => {
          try {
            const u = new URL(c.rentHref);
            if (!handoff.pathPattern.test(u.pathname)) return true;
            const id = u.searchParams.get(handoff.unitParam);
            if (!id || Number(id) <= 0) return true;
            if (handoff.requireType && u.searchParams.get('type') !== handoff.requireType) return true;
            return false;
          } catch { return true; }
        });
        checks.push(check(
          `all Rent links target ${handoff.label} with valid ${handoff.unitParam}`,
          badRent.length === 0,
          badRent.length ? `${badRent.length} bad URL(s); sample: ${badRent[0]?.rentHref}` : 'ok',
        ));

        // Every card should have a Reserve button alongside Rent Now.
        const missingReserve = cards.filter(c => !c.hasReserveButton);
        checks.push(check(
          'every card has Reserve button',
          missingReserve.length === 0,
          missingReserve.length ? `${missingReserve.length} cards missing Reserve` : 'ok',
        ));

        // Unit-card image paint state — INFO only. Deliverability is owned by the
        // Page Health "Images loaded" check, which re-verifies reachability and so
        // filters CDN-throttled-but-valid images. Failing here too would just
        // double-count that same throttle noise (unit thumbnails are exactly the
        // assets the CDN throttles hardest under automation).
        const brokenImgCards = cards.filter(c => c.imgLoaded === false);
        const noImgCards = cards.filter(c => c.imgLoaded === null);
        checks.push(check(
          'unit card images painted (info)',
          true,
          brokenImgCards.length === 0
            ? `${cards.length - noImgCards.length}/${cards.length} cards have a painted image`
            : `${brokenImgCards.length}/${cards.length} card image(s) slow/unpainted — see Page Health "Images loaded" for reachability`,
        ));

        // Cards typically show TWO prices (web rate + standard rate). Tolerate cards
        // with one price (deal-less units), but expect at least one to show two.
        const twoPriceCount = cards.filter(c => c.prices.length >= 2).length;
        checks.push(check(
          'at least one card shows two prices (promo + standard)',
          twoPriceCount >= 1,
          `${twoPriceCount}/${cards.length} cards show 2+ prices`,
        ));

        // Pricing sanity: the CURRENT (discounted/intro) price must be strictly
        // LESS than the "regular" price. A card showing current $69 over a
        // struck $21 is an inverted/mis-bound promo.
        //   • Chicago template marks the regular price with line-through →
        //     compare currentPrice vs struckPrice.
        //   • Carroll template shows two plain prices (web rate then standard)
        //     with no line-through → fall back to DOM order (first ≤ second).
        const struckCards = cards.filter(c => c.struckPrice != null && c.currentPrice != null);
        const invertedStruck = struckCards.filter(c => (c.currentPrice as number) >= (c.struckPrice as number));
        const dualPlain = cards.filter(c => !(c.struckPrice != null && c.currentPrice != null) && c.prices.length >= 2);
        const invertedPlain = dualPlain.filter(c => {
          const n = c.prices.map(p => parseFloat(p.replace(/[^0-9.]/g, '')));
          return n[0] > n[1]; // first-shown (web/intro) must be ≤ second-shown (standard)
        });
        const inverted = [...invertedStruck, ...invertedPlain];
        const pricedCount = struckCards.length + dualPlain.length;

        // Prices must be positive, real numbers — a $0 / negative / NaN price is
        // a broken binding (and would otherwise sneak past the inversion check).
        const badPrice = cards.filter(c =>
          (c.currentPrice != null && (!(c.currentPrice > 0))) ||
          (c.struckPrice != null && (!(c.struckPrice > 0))),
        );
        // Rate DATA originates in the FMS feed (Storagely doesn't author unit
        // rates; legacy shows the same values). A $0/negative rate is therefore an
        // FMS data issue, not a Storagely binding bug — so it's INFO here and the
        // Anomaly Scan surfaces + categorizes + learns it. This avoids false-failing
        // the Storagely run on data it can't control.
        checks.push(check(
          'displayed prices are positive (info — FMS data · see Anomaly Scan)',
          true,
          badPrice.length === 0
            ? `${cards.length} card(s), all prices positive`
            : `${badPrice.length} card(s) with a $0/negative/NaN price (FMS data); sample ${badPrice[0]?.dimensions}`,
        ));
        // web>standard inversion is also FMS rate data → INFO (see Anomaly Scan),
        // not a hard fail on the Storagely run.
        checks.push(check(
          'web ≤ regular price on every priced card (info — FMS data · see Anomaly Scan)',
          true,
          pricedCount === 0
            ? '(no comparable price pairs found)'
            : inverted.length === 0
              ? `${pricedCount} priced cards all consistent (web ≤ regular)`
              : `${inverted.length} INVERTED (FMS data); sample ${inverted[0]?.dimensions}: ${inverted[0]?.struckPrice != null ? `web $${inverted[0]?.currentPrice} > struck $${inverted[0]?.struckPrice}` : inverted[0]?.prices.join(' / ')}`,
        ));

        // Promo text — when present, must look like a real promo (% / months / free).
        // Defends against the common "promo bound but template literal leaked" bug.
        const cardsWithPromo = cards.filter(c => c.promo);
        const malformedPromo = cardsWithPromo.filter(c =>
          !/(\d+\s*%|month|free|save|\$\d)/i.test(c.promo)
        );
        checks.push(check(
          'every promo line looks well-formed',
          malformedPromo.length === 0,
          malformedPromo.length > 0
            ? `${malformedPromo.length} malformed; sample: "${malformedPromo[0]?.promo}"`
            : cardsWithPromo.length > 0
              ? `${cardsWithPromo.length} card promo line(s), all well-formed`
              : 'no per-card promo lines (promos shown as badges — see Promo section)',
        ));

        // No DUPLICATE listings WITHIN A SINGLE LIST/TRACK. A unit that repeats
        // across a featured strip + its size-category carousel (Mini Mall) is
        // intentional and does NOT count. A unit appearing twice within the SAME
        // list IS a bug (Chicago Safeguard: 16 cards, unit ids 5378805 / 5378808
        // / 5378824 each twice in one grid → 3 duplicate listings).
        const rawIds = parsed.allUnitIds;
        const perList: Record<string, number> = {};
        for (const { id, list } of parsed.visibleUnits) {
          perList[`${list}|${id}`] = (perList[`${list}|${id}`] || 0) + 1;
        }
        const inListDups = Object.entries(perList)
          .filter(([, n]) => n > 1)
          .map(([k, n]) => ({ id: k.split('|')[1], n }));
        const listCount = new Set(parsed.visibleUnits.map(u => u.list)).size;
        checks.push(check(
          'no duplicate unit listings (unique unit ids per list)',
          inListDups.length === 0,
          inListDups.length === 0
            ? `${rawIds.length} listing(s) across ${listCount} list(s), no in-list duplicates`
            : `${inListDups.length} unit(s) duplicated within one list: ${inListDups.map(d => `${d.id}×${d.n}`).join(', ')} (${parsed.rentLinkCount} cards, ${new Set(rawIds).size} unique)`,
        ));

        // Every unit card carries exactly one Rent CTA and one Reserve button,
        // so the count of VISIBLE Rent links must equal VISIBLE Reserve buttons.
        // A mismatch means a card rendered without one of its CTAs (or an orphan
        // CTA exists). Counts are visible-only so responsive twins don't skew it.
        const { rentLinkCount, reserveCount } = parsed;
        checks.push(check(
          'visible Rent links == visible Reserve buttons (one pair per card)',
          rentLinkCount === reserveCount,
          `Rent=${rentLinkCount}, Reserve=${reserveCount} (${new Set(parsed.allUnitIds).size} unique units)`,
        ));
      }

      // Mini Mall per-card "View unit details" buttons + the "More units /
      // See All Units" expander. (Client-specific card chrome — gated.)
      if (ctx.client === 'minimall') {
        const viewDetails = await page.getByRole('button', { name: /view unit details|view details/i }).count();
        checks.push(check(
          'unit cards expose "View unit details" buttons',
          viewDetails >= 1,
          `${viewDetails} view-details button(s)`,
        ));
        const moreUnits = await page.getByRole('button', { name: /more units|see all units/i }).count();
        checks.push(check(
          '"More units / See All Units" expander present',
          moreUnits >= 1,
          `${moreUnits} expander(s)`,
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
