import { expect, test } from "@playwright/test";

test.describe("Multiple Todo Operations", () => {
  test.setTimeout(90000);

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Clear any existing data
    await page.evaluate(() => {
      window.localStorage.clear();
    });
    await page.reload();
  });

  test("should handle creating multiple todos", async ({ page }) => {
    const input = page.locator('input[placeholder="Add a new todo..."]');
    const createButton = page.locator('button:has-text("Create")');

    const timestamp = Date.now();
    const todoTitles = [
      `Todo A ${timestamp}`,
      `Todo B ${timestamp}`,
      `Todo C ${timestamp}`,
      `Todo D ${timestamp}`,
      `Todo E ${timestamp}`,
    ];

    // Create all todos
    for (const title of todoTitles) {
      await input.fill(title);
      await createButton.click();
      await page.waitForTimeout(300);
    }

    // Verify all todos are created
    const todoItems = page.locator(".todo-item");
    await expect(todoItems).toHaveCount(5, { timeout: 10000 });

    // Verify each title is visible
    for (const title of todoTitles) {
      await expect(page.locator(".todo-item", { hasText: title })).toBeVisible();
    }
  });

  test("should handle toggling multiple todos", async ({ page }) => {
    const input = page.locator('input[placeholder="Add a new todo..."]');
    const createButton = page.locator('button:has-text("Create")');

    const timestamp = Date.now();
    const todoTitles = [`Toggle A ${timestamp}`, `Toggle B ${timestamp}`, `Toggle C ${timestamp}`];

    // Create todos
    for (const title of todoTitles) {
      await input.fill(title);
      await createButton.click();
      await page.waitForTimeout(300);
    }

    // Toggle first and third todos
    const firstTodo = page.locator(".todo-item", { hasText: todoTitles[0] });
    const thirdTodo = page.locator(".todo-item", { hasText: todoTitles[2] });

    await firstTodo.locator('input[type="checkbox"]').click();
    await page.waitForTimeout(300);
    await thirdTodo.locator('input[type="checkbox"]').click();
    await page.waitForTimeout(300);

    // Verify completion states
    await expect(firstTodo.locator('input[type="checkbox"]')).toBeChecked();
    await expect(
      page.locator(".todo-item", { hasText: todoTitles[1] }).locator('input[type="checkbox"]')
    ).not.toBeChecked();
    await expect(thirdTodo.locator('input[type="checkbox"]')).toBeChecked();
  });

  test("should handle deleting multiple todos", async ({ page }) => {
    const input = page.locator('input[placeholder="Add a new todo..."]');
    const createButton = page.locator('button:has-text("Create")');

    const timestamp = Date.now();
    const todoTitles = [`Delete A ${timestamp}`, `Delete B ${timestamp}`, `Delete C ${timestamp}`];

    // Create todos
    for (const title of todoTitles) {
      await input.fill(title);
      await createButton.click();
      await page.waitForTimeout(300);
    }

    // Verify all created
    await expect(page.locator(".todo-item")).toHaveCount(3, { timeout: 10000 });

    // Delete the second todo
    const secondTodo = page.locator(".todo-item", { hasText: todoTitles[1] });
    await secondTodo.locator('button[aria-label="Delete todo"]').click();
    await page.waitForTimeout(500);

    // Should have 2 todos
    await expect(page.locator(".todo-item")).toHaveCount(2);
    await expect(page.locator(".todo-item", { hasText: todoTitles[1] })).toHaveCount(0);

    // Delete remaining todos
    const firstTodo = page.locator(".todo-item", { hasText: todoTitles[0] });
    await firstTodo.locator('button[aria-label="Delete todo"]').click();
    await page.waitForTimeout(500);

    await expect(page.locator(".todo-item")).toHaveCount(1);

    const thirdTodo = page.locator(".todo-item", { hasText: todoTitles[2] });
    await thirdTodo.locator('button[aria-label="Delete todo"]').click();
    await page.waitForTimeout(500);

    // All deleted
    await expect(page.locator(".todo-item")).toHaveCount(0);
  });

  test("should handle mixed operations", async ({ page }) => {
    const input = page.locator('input[placeholder="Add a new todo..."]');
    const createButton = page.locator('button:has-text("Create")');

    const timestamp = Date.now();

    // Create first todo
    await input.fill(`Mixed Op 1 ${timestamp}`);
    await createButton.click();
    await expect(page.locator(".todo-item")).toHaveCount(1, { timeout: 10000 });

    // Toggle it
    const firstTodo = page.locator(".todo-item").first();
    await firstTodo.locator('input[type="checkbox"]').click();
    await page.waitForTimeout(300);
    await expect(firstTodo.locator('input[type="checkbox"]')).toBeChecked();

    // Create second todo
    await input.fill(`Mixed Op 2 ${timestamp}`);
    await createButton.click();
    await expect(page.locator(".todo-item")).toHaveCount(2, { timeout: 10000 });

    // Delete first todo
    await page
      .locator(".todo-item", { hasText: `Mixed Op 1 ${timestamp}` })
      .locator('button[aria-label="Delete todo"]')
      .click();
    await page.waitForTimeout(500);

    // Should have 1 unchecked todo
    await expect(page.locator(".todo-item")).toHaveCount(1);
    const remainingTodo = page.locator(".todo-item").first();
    await expect(remainingTodo.locator('input[type="checkbox"]')).not.toBeChecked();
  });

  test("should maintain state consistency with concurrent-like operations", async ({ page }) => {
    const input = page.locator('input[placeholder="Add a new todo..."]');
    const createButton = page.locator('button:has-text("Create")');

    const timestamp = Date.now();

    // Create todos quickly
    await input.fill(`Concurrent 1 ${timestamp}`);
    await createButton.click();
    await input.fill(`Concurrent 2 ${timestamp}`);
    await createButton.click();
    await input.fill(`Concurrent 3 ${timestamp}`);
    await createButton.click();

    // Wait for all to appear
    await expect(page.locator(".todo-item")).toHaveCount(3, { timeout: 10000 });

    // Rapid toggles
    const todoItems = page.locator(".todo-item");
    const count = await todoItems.count();

    for (let i = 0; i < count; i++) {
      await todoItems.nth(i).locator('input[type="checkbox"]').click();
      await page.waitForTimeout(100);
    }

    // All should be checked
    for (let i = 0; i < count; i++) {
      await expect(todoItems.nth(i).locator('input[type="checkbox"]')).toBeChecked();
    }

    // Reload and verify consistency
    await page.reload();

    const reloadedItems = page.locator(".todo-item");
    await expect(reloadedItems).toHaveCount(3, { timeout: 10000 });

    for (let i = 0; i < 3; i++) {
      await expect(reloadedItems.nth(i).locator('input[type="checkbox"]')).toBeChecked();
    }
  });
});
