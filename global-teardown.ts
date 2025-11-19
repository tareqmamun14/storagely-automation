// global-teardown.ts
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function globalTeardown() {
  // Disabled auto-open to prevent cluttering with multiple terminal windows
  console.log('\n📊 Test execution completed');
  console.log('💡 To view Allure report, run: npm run allure:serve');
  return;
  console.log('� To view Allure report, run: npm run allure:serve');
  return;
}

export default globalTeardown;