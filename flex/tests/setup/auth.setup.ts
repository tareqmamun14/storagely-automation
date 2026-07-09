import { test as setup, expect } from '@playwright/test';
import { FLEX_EDITOR_URLS } from '../../configs/urls';
import { FLEX_EDITOR_CREDENTIALS } from '../../configs/credentials';
import { FlexLoginPage } from '../../pages/FlexLoginPage';
import * as path from 'path';
import * as fs from 'fs';

const AUTH_FILE = path.join(__dirname, '..', '..', 'fixtures', 'auth', 'editor.json');

setup('authenticate to Flex editor', async ({ page }) => {
  setup.setTimeout(60_000);

  if (!FLEX_EDITOR_CREDENTIALS.password) {
    throw new Error(
      'FLEX_PASSWORD env var is not set. ' +
      'Set it in the control panel password field or export FLEX_PASSWORD in your shell.'
    );
  }

  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });

  const loginPage = new FlexLoginPage(page);
  await loginPage.goto(FLEX_EDITOR_URLS.login);
  await loginPage.login(FLEX_EDITOR_CREDENTIALS.email, FLEX_EDITOR_CREDENTIALS.password);
  await loginPage.expectLoggedIn();

  await page.context().storageState({ path: AUTH_FILE });
});
