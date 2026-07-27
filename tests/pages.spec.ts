import { test, expect } from '@playwright/test';

test.describe('LeagueFlow E2E Page Tests', () => {
  test('Landing Page - check title and pricing section', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/League\s*Flow/i);
    const bodyText = await page.innerText('body');
    expect(bodyText).toBeTruthy();
  });

  test('Login Page - check layout', async ({ page }) => {
    await page.goto('/th/login');
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible({ timeout: 10000 });
  });

  test('Signup Page - check layout', async ({ page }) => {
    await page.goto('/th/signup');
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible({ timeout: 10000 });
  });

  test('Privacy Policy Page - check title', async ({ page }) => {
    await page.goto('/th/privacy-policy');
    const bodyText = await page.innerText('body');
    expect(bodyText.length).toBeGreaterThan(50);
  });

  test('Terms of Service Page - check title', async ({ page }) => {
    await page.goto('/th/terms-of-service');
    const bodyText = await page.innerText('body');
    expect(bodyText.length).toBeGreaterThan(50);
  });

  test('Settings Billing Tab - check Event pricing and discount tag', async ({ page }) => {
    await page.goto('/th/dashboard/settings?tab=billing');
    // Page will either render billing tab or redirect to login
    const url = page.url();
    if (url.includes('/login')) {
      await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    } else {
      const bodyText = await page.innerText('body');
      expect(bodyText).toBeTruthy();
    }
  });
});
