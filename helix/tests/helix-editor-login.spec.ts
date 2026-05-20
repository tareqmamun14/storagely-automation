import { test, expect } from '@playwright/test';
import { HelixLoginPage } from '../pages/HelixLoginPage';
import { HelixEditorPage } from '../pages/HelixEditorPage';
import { HELIX_EDITOR_CREDENTIALS } from '../configs/credentials';
import { HELIX_EDITOR_URLS } from '../configs/urls';

test.describe('Helix Editor — Login & Access', () => {

  test('should log into Helix editor with work credentials', async ({ page }) => {
    const loginPage = new HelixLoginPage(page);
    const editorPage = new HelixEditorPage(page);

    await loginPage.goto(HELIX_EDITOR_URLS.login);
    await loginPage.login(
      HELIX_EDITOR_CREDENTIALS.email,
      HELIX_EDITOR_CREDENTIALS.password,
    );
    await loginPage.verifyLoggedIn();

    await editorPage.goto(HELIX_EDITOR_URLS.editor);
    await editorPage.verifyEditorLoaded();

    const title = await editorPage.getPageTitle();
    console.log('🏗️ Helix editor page title:', title);
  });

});
