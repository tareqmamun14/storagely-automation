// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true, // Enable parallel execution
  workers: process.env.CI ? 2 : '50%', // Use 50% of available CPU cores
  timeout: 30 * 1000,
  expect: { timeout: 5000 },
  reporter: 'html',
  use: {
    headless: false, // Run in headed mode
    viewport: { width: 1280, height: 720 },
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chrome',
      use: {
        browserName: 'chromium',
        channel: 'chrome', // Use the installed Chrome browser
      },
    },
  ],
});

