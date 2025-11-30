import { expect, test } from "@playwright/test";

test.describe("Subtask Integration E2E Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:5173", { waitUntil: "domcontentloaded" });
    // Wait for initial load
    await page.waitForSelector("input.todo-input", { timeout: 10000 });
  });

  test("should add a subtask to a todo", async ({ page }) => {
    // Create parent todo
    const parentTitle = `Parent Task ${Date.now()}`;
    await page.locator("input.todo-input").fill(parentTitle);
    await page.locator("button.create-button").click();
    
    // Wait for todo to appear
    const todoItem = page.locator(".todo-item-container", { hasText: parentTitle });
    await expect(todoItem).toBeVisible();

    // Click add subtask button (+)
    await todoItem.locator(".add-subtask-btn").click();

    // Fill subtask form
    const subtaskTitle = "Subtask 1";
    await todoItem.locator(".subtask-input").fill(subtaskTitle);
    await todoItem.locator(".subtask-submit-btn").click();

    // Verify subtask is visible
    const subtaskItem = todoItem.locator(".subtask-item", { hasText: subtaskTitle });
    await expect(subtaskItem).toBeVisible();
    
    // Verify progress indicator
    await expect(todoItem).toContainText("(0/1)");
  });

  test("should toggle subtask completion", async ({ page }) => {
    // Create parent todo
    const parentTitle = `Toggle Task ${Date.now()}`;
    await page.locator("input.todo-input").fill(parentTitle);
    await page.locator("button.create-button").click();
    
    const todoItem = page.locator(".todo-item-container", { hasText: parentTitle });
    await expect(todoItem).toBeVisible();

    // Add subtask
    await todoItem.locator(".add-subtask-btn").click();
    await todoItem.locator(".subtask-input").fill("Subtask to toggle");
    await todoItem.locator(".subtask-submit-btn").click();

    // Toggle subtask
    const subtaskCheckbox = todoItem.locator(".subtask-item input[type='checkbox']");
    await subtaskCheckbox.check();

    // Verify completion style
    const subtaskText = todoItem.locator(".subtask-text");
    await expect(subtaskText).toHaveClass(/completed/);

    // Verify progress indicator
    await expect(todoItem).toContainText("(1/1)");
  });

  test("should delete a subtask", async ({ page }) => {
    // Create parent todo
    const parentTitle = `Delete Task ${Date.now()}`;
    await page.locator("input.todo-input").fill(parentTitle);
    await page.locator("button.create-button").click();
    
    const todoItem = page.locator(".todo-item-container", { hasText: parentTitle });
    await expect(todoItem).toBeVisible();

    // Add subtask
    await todoItem.locator(".add-subtask-btn").click();
    await todoItem.locator(".subtask-input").fill("Subtask to delete");
    await todoItem.locator(".subtask-submit-btn").click();

    // Delete subtask
    await todoItem.locator(".subtask-delete-btn").click();

    // Verify subtask is gone
    const subtaskItem = todoItem.locator(".subtask-item");
    await expect(subtaskItem).not.toBeVisible();
    
    // Verify progress indicator is gone or (0/0) - actually it disappears if no subtasks
    await expect(todoItem).not.toContainText("(0/1)");
  });
});
