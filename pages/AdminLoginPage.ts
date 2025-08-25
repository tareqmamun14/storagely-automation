// pages/AdminLoginPage.ts

import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class AdminLoginPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Locators
  private get emailInput() { return this.page.getByRole('textbox', { name: 'Email Address' }); }
  private get passwordInput() { return this.page.getByRole('textbox', { name: 'Password' }); }
  private get loginButton() { return this.page.getByRole('button', { name: 'Login' }); }
  private get dashboardHeading() { return this.page.getByRole('heading', { name: 'Dashboard' }); }

  /**
   * Login with admin credentials
   * @param email Admin email
   * @param password Admin password
   */
  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  /**
   * Verify that the login was successful
   */
  async verifyLoginSuccess(): Promise<void> {
    const heading = this.dashboardHeading;
    console.log("Admin Page Header: " + await heading.innerText());
    await expect(heading).toHaveText(/Dashboard/);
  }
}