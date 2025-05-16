// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true, // Run tests in parallel for speed
  workers: 3, // Use multiple workers as requested
  timeout: 60 * 1000, // Increased to 60 seconds for payment processing
  expect: { timeout: 10000 }, // Increased for payment form interactions
  reporter: 'html',
  use: {
    headless: false, // Run in headed mode
    viewport: { width: 1280, height: 720 },
    actionTimeout: 15000, // Added for payment forms
    navigationTimeout: 30000, // Added for payment redirects
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

