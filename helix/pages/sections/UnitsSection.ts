import { Page } from '@playwright/test';
import { ISectionDetector, SectionContext, SectionResult, check } from './types';
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
      const handoff = getRentHandoff(ctx.client);

      // Wait until at least one Rent CTA appears — guards against lazy-rendered grids.
      await page.getByRole('link', { name: handoff.rentLinkText }).first()
        .waitFor({ state: 'visible', timeout: 15_000 })
        .catch(() => { /* unit grid may legitimately be empty — keep going */ });

      // Trigger a lazy-load by scrolling through the page.
      await page.evaluate(() => {
        return new Promise<void>(resolve => {
          let y = 0;
          const step = () => {
            window.scrollTo(0, y);
            y += 600;
            if (y < document.body.scrollHeight) setTimeout(step, 60);
            else { window.scrollTo(0, 0); setTimeout(() => resolve(), 200); }
          };
          step();
        });
      });

      const cards = await page.evaluate(({ textSrc, textFlags, pathSrc, pathFlags }) => {
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
          rentHref: string;
          hasReserveButton: boolean;
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

          const entry = {
            dimensions: dimM ? `${dimM[1]}'x${dimM[2]}'` : '',
            sqft: sqM ? `${sqM[1]} sq ft` : '',
            features,
            promo: promoLine,
            prices: priceMatches,
            rentHref: link.href || '',
            hasReserveButton: hasReserve,
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
        return out;
      }, {
        textSrc: handoff.rentLinkText.source, textFlags: handoff.rentLinkText.flags,
        pathSrc: handoff.pathPattern.source, pathFlags: handoff.pathPattern.flags,
      });

      data.unitCount = cards.length;
      data.units = cards.slice(0, 5); // keep the first 5 in the report to avoid log spam
      data.totalUnitsDetected = cards.length;

      checks.push(check(
        'at least 1 unit card rendered',
        cards.length >= 1,
        `${cards.length} unit card(s) detected`,
      ));

      // Sort + Filter buttons sit above the unit grid. Filter is universal
      // across Helix v4 facilities (hard check). Sort is config-dependent —
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

        // Cards typically show TWO prices (web rate + standard rate). Tolerate cards
        // with one price (deal-less units), but expect at least one to show two.
        const twoPriceCount = cards.filter(c => c.prices.length >= 2).length;
        checks.push(check(
          'at least one card shows two prices (promo + standard)',
          twoPriceCount >= 1,
          `${twoPriceCount}/${cards.length} cards show 2+ prices`,
        ));

        // Promo (web rate) MUST be < standard rate when both are shown — the
        // opposite means somebody crossed wires in the price binding.
        const dualPriceCards = cards.filter(c => c.prices.length >= 2);
        const invertedPrice = dualPriceCards.filter(c => {
          const nums = c.prices.map(p => parseFloat(p.replace(/[^0-9.]/g, '')));
          // We expect first-shown price (web rate) ≤ second-shown (standard rate).
          return nums[0] > nums[1];
        });
        checks.push(check(
          'web rate ≤ standard rate on every dual-priced card',
          invertedPrice.length === 0,
          invertedPrice.length === 0
            ? `${dualPriceCards.length} dual-priced cards all consistent`
            : `${invertedPrice.length} card(s) have web > standard; sample: ${invertedPrice[0]?.prices.join(' / ')}`,
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
          malformedPromo.length === 0
            ? `${cardsWithPromo.length} cards with valid promo`
            : `${malformedPromo.length} malformed; sample: "${malformedPromo[0]?.promo}"`,
        ));

        // Unique unit ids across all cards — duplicates would mean broken bindings.
        const ids = cards.map(c => {
          try { return new URL(c.rentHref).searchParams.get(handoff.unitParam); }
          catch { return null; }
        }).filter(Boolean);
        const unique = new Set(ids);
        checks.push(check(
          `${handoff.unitParam} values are unique across cards`,
          unique.size === ids.length,
          `${ids.length} cards, ${unique.size} unique ids`,
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
