// utils/AdminTestResultCollector.ts

interface AdminTestResult {
  testName: string;
  scenario: string;
  url: string;
  tenant: string;
  verified: string[];
  passed: boolean;
  failed: boolean;
  errorMessage: string;
  timestamp: string;
  duration?: number;
  screenshots?: string[];
}

export class AdminTestResultCollector {
  private results: AdminTestResult[] = [];
  private startTime: number = Date.now();

  /**
   * Add a test result to the collection
   */
  addResult(
    testName: string,
    scenario: string,
    url: string,
    tenant: string,
    verified: string[],
    passed: boolean,
    errorMessage: string = '',
    screenshots: string[] = []
  ): void {
    this.results.push({
      testName,
      scenario,
      url,
      tenant,
      verified,
      passed,
      failed: !passed,
      errorMessage: passed ? 'Test completed successfully' : errorMessage,
      timestamp: new Date().toISOString(),
      duration: Date.now() - this.startTime,
      screenshots
    });
  }

  /**
   * Print comprehensive test results summary
   */
  printDetailedSummary(): void {
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    const successRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : '0.0';
    const totalDuration = (Date.now() - this.startTime) / 1000;

    this.printHeader();
    this.printExecutionSummary(totalTests, passedTests, failedTests, successRate, totalDuration);
    this.printDetailedResults();
    this.printVerificationSummary();
    this.printFailureAnalysis();
    this.printRecommendations(failedTests, successRate);
    this.printFooter();
  }

  private printHeader(): void {
    console.log(`\n${'═'.repeat(80)}`);
    console.log(`STORAGELY ADMIN PLATFORM TEST RESULTS`);
    console.log(`Tenant Context & Navigation Verification`);
    console.log(`${'═'.repeat(80)}`);
  }

  private printExecutionSummary(
    totalTests: number, 
    passedTests: number, 
    failedTests: number, 
    successRate: string, 
    totalDuration: number
  ): void {
    console.log(`\n📊 EXECUTION SUMMARY:`);
    console.log(`${'═'.repeat(80)}`);
    console.log(`   🔢 Total Tests Executed:     ${totalTests.toString().padStart(3)}`);
    console.log(`   ✅ Tests Passed:             ${passedTests.toString().padStart(3)}`);
    console.log(`   ❌ Tests Failed:             ${failedTests.toString().padStart(3)}`);
    console.log(`   📈 Success Rate:             ${successRate.padStart(6)}%`);
    console.log(`   ⏱️  Total Execution Time:    ${totalDuration.toFixed(1).padStart(5)}s`);
    console.log(`   📅 Test Date:                ${new Date().toLocaleDateString()}`);
    console.log(`   🕒 Test Time:                ${new Date().toLocaleTimeString()}`);
    console.log(`${'═'.repeat(80)}`);
  }

