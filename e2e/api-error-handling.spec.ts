import { expect, test } from '@playwright/test';

test.describe('API Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    // Enable console logging
    page.on('console', msg => console.log(`BROWSER LOG: ${msg.type()}: ${msg.text()}`));
    
    // Navigate to app
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    
    // Force API mode (disable localStorage override)
    await page.evaluate(() => {
      window.localStorage.clear();
      window.localStorage.removeItem('forceLocalStorage');
    });
    
    // Reload to apply config
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
  });

  test('should display error when API returns 500 on create', async ({ page }) => {
    // Mock API failure
    // Note: The current implementation uses PUT for creation because Todo entities always have IDs
    await page.route('**/todos/*', async route => {
      if (route.request().method() === 'PUT') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Internal Server Error' })
        });
      } else {
        await route.continue();
      }
    });

    const input = page.locator('input').first();
    const button = page.locator('button').first();

    await input.fill('Fail todo');
    await button.click();

    // Verify error message
    const errorMessage = page.locator('.error-message');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText('Internal Server Error');
  });

  test('should display error when API returns 400 on create', async ({ page }) => {
    // Mock API failure
    await page.route('**/todos/*', async route => {
      if (route.request().method() === 'PUT') {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Invalid input' })
        });
      } else {
        await route.continue();
      }
    });

    const input = page.locator('input').first();
    const button = page.locator('button').first();

    await input.fill('Invalid todo');
    await button.click();

    // Verify error message
    const errorMessage = page.locator('.error-message');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText('Invalid input');
  });
});
