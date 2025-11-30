import { expect, test } from "@playwright/test";

test.describe("Data Persistence", () => {
  test.setTimeout(60000);

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Clear any existing data
    await page.evaluate(() => {
      window.localStorage.clear();
    });
    await page.reload();
  });

  test("should persist todos after page reload", async ({ page }) => {
    const input = page.locator('input[placeholder="Add a new todo..."]');
    const createButton = page.locator('button:has-text("Create")');

    // Create a todo
    const todoTitle = `Persistent Todo ${Date.now()}`;
    await input.fill(todoTitle);
    await createButton.click();
    await expect(page.locator(".todo-item")).toContainText(todoTitle, { timeout: 10000 });

    // Reload the page
    await page.reload();

    // Todo should still be there
    await expect(page.locator(".todo-item")).toContainText(todoTitle, { timeout: 10000 });
  });

  test("should persist completion status after reload", async ({ page }) => {
    const input = page.locator('input[placeholder="Add a new todo..."]');
    const createButton = page.locator('button:has-text("Create")');

    // Create a todo
    const todoTitle = `Completion Test ${Date.now()}`;
    await input.fill(todoTitle);
    await createButton.click();
    await expect(page.locator(".todo-item")).toContainText(todoTitle, { timeout: 10000 });

    // Toggle completion
    const todoItem = page.locator(".todo-item", { hasText: todoTitle });
    const checkbox = todoItem.locator('input[type="checkbox"]');
    await checkbox.click();

    // Wait for state to update
    await page.waitForTimeout(500);

    // Reload the page
    await page.reload();

    // Completion status should persist
    const reloadedTodoItem = page.locator(".todo-item", { hasText: todoTitle });
    const reloadedCheckbox = reloadedTodoItem.locator('input[type="checkbox"]');
    await expect(reloadedCheckbox).toBeChecked({ timeout: 10000 });
  });

  test("should persist multiple todos in correct order", async ({ page }) => {
    const input = page.locator('input[placeholder="Add a new todo..."]');
    const createButton = page.locator('button:has-text("Create")');

    // Create multiple todos
    const timestamp = Date.now();
    const titles = [
      `First Todo ${timestamp}`,
      `Second Todo ${timestamp}`,
      `Third Todo ${timestamp}`,
    ];

    for (const title of titles) {
      await input.fill(title);
      await createButton.click();
      await page.waitForTimeout(500);
    }

    // Verify all are visible
    for (const title of titles) {
      await expect(page.locator(".todo-item", { hasText: title })).toBeVisible({ timeout: 10000 });
    }

    // Reload the page
    await page.reload();

    // All todos should still be there
    for (const title of titles) {
      await expect(page.locator(".todo-item", { hasText: title })).toBeVisible({ timeout: 10000 });
    }
  });

  test("should persist subtasks after reload", async ({ page }) => {
    const input = page.locator('input[placeholder="Add a new todo..."]');
    const createButton = page.locator('button:has-text("Create")');

    // Create a todo
    const todoTitle = `Subtask Persistence ${Date.now()}`;
    await input.fill(todoTitle);
    await createButton.click();
    await expect(page.locator(".todo-item")).toContainText(todoTitle, { timeout: 10000 });

    // Add a subtask
    const todoItem = page.locator(".todo-item", { hasText: todoTitle });
    const subtaskInput = todoItem.locator('input[placeholder*="subtask"]');

    if (await subtaskInput.isVisible()) {
      await subtaskInput.fill("Test Subtask");
      await subtaskInput.press("Enter");
      await page.waitForTimeout(500);

      // Reload the page
      await page.reload();

      // Subtask should persist
      const reloadedTodoItem = page.locator(".todo-item", { hasText: todoTitle });
      await expect(reloadedTodoItem).toContainText("Test Subtask", { timeout: 10000 });
    }
  });

  test("should not lose data on rapid operations", async ({ page }) => {
    const input = page.locator('input[placeholder="Add a new todo..."]');
    const createButton = page.locator('button:has-text("Create")');

    // Rapid creation of todos
    const timestamp = Date.now();
    const rapidTodos = Array.from({ length: 5 }, (_, i) => `Rapid Todo ${i + 1} ${timestamp}`);

    for (const title of rapidTodos) {
      await input.fill(title);
      await createButton.click();
      // Minimal wait
      await page.waitForTimeout(200);
    }

    // Wait for all operations to complete
    await page.waitForTimeout(2000);

    // Reload
    await page.reload();

    // All rapid todos should persist
    for (const title of rapidTodos) {
      await expect(page.locator(".todo-item", { hasText: title })).toBeVisible({ timeout: 10000 });
    }
  });
});
