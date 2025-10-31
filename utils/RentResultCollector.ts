// // utils/ResultCollector.ts

// /**
//  * A class to collect and report test results
//  */
// export class ResultCollector {
//     private results: Array<{
//       url: string;
//       companyName: string;
//       platform: string;
//       error: string | null;
//       success: boolean;
//     }> = [];
  
//     /**
//      * Add a test result
//      */
//     addResult(url: string, companyName: string, platform: string, error: string | null, success: boolean): void {
//       this.results.push({
//         url,
//         companyName,
//         platform,
//         error,
//         success
//       });
//     }
  
//     /**
//      * Print a summary of all test results
//      */
//     printSummary(): void {
//       console.log('\n\n======== PAYMENT VERIFICATION TEST RESULTS ========');
//       console.log('------------------------------------------------');
      
//       // Count successful and failed tests
//       const successful = this.results.filter(r => r.success).length;
//       const failed = this.results.filter(r => !r.success).length;
      
//       console.log(`Total Tests: ${this.results.length}`);
//       console.log(`✅ Successful: ${successful}`);
//       console.log(`❌ Failed: ${failed}`);
//       console.log('------------------------------------------------');
      
//       // Print all errors by company
//       console.log('\nERROR MESSAGES BY COMPANY:');
//       this.results.forEach(result => {
//         if (result.error) {
//           console.log(`\n${result.companyName} (${result.platform || 'Unknown Platform'}):`);
//           console.log(`URL: ${result.url}`);
//           console.log(`Error: ${result.error}`);
//           console.log('------------------------------------------------');
//         }
//       });
      
//       console.log('\n');
//     }
//   }

// utils/ResultCollector.ts
//==============
// export interface TestResult {
//   url: string;
//   company: string;
//   platform: string;
//   error: string;
//   success: boolean;
//   timestamp: string;
// }

// export class ResultCollector {
//   private results: TestResult[] = [];

//   addResult(url: string, company: string, platform: string, error: string, success: boolean): void {
//     this.results.push({
//       url,
//       company,
//       platform,
//       error,
//       success,
//       timestamp: new Date().toISOString()
//     });
//   }

//   printSummary(): void {
//     const totalTests = this.results.length;
//     const successfulTests = this.results.filter(r => r.success).length;
//     const failedTests = totalTests - successfulTests;
//     const successRate = totalTests > 0 ? ((successfulTests / totalTests) * 100).toFixed(1) : '0.0';

//     console.log(`\n📊 OVERALL STATISTICS:`);
//     console.log(`   Total Tests: ${totalTests}`);
//     console.log(`   ✅ Successful: ${successfulTests}`);
//     console.log(`   ❌ Failed: ${failedTests}`);
//     console.log(`   📈 Success Rate: ${successRate}%`);
    
//     if (failedTests > 0) {
//       console.log(`\n❌ FAILED TESTS DETAILS:`);
//       console.log(`${'─'.repeat(120)}`);
//       console.log(`${'Company'.padEnd(25)} | ${'Platform'.padEnd(12)} | ${'Error'.padEnd(70)}`);
//       console.log(`${'─'.repeat(120)}`);
      
//       this.results
//         .filter(r => !r.success)
//         .forEach(result => {
//           const company = result.company.length > 24 ? result.company.substring(0, 21) + '...' : result.company;
//           const platform = result.platform.length > 11 ? result.platform.substring(0, 8) + '...' : result.platform;
//           const error = result.error.length > 69 ? result.error.substring(0, 66) + '...' : result.error;
//           console.log(`${company.padEnd(25)} | ${platform.padEnd(12)} | ${error.padEnd(70)}`);
//         });
//       console.log(`${'─'.repeat(120)}`);
//     }

//     if (successfulTests > 0) {
//       console.log(`\n✅ SUCCESSFUL TESTS DETAILS:`);
//       console.log(`${'─'.repeat(120)}`);
//       console.log(`${'Company'.padEnd(25)} | ${'Platform'.padEnd(12)} | ${'Result'.padEnd(70)}`);
//       console.log(`${'─'.repeat(120)}`);
      
