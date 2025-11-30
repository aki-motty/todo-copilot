import { expect, test } from '@playwright/test';

test.describe('Delete Todos', () => {
  test.setTimeout(60000);

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Clear localStorage before each test
    await page.evaluate(() => {
      window.localStorage.clear();
    });
    await page.reload();
    await page.waitForTimeout(1000);
  });

  test('should delete a todo', async ({ page }) => {
    const input = page.locator('input[placeholder="Add a new todo..."]');
    const createButton = page.locator('button:has-text("Create")');

    await input.fill('Todo to delete');
    await createButton.click();
    await expect(page.locator('.todo-item')).toBeVisible({ timeout: 10000 });

    // Delete the todo
    const deleteButton = page.locator('.todo-item button[aria-label="Delete todo"]');
    await deleteButton.click();
    await page.waitForTimeout(500);

    // Verify todo is removed
    await expect(page.locator('.todo-item')).toHaveCount(0);
  });

  test('should persist deletion across page reload', async ({ page }) => {
    const input = page.locator('input[placeholder="Add a new todo..."]');
    const createButton = page.locator('button:has-text("Create")');
    const timestamp = Date.now();

    // Create two todos
    await input.fill(`Keep this todo ${timestamp}`);
    await createButton.click();
    await page.waitForTimeout(300);

    await input.fill(`Delete this todo ${timestamp}`);
    await createButton.click();
    await expect(page.locator('.todo-item')).toHaveCount(2, { timeout: 10000 });

    // Delete the second todo
    const todoToDelete = page.locator('.todo-item', { hasText: `Delete this todo ${timestamp}` });
    await todoToDelete.locator('button[aria-label="Delete todo"]').click();
    await page.waitForTimeout(500);

    // Verify only one todo remains
    await expect(page.locator('.todo-item')).toHaveCount(1);
    await expect(page.locator('.todo-item', { hasText: `Delete this todo ${timestamp}` })).toHaveCount(0);

    // Reload page
    await page.reload();

    // Verify persistence
    await expect(page.locator('.todo-item')).toHaveCount(1, { timeout: 10000 });
    await expect(page.locator('.todo-item', { hasText: `Keep this todo ${timestamp}` })).toBeVisible();
    await expect(page.locator('.todo-item', { hasText: `Delete this todo ${timestamp}` })).toHaveCount(0);
  });

  test('should handle deleting multiple todos sequentially', async ({ page }) => {
    const input = page.locator('input[placeholder="Add a new todo..."]');
    const createButton = page.locator('button:has-text("Create")');
    const timestamp = Date.now();

    // Create 3 todos
    await input.fill(`First ${timestamp}`);
    await createButton.click();
    await page.waitForTimeout(300);

    await input.fill(`Second ${timestamp}`);
    await createButton.click();
    await page.waitForTimeout(300);

    await input.fill(`Third ${timestamp}`);
    await createButton.click();
    await expect(page.locator('.todo-item')).toHaveCount(3, { timeout: 10000 });

    // Delete all todos one by one
    for (let i = 0; i < 3; i++) {
      const deleteButton = page.locator('.todo-item button[aria-label="Delete todo"]').first();
      await deleteButton.click();
      await page.waitForTimeout(500);
    }

    // Verify all todos are gone
    await expect(page.locator('.todo-item')).toHaveCount(0);
  });

  test('should delete completed todo', async ({ page }) => {
    const input = page.locator('input[placeholder="Add a new todo..."]');
    const createButton = page.locator('button:has-text("Create")');
    const timestamp = Date.now();

    // Create and complete a todo
    await input.fill(`Completed todo ${timestamp}`);
    await createButton.click();
    await expect(page.locator('.todo-item')).toBeVisible({ timeout: 10000 });

    // Toggle completion
    const todoItem = page.locator('.todo-item');
    await todoItem.locator('input[type="checkbox"]').click();
    await page.waitForTimeout(300);
    await expect(todoItem.locator('input[type="checkbox"]')).toBeChecked();

    // Delete the completed todo
    await todoItem.locator('button[aria-label="Delete todo"]').click();
    await page.waitForTimeout(500);

    // Verify todo is removed
    await expect(page.locator('.todo-item')).toHaveCount(0);
  });

  test('should delete todo with subtasks', async ({ page }) => {
    const input = page.locator('input[placeholder="Add a new todo..."]');
    const createButton = page.locator('button:has-text("Create")');
    const timestamp = Date.now();

    // Create a todo
    await input.fill(`Parent todo ${timestamp}`);
    await createButton.click();
    await expect(page.locator('.todo-item')).toBeVisible({ timeout: 10000 });

    // Add subtask if feature exists
    const todoItem = page.locator('.todo-item');
    const subtaskInput = todoItem.locator('input[placeholder*="subtask"]');
    
    if (await subtaskInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await subtaskInput.fill('Child subtask');
      await subtaskInput.press('Enter');
      await page.waitForTimeout(500);
      await expect(todoItem).toContainText('Child subtask');
    }

    // Delete the parent todo (should delete subtasks too)
    await todoItem.locator('button[aria-label="Delete todo"]').click();
    await page.waitForTimeout(500);

    // Verify parent and subtasks are gone
    await expect(page.locator('.todo-item')).toHaveCount(0);
  });

  test('should delete todo with tags', async ({ page }) => {
    const input = page.locator('input[placeholder="Add a new todo..."]');
    const createButton = page.locator('button:has-text("Create")');
    const timestamp = Date.now();

    // Create a todo
    await input.fill(`Tagged todo ${timestamp}`);
    await createButton.click();
    await expect(page.locator('.todo-item')).toBeVisible({ timeout: 10000 });

    // Add tag if feature exists
    const todoItem = page.locator('.todo-item');
    const tagSelector = todoItem.locator('select.tag-selector');
    
    if (await tagSelector.isVisible({ timeout: 2000 }).catch(() => false)) {
      await tagSelector.selectOption('Summary');
      await page.waitForTimeout(500);
      await expect(todoItem.locator('.todo-tag')).toContainText('Summary');
    }

    // Delete the tagged todo
    await todoItem.locator('button[aria-label="Delete todo"]').click();
    await page.waitForTimeout(500);

    // Verify todo is removed
    await expect(page.locator('.todo-item')).toHaveCount(0);
  });
});
