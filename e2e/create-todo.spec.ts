import { expect, test } from '@playwright/test';

test.describe('User Story 1: Create and Display Todos', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:5173');
    // Wait for the app to fully load
    await page.waitForLoadState('networkidle');
  });

  test('should display the app header', async ({ page }) => {
    const header = page.locator('h1');
    await expect(header).toContainText('Todo Copilot');
  });

  test('should display empty state when no todos', async ({ page }) => {
    const emptyMessage = page.locator('text=No todos yet');
    await expect(emptyMessage).toBeVisible();
  });

  test('should create a new todo', async ({ page }) => {
    const input = page.locator('[aria-label="Todo title input"]');
    const createButton = page.locator('button:has-text("Create")').first();

    // Type a new todo
    await input.fill('Buy groceries');
    
    // Click create button
    await createButton.click();

    // Wait for the todo to appear
    await page.waitForTimeout(500);

    // Verify the todo appears in the list
    const todoItem = page.locator('text=Buy groceries');
    await expect(todoItem).toBeVisible();
  });

  test('should create multiple todos', async ({ page }) => {
    const input = page.locator('[aria-label="Todo title input"]');
    const createButton = page.locator('button:has-text("Create")').first();

    const todos = ['Task 1', 'Task 2', 'Task 3'];

    for (const todo of todos) {
      await input.fill(todo);
      await createButton.click();
      await page.waitForTimeout(300);
    }

    // Verify all todos appear
    for (const todo of todos) {
      const todoItem = page.locator(`text=${todo}`);
      await expect(todoItem).toBeVisible();
    }

    // Verify count display
    const counter = page.locator('text=My Todos (3)');
    await expect(counter).toBeVisible();
  });

  test('should toggle todo completion', async ({ page }) => {
    const input = page.locator('[aria-label="Todo title input"]');
    const createButton = page.locator('button:has-text("Create")').first();

    // Create a todo
    await input.fill('Test task');
    await createButton.click();
    await page.waitForTimeout(500);

    // Find and toggle the checkbox
    const checkbox = page.locator('input[type="checkbox"]').first();
    await expect(checkbox).not.toBeChecked();

    await checkbox.click();
    await page.waitForTimeout(300);

    // Verify it's now checked
    await expect(checkbox).toBeChecked();

    // Verify the text has strike-through styling (class 'completed')
    const todoText = page.locator('.todo-text.completed');
    await expect(todoText).toBeVisible();
  });

  test('should persist todos across page reload', async ({ page }) => {
    const input = page.locator('[aria-label="Todo title input"]');
    const createButton = page.locator('button:has-text("Create")').first();

    // Create a todo
    await input.fill('Persistent task');
    await createButton.click();
    await page.waitForTimeout(500);

    // Verify it appears
    let todoItem = page.locator('text=Persistent task');
    await expect(todoItem).toBeVisible();

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify todo still appears
    todoItem = page.locator('text=Persistent task');
    await expect(todoItem).toBeVisible();
  });

  test('should delete a todo', async ({ page }) => {
    const input = page.locator('[aria-label="Todo title input"]');
    const createButton = page.locator('button:has-text("Create")').first();

    // Create a todo
    await input.fill('Delete me');
    await createButton.click();
    await page.waitForTimeout(500);

    // Click delete button
    const deleteButton = page.locator('button:has-text("Delete")').first();
    await deleteButton.click();
    await page.waitForTimeout(300);

    // Click confirm
    const confirmButton = page.locator('button:has-text("Confirm")').first();
    await confirmButton.click();
    await page.waitForTimeout(500);

    // Verify todo is gone
    const todoItem = page.locator('text=Delete me');
    await expect(todoItem).not.toBeVisible();
  });
});