//       this.results
//         .filter(r => r.success)
//         .forEach(result => {
//           const company = result.company.length > 24 ? result.company.substring(0, 21) + '...' : result.company;
//           const platform = result.platform.length > 11 ? result.platform.substring(0, 8) + '...' : result.platform;
//           const error = result.error.length > 69 ? result.error.substring(0, 66) + '...' : result.error;
//           console.log(`${company.padEnd(25)} | ${platform.padEnd(12)} | ${error.padEnd(70)}`);
//         });
//       console.log(`${'─'.repeat(120)}`);
//     }

//     // Group results by platform for platform-specific insights
//     const platformStats = this.results.reduce((acc, result) => {
//       if (!acc[result.platform]) {
//         acc[result.platform] = { total: 0, successful: 0, failed: 0 };
//       }
//       acc[result.platform].total++;
//       if (result.success) {
//         acc[result.platform].successful++;
//       } else {
//         acc[result.platform].failed++;
//       }
//       return acc;
//     }, {} as Record<string, { total: number; successful: number; failed: number }>);

//     if (Object.keys(platformStats).length > 1) {
//       console.log(`\n🔍 PLATFORM BREAKDOWN:`);
//       console.log(`${'─'.repeat(80)}`);
//       console.log(`${'Platform'.padEnd(15)} | ${'Total'.padEnd(8)} | ${'Success'.padEnd(10)} | ${'Failed'.padEnd(8)} | ${'Rate'.padEnd(8)}`);
//       console.log(`${'─'.repeat(80)}`);
      
//       Object.entries(platformStats).forEach(([platform, stats]) => {
//         const rate = stats.total > 0 ? ((stats.successful / stats.total) * 100).toFixed(1) + '%' : '0.0%';
//         console.log(`${platform.padEnd(15)} | ${stats.total.toString().padEnd(8)} | ${stats.successful.toString().padEnd(10)} | ${stats.failed.toString().padEnd(8)} | ${rate.padEnd(8)}`);
//       });
//       console.log(`${'─'.repeat(80)}`);
//     }

//     // Show most common error types
//     if (failedTests > 0) {
//       const errorTypes = this.results
//         .filter(r => !r.success)
//         .reduce((acc, result) => {
//           // Extract error type from error message (first part before colon or first few words)
//           const errorType = result.error.split(':')[0].trim();
//           acc[errorType] = (acc[errorType] || 0) + 1;
//           return acc;
//         }, {} as Record<string, number>);

//       const sortedErrors = Object.entries(errorTypes)
//         .sort(([,a], [,b]) => b - a)
//         .slice(0, 5); // Top 5 error types

//       if (sortedErrors.length > 0) {
//         console.log(`\n🔍 MOST COMMON ERROR TYPES:`);
//         console.log(`${'─'.repeat(60)}`);
//         sortedErrors.forEach(([errorType, count]) => {
//           const percentage = ((count / failedTests) * 100).toFixed(1);
//           console.log(`   ${errorType.padEnd(45)} | ${count.toString().padStart(3)} (${percentage}%)`);
//         });
//         console.log(`${'─'.repeat(60)}`);
//       }
//     }

//     // FULL COMPREHENSIVE STATISTICS TABLE
//     console.log(`\n${'🏆 COMPLETE TEST RESULTS OVERVIEW 🏆'.padStart(60)}`);
//     console.log(`${'═'.repeat(140)}`);
//     console.log(`${'#'.padEnd(4)} | ${'Company Name'.padEnd(30)} | ${'Platform'.padEnd(12)} | ${'Status'.padEnd(8)} | ${'Result/Error Message'.padEnd(75)}`);
//     console.log(`${'═'.repeat(140)}`);
    
//     this.results.forEach((result, index) => {
//       const num = (index + 1).toString().padEnd(4);
//       const company = result.company.length > 29 ? result.company.substring(0, 26) + '...' : result.company.padEnd(30);
//       const platform = result.platform.length > 11 ? result.platform.substring(0, 8) + '...' : result.platform.padEnd(12);
//       const status = result.success ? '✅ PASS'.padEnd(8) : '❌ FAIL'.padEnd(8);
//       const message = result.error.length > 74 ? result.error.substring(0, 71) + '...' : result.error.padEnd(75);
      
