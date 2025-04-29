// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true, // Enable parallel execution
  workers: 3, // Fixed to run 3 workers
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


// import { defineConfig } from '@playwright/test';

// export default defineConfig({
//   use: {
//     headless: true, // Run in headless mode for speed
//   },
//   workers: 10, // Adjust based on your machine (more workers = faster)
//   timeout: 30000, // Adjust timeout if needed
// });
