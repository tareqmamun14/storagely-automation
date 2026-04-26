// Quick DOM inspector — run with: node inspect-dom.js
const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log('Navigating to Mini Mall location page...');
  await page.goto('https://minimallstorage.com/storage-units/alabama/birmingham/richard-arrington-jr-blvd', {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  await page.waitForTimeout(2500); // let Bootstrap Multiselect init

  const dom = await page.evaluate(() => {
    const filterArea = document.querySelector('#filterArea');

    // All btn-groups inside filterArea
    const btnGroups = Array.from(document.querySelectorAll('#filterArea .btn-group')).map(g => ({
      tag: g.tagName,
      classes: g.className,
      children: Array.from(g.children).map(c => `${c.tagName}[id=${c.id || '-'}][class=${c.className}]`),
    }));

    // All selects anywhere inside #filterArea
    const selects = Array.from(document.querySelectorAll('#filterArea select')).map(s => ({
      id: s.id,
      name: s.name,
      optionCount: s.options.length,
      parent: `${s.parentElement?.tagName}[id=${s.parentElement?.id || '-'}][class=${s.parentElement?.className}]`,
      grandParent: `${s.parentElement?.parentElement?.tagName}[id=${s.parentElement?.parentElement?.id || '-'}][class=${s.parentElement?.parentElement?.className}]`,
    }));

    // Multiselect buttons in #filterArea
    const multiBtns = Array.from(document.querySelectorAll('#filterArea button.multiselect')).map(b => ({
      title: b.getAttribute('title'),
      text: b.textContent?.trim(),
      parent: `${b.parentElement?.tagName}[id=${b.parentElement?.id || '-'}][class=${b.parentElement?.className}]`,
    }));

    // Sort-related elements
    const sortValue = document.querySelector('sortvalue');
    const sortBtnGroup = document.querySelector('sortvalue .btn-group, sortvalue.multi-select-button');
    const sortLabels = Array.from(document.querySelectorAll('label[for^="sortby_"]')).map(l => ({
      for: l.getAttribute('for'),
      text: l.textContent?.trim(),
      parent: `${l.parentElement?.tagName}[class=${l.parentElement?.className}]`,
      grandParent: `${l.parentElement?.parentElement?.tagName}[class=${l.parentElement?.parentElement?.className}]`,
    }));

    const filterAreaOuterHTML = filterArea ? filterArea.outerHTML.substring(0, 4000) : 'NOT FOUND';
    const sortOuterHTML = sortValue ? sortValue.outerHTML.substring(0, 2000) : 'NOT FOUND';

    return { btnGroups, selects, multiBtns, sortLabels, filterAreaOuterHTML, sortOuterHTML };
  });

  // All unit rows — print data-price, data-sqft, text values
  const units = await page.evaluate(() =>
    Array.from(document.querySelectorAll('tr.shortableClass')).map((r, i) => ({
      i: i + 1,
      dataPrice: r.getAttribute('data-price'),
      dataSqft:  r.getAttribute('data-sqft') || r.getAttribute('data-size'),
      priceText: r.querySelector('h3.actualMoPrice')?.textContent?.trim(),
      sizeText:  r.querySelector('h2.widthHeight')?.textContent?.trim(),
    }))
  );

  console.log('\n=== ALL UNIT ROWS (27) ===');
  units.forEach(u => console.log(
    `  #${String(u.i).padStart(2)} data-price=${String(u.dataPrice).padStart(8)} | data-sqft=${String(u.dataSqft).padStart(6)} | price-text=${u.priceText} | size-text=${u.sizeText}`
  ));

  await browser.close();
})().catch(console.error);