  private printDetailedResults(): void {
    console.log(`\n📋 DETAILED TEST RESULTS:`);
    console.log(`${'═'.repeat(100)}`);
    
    this.results.forEach((result, index) => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      
      console.log(`\n${index + 1}. ${result.testName}`);
      console.log(`   Status: ${status}`);
      console.log(`   Scenario: ${result.scenario}`);
      console.log(`   Tenant: ${result.tenant}`);
      console.log(`   URL: ${this.truncate(result.url, 80)}`);
      console.log(`   Verified: ${result.verified.length} items`);
      
      if (!result.passed && result.errorMessage) {
        console.log(`   Error: ${result.errorMessage}`);
      }
      
      if (index < this.results.length - 1) {
        console.log(`   ${'-'.repeat(80)}`);
      }
    });
    console.log(`\n${'═'.repeat(100)}`);
  }

  private printVerificationSummary(): void {
    console.log(`\n🔍 VERIFICATION BREAKDOWN:`);
    console.log(`${'═'.repeat(100)}`);
    
    this.results.forEach((result, index) => {
      console.log(`\n${index + 1}. ${result.testName} - ${result.scenario}`);
      console.log(`   🌐 URL: ${result.url}`);
      console.log(`   🏢 Tenant: ${result.tenant}`);
      console.log(`   ⏱️  Duration: ${result.duration ? (result.duration / 1000).toFixed(1) + 's' : 'N/A'}`);
      console.log(`   📊 Status: ${result.passed ? '✅ PASSED' : '❌ FAILED'}`);
      
      if (result.verified.length > 0) {
        console.log(`   ✓ Verified Items:`);
        result.verified.forEach(item => {
          console.log(`     • ${item}`);
        });
      }
      
      if (!result.passed && result.errorMessage) {
        console.log(`   ❌ Error: ${result.errorMessage}`);
      }
      
      if (result.screenshots && result.screenshots.length > 0) {
        console.log(`   📸 Screenshots: ${result.screenshots.join(', ')}`);
      }
      
      if (index < this.results.length - 1) {
        console.log(`   ${'-'.repeat(80)}`);
      }
    });
    console.log(`${'═'.repeat(100)}`);
  }

  private printFailureAnalysis(): void {
    const failedResults = this.results.filter(r => !r.passed);
    
    if (failedResults.length > 0) {
      console.log(`\n🚨 FAILURE ANALYSIS:`);
      console.log(`${'═'.repeat(100)}`);
      
      // Group failures by type
      const failureTypes = new Map<string, AdminTestResult[]>();
      failedResults.forEach(result => {
        const errorType = this.categorizeError(result.errorMessage);
        if (!failureTypes.has(errorType)) {
          failureTypes.set(errorType, []);
        }
        failureTypes.get(errorType)!.push(result);
      });
      
      failureTypes.forEach((failures, errorType) => {
        console.log(`\n   📌 ${errorType} (${failures.length} occurrence${failures.length > 1 ? 's' : ''}):`);
        failures.forEach(failure => {
          console.log(`     • ${failure.testName}: ${failure.errorMessage}`);
        });
      });
      
      console.log(`${'═'.repeat(100)}`);
    }
  }

  private printRecommendations(failedTests: number, successRate: string): void {
    console.log(`\n💡 SUMMARY:`);
    console.log(`${'═'.repeat(50)}`);
    
    if (failedTests === 0) {
      console.log(`   🎉 ALL TESTS PASSED!`);
    } else if (parseFloat(successRate) >= 80) {
      console.log(`   🔧 Good overall health with ${failedTests} failure(s) to address.`);
    } else if (parseFloat(successRate) >= 50) {
      console.log(`   ⚠️  Moderate success rate - review failures above.`);
    } else {
      console.log(`   🚨 Critical issues detected - immediate attention required!`);
    }
    console.log(`${'═'.repeat(50)}`);
  }

  private printFooter(): void {
    console.log(`\n${'═'.repeat(80)}`);
    console.log(`END OF ADMIN PLATFORM TEST REPORT`);
    console.log(`Generated by Storagely Automation Suite`);
    console.log(`${'═'.repeat(80)}\n`);
  }

  private truncate(text: string, maxLength: number): string {
    return text.length > maxLength ? text.substring(0, maxLength - 3) + '...' : text;
  }

  private categorizeError(errorMessage: string): string {
    const lowerError = errorMessage.toLowerCase();
    
    if (lowerError.includes('tenant') || lowerError.includes('context')) {
      return 'Tenant Context Issues';
    } else if (lowerError.includes('navigation') || lowerError.includes('404') || lowerError.includes('not found')) {
      return 'Navigation Failures';
    } else if (lowerError.includes('timeout') || lowerError.includes('loading')) {
      return 'Performance/Timing Issues';
    } else if (lowerError.includes('element') || lowerError.includes('locator') || lowerError.includes('selector')) {
      return 'UI Element Issues';
    } else if (lowerError.includes('login') || lowerError.includes('auth')) {
      return 'Authentication Issues';
    } else {
      return 'Other Issues';
    }
  }

  // Utility methods for external access
  getResults(): AdminTestResult[] {
    return [...this.results];
  }

  getPassedResults(): AdminTestResult[] {
    return this.results.filter(r => r.passed);
  }

  getFailedResults(): AdminTestResult[] {
    return this.results.filter(r => !r.passed);
  }

  getResultsByScenario(scenario: string): AdminTestResult[] {
    return this.results.filter(r => r.scenario.includes(scenario));
  }

  clear(): void {
    this.results = [];
    this.startTime = Date.now();
  }

  // Export results to JSON for further analysis
  exportToJson(): string {
    return JSON.stringify({
      summary: {
        total: this.results.length,
        passed: this.results.filter(r => r.passed).length,
        failed: this.results.filter(r => !r.passed).length,
        executionTime: Date.now() - this.startTime,
        timestamp: new Date().toISOString()
      },
      results: this.results
    }, null, 2);
  }
}
