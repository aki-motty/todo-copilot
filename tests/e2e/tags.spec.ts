import { expect, test } from "@playwright/test";

test.describe("Task Tags", () => {
  test.setTimeout(120000);
  let todoName: string;

  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => console.log(`PAGE LOG: ${msg.text()}`));
    page.on("pageerror", (exception) => console.log(`PAGE ERROR: ${exception}`));
    todoName = `Tag Test Todo ${Date.now()}`;
    await page.goto("/");
    // Create a todo for testing
    await page.fill('input[placeholder="Add a new todo..."]', todoName);
    await page.click('button:has-text("Create")');
    await expect(page.locator(`text=${todoName}`)).toBeVisible({ timeout: 30000 });
  });

  test("should add and remove tags", async ({ page }) => {
    const todoItem = page.locator(".todo-item", { hasText: todoName });

    // Add tag
    await todoItem.locator("select.tag-selector").selectOption("Summary");
    await expect(todoItem.locator(".todo-tag")).toContainText("Summary", { timeout: 30000 });

    // Add another tag
    await todoItem.locator("select.tag-selector").selectOption("Research");
    await expect(todoItem.locator(".todo-tag").nth(1)).toContainText("Research", {
      timeout: 30000,
    });

    // Remove tag - wait for network to settle
    const removePromise = page.waitForResponse(
      (resp) => resp.url().includes("/tags/") && resp.request().method() === "DELETE",
      { timeout: 30000 }
    );
    await todoItem.locator('button[aria-label="Remove tag Summary"]').click();
    await removePromise;

    // Wait for UI to update after API response
    await expect(todoItem.locator(".todo-tag")).not.toContainText("Summary", { timeout: 30000 });
    await expect(todoItem.locator(".todo-tag")).toContainText("Research", { timeout: 30000 });
  });

  test("should persist tags after reload", async ({ page }) => {
    const todoItem = page.locator(".todo-item", { hasText: todoName });

    // Add tag
    await todoItem.locator("select.tag-selector").selectOption("Summary");
    await expect(todoItem.locator(".todo-tag")).toContainText("Summary", { timeout: 30000 });

    // Reload
    await page.reload();

    // Re-locate element after reload
    const reloadedTodoItem = page.locator(".todo-item", { hasText: todoName });
    await expect(reloadedTodoItem.locator(".todo-tag")).toContainText("Summary", {
      timeout: 30000,
    });
  });
});
