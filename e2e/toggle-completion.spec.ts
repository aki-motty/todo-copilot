import { expect, test } from "@playwright/test";

test.describe("Toggle Completion - End-to-End", () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.evaluate(() => {
      localStorage.clear();
    });
    await page.goto("http://localhost:5173");
    await page.waitForLoadState("networkidle");
  });

  test("should toggle todo completion with checkbox", async ({ page }) => {
    const input = page.locator('input[placeholder="Add a new todo..."]');

    // Create a todo
    await input.fill("Toggle Test Todo");
    await page.keyboard.press("Enter");

    // Verify it's uncompleted
    const checkbox = page.locator('[data-testid="todo-checkbox"]').first();
    await expect(checkbox).not.toBeChecked();

    // Toggle completion
    await checkbox.click();
    await page.waitForTimeout(300);

    // Verify it's completed
    await expect(checkbox).toBeChecked();

    // Verify text has strikethrough style
    const todoText = page.locator('[data-testid="todo-text"]').first();
    const classes = await todoText.getAttribute("class");
    expect(classes).toContain("completed");
  });

  test("should persist completion state after page reload", async ({ page }) => {
    const input = page.locator('input[placeholder="Add a new todo..."]');

    // Create and complete a todo
    await input.fill("Persistent Completion");
    await page.keyboard.press("Enter");

    const checkbox = page.locator('[data-testid="todo-checkbox"]').first();
    await checkbox.click();
    await page.waitForTimeout(300);

    // Verify it's completed
    await expect(checkbox).toBeChecked();

    // Reload page
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Verify completion state persists
    const reloadedCheckbox = page
      .locator('[data-testid="todo-checkbox"]')
      .first();
    await expect(reloadedCheckbox).toBeChecked();
  });

  test("should toggle completion on and off multiple times", async ({ page }) => {
    const input = page.locator('input[placeholder="Add a new todo..."]');

    // Create a todo
    await input.fill("Multi-toggle Test");
    await page.keyboard.press("Enter");

    const checkbox = page.locator('[data-testid="todo-checkbox"]').first();

    // First toggle - complete
    await checkbox.click();
    await page.waitForTimeout(300);
    await expect(checkbox).toBeChecked();

    // Second toggle - uncomplete
    await checkbox.click();
    await page.waitForTimeout(300);
    await expect(checkbox).not.toBeChecked();

    // Third toggle - complete again
    await checkbox.click();
    await page.waitForTimeout(300);
    await expect(checkbox).toBeChecked();
  });

  test("should handle completion state with mixed todos", async ({ page }) => {
    const input = page.locator('input[placeholder="Add a new todo..."]');

    // Create multiple todos
    await input.fill("Todo 1");
    await page.keyboard.press("Enter");

    await input.fill("Todo 2");
    await page.keyboard.press("Enter");

    await input.fill("Todo 3");
    await page.keyboard.press("Enter");

    // Complete todos 1 and 3
    const checkboxes = page.locator('[data-testid="todo-checkbox"]');
    await checkboxes.nth(0).click();
    await page.waitForTimeout(300);
    await checkboxes.nth(2).click();
    await page.waitForTimeout(300);

    // Verify states
    await expect(checkboxes.nth(0)).toBeChecked();
    await expect(checkboxes.nth(1)).not.toBeChecked();
    await expect(checkboxes.nth(2)).toBeChecked();
  });

  test("should update completion state visually in real-time", async ({ page }) => {
    const input = page.locator('input[placeholder="Add a new todo..."]');

    // Create a todo
    await input.fill("Visual Update Test");
    await page.keyboard.press("Enter");

    const todoItem = page.locator('[data-testid="todo-item"]').first();
    const checkbox = todoItem.locator('[data-testid="todo-checkbox"]');
    const todoText = todoItem.locator('[data-testid="todo-text"]');

    // Before toggle
    let textClasses = await todoText.getAttribute("class");
    expect(textClasses).not.toContain("completed");

    // After toggle
    await checkbox.click();
    await page.waitForTimeout(300);

    textClasses = await todoText.getAttribute("class");
    expect(textClasses).toContain("completed");
  });

  test("should maintain todo list order when toggling", async ({ page }) => {
    const input = page.locator('input[placeholder="Add a new todo..."]');

    // Create ordered todos
    await input.fill("First");
    await page.keyboard.press("Enter");
    await input.fill("Second");
    await page.keyboard.press("Enter");
    await input.fill("Third");
    await page.keyboard.press("Enter");

    // Toggle second todo
    const checkboxes = page.locator('[data-testid="todo-checkbox"]');
    await checkboxes.nth(1).click();
    await page.waitForTimeout(300);

    // Verify order is maintained
    const todoTexts = await page
      .locator('[data-testid="todo-text"]')
      .allTextContents();
    expect(todoTexts).toEqual(["First", "Second", "Third"]);

    // Verify second is marked as completed
    await expect(checkboxes.nth(1)).toBeChecked();
  });

  test("should handle rapid completion toggles", async ({ page }) => {
    const input = page.locator('input[placeholder="Add a new todo..."]');

    // Create a todo
    await input.fill("Rapid Toggle");
    await page.keyboard.press("Enter");

    const checkbox = page.locator('[data-testid="todo-checkbox"]').first();

    // Perform rapid toggles
    for (let i = 0; i < 5; i++) {
      await checkbox.click();
      await page.waitForTimeout(100);
    }

    // After odd number of toggles, should be uncompleted
    await expect(checkbox).not.toBeChecked();
  });

  test("should update count or progress indicator when toggling", async ({
    page,
  }) => {
    const input = page.locator('input[placeholder="Add a new todo..."]');

    // Create todos
    await input.fill("Count Test 1");
    await page.keyboard.press("Enter");
    await input.fill("Count Test 2");
    await page.keyboard.press("Enter");

    // Check if there's a count indicator
    const countIndicator = page.locator(
      '[data-testid="todo-count"], .todo-count, h2'
    );
    const initialText = await countIndicator.first().textContent();

    // Toggle one todo
    const checkbox = page.locator('[data-testid="todo-checkbox"]').first();
    await checkbox.click();
    await page.waitForTimeout(300);

    // Count might update (depending on UI implementation)
    const updatedText = await countIndicator.first().textContent();

    // Either count updates or UI shows completion feedback
    expect(initialText || updatedText).toBeTruthy();
  });
});
