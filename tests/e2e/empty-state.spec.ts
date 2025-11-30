import { expect, test } from "@playwright/test";

test.describe("Empty State", () => {
  test.setTimeout(60000);

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Clear all data
    await page.evaluate(() => {
      window.localStorage.clear();
    });
    await page.reload();
  });

  test("should display empty state when no todos exist", async ({ page }) => {
    // Wait for app to load
    await page.waitForTimeout(1000);

    // Should not have any todo items
    const todoItems = page.locator(".todo-item");
    await expect(todoItems).toHaveCount(0);

    // Input should still be visible for creating new todos
    const input = page.locator('input[placeholder="Add a new todo..."]');
    await expect(input).toBeVisible();
  });

  test("should show empty state after deleting all todos", async ({ page }) => {
    const input = page.locator('input[placeholder="Add a new todo..."]');
    const createButton = page.locator('button:has-text("Create")');

    // Create a todo first
    await input.fill("Todo to delete");
    await createButton.click();
    await expect(page.locator(".todo-item")).toBeVisible({ timeout: 10000 });

    // Delete the todo
    const deleteButton = page.locator('.todo-item button[aria-label="Delete todo"]').first();
    await deleteButton.click();

    // Wait for deletion
    await page.waitForTimeout(1000);

    // Should be empty now
    const todoItems = page.locator(".todo-item");
    await expect(todoItems).toHaveCount(0);
  });
});
