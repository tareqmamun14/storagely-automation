import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true, // Run tests in parallel for speed
  forbidOnly: !!process.env.CI,
  retries: 1, // Retry once (total 2 attempts) for all tests, even when failed or interrupted
  workers: process.env.CI ? 2 : 2, // (reduced to 2 workers) Increased to 3 workers locally for faster execution (8 cores available)
  timeout: 300_000, // 5 minute global safety timeout - individual tests override with test.setTimeout()
  expect: { timeout: 20000 }, // 20 seconds for element checks
  
  reporter: process.env.CI ? [
    ['allure-playwright', { 
      outputFolder: 'allure-results',
      suiteTitle: 'Storagely Automation Tests',
      detail: true,
      environmentInfo: {
        framework: 'Playwright',
        node_version: process.version,
        os: process.platform,
        test_environment: 'Production',
        browser: 'Chrome',
        base_url: 'Multiple Storage Sites'
      },
      categories: [
        {
          name: 'Critical Tests',
          messageRegex: '.*critical.*',
          traceRegex: '.*critical.*'
        },
        {
          name: 'Homepage Tests', 
          messageRegex: '.*landing page.*',
          traceRegex: '.*homepage.*'
        }
      ]
    }],
    ['junit', { outputFile: 'test-results/junit.xml' }]
  ] : [
    ['html', { open: 'never' }],
    ['allure-playwright', {
      outputFolder: 'allure-results',
      suiteTitle: '🏢 Storagely Automation Test Suite',
      detail: true,
      environmentInfo: {
        framework: 'Playwright',
        node_version: process.version,
        os: process.platform,
        test_environment: 'Local Development',
        browser: 'Chrome',
        base_url: 'Multiple Storage Sites',
        tester: 'QA Team',
        build_version: '1.0.0'
      },
      categories: [
        {
          name: '🏠 Homepage Tests',
          messageRegex: '.*landing page.*',
          traceRegex: '.*homepage.*'
        },
        {
          name: '📧 Contact Tests',
          messageRegex: '.*contact.*',
          traceRegex: '.*contact.*'
        },
        {
          name: '🏷️ Banner Tests',
          messageRegex: '.*banner.*',
          traceRegex: '.*banner.*'
        },
        {
          name: '💰 Discount Tests',
          messageRegex: '.*discount.*|.*offer.*',
          traceRegex: '.*discount.*'
        }
      ]
    }]
  ],
  
  use: {
    headless: process.env.CI ? true : false, // Headless in CI, headed locally
    viewport: { width: 1280, height: 720 },
    actionTimeout: 60000, // 60 seconds for slow interactions
    navigationTimeout: 90000, // 90 seconds for slow page loads
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  
  projects: [
    {
      name: 'chrome',
      use: {
        browserName: 'chromium',
        channel: process.env.CI ? undefined : 'chrome', // Use Chrome locally, Chromium in CI
        // Add browser context options to ensure clean state
        contextOptions: {
          ignoreHTTPSErrors: true, // Ignore SSL certificate errors
        },
      },
    },
  ],

  // REMOVED: globalTeardown that was auto-opening browser
  // globalTeardown: require.resolve('./global-teardown'),
});