import { test, expect } from "@playwright/test";

test.describe("Display Todos - End-to-End", () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.evaluate(() => {
      localStorage.clear();
    });
    await page.goto("http://localhost:5173");
    await page.waitForLoadState("networkidle");
  });

  test("should display empty state when no todos exist", async ({ page }) => {
    const emptyMessage = page.locator("text=No todos yet");
    await expect(emptyMessage).toBeVisible();

    const todoItems = page.locator('[data-testid="todo-item"]');
    await expect(todoItems).toHaveCount(0);
  });

  test("should display todos after creating them", async ({ page }) => {
    // Create first todo
    const input = page.locator('input[placeholder="Add a new todo..."]');
    await input.fill("First Todo");
    await page.keyboard.press("Enter");

    // Create second todo
    await input.fill("Second Todo");
    await page.keyboard.press("Enter");

    // Create third todo
    await input.fill("Third Todo");
    await page.keyboard.press("Enter");

    // Verify all todos are displayed
    const todoItems = page.locator('[data-testid="todo-item"]');
    await expect(todoItems).toHaveCount(3);

    // Verify todo content
    const firstTodoText = page.locator('[data-testid="todo-item"]:nth-child(1)');
    await expect(firstTodoText).toContainText("First Todo");

    const secondTodoText = page.locator('[data-testid="todo-item"]:nth-child(2)');
    await expect(secondTodoText).toContainText("Second Todo");

    const thirdTodoText = page.locator('[data-testid="todo-item"]:nth-child(3)');
    await expect(thirdTodoText).toContainText("Third Todo");
  });

  test("should maintain todo order", async ({ page }) => {
    const input = page.locator('input[placeholder="Add a new todo..."]');

    // Create todos with specific order
    await input.fill("Alpha");
    await page.keyboard.press("Enter");

    await input.fill("Beta");
    await page.keyboard.press("Enter");

    await input.fill("Gamma");
    await page.keyboard.press("Enter");

    // Verify order is preserved
    const todoTexts = await page.locator('[data-testid="todo-text"]').allTextContents();
    expect(todoTexts).toEqual(["Alpha", "Beta", "Gamma"]);
  });

  test("should update todo list when completing a todo", async ({ page }) => {
    const input = page.locator('input[placeholder="Add a new todo..."]');

    // Create todos
    await input.fill("Incomplete Todo");
    await page.keyboard.press("Enter");

    await input.fill("Another Todo");
    await page.keyboard.press("Enter");

    // Toggle first todo
    const checkboxes = page.locator('[data-testid="todo-checkbox"]');
    await checkboxes.first().click();

    // Wait for update
    await page.waitForTimeout(500);

    // Verify todo is marked as completed
    const firstTodo = page.locator('[data-testid="todo-item"]:nth-child(1)');
    const checkbox = firstTodo.locator('input[type="checkbox"]');
    await expect(checkbox).toBeChecked();

    // Verify other todo is not completed
    const secondTodo = page.locator('[data-testid="todo-item"]:nth-child(2)');
    const secondCheckbox = secondTodo.locator('input[type="checkbox"]');
    await expect(secondCheckbox).not.toBeChecked();
  });

  test("should update todo list when deleting a todo", async ({ page }) => {
    const input = page.locator('input[placeholder="Add a new todo..."]');

    // Create todos
    await input.fill("Delete Me");
    await page.keyboard.press("Enter");

    await input.fill("Keep This");
    await page.keyboard.press("Enter");

    // Verify initial count
    const todoItems = page.locator('[data-testid="todo-item"]');
    await expect(todoItems).toHaveCount(2);

    // Delete first todo
    const deleteButtons = page.locator('[data-testid="todo-delete-btn"]');
    await deleteButtons.first().click();

    // Handle confirmation if present
    const confirmButton = page.locator("button:has-text('Delete')").first();
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    }

    // Wait for deletion
    await page.waitForTimeout(500);

    // Verify todo is removed
    await expect(todoItems).toHaveCount(1);
    const remaining = await page.locator('[data-testid="todo-text"]').allTextContents();
    expect(remaining).toContain("Keep This");
  });

  test("should persist todos after page refresh", async ({ page }) => {
    const input = page.locator('input[placeholder="Add a new todo..."]');

    // Create todos
    await input.fill("Persistent Todo");
    await page.keyboard.press("Enter");

    // Verify todo exists
    let todoItems = page.locator('[data-testid="todo-item"]');
    await expect(todoItems).toHaveCount(1);

    // Refresh page
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Verify todo still exists
    todoItems = page.locator('[data-testid="todo-item"]');
    await expect(todoItems).toHaveCount(1);

    const todoText = await page.locator('[data-testid="todo-text"]').first().textContent();
    expect(todoText).toBe("Persistent Todo");
  });

  test("should handle multiple todos with mixed states", async ({ page }) => {
    const input = page.locator('input[placeholder="Add a new todo..."]');

    // Create multiple todos
    for (let i = 1; i <= 5; i++) {
      await input.fill(`Todo ${i}`);
      await page.keyboard.press("Enter");
    }

    // Verify all created
    const todoItems = page.locator('[data-testid="todo-item"]');
    await expect(todoItems).toHaveCount(5);

    // Toggle some todos
    const checkboxes = page.locator('[data-testid="todo-checkbox"]');
    await checkboxes.nth(0).click(); // Complete first
    await checkboxes.nth(2).click(); // Complete third
    await checkboxes.nth(4).click(); // Complete fifth

    await page.waitForTimeout(500);

    // Verify mixed completion states
    const allCheckboxes = await page.locator('[data-testid="todo-checkbox"]').all();
    expect(await allCheckboxes[0].isChecked()).toBe(true);
    expect(await allCheckboxes[1].isChecked()).toBe(false);
    expect(await allCheckboxes[2].isChecked()).toBe(true);
    expect(await allCheckboxes[3].isChecked()).toBe(false);
    expect(await allCheckboxes[4].isChecked()).toBe(true);
  });

  test("should display todos in real-time", async ({ page, context }) => {
    const input = page.locator('input[placeholder="Add a new todo..."]');

    // Create first todo
    await input.fill("Real-time Test 1");
    await page.keyboard.press("Enter");

    // Open second page to simulate another client
    const page2 = await context.newPage();
    await page2.goto("http://localhost:5173");
    await page2.waitForLoadState("networkidle");

    // Verify both pages see the same todo
    const page1Todos = page.locator('[data-testid="todo-item"]');
    const page2Todos = page2.locator('[data-testid="todo-item"]');

    await expect(page1Todos).toHaveCount(1);
    await expect(page2Todos).toHaveCount(1);

    // Create another todo in page 1
    await input.fill("Real-time Test 2");
    await page.keyboard.press("Enter");

    // Note: Real-time sync would require WebSocket/polling
    // For now, manually refresh page2 to verify persistence
    await page2.reload();
    await page2.waitForLoadState("networkidle");

    const updated = page2.locator('[data-testid="todo-item"]');
    await expect(updated).toHaveCount(2);

    await page2.close();
  });
});
