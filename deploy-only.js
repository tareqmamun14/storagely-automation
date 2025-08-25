#!/usr/bin/env node

/**
 * Deploy Only - Push existing Allure reports to GitHub Pages
 * Run this after any test execution to deploy fresh reports
 */

const { execSync } = require('child_process');

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
    log(`Failed: ${cmd}`, 'error');
    throw error;
  }
}

async function deployOnly() {
  try {
    log('🚀 Deploying existing Allure reports to GitHub Pages');
    
    // Check if allure-results exists
    const fs = require('fs');
    if (!fs.existsSync('./allure-results')) {
      log('No allure-results folder found. Run tests first!', 'warning');
      console.log('💡 Run one of these commands first:');
      console.log('   node test-runner.js test');
      console.log('   node test-runner.js test:homepage');
      console.log('   node test-runner.js test:banner');
      process.exit(1);
    }
    
    // 1. Generate fresh Allure report from existing results
    log('Generating Allure report from existing test results...');
    runCommand('npm run allure:generate');
    
    // 2. Add only docs folder
    log('Adding docs folder to git...');
    runCommand('git add docs/');
    
    // 3. Check if there are changes to commit
    try {
      const status = runCommand('git status --porcelain docs/', { silent: true });
      if (!status.trim()) {
        log('No changes in docs folder to deploy', 'warning');
        console.log('💡 Reports are already up to date on GitHub Pages');
        return;
      }
    } catch (error) {
      // Continue with deployment if git status fails
    }
    
    // 4. Commit only docs
    log('Committing Allure report...');
    const commitMessage = `Deploy Allure Report - ${new Date().toISOString()}`;
    runCommand(`git commit -m "${commitMessage}"`);
    
    // 5. Push only this commit
    log('Pushing to GitHub...');
    runCommand('git push origin main');
    
    log('🎉 Deployment completed successfully!', 'success');
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 DEPLOYMENT SUMMARY');
    console.log('='.repeat(60));
    console.log('🌐 Report URL: https://tareqmamun14.github.io/storagely-automation');
    console.log('🕒 Deployed: ' + new Date().toLocaleString());
    console.log('💡 Wait 1-2 minutes for GitHub Pages to update');
    console.log('='.repeat(60));
    
  } catch (error) {
    log(`Deployment failed: ${error.message}`, 'error');
    console.log('\n💡 Try running manually:');
    console.log('1. npm run allure:generate');
    console.log('2. git add docs/');
    console.log('3. git commit -m "Deploy Allure Report"');
    console.log('4. git push origin main');
    process.exit(1);
  }
}

deployOnly();
