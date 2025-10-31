const fs = require('fs');

const filePath = './pages/StorageListingPage_steptwo.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Find and replace the clickRentButton method with optimized version
const oldMethodStart = '  async clickRentButton(): Promise<string | null> {';
const oldMethodEnd = '    }\n  }\n\n  /**\n   * Check for error toast/alert messages';

const newMethod = `  async clickRentButton(): Promise<string | null> {
    const startTime = Date.now();
    console.log(\`[\${new Date().toISOString()}] 🎯 Attempting to click rent button - SPEED OPTIMIZED\`);
    
    try {
      // Minimal page load wait
      await this.page.waitForLoadState('domcontentloaded');
      await this.wait(500);
      
      console.log(\`[\${new Date().toISOString()}] ⏳ Searching for rent button...\`);
      
      // Try strategies in order, break on first found
      const strategies = [
        () => this.page.getByRole('link', { name: /^rent$/i }).first(),
        () => this.page.locator('.listviewrows .blackBtnStoragely:has-text("RENT")').first(),
        () => this.page.getByRole('link', { name: /RENT NOW/i }).first(),
        () => this.page.getByRole('link').filter({ hasText: /rent/i }).first(),
        () => this.page.getByRole('button', { name: /rent/i }).first()
      ];
      
      let rentButtonLocator = null;
      for (const strategy of strategies) {
        try {
          const locator = strategy();
          if (await locator.isVisible({ timeout: 1000 })) {
            rentButtonLocator = locator;
            console.log(\`[\${new Date().toISOString()}] ✅ Rent button found!\`);
            break;
          }
        } catch { continue; }
      }
      
      if (!rentButtonLocator) {
        throw new Error('No rent button found');
      }
      
      const buttonText = await rentButtonLocator.textContent();
      console.log(\`[\${new Date().toISOString()}] 📝 Button text: \${buttonText?.trim()}\`);
      
      // Click immediately
      await rentButtonLocator.scrollIntoViewIfNeeded();
      await rentButtonLocator.click();
      console.log(\`[\${new Date().toISOString()}] ✅ Rent button clicked\`);
      
      await this.wait(1000);
      
      const currentUrl = this.page.url();
      console.log(\`[\${new Date().toISOString()}] 🌐 URL: \${currentUrl}\`);
      
      if (currentUrl.includes('/storage-units-near-me') || currentUrl.includes('/find-storage')) {
        throw new Error(\`Wrong button clicked - navigated to \${currentUrl}\`);
      }
      
      // Handle VBP if needed
      if (buttonText?.includes("Select Pricing Option")) {
        console.log(\`[\${new Date().toISOString()}] 🔀 Handling VBP...\`);
        await this.vbpRentButton.waitFor({ state: 'visible', timeout: 10000 });
        await this.vbpRentButton.click();
      }
      
      const totalDuration = Date.now() - startTime;
      console.log(\`[\${new Date().toISOString()}] ✓ Completed in \${totalDuration}ms\`);
      return buttonText;
      
    } catch (error) {
      console.error(\`CRITICAL ERROR: \${(error as Error).message}\`);
      throw new Error(\`Could not find or click rent button - \${(error as Error).message}\`);
    }
  }

  /**
   * Check for error toast/alert messages`;

const startIdx = content.indexOf(oldMethodStart);
const endIdx = content.indexOf(oldMethodEnd);

if (startIdx !== -1 && endIdx !== -1) {
  const before = content.substring(0, startIdx);
  const after = content.substring(endIdx);
  content = before + newMethod + after;
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ Successfully optimized clickRentButton method!');
} else {
  console.error('❌ Could not find method boundaries');
}
