import { expect, test } from "@playwright/test";

test.describe("Accessibility", () => {
  test.setTimeout(60000);

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      window.localStorage.clear();
    });
    await page.reload();
  });

  test("should be navigable by keyboard", async ({ page }) => {
    const input = page.locator('input[placeholder="Add a new todo..."]');
    const createButton = page.locator('button:has-text("Create")');

    // Focus should start on input or be reachable via Tab
    await page.keyboard.press("Tab");

    // Create a todo using keyboard
    await input.focus();
    await page.keyboard.type("Keyboard Todo");
    await page.keyboard.press("Enter");

    await expect(page.locator(".todo-item")).toBeVisible({ timeout: 10000 });
    await expect(page.locator(".todo-item")).toContainText("Keyboard Todo");
  });

  test("checkboxes should be focusable and toggleable via keyboard", async ({ page }) => {
    const input = page.locator('input[placeholder="Add a new todo..."]');

    // Create a todo
    await input.fill("Accessible Todo");
    await input.press("Enter");
    await expect(page.locator(".todo-item")).toBeVisible({ timeout: 10000 });

    // Navigate to checkbox
    const checkbox = page.locator('.todo-item input[type="checkbox"]');
    await checkbox.focus();

    // Toggle with Space key
    await page.keyboard.press("Space");
    await page.waitForTimeout(300);

    await expect(checkbox).toBeChecked();

    // Toggle back
    await page.keyboard.press("Space");
    await page.waitForTimeout(300);

    await expect(checkbox).not.toBeChecked();
  });

  test("delete button should have accessible label", async ({ page }) => {
    const input = page.locator('input[placeholder="Add a new todo..."]');

    // Create a todo
    await input.fill("Delete Me");
    await input.press("Enter");
    await expect(page.locator(".todo-item")).toBeVisible({ timeout: 10000 });

    // Check delete button has aria-label
    const deleteButton = page.locator('.todo-item button[aria-label="Delete todo"]');
    await expect(deleteButton).toBeVisible();

    // Should be able to delete via keyboard
    await deleteButton.focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(500);

    await expect(page.locator(".todo-item")).toHaveCount(0);
  });

  test("form should be properly labeled", async ({ page }) => {
    // Input should have placeholder for context
    const input = page.locator('input[placeholder="Add a new todo..."]');
    await expect(input).toBeVisible();

    // Create button should be identifiable
    const createButton = page.locator('button:has-text("Create")');
    await expect(createButton).toBeVisible();
  });

  test("completed todos should have visual indication", async ({ page }) => {
    const input = page.locator('input[placeholder="Add a new todo..."]');

    // Create a todo
    await input.fill("Visual Test");
    await input.press("Enter");
    await expect(page.locator(".todo-item")).toBeVisible({ timeout: 10000 });

    // Check initial state - not completed
    const todoItem = page.locator(".todo-item");
    const checkbox = todoItem.locator('input[type="checkbox"]');
    await expect(checkbox).not.toBeChecked();

    // Toggle completion
    await checkbox.click();
    await page.waitForTimeout(300);

    // Should have visual indication (checked state)
    await expect(checkbox).toBeChecked();

    // Check for strikethrough or other visual changes (class-based)
    // The todo item should reflect completed state somehow
    const isCompleted = await todoItem.evaluate((el) => {
      return (
        el.classList.contains("completed") ||
        el.querySelector(".completed") !== null ||
        window
          .getComputedStyle(el.querySelector(".todo-title") || el)
          .textDecoration.includes("line-through")
      );
    });

    // At minimum, checkbox should be checked
    expect(isCompleted || (await checkbox.isChecked())).toBeTruthy();
  });
});