//       console.log(`${num} | ${company} | ${platform} | ${status} | ${message}`);
//     });
//     console.log(`${'═'.repeat(140)}`);

//     // FINAL GIANT SUMMARY BOX
//     const boxWidth = 100;
//     const padding = Math.floor((boxWidth - 20) / 2);
    
//     console.log(`\n${'█'.repeat(boxWidth)}`);
//     console.log(`█${' '.repeat(boxWidth - 2)}█`);
//     console.log(`█${'FINAL TEST EXECUTION SUMMARY'.padStart(padding + 20).padEnd(boxWidth - 2)}█`);
//     console.log(`█${' '.repeat(boxWidth - 2)}█`);
//     console.log(`█   📊 TOTAL TESTS EXECUTED: ${totalTests.toString().padStart(10)}${' '.repeat(boxWidth - 40)}█`);
//     console.log(`█   ✅ SUCCESSFUL TESTS:     ${successfulTests.toString().padStart(10)}${' '.repeat(boxWidth - 40)}█`);
//     console.log(`█   ❌ FAILED TESTS:         ${failedTests.toString().padStart(10)}${' '.repeat(boxWidth - 40)}█`);
//     console.log(`█   📈 SUCCESS RATE:         ${successRate.padStart(9)}%${' '.repeat(boxWidth - 40)}█`);
//     console.log(`█   🕒 EXECUTION TIME:       ${new Date().toLocaleTimeString().padStart(10)}${' '.repeat(boxWidth - 40)}█`);
//     console.log(`█   📅 DATE:                 ${new Date().toLocaleDateString().padStart(10)}${' '.repeat(boxWidth - 40)}█`);
//     console.log(`█${' '.repeat(boxWidth - 2)}█`);
    
//     // Status indicator
//     if (failedTests === 0) {
//       console.log(`█${'🎉 ALL TESTS PASSED - EXCELLENT! 🎉'.padStart(padding + 18).padEnd(boxWidth - 2)}█`);
//     } else if (successfulTests === 0) {
//       console.log(`█${'⚠️  ALL TESTS FAILED - NEEDS ATTENTION ⚠️'.padStart(padding + 22).padEnd(boxWidth - 2)}█`);
//     } else {
//       const ratio = `${successfulTests}/${totalTests}`;
//       console.log(`█${'⚡ PARTIAL SUCCESS - REVIEW FAILURES ⚡'.padStart(padding + 21).padEnd(boxWidth - 2)}█`);
//       console.log(`█${'(' + ratio + ' tests passed)'.padStart(padding + 8).padEnd(boxWidth - 2)}█`);
//     }
    
//     console.log(`█${' '.repeat(boxWidth - 2)}█`);
//     console.log(`${'█'.repeat(boxWidth)}`);

//     // Final summary message with recommendations
//     console.log(`\n🔍 RECOMMENDATIONS:`);
//     if (failedTests === 0) {
//       console.log(`   🎯 All systems are working perfectly! Consider this test suite for CI/CD integration.`);
//     } else if (successRate >= '80') {
//       console.log(`   🔧 Good overall performance. Focus on fixing the ${failedTests} failed test(s) above.`);
//     } else if (successRate >= '50') {
//       console.log(`   ⚠️  Moderate success rate. Review failed tests and consider infrastructure improvements.`);
//     } else {
//       console.log(`   🚨 Low success rate indicates systematic issues. Prioritize debugging and infrastructure review.`);
//     }
    
//     console.log(`\n${'END OF PAYMENT VERIFICATION TEST REPORT'.padStart(50)}`);
//     console.log(`${'═'.repeat(100)}\n`);
//   }

//   getResults(): TestResult[] {
//     return [...this.results];
//   }

//   getFailedResults(): TestResult[] {
//     return this.results.filter(r => !r.success);
//   }

//   getSuccessfulResults(): TestResult[] {
//     return this.results.filter(r => r.success);
//   }

