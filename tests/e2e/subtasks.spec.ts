import { expect, test } from "@playwright/test";

test.describe("Subtasks", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:5173", { waitUntil: "networkidle" });
    await page.evaluate(() => {
      window.localStorage.clear();
      window.localStorage.setItem("forceLocalStorage", "true");
    });
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
  });

  test("should add, toggle, and delete a subtask", async ({ page }) => {
    // Create parent todo
    const input = page.getByPlaceholder("Add a new todo...");
    const addButton = page.getByRole("button", { name: "Create" });
    await input.fill("Parent Task");
    await addButton.click();
    await expect(page.getByText("Parent Task")).toBeVisible();

    // Add subtask
    const addSubtaskBtn = page.locator(".add-subtask-btn");
    await addSubtaskBtn.click();

    const subtaskInput = page.locator(".subtask-input");
    await subtaskInput.fill("Child Task");
    const subtaskSubmit = page.locator(".subtask-submit-btn");
    await subtaskSubmit.click();

    await expect(page.getByText("Child Task")).toBeVisible();

    // Toggle subtask
    const subtaskCheckbox = page.locator(".subtask-checkbox");
    await subtaskCheckbox.click();
    const subtaskText = page.locator(".subtask-text");
    await expect(subtaskText).toHaveClass(/completed/);

    // Delete subtask
    const deleteSubtaskBtn = page.locator(".subtask-delete-btn");
    await deleteSubtaskBtn.click();
    await expect(page.getByText("Child Task")).not.toBeVisible();
  });
});
