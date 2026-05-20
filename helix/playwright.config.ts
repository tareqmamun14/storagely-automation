import { defineConfig } from '@playwright/test';
import path from 'path';

const AUTH_FILE = path.join(__dirname, 'fixtures', 'auth', 'editor.json');

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 1,
  workers: 2,
  timeout: 180_000,
  expect: { timeout: 15_000 },

  reporter: [
    ['html', { outputFolder: '../playwright-report/helix', open: 'never' }],
    ['list'],
  ],

  use: {
    headless: !!process.env.CI,
    viewport: { width: 1440, height: 900 },
    actionTimeout: 30_000,
    navigationTimeout: 60_000,
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    browserName: 'chromium',
    channel: process.env.CI ? undefined : 'chrome',
    ignoreHTTPSErrors: true,
    launchOptions: {
      // Bypass local DNS (CleanBrowsing at 185.228.168.10 times out for sites.apps.mystoragely.com).
      // Force DNS-over-HTTPS via Google so Chromium resolves regardless of the system resolver.
      args: [
        '--enable-features=DnsOverHttps',
        '--dns-over-https-mode=secure',
        '--dns-over-https-templates=https://dns.google/dns-query',
      ],
    },
  },

  projects: [
    {
      name: 'setup',
      testMatch: 'setup/**/*.setup.ts',
    },
    {
      name: 'editor',
      testMatch: 'editor/**/*.spec.ts',
      testIgnore: 'editor/_discovery/**/*.spec.ts',
      dependencies: ['setup'],
      use: { storageState: AUTH_FILE },
    },
    {
      name: 'discovery',
      testMatch: 'editor/_discovery/**/*.spec.ts',
      dependencies: ['setup'],
      use: { storageState: AUTH_FILE, headless: false },
      timeout: 240_000,
      retries: 0,
    },
    {
      name: 'live',
      testMatch: ['live/**/*.spec.ts', 'e2e/**/*.spec.ts'],
      fullyParallel: true,
    },
  ],
});
