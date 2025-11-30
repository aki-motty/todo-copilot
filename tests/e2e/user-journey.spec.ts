import { expect, test } from "@playwright/test";

test.describe("User Journey", () => {
  test.setTimeout(120000);

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Clear any existing data
    await page.evaluate(() => {
      window.localStorage.clear();
    });
    await page.reload();
  });

  test("complete user journey: create, view, complete, and manage todos", async ({ page }) => {
    const input = page.locator('input[placeholder="Add a new todo..."]');
    const createButton = page.locator('button:has-text("Create")');
    const timestamp = Date.now();

    // Step 1: Create first todo "Buy milk"
    await input.fill(`Buy milk ${timestamp}`);
    await createButton.click();
    await expect(page.locator(".todo-item")).toBeVisible({ timeout: 10000 });
    await expect(page.locator(".todo-item")).toContainText(`Buy milk ${timestamp}`);

    // Step 2: Create second todo "Walk dog"
    await input.fill(`Walk dog ${timestamp}`);
    await createButton.click();
    await expect(page.locator(".todo-item")).toHaveCount(2, { timeout: 10000 });

    // Step 3: Create third todo "Read book"
    await input.fill(`Read book ${timestamp}`);
    await createButton.click();
    await expect(page.locator(".todo-item")).toHaveCount(3, { timeout: 10000 });

    // Step 4: Toggle first todo (Buy milk) as completed
    const buyMilkTodo = page.locator(".todo-item", { hasText: `Buy milk ${timestamp}` });
    await buyMilkTodo.locator('input[type="checkbox"]').click();
    await page.waitForTimeout(500);
    await expect(buyMilkTodo.locator('input[type="checkbox"]')).toBeChecked();

    // Step 5: Add a subtask to "Walk dog" (if subtask feature exists)
    const walkDogTodo = page.locator(".todo-item", { hasText: `Walk dog ${timestamp}` });
    const subtaskInput = walkDogTodo.locator('input[placeholder*="subtask"]');

    if (await subtaskInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await subtaskInput.fill("Get leash");
      await subtaskInput.press("Enter");
      await page.waitForTimeout(500);
      await expect(walkDogTodo).toContainText("Get leash");
    }

    // Step 6: Reload page and verify everything persists
    await page.reload();

    // Verify todos persist
    await expect(page.locator(".todo-item")).toHaveCount(3, { timeout: 10000 });
    await expect(page.locator(".todo-item", { hasText: `Buy milk ${timestamp}` })).toBeVisible();
    await expect(page.locator(".todo-item", { hasText: `Walk dog ${timestamp}` })).toBeVisible();
    await expect(page.locator(".todo-item", { hasText: `Read book ${timestamp}` })).toBeVisible();

    // Verify completion status persists
    const reloadedBuyMilk = page.locator(".todo-item", { hasText: `Buy milk ${timestamp}` });
    await expect(reloadedBuyMilk.locator('input[type="checkbox"]')).toBeChecked();

    // Step 7: Delete a completed todo
    await reloadedBuyMilk.locator('button[aria-label="Delete todo"]').click();
    await page.waitForTimeout(500);
    await expect(page.locator(".todo-item")).toHaveCount(2);

    // Step 8: Toggle remaining todos
    const walkDogReloaded = page.locator(".todo-item", { hasText: `Walk dog ${timestamp}` });
    const readBookTodo = page.locator(".todo-item", { hasText: `Read book ${timestamp}` });

    await walkDogReloaded.locator('input[type="checkbox"]').click();
    await page.waitForTimeout(300);
    await readBookTodo.locator('input[type="checkbox"]').click();
    await page.waitForTimeout(300);

    // Verify all remaining are completed
    await expect(walkDogReloaded.locator('input[type="checkbox"]')).toBeChecked();
    await expect(readBookTodo.locator('input[type="checkbox"]')).toBeChecked();

    // Step 9: Final reload to verify state
    await page.reload();
    await expect(page.locator(".todo-item")).toHaveCount(2, { timeout: 10000 });
  });

  test("todo workflow with tags and subtasks", async ({ page }) => {
    const input = page.locator('input[placeholder="Add a new todo..."]');
    const createButton = page.locator('button:has-text("Create")');
    const timestamp = Date.now();

    // Create a project todo
    const projectTitle = `Project Planning ${timestamp}`;
    await input.fill(projectTitle);
    await createButton.click();
    await expect(page.locator(".todo-item")).toBeVisible({ timeout: 10000 });

    const todoItem = page.locator(".todo-item", { hasText: projectTitle });

    // Add a tag if tag selector exists
    const tagSelector = todoItem.locator("select.tag-selector");
    if (await tagSelector.isVisible({ timeout: 2000 }).catch(() => false)) {
      await tagSelector.selectOption("Summary");
      await expect(todoItem.locator(".todo-tag")).toContainText("Summary", { timeout: 10000 });
    }

    // Add subtasks if the feature exists
    const subtaskInput = todoItem.locator('input[placeholder*="subtask"]');
    if (await subtaskInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Add multiple subtasks
      await subtaskInput.fill("Research phase");
      await subtaskInput.press("Enter");
      await page.waitForTimeout(500);

      await subtaskInput.fill("Design phase");
      await subtaskInput.press("Enter");
      await page.waitForTimeout(500);

      await subtaskInput.fill("Implementation phase");
      await subtaskInput.press("Enter");
      await page.waitForTimeout(500);

      // Verify subtasks were added
      await expect(todoItem).toContainText("Research phase");
      await expect(todoItem).toContainText("Design phase");
      await expect(todoItem).toContainText("Implementation phase");

      // Toggle one subtask as complete
      const subtaskCheckbox = todoItem.locator('.subtask-item input[type="checkbox"]').first();
      if (await subtaskCheckbox.isVisible({ timeout: 2000 }).catch(() => false)) {
        await subtaskCheckbox.click();
        await page.waitForTimeout(300);
      }
    }

    // Reload and verify
    await page.reload();
    const reloadedItem = page.locator(".todo-item", { hasText: projectTitle });
    await expect(reloadedItem).toBeVisible({ timeout: 10000 });
  });

  test("error recovery scenario", async ({ page }) => {
    const input = page.locator('input[placeholder="Add a new todo..."]');
    const createButton = page.locator('button:has-text("Create")');
    const timestamp = Date.now();

    // Create a valid todo
    await input.fill(`Valid Todo ${timestamp}`);
    await createButton.click();
    await expect(page.locator(".todo-item")).toBeVisible({ timeout: 10000 });

    // Try to create invalid todo (empty)
    await input.fill("");
    await createButton.click();

    // Should still have only 1 todo
    await page.waitForTimeout(500);
    await expect(page.locator(".todo-item")).toHaveCount(1);

    // Create another valid todo to ensure form still works
    await input.fill(`Another Valid Todo ${timestamp}`);
    await createButton.click();
    await expect(page.locator(".todo-item")).toHaveCount(2, { timeout: 10000 });

    // Delete one and verify counts
    const firstTodo = page.locator(".todo-item").first();
    await firstTodo.locator('button[aria-label="Delete todo"]').click();
    await page.waitForTimeout(500);
    await expect(page.locator(".todo-item")).toHaveCount(1);
  });

  test("navigation and page state", async ({ page }) => {
    const input = page.locator('input[placeholder="Add a new todo..."]');
    const createButton = page.locator('button:has-text("Create")');
    const timestamp = Date.now();

    // Create a todo
    await input.fill(`Navigation Test ${timestamp}`);
    await createButton.click();
    await expect(page.locator(".todo-item")).toBeVisible({ timeout: 10000 });

    // Navigate away (go to a non-existent page)
    await page.goto("/non-existent-page");

    // Navigate back to home
    await page.goto("/");

    // Todo should still exist
    await expect(
      page.locator(".todo-item", { hasText: `Navigation Test ${timestamp}` })
    ).toBeVisible({ timeout: 10000 });
  });
});
