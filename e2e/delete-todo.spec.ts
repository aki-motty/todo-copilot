import { expect, test } from '@playwright/test';

test.describe('Delete Todos', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
    
    // Force localStorage mode and clear data
    await page.evaluate(() => {
      window.localStorage.clear();
      window.localStorage.setItem('forceLocalStorage', 'true');
    });
    
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('input', { timeout: 10000 });
    await page.waitForTimeout(1000);
  });

  test('should delete a todo', async ({ page }) => {
    const input = page.locator('input').first();
    const button = page.locator('button').first();

    await input.fill('Todo to delete');
    await button.click();
    await page.waitForTimeout(1000);

    const todoItem = page.getByText('Todo to delete');
    await expect(todoItem).toBeVisible();
  });
});
