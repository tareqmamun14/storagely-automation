// global-teardown.ts
import * as fs from 'fs';
import * as path from 'path';

const RESULTS_DIR = path.join(process.cwd(), 'test-results', 'singlepage-results');
const RESULTS_FILE = path.join(process.cwd(), 'test-results', 'singlepage-results.json');
const LOCK_FILE = RESULTS_FILE + '.lock';

// V1 (multi-page) results
const V1_RESULTS_DIR = path.join(process.cwd(), 'test-results', 'v1-results');
const V1_RESULTS_FILE = path.join(process.cwd(), 'test-results', 'v1-results.json');
const V1_LOCK_FILE = V1_RESULTS_FILE + '.lock';

// UI Components Validation — shared results file written by uiComponents-validation.spec.ts
const UI_RESULTS_FILE = path.join(process.cwd(), 'test-results', 'ui-components-results.json');

// Mini-Mall Rental Flow results
const MMRENT_RESULTS_DIR = path.join(process.cwd(), 'test-results', 'minimallrent-results');
const MMRENT_RESULTS_FILE = path.join(process.cwd(), 'test-results', 'minimallrent-results.json');
const MMRENT_LOCK_FILE = MMRENT_RESULTS_FILE + '.lock';

const MINI_MALL_TAG = '⭐ MINI MALL';
function isMiniMall(name: string): boolean {
  const s = name.toLowerCase();
  return s.includes('minimall') || s.includes('mini mall') || s.includes('mini-mall');
}

interface UITestResult {
  module: string;
  name: string;
  status: 'PASSED' | 'FAILED' | 'EXPECTED';
  detail?: string;
  timestamp: string;
}

function readUIResults(): UITestResult[] {
  if (!fs.existsSync(UI_RESULTS_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(UI_RESULTS_FILE, 'utf-8')); } catch { return []; }
}

