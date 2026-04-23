const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });

  // 1. Check native sites for FAQ links in the nav/footer
  const sites = [
    'https://gatekeeperstoragega.com/',
    'https://redrocksstorage.com/',
    'https://rhino-storage.com/',
    'https://storagedepotla.com/',
  ];
  for (const url of sites) {
    const page = await browser.newPage();
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      const faqLinks = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a')).filter(a => /faq/i.test(a.href) || /faq/i.test(a.textContent))
          .map(e => ({ href: e.href, text: e.textContent.trim().substring(0, 50) }));
      });
      console.log(url, JSON.stringify(faqLinks));
    } catch(e) { console.log(url, 'ERROR:', e.message); }
    await page.close();
  }

  // 2. Check Distinct — sticky header issue
  const p2 = await browser.newPage();
  await p2.goto('https://distinctstorage.com/self-storage-faq', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await p2.waitForTimeout(2000);
  const distinctInfo = await p2.evaluate(() => {
    const items = document.querySelectorAll('.brz-accordion__item');
    const stgHeader = document.querySelector('.stg_custom_header');
    const r = { items: items.length, hasStgHeader: !!stgHeader };
    if (stgHeader) {
      const cs = window.getComputedStyle(stgHeader);
      r.headerPosition = cs.position;
      r.headerZIndex = cs.zIndex;
    }
    // Check item 0 and 1 active state
    if (items.length > 1) {
      r.item0Active = items[0].classList.contains('brz-accordion__item--active');
      r.item1Active = items[1].classList.contains('brz-accordion__item--active');
    }
    return r;
  });
  console.log('Distinct FAQ:', JSON.stringify(distinctInfo));
  await p2.close();

  // 3. Check Almighty FAQ page structure + aria-expanded buttons detail
  const p3 = await browser.newPage();
  await p3.goto('https://www.almightystorage.com/self-storage-faq', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await p3.waitForTimeout(2000);
  const almightyInfo = await p3.evaluate(() => {
    const ariaButtons = document.querySelectorAll('[role="button"][aria-expanded], button[aria-expanded]');
    const result = [];
    ariaButtons.forEach((b, i) => {
      result.push({
        tag: b.tagName,
        role: b.getAttribute('role'),
        expanded: b.getAttribute('aria-expanded'),
        visible: b.offsetParent !== null,
        text: b.textContent.trim().substring(0, 60),
        className: b.className.substring(0, 80),
        parentClass: b.parentElement ? b.parentElement.className.substring(0, 80) : ''
      });
    });
    // Also check for collapsible toggles
    const toggles = document.querySelectorAll('.brz-collapsible__btn, [data-brz-collapsible], [class*="collapsible"]');
    return { ariaButtons: result, toggleCount: toggles.length, 
      toggleSample: toggles.length > 0 ? toggles[0].outerHTML.substring(0, 300) : 'none' };
  });
  console.log('Almighty FAQ:', JSON.stringify(almightyInfo, null, 2));
  await p3.close();

  // 4. Check native sites FAQ structures
  const p4 = await browser.newPage();
  await p4.goto('https://gatekeeperstoragega.com/storage-faqs', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await p4.waitForTimeout(2000);
  const gkInfo = await p4.evaluate(() => {
    // Check for Bootstrap accordion
    const accItems = document.querySelectorAll('.accordion-item');
    const accBtns = document.querySelectorAll('.accordion-button');
    const accCollapse = document.querySelectorAll('.accordion-collapse');
    const sample = accItems.length > 0 ? accItems[0].outerHTML.substring(0, 600) : 'none';
    // Check active state
    let firstCollapsed = -1;
    const states = [];
    for (let i = 0; i < Math.min(5, accBtns.length); i++) {
      const collapsed = accBtns[i].classList.contains('collapsed');
      const text = accBtns[i].textContent.trim().substring(0, 60);
      states.push({ i, collapsed, text });
      if (collapsed && firstCollapsed === -1) firstCollapsed = i;
    }
    return { accItems: accItems.length, accBtns: accBtns.length, accCollapse: accCollapse.length, states, firstCollapsed, sample };
  });
  console.log('Gatekeeper FAQ:', JSON.stringify(gkInfo, null, 2));
  await p4.close();

  // 5. Also check Rhino FAQ
  const p5 = await browser.newPage();
  await p5.goto('https://rhino-storage.com/storage-faqs', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await p5.waitForTimeout(2000);
  const rhinoInfo = await p5.evaluate(() => {
    const accItems = document.querySelectorAll('.accordion-item');
    const accBtns = document.querySelectorAll('.accordion-button');
    return { accItems: accItems.length, accBtns: accBtns.length,
      firstSample: accItems.length > 0 ? accItems[0].outerHTML.substring(0, 400) : 'none' };
  });
  console.log('Rhino FAQ:', JSON.stringify(rhinoInfo, null, 2));
  await p5.close();

  await browser.close();
})();
