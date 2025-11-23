import { expect, test } from '@playwright/test';

test.describe('Create Todos', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    
    // Force localStorage mode and clear data
    await page.evaluate(() => {
      window.localStorage.clear();
      window.localStorage.setItem('forceLocalStorage', 'true');
    });
    
    // Reload to apply config
    await page.reload({ waitUntil: 'networkidle' });
    
    // Longer wait for React + hooks to initialize
    await page.waitForTimeout(2000);
  });

  test('should load input element', async ({ page }) => {
    const input = page.locator('input').first();
    await expect(input).toBeVisible({ timeout: 5000 });
  });

  test('should create a new todo', async ({ page }) => {
    const input = page.locator('input').first();
    const button = page.locator('button').first();

    await input.fill('Buy groceries');
    await button.click();
    await page.waitForTimeout(1000);
    
    const todoText = page.getByText('Buy groceries');
    await expect(todoText).toBeVisible({ timeout: 5000 });
  });
});
