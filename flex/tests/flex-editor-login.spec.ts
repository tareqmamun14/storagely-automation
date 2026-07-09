import { test, expect } from '@playwright/test';
import { FlexLoginPage } from '../pages/FlexLoginPage';
import { FlexEditorPage } from '../pages/FlexEditorPage';
import { FLEX_EDITOR_CREDENTIALS } from '../configs/credentials';
import { FLEX_EDITOR_URLS } from '../configs/urls';

test.describe('Flex Editor — Login & Access', () => {

  test('should log into Flex editor with work credentials', async ({ page }) => {
    const loginPage = new FlexLoginPage(page);
    const editorPage = new FlexEditorPage(page);

    await loginPage.goto(FLEX_EDITOR_URLS.login);
    await loginPage.login(
      FLEX_EDITOR_CREDENTIALS.email,
      FLEX_EDITOR_CREDENTIALS.password,
    );
    await loginPage.verifyLoggedIn();

    await editorPage.goto(FLEX_EDITOR_URLS.editor);
    await editorPage.verifyEditorLoaded();

    const title = await editorPage.getPageTitle();
    console.log('🏗️ Flex editor page title:', title);
  });

});
