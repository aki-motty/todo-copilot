/**
 * E2E tests for Todo detail panel and markdown description
 * Tests User Story 1: Add/Edit task descriptions
 */

import { expect, test } from "@playwright/test";

test.describe("Todo Detail Panel - Add/Edit Description", () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.clear();
    });
    await page.reload();
  });

  test("should show detail button on todo item", async ({ page }) => {
    // Create a todo
    await page.fill('input[placeholder*="todo"]', "Test todo");
    await page.keyboard.press("Enter");

    // Wait for todo to appear
    await expect(page.locator(".todo-item")).toBeVisible();

    // Check for detail button
    const detailBtn = page.locator(".detail-btn").first();
    await expect(detailBtn).toBeVisible();
    await expect(detailBtn).toHaveAttribute("title", /description/i);
  });

  test("should open detail panel when clicking detail button", async ({ page }) => {
    // Create a todo
    await page.fill('input[placeholder*="todo"]', "Test todo for details");
    await page.keyboard.press("Enter");

    // Click detail button
    await page.locator(".detail-btn").first().click();

    // Verify panel is open
    await expect(page.locator(".todo-detail-panel")).toBeVisible();
    await expect(page.locator(".todo-detail-panel__title")).toContainText("Test todo for details");
  });

  test("should show edit and preview mode toggle buttons", async ({ page }) => {
    // Create and open detail panel
    await page.fill('input[placeholder*="todo"]', "Test todo");
    await page.keyboard.press("Enter");
    await page.locator(".detail-btn").first().click();

    // Check for mode toggle buttons
    await expect(
      page.locator(".todo-detail-panel__mode-btn").filter({ hasText: "Edit" })
    ).toBeVisible();
    await expect(
      page.locator(".todo-detail-panel__mode-btn").filter({ hasText: "Preview" })
    ).toBeVisible();
  });

  test("should show markdown editor in edit mode", async ({ page }) => {
    // Create and open detail panel
    await page.fill('input[placeholder*="todo"]', "Test todo");
    await page.keyboard.press("Enter");
    await page.locator(".detail-btn").first().click();

    // Should be in edit mode by default
    await expect(page.locator(".markdown-editor")).toBeVisible();
    await expect(page.locator(".markdown-editor__textarea")).toBeVisible();
  });

  test("should allow typing description in editor", async ({ page }) => {
    // Create and open detail panel
    await page.fill('input[placeholder*="todo"]', "Test todo");
    await page.keyboard.press("Enter");
    await page.locator(".detail-btn").first().click();

    // Type in editor
    const editor = page.locator(".markdown-editor__textarea");
    await editor.fill("# My Description\n\nThis is a test.");

    // Verify content
    await expect(editor).toHaveValue("# My Description\n\nThis is a test.");
  });

  test("should show character count", async ({ page }) => {
    // Create and open detail panel
    await page.fill('input[placeholder*="todo"]', "Test todo");
    await page.keyboard.press("Enter");
    await page.locator(".detail-btn").first().click();

    // Type in editor
    await page.locator(".markdown-editor__textarea").fill("Hello world");

    // Check character count
    await expect(page.locator(".markdown-editor__char-count")).toContainText("11");
  });

  test("should show unsaved changes indicator", async ({ page }) => {
    // Create and open detail panel
    await page.fill('input[placeholder*="todo"]', "Test todo");
    await page.keyboard.press("Enter");
    await page.locator(".detail-btn").first().click();

    // Type in editor
    await page.locator(".markdown-editor__textarea").fill("Some content");

    // Check for unsaved indicator
    await expect(page.locator(".todo-detail-panel__unsaved-indicator")).toBeVisible();
    await expect(page.locator(".todo-detail-panel__unsaved-indicator")).toContainText("Unsaved");
  });

  test("should save description when clicking save button", async ({ page }) => {
    // Create and open detail panel
    await page.fill('input[placeholder*="todo"]', "Test todo");
    await page.keyboard.press("Enter");
    await page.locator(".detail-btn").first().click();

    // Type description
    await page.locator(".markdown-editor__textarea").fill("Saved description");

    // Click save button
    await page.locator(".todo-detail-panel__btn--primary").click();

    // Unsaved indicator should disappear
    await expect(page.locator(".todo-detail-panel__unsaved-indicator")).not.toBeVisible();
  });

  test("should persist description after page reload", async ({ page }) => {
    // Create and open detail panel
    await page.fill('input[placeholder*="todo"]', "Persistent todo");
    await page.keyboard.press("Enter");
    await page.locator(".detail-btn").first().click();

    // Type and save description
    await page.locator(".markdown-editor__textarea").fill("Persistent description");
    await page.locator(".todo-detail-panel__btn--primary").click();

    // Wait for save
    await expect(page.locator(".todo-detail-panel__unsaved-indicator")).not.toBeVisible();

    // Close panel
    await page.locator(".todo-detail-panel__close-btn").click();

    // Reload page
    await page.reload();

    // Re-open detail panel
    await page.locator(".detail-btn").first().click();

    // Verify description is persisted
    await expect(page.locator(".markdown-editor__textarea")).toHaveValue("Persistent description");
  });

  test("should show detail icon indicator when todo has description", async ({ page }) => {
    // Create and open detail panel
    await page.fill('input[placeholder*="todo"]', "Todo with description");
    await page.keyboard.press("Enter");
    await page.locator(".detail-btn").first().click();

    // Type and save description
    await page.locator(".markdown-editor__textarea").fill("Has content");
    await page.locator(".todo-detail-panel__btn--primary").click();

    // Close panel
    await page.locator(".todo-detail-panel__close-btn").click();

    // Check that detail button has content indicator
    await expect(page.locator(".detail-btn.has-content")).toBeVisible();
  });

  test("should show confirmation when closing with unsaved changes", async ({ page }) => {
    // Create and open detail panel
    await page.fill('input[placeholder*="todo"]', "Test todo");
    await page.keyboard.press("Enter");
    await page.locator(".detail-btn").first().click();

    // Type description without saving
    await page.locator(".markdown-editor__textarea").fill("Unsaved content");

    // Set up dialog handler
    page.on("dialog", async (dialog) => {
      expect(dialog.message()).toContain("unsaved");
      await dialog.dismiss(); // Cancel close
    });

    // Try to close panel
    await page.locator(".todo-detail-panel__close-btn").click();

    // Panel should still be visible (we dismissed the dialog)
    await expect(page.locator(".todo-detail-panel")).toBeVisible();
  });

  test("should discard changes when clicking discard button", async ({ page }) => {
    // Create and open detail panel
    await page.fill('input[placeholder*="todo"]', "Test todo");
    await page.keyboard.press("Enter");
    await page.locator(".detail-btn").first().click();

    // Type description
    await page.locator(".markdown-editor__textarea").fill("To be discarded");

    // Click discard button
    await page.locator(".todo-detail-panel__btn--secondary").click();

    // Content should be cleared
    await expect(page.locator(".markdown-editor__textarea")).toHaveValue("");
    await expect(page.locator(".todo-detail-panel__unsaved-indicator")).not.toBeVisible();
  });

  test("should highlight selected todo in list", async ({ page }) => {
    // Create multiple todos
    await page.fill('input[placeholder*="todo"]', "First todo");
    await page.keyboard.press("Enter");
    await page.fill('input[placeholder*="todo"]', "Second todo");
    await page.keyboard.press("Enter");

    // Click detail button on first todo
    await page.locator(".detail-btn").first().click();

    // First todo should be selected
    await expect(page.locator(".todo-item.selected")).toBeVisible();
  });

  test("should switch preview mode", async ({ page }) => {
    // Create and open detail panel
    await page.fill('input[placeholder*="todo"]', "Test todo");
    await page.keyboard.press("Enter");
    await page.locator(".detail-btn").first().click();

    // Type markdown
    await page.locator(".markdown-editor__textarea").fill("# Heading\n\n**Bold text**");

    // Switch to preview mode
    await page.locator(".todo-detail-panel__mode-btn").filter({ hasText: "Preview" }).click();

    // Editor should be hidden, preview should be visible
    await expect(page.locator(".markdown-editor")).not.toBeVisible();
    await expect(page.locator(".markdown-preview")).toBeVisible();

    // Check rendered markdown
    await expect(page.locator(".markdown-preview h1")).toContainText("Heading");
    await expect(page.locator(".markdown-preview strong")).toContainText("Bold text");
  });

  test("should save with keyboard shortcut Ctrl+S", async ({ page }) => {
    // Create and open detail panel
    await page.fill('input[placeholder*="todo"]', "Test todo");
    await page.keyboard.press("Enter");
    await page.locator(".detail-btn").first().click();

    // Type description
    await page.locator(".markdown-editor__textarea").fill("Saved with shortcut");

    // Save with Ctrl+S
    await page.keyboard.press("Control+s");

    // Unsaved indicator should disappear
    await expect(page.locator(".todo-detail-panel__unsaved-indicator")).not.toBeVisible();
  });
});