function printUIGrandSummary(): void {
  const allResults = readUIResults();
  if (allResults.length === 0) return;

  const moduleMap = new Map<string, UITestResult[]>();
  for (const r of allResults) {
    if (!moduleMap.has(r.module)) moduleMap.set(r.module, []);
    moduleMap.get(r.module)!.push(r);
  }
  const modules = [...moduleMap.entries()].map(([module, tests]) => ({ module, tests }));

  const totalPassed   = allResults.filter(r => r.status === 'PASSED').length;
  const totalFailed   = allResults.filter(r => r.status === 'FAILED').length;
  const totalExpected = allResults.filter(r => r.status === 'EXPECTED').length;
  const totalTests    = totalPassed + totalFailed + totalExpected;

  console.log('\n\n');
  console.log('#'.repeat(80));
  console.log('##  📊 UI COMPONENTS VALIDATION — GRAND SUMMARY');
  console.log('#'.repeat(80));

  console.log('\n📦 MODULE OVERVIEW:');
  console.log('-'.repeat(80));
  console.log(`   ${'Module'.padEnd(25)} | ${'Passed'.padEnd(8)} | ${'Failed'.padEnd(8)} | ${'Expected'.padEnd(8)} | Total  | Status`);
  console.log('-'.repeat(80));

  for (const m of modules) {
    const p = m.tests.filter(t => t.status === 'PASSED').length;
    const f = m.tests.filter(t => t.status === 'FAILED').length;
    const e = m.tests.filter(t => t.status === 'EXPECTED').length;
    const icon = f === 0 ? '✅' : '❌';
    let statusStr: string;
    if (f === 0) {
      statusStr = e > 0 ? `ALL PASSED (${e} expected fail)` : 'ALL PASSED';
    } else {
      const failedNames = m.tests.filter(t => t.status === 'FAILED').map(t => t.name);
      const namesList = failedNames.length > 3
        ? failedNames.slice(0, 3).join(', ') + ` +${failedNames.length - 3} more`
        : failedNames.join(', ');
      statusStr = `${f} FAILED: ${namesList}`;
    }
    console.log(`   ${m.module.padEnd(25)} | ${String(p).padEnd(8)} | ${String(f).padEnd(8)} | ${String(e).padEnd(8)} | ${String(p + f + e).padEnd(6)} | ${icon} ${statusStr}`);
  }

  console.log('-'.repeat(80));
  const totalStatusStr = totalFailed === 0
    ? (totalExpected > 0 ? `✅ ALL CLEAR (${totalExpected} expected fail)` : '✅ ALL CLEAR')
    : `❌ ${totalFailed} ISSUE(S)`;
  console.log(`   ${'TOTAL'.padEnd(25)} | ${String(totalPassed).padEnd(8)} | ${String(totalFailed).padEnd(8)} | ${String(totalExpected).padEnd(8)} | ${String(totalTests).padEnd(6)} | ${totalStatusStr}`);
  console.log('-'.repeat(80));

  console.log('\n\n📋 ALL CLIENT RESULTS — UI COMPONENTS VALIDATION (per module):');
  console.log('='.repeat(80));

  const clientNames = [...new Set(modules.flatMap(m => m.tests.map(t => t.name)))].filter(n => !isMiniMall(n));

  for (const client of clientNames) {
    const resultsForClient = modules
      .map(m => {
        const t = m.tests.find(t => t.name === client);
        return { module: m.module, ...t };
      })
      .filter(r => r.status);

    const anyFailed = resultsForClient.some(r => r.status === 'FAILED');
    const anyExpected = resultsForClient.some(r => r.status === 'EXPECTED');
    const clientIcon = anyFailed ? '❌' : anyExpected ? '⚠️' : '✅';

    console.log(`\n   ${clientIcon} ${client}`);
    for (const r of resultsForClient) {
      const statusIcon = r.status === 'PASSED' ? '✅' : r.status === 'EXPECTED' ? '⚠️' : '🚩';
      const detailStr = r.detail ? ` → ${r.detail.substring(0, 80)}` : '';
      console.log(`      ${statusIcon} ${r.module}${detailStr}`);
    }
  }

  console.log('\n' + '='.repeat(80));

  const allFailed = modules.flatMap(m => m.tests.filter(t => t.status === 'FAILED').map(t => ({ ...t, module: m.module })));
  const allExpected = modules.flatMap(m => m.tests.filter(t => t.status === 'EXPECTED').map(t => ({ ...t, module: m.module })));

  if (allFailed.length > 0) {
    console.log('\n\n');
    console.log('🚩'.repeat(20));
    console.log('❌  FAILURES THAT NEED ATTENTION:');
    console.log('🚩'.repeat(20));
    allFailed.forEach((f, i) => {
      console.log(`\n   ${i + 1}. ❌ [${f.module}] ${f.name}`);
      if (f.detail) console.log(`      ↳ ${f.detail}`);
    });
    console.log('\n' + '🚩'.repeat(20));
  }

  if (allExpected.length > 0) {
    console.log('\n\n');
    console.log('⚠️'.repeat(20));
    console.log('⚠️  EXPECTED FAILURES (known issues):');
    console.log('⚠️'.repeat(20));
    allExpected.forEach((f, i) => {
      console.log(`\n   ${i + 1}. ⚠️ [${f.module}] ${f.name}`);
      if (f.detail) console.log(`      ↳ ${f.detail}`);
    });
    console.log('\n' + '⚠️'.repeat(20));
  }

  if (allFailed.length === 0 && allExpected.length === 0) {
    console.log('\n\n🎉 ALL TESTS PASSED — NO FAILURES!\n');
  } else if (allFailed.length === 0) {
    console.log('\n\n🎉 ALL TESTS PASSED (expected failures are known issues)\n');
  }

  const allMiniMall = modules.flatMap(m =>
    m.tests.filter(t => isMiniMall(t.name)).map(t => ({ ...t, module: m.module }))
  );

  if (allMiniMall.length > 0) {
    const mmPassed = allMiniMall.filter(t => t.status === 'PASSED').length;
    const mmFailed = allMiniMall.filter(t => t.status === 'FAILED').length;

    console.log('\n\n');
    console.log('⭐'.repeat(20));
    console.log('⭐  MINI MALL STORAGE — DEDICATED REPORT');
    console.log('⭐'.repeat(20));
    console.log(`\n   Results: ✅ ${mmPassed} Passed   ❌ ${mmFailed} Failed   📋 ${allMiniMall.length} Total`);
    console.log('-'.repeat(60));

    for (const t of allMiniMall) {
      const icon = t.status === 'PASSED' ? '✅' : '🚩';
      console.log(`   ${icon} [${t.module}] ${t.name}`);
      if (t.detail) console.log(`      ↳ ${t.detail}`);
    }

    if (mmFailed > 0) {
      console.log('\n   ⚠️  MINI MALL HAS FAILURES — REVIEW ABOVE');
    } else {
      console.log('\n   🎉 MINI MALL — ALL CLEAR!');
    }

    console.log('-'.repeat(60));
    console.log('⭐'.repeat(20));
  }

  console.log('\n' + '#'.repeat(80) + '\n');

  void MINI_MALL_TAG;
}

