#!/usr/bin/env node

/**
 * Test Runner with Allure Integration
 * This script makes it easy to run tests with Allure reporting
 */

const { execSync, spawn } = require('child_process');
const path = require('path');

const args = process.argv.slice(2);
const command = args[0] || 'help';

function log(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  const prefix = {
    info: '🔵',
    success: '✅',
    error: '❌',
    warning: '⚠️'
  }[type];
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

function runCommand(cmd, options = {}) {
  try {
    log(`Running: ${cmd}`);
    const result = execSync(cmd, { 
      encoding: 'utf8', 
      stdio: options.silent ? 'pipe' : 'inherit',
      cwd: process.cwd(),
      ...options 
    });
    return result;
  } catch (error) {
    log(`Command completed with exit code: ${error.status}`, 'warning');
    // For playwright test commands, continue anyway as tests may have passed
    if (cmd.includes('npx playwright test')) {
      log(`Tests completed. Starting Allure report...`, 'info');
      return null;
    }
    log(`Failed: ${cmd}`, 'error');
    throw error;
  }
}

function startAllureServer() {
  try {
    log('🚀 Starting Allure server automatically...', 'info');
    
    // Use spawn to run npm run allure:serve - this should work like manual command
    const allureProcess = spawn('npm', ['run', 'allure:serve'], {
      stdio: 'inherit',
      shell: true
    });

    log('✅ Allure server is starting...', 'success');
    log('🌐 The browser should open automatically with the Allure report', 'info');
    log('⏹️  Press Ctrl+C to stop the Allure server when done', 'warning');

    // Handle Ctrl+C gracefully
    process.on('SIGINT', () => {
      log('🛑 Stopping Allure server...', 'warning');
      allureProcess.kill('SIGINT');
      process.exit(0);
    });

    // Handle process errors
    allureProcess.on('error', (error) => {
      log(`❌ Allure server error: ${error.message}`, 'error');
      log('💡 You can manually run: npm run allure:serve', 'info');
    });

    // Handle process exit
    allureProcess.on('close', (code) => {
      if (code !== 0 && code !== null) {
        log(`⚠️ Allure server exited with code ${code}`, 'warning');
      }
    });

  } catch (error) {
    log(`❌ Failed to start Allure server: ${error.message}`, 'error');
    log('💡 You can manually run: npm run allure:serve', 'info');
  }
}

function showHelp() {
  console.log(`
🧪 Storagely Test Runner with Allure Integration

Usage: node test-runner.js <command> [options]

Commands:
  test                    Run all tests and generate Allure report
  test:specific <pattern> Run specific tests matching the pattern
  test:banner             Run only banner verification tests
  test:discount           Run only discount verification tests
  test:admin              Run only admin tests
  test:contact            Run only contact page tests
  test:homepage           Run only home page tests
  test:reservation        Run only reservation tests
  test:deploy             Run tests and deploy Allure report to GitHub Pages
  report                  Open existing Allure report
  deploy                  Deploy existing Allure report to GitHub Pages
  clean                   Clean Allure directories
  help                    Show this help

Examples:
  node test-runner.js test
  node test-runner.js test:specific "banner loading"
  node test-runner.js test:banner
  node test-runner.js test:contact
  node test-runner.js test:homepage
  node test-runner.js test:deploy

🌐 The deployed report will be available at your GitHub Pages URL
📊 All logs and test results are captured in the Allure report
`);
}

async function main() {
  console.log('🧪 Storagely Test Runner with Allure Integration\n');

  try {
    switch (command) {
      case 'test':
        log('Running all tests with Allure reporting');
        log('Cleaning previous test results...', 'info');
        runCommand('npm run allure:clean');
        runCommand('npx playwright test');
        startAllureServer();
        break;

      case 'test:specific':
        const pattern = args[1];
        if (!pattern) {
          log('Please provide a test pattern', 'error');
          process.exit(1);
        }
        log(`Running tests matching: ${pattern}`);
        log('Cleaning previous test results...', 'info');
        runCommand('npm run allure:clean');
        runCommand(`npx playwright test --grep "${pattern}"`);
        startAllureServer();
        break;

      case 'test:banner':
        log('Running banner verification tests');
        log('Cleaning previous test results...', 'info');
        runCommand('npm run allure:clean');
        runCommand('npx playwright test --grep "banner loading"');
        startAllureServer();
        break;

      case 'test:discount':
        log('Running discount verification tests');
        log('Cleaning previous test results...', 'info');
        runCommand('npm run allure:clean');
        runCommand('npx playwright test --grep "Offer Text"');
        startAllureServer();
        break;

      case 'test:contact':
        log('Running contact page verification tests');
        log('Cleaning previous test results...', 'info');
        runCommand('npm run allure:clean');
        runCommand('npx playwright test --grep "contact page"');
        startAllureServer();
        break;

      case 'test:homepage':
        log('Running home page verification tests');
        log('Cleaning previous test results...', 'info');
        runCommand('npm run allure:clean');
        runCommand('npx playwright test --grep "landing page"');
        startAllureServer();
        break;

      case 'test:reservation':
        log('Running rent reservation tests');
        log('Cleaning previous test results...', 'info');
        runCommand('npm run allure:clean');
        runCommand('npx playwright test --grep "Payment verification"');
        startAllureServer();
        break;

      case 'test:deploy':
        log('Running tests and deploying Allure report to GitHub Pages');
        log('Cleaning previous test results...', 'info');
        runCommand('npm run allure:clean');
        runCommand('npm run test:deploy');
        log('🌐 Report deployed! Check your GitHub Pages URL', 'success');
        break;

      case 'report':
        log('Opening existing Allure report');
        runCommand('npm run allure:open');
        break;

      case 'deploy':
        log('Deploying existing Allure report');
        runCommand('node scripts/deploy-allure.js');
        break;

      case 'clean':
        log('Cleaning Allure directories');
        runCommand('npm run allure:clean');
        break;

      case 'help':
      default:
        showHelp();
        break;
    }

    if (command !== 'help') {
      log('Operation completed successfully!', 'success');
    }

  } catch (error) {
    log(`Operation failed: ${error.message}`, 'error');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
