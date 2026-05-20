import { test as setup, expect } from '@playwright/test';
import { HELIX_EDITOR_URLS } from '../../configs/urls';
import { HELIX_EDITOR_CREDENTIALS } from '../../configs/credentials';
import { HelixLoginPage } from '../../pages/HelixLoginPage';
import * as path from 'path';
import * as fs from 'fs';

const AUTH_FILE = path.join(__dirname, '..', '..', 'fixtures', 'auth', 'editor.json');

setup('authenticate to Helix editor', async ({ page }) => {
  setup.setTimeout(60_000);

  if (!HELIX_EDITOR_CREDENTIALS.password) {
    throw new Error(
      'HELIX_PASSWORD env var is not set. ' +
      'Set it in the control panel password field or export HELIX_PASSWORD in your shell.'
    );
  }

  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });

  const loginPage = new HelixLoginPage(page);
  await loginPage.goto(HELIX_EDITOR_URLS.login);
  await loginPage.login(HELIX_EDITOR_CREDENTIALS.email, HELIX_EDITOR_CREDENTIALS.password);
  await loginPage.expectLoggedIn();

  await page.context().storageState({ path: AUTH_FILE });
});