function readAllResults(): any[] {
  if (!fs.existsSync(RESULTS_DIR)) {
    return [];
  }
  const files = fs.readdirSync(RESULTS_DIR).filter(f => f.endsWith('.json'));
  const results: any[] = [];
  for (const file of files) {
    try {
      const data = fs.readFileSync(path.join(RESULTS_DIR, file), 'utf-8');
      results.push(JSON.parse(data));
    } catch {
      // skip corrupted files
    }
  }
  // Also write consolidated file for easy access
  if (results.length > 0) {
    try { fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2)); } catch { /* ignore */ }
  }
  return results;
}

function readAllV1Results(): any[] {
  if (!fs.existsSync(V1_RESULTS_DIR)) {
    return [];
  }
  const files = fs.readdirSync(V1_RESULTS_DIR).filter(f => f.endsWith('.json'));
  const results: any[] = [];
  for (const file of files) {
    try {
      const data = fs.readFileSync(path.join(V1_RESULTS_DIR, file), 'utf-8');
      results.push(JSON.parse(data));
    } catch {
      // skip corrupted files
    }
  }
  if (results.length > 0) {
    try { fs.writeFileSync(V1_RESULTS_FILE, JSON.stringify(results, null, 2)); } catch { /* ignore */ }
  }
  return results;
}

function readAllMiniMallRentalResults(): any[] {
  if (!fs.existsSync(MMRENT_RESULTS_DIR)) return [];
  const files = fs.readdirSync(MMRENT_RESULTS_DIR).filter(f => f.endsWith('.json'));
  const results: any[] = [];
  for (const file of files) {
    try {
      results.push(JSON.parse(fs.readFileSync(path.join(MMRENT_RESULTS_DIR, file), 'utf-8')));
    } catch { /* skip corrupted */ }
  }
  if (results.length > 0) {
    try { fs.writeFileSync(MMRENT_RESULTS_FILE, JSON.stringify(results, null, 2)); } catch { /* ignore */ }
  }
  return results;
}