//   clear(): void {
//     this.results = [];
//   }
// }

// utils/ResultCollector.ts

interface TestResult {
  url: string;
  company: string;
  platform: string;
  error: string;
  success: boolean;
  timestamp: string;
}

export class RentResultCollector{
  private results: TestResult[] = [];

  addResult(url: string, company: string, platform: string, error: string, success: boolean): void {
    this.results.push({
      url,
      company,
      platform,
      error,
      success,
      timestamp: new Date().toISOString()
    });
  }

  printSummary(): void {
    const totalTests = this.results.length;
    const successfulTests = this.results.filter(r => r.success).length;
    const failedTests = totalTests - successfulTests;
    
    console.log(`\n📊 TEST EXECUTION SUMMARY:`);
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   ✅ Successful: ${successfulTests}`);
    console.log(`   ❌ Failed: ${failedTests}`);
    console.log(`   📈 Success Rate: ${totalTests > 0 ? ((successfulTests / totalTests) * 100).toFixed(1) : 0}%`);
    
    if (this.results.length === 0) {
      console.log('\n⚠️  No test results to display');
      return;
    }

    // Print detailed results
    console.log(`\n📋 DETAILED RESULTS:`);
    console.log(`${'='.repeat(120)}`);
    console.log(`${'Company'.padEnd(25)} | ${'Platform'.padEnd(10)} | ${'Status'.padEnd(8)} | Error Message`);
    console.log(`${'='.repeat(120)}`);

    this.results.forEach(result => {
      const statusIcon = result.success ? '✅ PASS' : '❌ FAIL';
      
      console.log(
        `${result.company.padEnd(25)} | ` +
        `${result.platform.padEnd(10)} | ` +
        `${statusIcon.padEnd(8)} | ` +
        `${result.error}`
      );
    });

    console.log(`${'='.repeat(120)}`);

    // Group by platform for platform-specific insights
    this.printPlatformSummary();

    // Print all error messages in full
    this.printAllErrors();
  }

  private printPlatformSummary(): void {
    const platformStats = new Map<string, { total: number; success: number }>();
    
    this.results.forEach(result => {
      if (!platformStats.has(result.platform)) {
        platformStats.set(result.platform, { total: 0, success: 0 });
      }
      const stats = platformStats.get(result.platform)!;
      stats.total++;
      if (result.success) stats.success++;
    });

    if (platformStats.size > 1) {
      console.log(`\n🔧 PLATFORM BREAKDOWN:`);
      platformStats.forEach((stats, platform) => {
        const successRate = ((stats.success / stats.total) * 100).toFixed(1);
        console.log(`   ${platform}: ${stats.success}/${stats.total} (${successRate}%)`);
      });
    }
  }

  private printAllErrors(): void {
    const errorResults = this.results.filter(r => !r.success || (r.success && r.error !== 'No error - Test completed successfully'));
    
    if (errorResults.length > 0) {
      console.log(`\n🚨 ALL ERROR MESSAGES:`);
      console.log(`${'='.repeat(100)}`);
      
      errorResults.forEach((result, index) => {
        const status = result.success ? '⚠️  WARNING' : '❌ ERROR';
        console.log(`\n${index + 1}. ${status} - ${result.company} (${result.platform})`);
        console.log(`   URL: ${result.url}`);
        console.log(`   Message: ${result.error}`);
        console.log(`   Time: ${new Date(result.timestamp).toLocaleString()}`);
        
        if (index < errorResults.length - 1) {
          console.log(`   ${'-'.repeat(80)}`);
        }
      });
      
      console.log(`${'='.repeat(100)}`);
    } else {
      console.log(`\n🎉 ALL TESTS COMPLETED WITHOUT ERRORS!`);
    }
  }

  // Method to get results for further processing if needed
  getResults(): TestResult[] {
    return [...this.results];
  }

  // Method to get only failed results
  getFailedResults(): TestResult[] {
    return this.results.filter(r => !r.success);
  }

  // Method to get results by platform
  getResultsByPlatform(platform: string): TestResult[] {
    return this.results.filter(r => r.platform === platform);
  }
}