// utils/screenshot.ts

import fs from 'fs';
import path from 'path';
import { Page } from '@playwright/test';

/**
 * Clean up old error screenshots
 * @param dir Directory containing screenshots
 */
export function cleanupOldErrorScreenshots(dir: string = './'): void {
  fs.readdir(dir, (err, files) => {
    if (err) {
      console.error('Failed to read directory:', err);
      return;
    }

    files.forEach((file) => {
      if (file.startsWith('error-') && file.endsWith('.png')) {
        fs.unlink(path.join(dir, file), (unlinkErr) => {
          if (unlinkErr) {
            console.error(`Failed to delete ${file}:`, unlinkErr);
          } else {
            console.log(`Deleted old screenshot: ${file}`);
          }
        });
      }
    });
  });
}

/**
 * Take an error screenshot
 * @param page Playwright page
 * @param prefix Optional prefix for the screenshot filename
 * @returns Path to the saved screenshot
 */
export async function takeErrorScreenshot(page: Page, prefix: string = ''): Promise<string | null> {
  if (!page.isClosed()) {
    try {
      const filename = `error-${prefix ? prefix + '-' : ''}${Date.now()}.png`;
      await page.screenshot({ path: filename, fullPage: true });
      return filename;
    } catch (screenshotError) {
      console.error('Failed to take screenshot:', screenshotError);
    }
  }
  return null;
}