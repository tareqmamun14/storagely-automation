// utils/ResultCollector.ts

/**
 * A class to collect and report test results
 */
export class ResultCollector {
    private results: Array<{
      url: string;
      companyName: string;
      platform: string;
      error: string | null;
      success: boolean;
    }> = [];
  
    /**
     * Add a test result
     */
    addResult(url: string, companyName: string, platform: string, error: string | null, success: boolean): void {
      this.results.push({
        url,
        companyName,
        platform,
        error,
        success
      });
    }
  
    /**
     * Print a summary of all test results
     */
    printSummary(): void {
      console.log('\n\n======== PAYMENT VERIFICATION TEST RESULTS ========');
      console.log('------------------------------------------------');
      
      // Count successful and failed tests
      const successful = this.results.filter(r => r.success).length;
      const failed = this.results.filter(r => !r.success).length;
      
      console.log(`Total Tests: ${this.results.length}`);
      console.log(`✅ Successful: ${successful}`);
      console.log(`❌ Failed: ${failed}`);
      console.log('------------------------------------------------');
      
      // Print all errors by company
      console.log('\nERROR MESSAGES BY COMPANY:');
      this.results.forEach(result => {
        if (result.error) {
          console.log(`\n${result.companyName} (${result.platform || 'Unknown Platform'}):`);
          console.log(`URL: ${result.url}`);
          console.log(`Error: ${result.error}`);
          console.log('------------------------------------------------');
        }
      });
      
      console.log('\n');
    }
  }