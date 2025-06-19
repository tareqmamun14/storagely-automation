import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true, // Run tests in parallel for speed
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : 3, // Use 2 workers in CI, 3 locally
  timeout: 60 * 1000, // Increased to 60 seconds for payment processing
  expect: { timeout: 10000 }, // Increased for payment form interactions
  
  reporter: process.env.CI ? [
    ['html'],
    ['allure-playwright', { 
      outputFolder: 'allure-results',
      suiteTitle: 'Storagely Automation Tests',
      detail: true,
      environmentInfo: {
        framework: 'Playwright',
        node_version: process.version,
        os: process.platform
      }
    }],
    ['junit', { outputFile: 'test-results/junit.xml' }]
  ] : [
    ['html'],
    ['allure-playwright', {
      outputFolder: 'allure-results',
      suiteTitle: 'Storagely Automation Tests',
      detail: true,
      environmentInfo: {
        framework: 'Playwright',
        node_version: process.version,
        os: process.platform
      }
    }]
  ],
  
  use: {
    headless: process.env.CI ? true : false, // Headless in CI, headed locally
    viewport: { width: 1280, height: 720 },
    actionTimeout: 30000, // Added for payment forms
    navigationTimeout: 45000, // Added for payment redirects
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

  // Add global teardown for auto-opening Allure report
  globalTeardown: require.resolve('./global-teardown'),
});