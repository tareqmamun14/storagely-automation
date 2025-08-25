#!/usr/bin/env node

/**
 * Quick Allure Deploy - Only push docs folder
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

async function quickDeploy() {
  try {
    log('🚀 Quick Allure Report Deployment');
    
    // 1. Generate fresh Allure report
    log('Generating fresh Allure report...');
    runCommand('npm run allure:generate');
    
    // 2. Add only docs folder
    log('Adding docs folder to git...');
    runCommand('git add docs/');
    
    // 3. Commit only docs
    log('Committing Allure report...');
    const commitMessage = `Update Allure Report - ${new Date().toISOString()}`;
    runCommand(`git commit -m "${commitMessage}"`);
    
    // 4. Push only this commit
    log('Pushing to GitHub...');
    runCommand('git push origin main');
    
    log('🎉 Deployment completed successfully!', 'success');
    
    // 5. Open local Allure report
    log('Opening Allure report...');
    runCommand('npm run allure:open');
    
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
    console.log('3. git commit -m "Update Allure Report"');
    console.log('4. git push origin main');
    process.exit(1);
  }
}

quickDeploy();
