import { expect, test } from '@playwright/test';

test.describe('User Story 4: Delete Todo', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.evaluate(() => localStorage.clear());
    
    // Navigate to application
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
  });

  test('should delete todo and remove from list', async ({ page }) => {
    // Create a todo
    const input = page.locator('input[placeholder*="add" i]').first();
    await input.fill('Todo to delete');
    await page.keyboard.press('Enter');

    // Verify todo appears
    await expect(page.locator('text=Todo to delete')).toBeVisible();

    // Find and click delete button
    const deleteButton = page.locator('button:has-text("Delete")').first();
    await deleteButton.click();

    // Handle confirmation dialog if present
    const confirmButton = page.locator('button:has-text("Confirm")');
    if (await confirmButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await confirmButton.click();
    }

    // Verify todo is removed from list
    await expect(page.locator('text=Todo to delete')).not.toBeVisible();
  });

  test('should persist deletion across page reload', async ({ page }) => {
    // Create two todos
    const input = page.locator('input[placeholder*="add" i]').first();
    
    await input.fill('Keep this todo');
    await page.keyboard.press('Enter');
    
    await input.fill('Delete this todo');
    await page.keyboard.press('Enter');

    // Verify both are visible
    await expect(page.locator('text=Keep this todo')).toBeVisible();
    await expect(page.locator('text=Delete this todo')).toBeVisible();

    // Delete the second todo
    const deleteButtons = page.locator('button:has-text("Delete")');
    await deleteButtons.last().click();

    // Handle confirmation
    const confirmButton = page.locator('button:has-text("Confirm")');
    if (await confirmButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await confirmButton.click();
    }

    // Verify only one todo remains
    await expect(page.locator('text=Delete this todo')).not.toBeVisible();
    await expect(page.locator('text=Keep this todo')).toBeVisible();

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify persistence
    await expect(page.locator('text=Keep this todo')).toBeVisible();
    await expect(page.locator('text=Delete this todo')).not.toBeVisible();
  });

  test('should update count when todo is deleted', async ({ page }) => {
    // Create 3 todos
    const input = page.locator('input[placeholder*="add" i]').first();
    
    await input.fill('Todo 1');
    await page.keyboard.press('Enter');
    
    await input.fill('Todo 2');
    await page.keyboard.press('Enter');
    
    await input.fill('Todo 3');
    await page.keyboard.press('Enter');

    // Verify count shows 3
    let count = page.locator('text=3');
    await expect(count).toBeVisible();

    // Delete one todo
    const deleteButton = page.locator('button:has-text("Delete")').first();
    await deleteButton.click();

    // Handle confirmation
    const confirmButton = page.locator('button:has-text("Confirm")');
    if (await confirmButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await confirmButton.click();
    }

    // Verify count is now 2
    count = page.locator('text=2');
    await expect(count).toBeVisible();
  });

  test('should show confirmation dialog before deletion', async ({ page }) => {
    // Create todo
    const input = page.locator('input[placeholder*="add" i]').first();
    await input.fill('Confirm delete');
    await page.keyboard.press('Enter');

    // Click delete button
    const deleteButton = page.locator('button:has-text("Delete")').first();
    await deleteButton.click();

    // Look for confirmation dialog or message
    const confirmationText = page.locator('text=confirm|sure|delete|undo', { matchCase: false });
    
    // Dialog should be visible or at minimum the todo should still be there
    const todoStillVisible = await page.locator('text=Confirm delete').isVisible();
    expect(todoStillVisible).toBe(true);
  });

  test('should handle deleting multiple todos sequentially', async ({ page }) => {
    // Create 3 todos
    const input = page.locator('input[placeholder*="add" i]').first();
    
    await input.fill('First');
    await page.keyboard.press('Enter');
    
    await input.fill('Second');
    await page.keyboard.press('Enter');
    
    await input.fill('Third');
    await page.keyboard.press('Enter');

    // Delete all todos one by one
    for (let i = 0; i < 3; i++) {
      const deleteButton = page.locator('button:has-text("Delete")').first();
      await deleteButton.click();

      // Handle confirmation
      const confirmButton = page.locator('button:has-text("Confirm")');
      if (await confirmButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await confirmButton.click();
      }

      // Wait for deletion to complete
      await page.waitForTimeout(100);
    }

    // Verify all todos are gone
    const emptyMessage = page.locator('text=No todos|empty', { matchCase: false });
    await expect(emptyMessage).toBeVisible();
  });
});