function printMiniMallRentalSummary(): void {
  const results = readAllMiniMallRentalResults();
  if (results.length === 0) return;

  const passed = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const total = results.length;
  const rate = ((passed.length / total) * 100).toFixed(1);

  console.log(`\n\n${'⭐'.repeat(50)}`);
  console.log(`⭐  MINI-MALL RENTAL FLOW — FINAL SUMMARY`);
  console.log(`${'⭐'.repeat(50)}\n`);

  console.log(`📊 TEST EXECUTION SUMMARY:`);
  console.log(`   Total Tests : ${total}`);
  console.log(`   ✅ Passed   : ${passed.length}`);
  if (failed.length > 0) {
    console.log(`   ❌ Failed   : ${failed.length}`);
  }
  console.log(`   📈 Success  : ${rate}%\n`);

  console.log(`📋 ALL TEST RESULTS:`);
  console.log(`${'='.repeat(110)}`);
  console.log(`  #  | FMS        | Location                             | Status        | Result`);
  console.log(`${'='.repeat(110)}`);

  results.forEach((result: any, index: number) => {
    const num = String(index + 1).padStart(3);
    const fms = (result.fms || 'Unknown').padEnd(10);
    const company = (result.company || 'Unknown').padEnd(36);
    const status = !result.success ? '❌ FAILED' : '✅ PASSED';
    const statusPad = status.padEnd(13);
    const flowResult = (result.flowResult || '').length > 40
      ? (result.flowResult || '').substring(0, 37) + '...'
      : (result.flowResult || '');
    console.log(`${num}  | ${fms} | ${company} | ${statusPad} | ${flowResult}`);
  });

  console.log(`${'='.repeat(110)}\n`);

  console.log(`🔍 FULL DETAILS:`);
  console.log(`${'='.repeat(110)}\n`);

  results.forEach((result: any, index: number) => {
    const icon = !result.success ? '❌ FAILED' : '✅ PASSED';
    console.log(`${index + 1}. ${icon} — ⭐ Mini Mall ${result.fms || 'Unknown'}`);
    console.log(`   URL:     ${result.url}`);
    console.log(`   FMS:     ${result.fms}`);
    console.log(`   Result:  ${result.flowResult}`);
    console.log(`   Time:    ${new Date(result.timestamp).toLocaleString()}`);
    if (index < results.length - 1) {
      console.log(`   ${'-'.repeat(80)}\n`);
    }
  });

  console.log(`\n${'='.repeat(110)}`);

  if (failed.length > 0) {
    console.log('\n⚠️  MINI-MALL RENTAL HAS FAILURES — REVIEW ABOVE');
  } else {
    console.log('\n🎉 MINI-MALL RENTAL — ALL CLEAR!');
  }

  console.log(`\n${'⭐'.repeat(50)}\n`);

  // Clean up
  try {
    if (fs.existsSync(MMRENT_RESULTS_DIR)) {
      const files = fs.readdirSync(MMRENT_RESULTS_DIR);
      for (const f of files) { try { fs.unlinkSync(path.join(MMRENT_RESULTS_DIR, f)); } catch { /* ignore */ } }
      fs.rmdirSync(MMRENT_RESULTS_DIR);
    }
  } catch { /* ignore */ }
}

