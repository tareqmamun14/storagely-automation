// global-teardown.ts
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function globalTeardown() {
  // Only run in local environment (not CI)
  if (process.env.CI) {
    console.log('⏭️  Skipping Allure auto-open in CI environment');
    return;
  }

  console.log('🔄 Generating Allure report...');
  
  try {
    // Generate Allure report
    await execAsync('npx allure generate allure-results --clean -o allure-report');
    console.log('✅ Allure report generated successfully');
    
    // Auto-open Allure report
    console.log('🚀 Opening Allure report in browser...');
    
    // Cross-platform browser opening
    const platform = process.platform;
    let openCommand = '';
    
    if (platform === 'darwin') {
      // macOS
      openCommand = 'open allure-report/index.html';
    } else if (platform === 'win32') {
      // Windows
      openCommand = 'start "" "allure-report/index.html"';
    } else {
      // Linux
      openCommand = 'xdg-open allure-report/index.html';
    }
    
    await execAsync(openCommand);
    console.log('✅ Allure report opened in browser');
    
    // Give some time for the browser to open before the process ends
    await new Promise(resolve => setTimeout(resolve, 2000));
    
  } catch (error) {
    console.error('❌ Error with Allure report:', error);
    console.log('💡 You can manually generate and open the report with:');
    console.log('   npm run allure:generate');
    console.log('   npm run allure:open');
  }
}

export default globalTeardown;