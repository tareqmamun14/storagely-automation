// import { defineConfig, devices } from '@playwright/test';

// /**
//  * Read environment variables from file.
//  * https://github.com/motdotla/dotenv
//  */
// // require('dotenv').config();

// /**
//  * See https://playwright.dev/docs/test-configuration.
//  */
// export default defineConfig({
//   timeout: 120000, // Global timeout of 2 minutes
//   expect: {
//     timeout: 30000,
//   },
//   testDir: './tests',
//   /* Run tests in files in parallel */
//   fullyParallel: true,
//   /* Fail the build on CI if you accidentally left test.only in the source code. */
//   forbidOnly: !!process.env.CI,
//   /* Retry on CI only */
//   //retries: process.env.CI ? 2 : 0,
//   /* Opt out of parallel tests on CI. */
//   workers: process.env.CI ? 1 : undefined,
//   /* Reporter to use. See https://playwright.dev/docs/test-reporters */
//   reporter: [
//     [ 'html', { outputFolder: 'playwright-report' }],
//     ['list']
//   ],
//   /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
//   use: {
//     actionTimeout: 60000,
//     navigationTimeout: 60000,
//     baseURL: 'https://legacy-test.storagely-api.com',
//     screenshot: 'only-on-failure',
//     video: 'retain-on-failure',
//     trace: 'retain-on-failure',
//     /* Base URL to use in actions like `await page.goto('/')`. */
//     headless: false,
//     //baseURL: 'https://legacy-test.storagely-api.com/10-federal-storage/storage-units/north-carolina/high-point/greensboro-road',
//     /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
//   },

//   /* Configure projects for major browsers */
//   projects: [
//     {
//       name: 'chromium',
//       use: { ...devices['Desktop Chrome'] },
//     },

//     /* Test against mobile viewports. */
//     // {
//     //   name: 'Mobile Chrome',
//     //   use: { ...devices['Pixel 5'] },
//     // },
//     // {
//     //   name: 'Mobile Safari',
//     //   use: { ...devices['iPhone 12'] },
//     // },

//     /* Test against branded browsers. */
//     // {
//     //   name: 'Microsoft Edge',
//     //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
//     // },
//     // {
//     //   name: 'Google Chrome',
//     //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
//     // },
//   ],

//   /* Run your local dev server before starting the tests */
//   // webServer: {
//   //   command: 'npm run start',
//   //   url: 'http://127.0.0.1:3000',
//   //   reuseExistingServer: !process.env.CI,
//   // },
// });


// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  workers: process.env.CI ? 2 : 5,
  timeout: 30 * 1000,
  expect: { timeout: 5000 },
  reporter: 'html',
  projects: [
    {
      name: 'chrome',
      use: {
        // Use the actual installed Google Chrome instead of bundled Chromium
        browserName: 'chromium',
        channel: 'chrome',  // This uses the Chrome channel
        headless: false,    // Set to false to see the browser window
        viewport: { width: 1280, height: 720 },
      },
    },
    // You can define additional projects for other browsers if needed.
  ],
});
