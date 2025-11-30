import { expect, test } from "@playwright/test";

test.describe("Edge Cases", () => {
  test.setTimeout(60000);

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Clear any existing todos
    await page.evaluate(() => {
      window.localStorage.clear();
    });
    await page.reload();
  });

  test("should not create todo with empty title", async ({ page }) => {
    const input = page.locator('input[placeholder="Add a new todo..."]');
    const createButton = page.locator('button:has-text("Create")');

    // Try to create with empty input
    await input.fill("");
    await createButton.click();

    // Should not create any todo
    await page.waitForTimeout(500);
    const todoItems = page.locator(".todo-item");
    await expect(todoItems).toHaveCount(0);
  });

  test("should not create todo with whitespace only", async ({ page }) => {
    const input = page.locator('input[placeholder="Add a new todo..."]');
    const createButton = page.locator('button:has-text("Create")');

    // Try to create with whitespace only
    await input.fill("   ");
    await createButton.click();

    // Should not create any todo
    await page.waitForTimeout(500);
    const todoItems = page.locator(".todo-item");
    await expect(todoItems).toHaveCount(0);
  });

  test("should handle special characters in todo title", async ({ page }) => {
    const input = page.locator('input[placeholder="Add a new todo..."]');
    const createButton = page.locator('button:has-text("Create")');

    const specialTitle = '特殊文字テスト <script>alert("XSS")</script> & "quotes" \'apostrophe\'';
    await input.fill(specialTitle);
    await createButton.click();

    // Should display the title safely (escaped)
    await expect(page.locator(".todo-item")).toBeVisible({ timeout: 10000 });
    // The content should be visible and not execute script
    await expect(page.locator(".todo-item")).toContainText("特殊文字テスト");
  });

  test("should handle very long todo title", async ({ page }) => {
    const input = page.locator('input[placeholder="Add a new todo..."]');
    const createButton = page.locator('button:has-text("Create")');

    // Create a long title (200 characters)
    const longTitle = "A".repeat(200);
    await input.fill(longTitle);
    await createButton.click();

    // Should create the todo
    await expect(page.locator(".todo-item")).toBeVisible({ timeout: 10000 });
    await expect(page.locator(".todo-item")).toContainText("AAAA");
  });

  test("should handle Japanese characters", async ({ page }) => {
    const input = page.locator('input[placeholder="Add a new todo..."]');
    const createButton = page.locator('button:has-text("Create")');

    const japaneseTitle = "日本語のTodoタスク🎉";
    await input.fill(japaneseTitle);
    await createButton.click();

    await expect(page.locator(".todo-item")).toBeVisible({ timeout: 10000 });
    await expect(page.locator(".todo-item")).toContainText(japaneseTitle);
  });

  test("should clear input after creating todo", async ({ page }) => {
    const input = page.locator('input[placeholder="Add a new todo..."]');
    const createButton = page.locator('button:has-text("Create")');

    await input.fill("Test Todo");
    await createButton.click();

    await expect(page.locator(".todo-item")).toBeVisible({ timeout: 10000 });
    // Input should be cleared
    await expect(input).toHaveValue("");
  });

  test("should create todo on Enter key press", async ({ page }) => {
    const input = page.locator('input[placeholder="Add a new todo..."]');

    await input.fill("Enter Key Todo");
    await input.press("Enter");

    await expect(page.locator(".todo-item")).toBeVisible({ timeout: 10000 });
    await expect(page.locator(".todo-item")).toContainText("Enter Key Todo");
  });
});
