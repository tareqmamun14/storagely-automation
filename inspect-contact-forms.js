// Quick script to inspect all contact page forms and dump their HTML structure
const { chromium } = require('playwright');

const SITES = [
  { name: 'Smart Ohio',   url: 'https://smartstorageohio.com/contact' },
  { name: 'Storage Star',  url: 'https://storagestar.com/contact' },
  { name: 'Sunbird',       url: 'https://sunbirdstorage.com/contact' },
  { name: 'Bluebird',      url: 'https://bluebirdstorage.ca/contact' },
  { name: 'Gatekeeper',    url: 'https://gatekeeperstoragega.com/pages/contact' },
  { name: 'Red Rocks',     url: 'https://redrocksstorage.com/pages/contact' },
  { name: 'Distinct',      url: 'https://distinctstorage.com/contact' },
  { name: 'Rhino',         url: 'https://rhino-storage.com/pages/contact' },
  { name: 'StorageDepot',  url: 'https://storagedepotla.com/contact-storage' },
  { name: 'Mini Mall',     url: 'https://minimallstorage.com/contact' },
  { name: 'Storsafe',      url: 'https://www.storsafe.com/contact' },
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  for (const site of SITES) {
    const page = await context.newPage();
    console.log(`\n${'='.repeat(80)}`);
    console.log(`  ${site.name} — ${site.url}`);
    console.log(`${'='.repeat(80)}`);
    try {
      await page.goto(site.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(3000);

      // Get all forms
      const forms = await page.locator('form').all();
      console.log(`  Forms found: ${forms.length}`);

      for (let i = 0; i < forms.length; i++) {
        const form = forms[i];
        const formAction = await form.getAttribute('action') || '(none)';
        const formMethod = await form.getAttribute('method') || '(none)';
        console.log(`\n  --- Form #${i + 1} (action=${formAction}, method=${formMethod}) ---`);

        // Get all inputs
        const inputs = await form.locator('input:not([type="hidden"])').all();
        for (const inp of inputs) {
          const type = await inp.getAttribute('type') || 'text';
          const name = await inp.getAttribute('name') || '';
          const placeholder = await inp.getAttribute('placeholder') || '';
          const id = await inp.getAttribute('id') || '';
          const brzLabel = await inp.getAttribute('data-brz-label') || '';
          const visible = await inp.isVisible().catch(() => false);
          console.log(`    INPUT type=${type} name="${name}" placeholder="${placeholder}" id="${id}" brz="${brzLabel}" visible=${visible}`);
        }

        // Get all textareas
        const textareas = await form.locator('textarea').all();
        for (const ta of textareas) {
          const name = await ta.getAttribute('name') || '';
          const placeholder = await ta.getAttribute('placeholder') || '';
          const id = await ta.getAttribute('id') || '';
          const brzLabel = await ta.getAttribute('data-brz-label') || '';
          const visible = await ta.isVisible().catch(() => false);
          console.log(`    TEXTAREA name="${name}" placeholder="${placeholder}" id="${id}" brz="${brzLabel}" visible=${visible}`);
        }

        // Get all selects
        const selects = await form.locator('select').all();
        for (const sel of selects) {
          const name = await sel.getAttribute('name') || '';
          const id = await sel.getAttribute('id') || '';
          const brzLabel = await sel.getAttribute('data-brz-label') || '';
          const ariaHidden = await sel.getAttribute('aria-hidden') || '';
          const cls = await sel.getAttribute('class') || '';
          const visible = await sel.isVisible().catch(() => false);
          const options = await sel.locator('option').all();
          const optTexts = [];
          for (const opt of options) {
            const val = await opt.getAttribute('value') || '';
            const text = (await opt.textContent() || '').trim();
            optTexts.push(`"${text}" (val=${val})`);
          }
          console.log(`    SELECT name="${name}" id="${id}" brz="${brzLabel}" aria-hidden="${ariaHidden}" class="${cls}" visible=${visible}`);
          console.log(`      Options: ${optTexts.join(', ')}`);
        }

        // Get all buttons
        const buttons = await form.locator('button, input[type="submit"]').all();
        for (const btn of buttons) {
          const type = await btn.getAttribute('type') || '';
          const text = (await btn.textContent() || '').trim();
          const visible = await btn.isVisible().catch(() => false);
          console.log(`    BUTTON type="${type}" text="${text}" visible=${visible}`);
        }

        // Check for hidden inputs (useful for CSRF, form IDs, etc.)
        const hiddenInputs = await form.locator('input[type="hidden"]').all();
        for (const h of hiddenInputs) {
          const name = await h.getAttribute('name') || '';
          const value = await h.getAttribute('value') || '';
          console.log(`    HIDDEN name="${name}" value="${value.substring(0, 60)}"`);
        }
      }

      // Check if there's no form but there's contact info
      if (forms.length === 0) {
        const hasContactText = await page.getByText(/contact/i).count();
        const hasPhoneLink = await page.locator('a[href^="tel:"]').count();
        const hasEmailLink = await page.locator('a[href^="mailto:"]').count();
        console.log(`  NO FORM. Contact text: ${hasContactText}, Phone links: ${hasPhoneLink}, Email links: ${hasEmailLink}`);
      }
    } catch (err) {
      console.log(`  ERROR: ${err.message}`);
    }
    await page.close();
  }

  await browser.close();
  console.log('\n\nDONE.');
})();
