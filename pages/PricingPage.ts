import { Page } from '@playwright/test';

// ============================================================================
// Pricing Page — Unit Price Validation
// ============================================================================
// All Storagely sites share a common HTML structure for location pages:
//   - Unit rows:       .row.listviewrows
//   - Promo price:     h3.actualMoPrice    (left price — web rate / promo)
//   - Regular price:   h3.withoutDiscntprice (right price — standard / after promo)
//   - Price label:     small.promoText
//   - Unit type name:  .unit-type-listing-name
//   - Dimensions:      h2.widthHeight
//
// Dual-price units have BOTH .actualMoPrice AND .withoutDiscntprice.
// Single-price units have ONLY .actualMoPrice (with "Standard Rate" or similar label).
// ============================================================================

export interface UnitPriceInfo {
  unitType: string;       // e.g. "Indoor - Climate Controlled"
  dimensions: string;     // e.g. "5' x 10'"
  firstPrice: number;     // left price (promo/web rate)
  secondPrice: number;    // right price (standard/regular)
  firstLabel: string;     // e.g. "WEB RATE ONLY", "DURING PROMO PERIOD"
  secondLabel: string;    // e.g. "STANDARD RATE", "AFTER PROMO PERIOD"
  isValid: boolean;       // firstPrice < secondPrice
}

export interface PricingTestResult {
  locationUrl: string;
  totalUnits: number;
  dualPriceUnits: number;
  singlePriceUnits: number;
  validCount: number;     // dual-price units where first < second
  invalidCount: number;   // dual-price units where first >= second
  units: UnitPriceInfo[];
  error?: string;
}

export class PricingPage {
  constructor(private page: Page) {}

  /**
   * Navigate to a specific location page.
   */
  async navigateToLocation(url: string): Promise<void> {
    console.log(`🔍 Testing pricing page: ${url}`);
    await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    // Wait for units to render
    await this.page.waitForSelector('.listviewrows', { timeout: 20000 }).catch(() => {
      // Some locations might have no units — will be caught later
    });
    // Small additional wait for dynamic content
    await this.page.waitForTimeout(2000);
  }

  /**
   * Parse a dollar amount from text like "$34", "$34.50", "$1,234", "$34 /month"
   */
  private parsePrice(text: string): number {
    const cleaned = text.replace(/[^0-9.$,]/g, '').replace(/,/g, '');
    const match = cleaned.match(/\$?([\d]+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : NaN;
  }

  /**
   * Extract and validate pricing for all units on the current location page.
   */
  async validatePricing(): Promise<PricingTestResult> {
    const result: PricingTestResult = {
      locationUrl: this.page.url(),
      totalUnits: 0,
      dualPriceUnits: 0,
      singlePriceUnits: 0,
      validCount: 0,
      invalidCount: 0,
      units: [],
    };

    try {
      const unitRows = this.page.locator('.listviewrows');
      const rowCount = await unitRows.count();
      result.totalUnits = rowCount;

      if (rowCount === 0) {
        result.error = 'No unit rows found on page (.listviewrows)';
        console.log(`   ❌ No units found on page`);
        return result;
      }

      console.log(`   ✓ Found ${rowCount} unit row(s)`);

      let dualCount = 0;
      let singleCount = 0;

      for (let i = 0; i < rowCount; i++) {
        const row = unitRows.nth(i);

        // Get unit type name
        const unitTypeLoc = row.locator('.unit-type-listing-name');
        let unitType = '';
        if (await unitTypeLoc.count() > 0) {
          unitType = (await unitTypeLoc.first().innerText()).replace(/\s+/g, ' ').trim();
          // Remove hidden span content (unit ID)
          unitType = unitType.replace(/\d{4,}/, '').trim();
        }

        // Get dimensions
        const dimsLoc = row.locator('h2.widthHeight');
        let dimensions = '';
        if (await dimsLoc.count() > 0) {
          dimensions = (await dimsLoc.first().innerText())
            .replace(/WIDTH|DEPTH/gi, '')
            .replace(/\s+/g, ' ')
            .trim();
        }

        // Check for dual pricing: both actualMoPrice and withoutDiscntprice present
        const promoPriceLoc = row.locator('h3.actualMoPrice');
        const regularPriceLoc = row.locator('h3.withoutDiscntprice');

        const hasPromoPrice = (await promoPriceLoc.count()) > 0;
        const hasRegularPrice = (await regularPriceLoc.count()) > 0;

        if (hasPromoPrice && hasRegularPrice) {
          // DUAL PRICE unit
          dualCount++;

          const promoText = await promoPriceLoc.first().innerText();
          const regularText = await regularPriceLoc.first().innerText();

          const firstPrice = this.parsePrice(promoText);
          const secondPrice = this.parsePrice(regularText);

          // Get labels
          const promoLabels = row.locator('.priceSection small.promoText');
          const labelCount = await promoLabels.count();
          let firstLabel = '';
          let secondLabel = '';
          if (labelCount >= 2) {
            firstLabel = (await promoLabels.nth(0).innerText()).trim();
            secondLabel = (await promoLabels.nth(1).innerText()).trim();
          } else if (labelCount === 1) {
            firstLabel = (await promoLabels.nth(0).innerText()).trim();
          }

          const isValid = !isNaN(firstPrice) && !isNaN(secondPrice) && firstPrice < secondPrice;

          const unitInfo: UnitPriceInfo = {
            unitType,
            dimensions,
            firstPrice,
            secondPrice,
            firstLabel,
            secondLabel,
            isValid,
          };

          result.units.push(unitInfo);

          if (isValid) {
            result.validCount++;
          } else {
            result.invalidCount++;
            console.log(`   🚨 INVALID PRICING: ${dimensions} ${unitType} → $${firstPrice} (${firstLabel}) >= $${secondPrice} (${secondLabel})`);
          }
        } else {
          // SINGLE PRICE unit (only one price displayed)
          singleCount++;
        }
      }

      result.dualPriceUnits = dualCount;
      result.singlePriceUnits = singleCount;

      // Print summary of dual-price units
      if (dualCount > 0) {
        console.log(`   ✓ Dual-price units: ${dualCount} (valid: ${result.validCount}, invalid: ${result.invalidCount})`);
        console.log(`   ✓ Single-price units: ${singleCount}`);

        // Print first few dual-price unit details
        const maxPrint = Math.min(result.units.length, 5);
        for (let i = 0; i < maxPrint; i++) {
          const u = result.units[i];
          const icon = u.isValid ? '✅' : '🚨';
          console.log(`      ${icon} ${u.dimensions} → $${u.firstPrice} (${u.firstLabel}) | $${u.secondPrice} (${u.secondLabel})`);
        }
        if (result.units.length > 5) {
          console.log(`      ... and ${result.units.length - 5} more dual-price units`);
        }
      } else {
        console.log(`   ⚠️  No dual-price units found (all ${singleCount} units show single price)`);
        // Not an error — some locations legitimately have only single-price units
      }

    } catch (err) {
      result.error = (err as Error).message;
      console.log(`   ❌ Error: ${result.error}`);
    }

    return result;
  }
}
