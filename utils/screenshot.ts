import { Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// Directory to store error screenshots
const SCREENSHOT_DIR = path.join(__dirname, '../test-results/error-screenshots');

/**
 * Ensure the screenshot directory exists
 */
function ensureScreenshotDir(): void {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }
}

/**
 * Take an error screenshot and save it with a timestamp
 */
export async function takeErrorScreenshot(page: Page, filename: string): Promise<string> {
  try {
    ensureScreenshotDir();
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const screenshotPath = path.join(SCREENSHOT_DIR, `${filename}_${timestamp}.png`);
    
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`📸 Screenshot saved: ${screenshotPath}`);
    
    return screenshotPath;
  } catch (error) {
    console.error(`⚠️  Failed to take screenshot: ${error}`);
    return '';
  }
}

/**
 * Clean up old error screenshots (older than 7 days)
 */
export function cleanupOldErrorScreenshots(daysOld: number = 7): void {
  try {
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      return;
    }
    
    const now = Date.now();
    const files = fs.readdirSync(SCREENSHOT_DIR);
    let deletedCount = 0;
    
    files.forEach((file) => {
      const filePath = path.join(SCREENSHOT_DIR, file);
      const stats = fs.statSync(filePath);
      const ageInDays = (now - stats.mtimeMs) / (1000 * 60 * 60 * 24);
      
      if (ageInDays > daysOld) {
        fs.unlinkSync(filePath);
        deletedCount++;
      }
    });
    
    if (deletedCount > 0) {
      console.log(`🧹 Cleaned up ${deletedCount} old screenshot(s)`);
    }
  } catch (error) {
    console.error(`⚠️  Error during screenshot cleanup: ${error}`);
  }
}
