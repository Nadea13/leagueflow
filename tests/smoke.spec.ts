import { test, expect } from '@playwright/test';

test.describe('Smoke Test', () => {
  test('should load the home page', async ({ page }) => {
    // Navigate to the home page
    await page.goto('/');

    // Check if the page title or a key element exists
    // We expect "League Flow" to be somewhere on the page
    await expect(page).toHaveTitle(/LeagueFlow/i);
    
    // Check if the main heading or a specific text is visible
    // Adjust this based on the actual content of the home page
    const bodyText = await page.innerText('body');
    expect(bodyText.toLowerCase()).toContain('leagueflow');
  });
});
