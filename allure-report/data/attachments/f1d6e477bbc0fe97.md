# Test info

- Name: Admin Login Test
- Location: C:\Users\tareq\OneDrive\Documents\GitHub\storagely-automation\tests\admin-login.spec.ts:8:5

# Error details

```
TimeoutError: page.goto: Timeout 45000ms exceeded.
Call log:
  - navigating to "https://test.staging.storagely-api.com/10-federal-storage/admin", waiting until "load"

    at C:\Users\tareq\OneDrive\Documents\GitHub\storagely-automation\tests\admin-login.spec.ts:13:14
```

# Page snapshot

```yaml
- img "Loader"
- img "logo"
- textbox "Email Address"
- textbox "Password"
- checkbox "Remember Me"
- text: Remember Me
- button "Login"
```

# Test source

```ts
   1 | // tests/admin-login.spec.ts
   2 |
   3 | import { test } from '@playwright/test';
   4 | import { getCurrentUrls } from '../configs/urls';
   5 | import { ADMIN_CREDENTIALS } from '../configs/credentials';
   6 | import { CURRENT_ENVIRONMENT } from '../configs/urls';
   7 |
   8 | test('Admin Login Test', async ({ page }) => {
   9 |   const urls = getCurrentUrls();
  10 |   const credentials = ADMIN_CREDENTIALS[CURRENT_ENVIRONMENT];
  11 |   
  12 |   // Go to admin page
> 13 |   await page.goto(urls.admin);
     |              ^ TimeoutError: page.goto: Timeout 45000ms exceeded.
  14 |   
  15 |   // Fill login form
  16 |   await page.getByRole('textbox', { name: 'Email Address' }).fill(credentials.email);
  17 |   await page.getByRole('textbox', { name: 'Password' }).fill(credentials.password);
  18 |   await page.getByRole('button', { name: 'Login' }).click();
  19 |   
  20 |   // Check if login was successful
  21 |   const heading = page.getByRole('heading', { name: 'Dashboard' });
  22 |   console.log("Admin Page Header: " + await heading.innerText());
  23 |   await heading.waitFor({ state: 'visible' });
  24 |   
  25 |   await page.close();
  26 | });
```