async function globalTeardown() {
  // ── Print consolidated V1 results (if any) ──
  const v1Results = readAllV1Results();

  if (v1Results.length > 0) {
    const cleanError = (msg: string) => msg.replace(/^Error Occurred\s*[—–-]+\s*Dismiss\s*[—–-]+\s*/i, '');

    const passedV1 = v1Results.filter(r => r.success);
    const failedV1 = v1Results.filter(r => !r.success);
    const totalV1 = v1Results.length;
    const v1Rate = ((passedV1.length / totalV1) * 100).toFixed(1);

    console.log(`\n\n${'='.repeat(100)}`);
    console.log(`${'='.repeat(100)}`);
    console.log(`🏁  V1 RENT VERIFICATION — FINAL CONSOLIDATED SUMMARY`);
    console.log(`${'='.repeat(100)}`);
    console.log(`${'='.repeat(100)}\n`);

    console.log(`📊 TEST EXECUTION SUMMARY:`);
    console.log(`   Total Tests : ${totalV1}`);
    console.log(`   ✅ Passed   : ${passedV1.length}`);
    if (failedV1.length > 0) {
      console.log(`   ❌ Failed   : ${failedV1.length}`);
    }
    console.log(`   📈 Success  : ${v1Rate}%\n`);

    console.log(`📋 ALL TEST RESULTS:`);
    console.log(`${'='.repeat(100)}`);
    console.log(`  #  | Company                   | Platform   | Status        | Error Message`);
    console.log(`${'='.repeat(100)}`);

    v1Results.forEach((result: any, index: number) => {
      const num = String(index + 1).padStart(3);
      const company = result.company.padEnd(25);
      const platform = result.platform.padEnd(10);
      const status = !result.success ? '❌ FAILED' : '✅ PASSED';
      const statusPad = status.padEnd(13);
      const cleaned = cleanError(result.error);
      const errorPreview = cleaned.length > 45 ? cleaned.substring(0, 42) + '...' : cleaned;
      console.log(`${num}  | ${company} | ${platform} | ${statusPad} | ${errorPreview}`);
    });

    console.log(`${'='.repeat(100)}\n`);

    console.log(`🚨 FULL ERROR MESSAGES:`);
    console.log(`${'='.repeat(100)}\n`);

    v1Results.forEach((result: any, index: number) => {
      const icon = !result.success ? '❌ FAILED' : '✅ PASSED';
      console.log(`${index + 1}. ${icon} — ${result.company} (${result.platform})`);
      console.log(`   URL:     ${result.url}`);
      console.log(`   Message: ${cleanError(result.error)}`);
      if (result.error.includes('Alternate contact must have a first name')) {
        console.log(`   🚩 ATTENTION: Alternate contact address may need to be provided!`);
      }
      console.log(`   Time:    ${new Date(result.timestamp).toLocaleString()}`);
      if (index < v1Results.length - 1) {
        console.log(`   ${'-'.repeat(80)}\n`);
      }
    });

    console.log(`\n${'='.repeat(100)}`);
    console.log(`${'='.repeat(100)}\n`);

    // Clean up individual V1 results directory
    try {
      if (fs.existsSync(V1_RESULTS_DIR)) {
        const files = fs.readdirSync(V1_RESULTS_DIR);
        for (const f of files) { try { fs.unlinkSync(path.join(V1_RESULTS_DIR, f)); } catch { /* ignore */ } }
        fs.rmdirSync(V1_RESULTS_DIR);
      }
    } catch { /* ignore */ }
  }

  try {
    if (fs.existsSync(V1_LOCK_FILE)) {
      fs.unlinkSync(V1_LOCK_FILE);
    }
  } catch { /* ignore */ }

  // ── Print consolidated SPC results (if any) ──
  const allResults = readAllResults();

  if (allResults.length > 0) {
    // Helper to strip "Error Occurred — Dismiss — " prefix
    const cleanError = (msg: string) => msg.replace(/^Error Occurred\s*[—–-]+\s*Dismiss\s*[—–-]+\s*/i, '');

    // Categorize tests
    const passedTests = allResults.filter(r => r.success);
    const failedTests = allResults.filter(r => !r.success);
    const totalTests = allResults.length;
    const successRate = ((passedTests.length / totalTests) * 100).toFixed(1);

    console.log(`\n\n${'='.repeat(100)}`);
    console.log(`${'='.repeat(100)}`);
    console.log(`🏁  SINGLE-PAGE RENT VERIFICATION — FINAL CONSOLIDATED SUMMARY`);
    console.log(`${'='.repeat(100)}`);
    console.log(`${'='.repeat(100)}\n`);

    console.log(`📊 TEST EXECUTION SUMMARY:`);
    console.log(`   Total Tests : ${totalTests}`);
    console.log(`   ✅ Passed   : ${passedTests.length}`);
    if (failedTests.length > 0) {
      console.log(`   ❌ Failed   : ${failedTests.length}`);
    }
    console.log(`   📈 Success  : ${successRate}%\n`);

    // ── RESULTS TABLE ──
    console.log(`📋 ALL TEST RESULTS:`);
    console.log(`${'='.repeat(100)}`);
    console.log(`  #  | Company                   | Platform   | Status        | Error Message`);
    console.log(`${'='.repeat(100)}`);

    allResults.forEach((result, index) => {
      const num = String(index + 1).padStart(3);
      const company = result.company.padEnd(25);
      const platform = result.platform.padEnd(10);
      const isFailed = !result.success;
      const status = isFailed ? '❌ FAILED' : '✅ PASSED';
      const statusPad = status.padEnd(13);
      const cleaned = cleanError(result.error);
      const errorPreview = cleaned.length > 45 ? cleaned.substring(0, 42) + '...' : cleaned;
      console.log(`${num}  | ${company} | ${platform} | ${statusPad} | ${errorPreview}`);
    });

    console.log(`${'='.repeat(100)}\n`);

    // ── FULL ERROR MESSAGES ──
    console.log(`🚨 FULL ERROR MESSAGES:`);
    console.log(`${'='.repeat(100)}\n`);

    allResults.forEach((result, index) => {
      const isFailed = !result.success;
      const icon = isFailed ? '❌ FAILED' : '✅ PASSED';
      console.log(`${index + 1}. ${icon} — ${result.company} (${result.platform})`);
      console.log(`   URL:     ${result.url}`);
      console.log(`   Message: ${cleanError(result.error)}`);
      if (result.retried) {
        console.log(`   🔄 Retried — attempt 1: "${result.attempt1Error}"`);
      }
      if (result.error.includes('Alternate contact must have a first name')) {
        console.log(`   🚩 ATTENTION: Alternate contact address may need to be provided!`);
      }
      console.log(`   Time:    ${new Date(result.timestamp).toLocaleString()}`);
      if (index < allResults.length - 1) {
        console.log(`   ${'-'.repeat(80)}\n`);
      }
    });

    // Flag clients that need manual checking
    const manualCheckClients = allResults.filter((r: any) => r.error.toLowerCase().includes('manual check needed'));
    if (manualCheckClients.length > 0) {
      console.log(`\n🔍 CLIENTS NEEDING MANUAL CHECK (unexpected error persisted after retry):`);
      console.log(`${'─'.repeat(80)}`);
      manualCheckClients.forEach((r: any, i: number) => {
        console.log(`   ${i + 1}. ${r.company} (${r.platform})`);
      });
      console.log(`${'─'.repeat(80)}`);
    }

    // Flag clients that were retried
    const retriedClients = allResults.filter((r: any) => r.retried);
    if (retriedClients.length > 0) {
      console.log(`\n🔄 CLIENTS THAT WERE RETRIED:`);
      console.log(`${'─'.repeat(80)}`);
      retriedClients.forEach((r: any, i: number) => {
        console.log(`   ${i + 1}. ${r.company} — attempt 1: "${r.attempt1Error}" → attempt 2: "${cleanError(r.error)}"`);
      });
      console.log(`${'─'.repeat(80)}`);
    }

    console.log(`\n${'='.repeat(100)}`);
    console.log(`${'='.repeat(100)}\n`);

    // Clean up individual results directory (consolidated file remains)
    try {
      if (fs.existsSync(RESULTS_DIR)) {
        const files = fs.readdirSync(RESULTS_DIR);
        for (const f of files) { try { fs.unlinkSync(path.join(RESULTS_DIR, f)); } catch { /* ignore */ } }
        fs.rmdirSync(RESULTS_DIR);
      }
    } catch { /* ignore */ }
  }

  try {
    if (fs.existsSync(LOCK_FILE)) {
      fs.unlinkSync(LOCK_FILE);
    }
  } catch {
    // ignore lock cleanup failures
  }

  // Print UI Components grand summary (once, after all workers done)
  printUIGrandSummary();

  // Print Mini-Mall Rental flow summary (once, after all workers done)
  printMiniMallRentalSummary();

  try {
    if (fs.existsSync(MMRENT_LOCK_FILE)) fs.unlinkSync(MMRENT_LOCK_FILE);
  } catch { /* ignore */ }

  console.log('\n📊 Test execution completed');
  console.log('💡 To view Allure report, run: npm run allure:serve');
}

export default globalTeardown;