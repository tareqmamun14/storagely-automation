// global-teardown.ts
import * as fs from 'fs';
import * as path from 'path';

const RESULTS_DIR = path.join(process.cwd(), 'test-results', 'singlepage-results');
const RESULTS_FILE = path.join(process.cwd(), 'test-results', 'singlepage-results.json');

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

async function globalTeardown() {
  // ── Print consolidated SPC results (if any) ──
  const allResults = readAllResults();

  if (allResults.length > 0) {
    // Helper to strip "Error Occurred — Dismiss — " prefix
    const cleanError = (msg: string) => msg.replace(/^Error Occurred\s*[—–-]+\s*Dismiss\s*[—–-]+\s*/i, '');

    // Categorize tests
    const passedTests = allResults.filter(r => r.success && (!r.attempt || r.attempt === 0));
    const flakyTests = allResults.filter(r => r.success && r.attempt && r.attempt > 0);
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
    if (flakyTests.length > 0) {
      console.log(`   ⚠️  Flaky   : ${flakyTests.length}  (passed on retry)`);
    }
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
      const isFlaky = result.success && result.attempt && result.attempt > 0;
      const isFailed = !result.success;
      // ✅ green for passed, ⚠️ yellow for flaky, ❌ red cross for failed
      const status = isFailed ? '❌ FAILED' : isFlaky ? '⚠️  FLAKY ' : '✅ PASSED';
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
      const isFlaky = result.success && result.attempt && result.attempt > 0;
      const isFailed = !result.success;
      const icon = isFailed ? '❌ FAILED' : isFlaky ? '⚠️  FLAKY' : '✅ PASSED';
      console.log(`${index + 1}. ${icon} — ${result.company} (${result.platform})`);
      console.log(`   URL:     ${result.url}`);
      console.log(`   Message: ${cleanError(result.error)}`);
      if (isFlaky) {
        console.log(`   ⚠️  Passed on retry attempt #${result.attempt}`);
      }
      if (result.error.includes('Alternate contact must have a first name')) {
        console.log(`   🚩 ATTENTION: Alternate contact address may need to be provided!`);
      }
      console.log(`   Time:    ${new Date(result.timestamp).toLocaleString()}`);
      if (index < allResults.length - 1) {
        console.log(`   ${'-'.repeat(80)}\n`);
      }
    });

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

  console.log('\n📊 Test execution completed');
  console.log('💡 To view Allure report, run: npm run allure:serve');
}

export default globalTeardown;