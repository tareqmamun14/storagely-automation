import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true, // Run tests in parallel for speed
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : 3, // Use 2 workers in CI, 3 locally
  timeout: 120 * 1000, // Increased to 120 seconds for complex admin operations
  expect: { timeout: 15000 }, // Increased for admin page interactions
  
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
    actionTimeout: 45000, // Increased for admin page interactions
    navigationTimeout: 60000, // Increased for admin page navigation
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
      },
    },
  ],

  // REMOVED: globalTeardown that was auto-opening browser
  // globalTeardown: require.resolve('./global-teardown'),
});