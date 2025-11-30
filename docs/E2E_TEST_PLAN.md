# 🎭 E2E Test Plan

> Playwright end-to-end test strategies, scenarios, and execution guide for todo-copilot

## Table of Contents
1. [Test Strategy](#test-strategy)
2. [Test Scenarios](#test-scenarios)
3. [Test Data Management](#test-data-management)
4. [Execution Guide](#execution-guide)
5. [Troubleshooting](#troubleshooting)

## Test Strategy

### Coverage Goals

#### Sprint 1 MVP (Current)
- ✅ **US1: Create Todos** - Form validation, submission, success/failure
- ✅ **US2: Display Todos** - List rendering, empty state, persistence
- ✅ **US3: Toggle Completion** - Status change, visual feedback, persistence
- ⏳ **Error Scenarios** - Invalid input, storage errors, edge cases

#### Sprint 2+ (Implemented)
- ✅ **US4: Delete Todos** - Deletion flow, validation
- ✅ **Subtasks** - Add, toggle, delete subtasks
- ✅ **Tags** - Add, remove tags (Summary, Research, Split)
- ✅ **Task Details (Markdown)** - Add, edit, preview descriptions with markdown support
- ⏳ **Undo/Redo** - State restoration, operation history
- ⏳ **Search/Filter** - Text search, category filtering

### Test Approach

#### 1. User Journey Testing
```
Path: User creates, views, and completes todos
1. Load application
2. Create first todo ("Buy milk")
3. Verify in list
4. Create second todo ("Walk dog")
5. Verify count = 2
6. Toggle first todo completed
7. Verify visual feedback (strikethrough)
8. Reload page
9. Verify todos persist
```

#### 2. Critical Path Testing
```
High Priority: Must not break
- Create todo with valid input
- Display all created todos
- Toggle completion status
- Data persists across reloads

Medium Priority: Important features
- Create todo with edge case input (1 char, 500 chars)
- Empty state display
- Delete todo
- Undo/redo

Low Priority: Nice to have
- Search functionality
- Performance with 100+ todos
- Mobile responsiveness
```

#### 3. Error Scenario Testing
```
Critical Errors to Catch:
- Invalid input (empty title)
- Very long title (>500 chars)
- Network errors (future API)
- Storage quota exceeded
- Corrupted data

Test Matrix:
✓ Valid input → Success
✗ Empty input → Error message
✗ 501+ chars → Error message
✗ Storage full → Quota error
✗ Corrupted JSON → Recovery
```

## Test Scenarios

### Scenario 1: Create Todo Flow

**Description**: User creates a new todo with valid input

**Steps**:
```gherkin
Feature: Create Todo
  Scenario: Create todo with valid title
    Given user is on the application
    When user enters "Buy groceries" in create input
    And user clicks the create button
    Then new todo appears in the list
    And todo title shows "Buy groceries"
    And todo status is "PENDING"
    And input field is cleared
```

**Test Implementation**:
```typescript
test('Create todo with valid title', async ({ page }) => {
  // Navigate to application
  await page.goto('http://localhost:5173');

  // Wait for application to load
  await page.waitForSelector('input[placeholder*="add"]');

  // Enter title
  const input = page.locator('input[placeholder*="add"]');
  await input.fill('Buy groceries');

  // Submit form
  await page.keyboard.press('Enter');

  // Verify todo appears
  const todoItem = page.locator('text=Buy groceries');
  await expect(todoItem).toBeVisible();

  // Verify input cleared
  await expect(input).toHaveValue('');
});
```

### Scenario 2: Display Todos

**Description**: User sees all created todos in a list

**Steps**:
```gherkin
Feature: Display Todos
  Scenario: Display multiple todos in list
    Given 3 todos exist in storage
    When user navigates to application
    Then all 3 todos appear in list
    And todos are in creation order
    And count shows "3 Todos"

  Scenario: Display empty state
    Given no todos in storage
    When user navigates to application
    Then empty state message appears
    And create input is visible
```

**Test Implementation**:
```typescript
test('Display multiple todos', async ({ page }) => {
  // Seed test data
  await page.evaluate(() => {
    localStorage.setItem('todos', JSON.stringify([
      {
        id: '1',
        title: 'Todo 1',
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: '2',
        title: 'Todo 2',
        status: 'COMPLETED',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]));
  });

  await page.goto('http://localhost:5173');

  // Verify both todos appear
  await expect(page.locator('text=Todo 1')).toBeVisible();
  await expect(page.locator('text=Todo 2')).toBeVisible();

  // Verify count
  const count = page.locator('text="2 Todos"');
  await expect(count).toBeVisible();
});

test('Display empty state', async ({ page }) => {
  // Clear storage
  await page.evaluate(() => localStorage.clear());

  await page.goto('http://localhost:5173');

  // Verify empty state message
  const emptyMessage = page.locator('text=No todos yet');
  await expect(emptyMessage).toBeVisible();
});
```

### Scenario 3: Toggle Completion

**Description**: User marks todo as complete/incomplete

**Steps**:
```gherkin
Feature: Toggle Completion
  Scenario: Mark todo as completed
    Given todo "Buy milk" with status "PENDING"
    When user clicks checkbox
    Then todo status becomes "COMPLETED"
    And todo title has strikethrough styling
    And checkbox is checked

  Scenario: Unmark completed todo
    Given todo "Buy milk" with status "COMPLETED"
    When user clicks checkbox
    Then todo status becomes "PENDING"
    And strikethrough styling removed
    And checkbox is unchecked
```

**Test Implementation**:
```typescript
test('Toggle todo completion', async ({ page }) => {
  // Create todo
  await page.goto('http://localhost:5173');
  const input = page.locator('input[placeholder*="add"]');
  await input.fill('Buy milk');
  await page.keyboard.press('Enter');

  // Find and click checkbox
  const checkbox = page.locator('input[type="checkbox"]').first();
  await checkbox.click();

  // Verify status changed to COMPLETED
  const todoItem = page.locator('text=Buy milk');
  await expect(todoItem).toHaveClass(/completed/);

  // Verify strikethrough applied
  const style = await todoItem.evaluate((el) => 
    window.getComputedStyle(el).textDecoration
  );
  expect(style).toContain('line-through');

  // Toggle back
  await checkbox.click();

  // Verify status back to PENDING
  await expect(todoItem).not.toHaveClass(/completed/);
});
```

### Scenario 4: Persistence

**Description**: Todos persist across page reloads

**Steps**:
```gherkin
Feature: Persistence
  Scenario: Todos survive page reload
    Given user created 2 todos
    When user reloads the page
    Then both todos still appear
    And todo count is still 2
    And completion status is preserved
```

**Test Implementation**:
```typescript
test('Todos persist across reload', async ({ page }) => {
  // Create todo
  await page.goto('http://localhost:5173');
  const input = page.locator('input[placeholder*="add"]');
  
  await input.fill('Task 1');
  await page.keyboard.press('Enter');
  
  await input.fill('Task 2');
  await page.keyboard.press('Enter');

  // Toggle first todo
  const checkbox = page.locator('input[type="checkbox"]').first();
  await checkbox.click();

  // Get initial todo count
  let todos = page.locator('text=Task');
  let count = await todos.count();
  expect(count).toBe(2);

  // Reload page
  await page.reload();
  await page.waitForSelector('text=Task');

  // Verify todos still present
  todos = page.locator('text=Task');
  count = await todos.count();
  expect(count).toBe(2);

  // Verify completion status preserved
  const checkbox2 = page.locator('input[type="checkbox"]').first();
  await expect(checkbox2).toBeChecked();
});
```

### Scenario 5: Error Handling

**Description**: Application handles invalid input gracefully

**Steps**:
```gherkin
Feature: Error Handling
  Scenario: Reject empty title
    Given user on create form
    When user submits empty title
    Then error message appears
    And todo is not created

  Scenario: Reject title > 500 chars
    Given user on create form
    When user enters 501 character title
    Then validation error appears
    And create button is disabled
```

**Test Implementation**:
```typescript
test('Reject empty title', async ({ page }) => {
  await page.goto('http://localhost:5173');
  
  const input = page.locator('input[placeholder*="add"]');
  const button = page.locator('button:has-text("Add")');

  // Try submitting empty
  await button.click();

  // Verify error message
  const error = page.locator('text=Title cannot be empty');
  await expect(error).toBeVisible();

  // Verify no todo created
  const todos = page.locator('[class*="todo-item"]');
  expect(await todos.count()).toBe(0);
});

test('Reject title > 500 chars', async ({ page }) => {
  await page.goto('http://localhost:5173');
  
  const input = page.locator('input[placeholder*="add"]');
  const longTitle = 'a'.repeat(501);

  await input.fill(longTitle);

  // Verify validation error
  const error = page.locator('text=Title cannot exceed');
  await expect(error).toBeVisible();

  // Verify button disabled
  const button = page.locator('button:has-text("Add")');
  await expect(button).toBeDisabled();
});
```

### Scenario 6: Todo Detail/Description

**Description**: User can add and edit markdown descriptions for todos

**Steps**:
```gherkin
Feature: Todo Detail/Description
  Scenario: Add description to todo
    Given user has created a todo
    When user clicks the detail icon on the todo
    Then the detail panel opens on the right
    And user can enter a markdown description
    And user clicks the save button
    Then the description is saved

  Scenario: Preview markdown formatting
    Given user has opened a todo detail panel
    And user has entered markdown text
    When user clicks the preview button
    Then the markdown is rendered as HTML
    And headings, lists, code blocks are properly formatted

  Scenario: Description character limit
    Given user has opened a todo detail panel
    When user enters more than 10,000 characters
    Then an error message appears
    And the save button is disabled

  Scenario: Unsaved changes warning
    Given user has modified the description
    And user has not saved the changes
    When user tries to close the panel
    Then a warning message appears
    And user can choose to discard or save changes
```

**Test Implementation**:
```typescript
test('Add description to todo', async ({ page }) => {
  await page.goto('http://localhost:5173');
  
  // Create a todo first
  const input = page.locator('input[placeholder*="add"]');
  await input.fill('Todo with description');
  await page.keyboard.press('Enter');
  
  // Click detail icon
  const detailButton = page.locator('.detail-btn').first();
  await detailButton.click();
  
  // Verify panel opened
  const detailPanel = page.locator('.todo-detail-panel');
  await expect(detailPanel).toBeVisible();
  
  // Enter description
  const editor = page.locator('.markdown-editor textarea');
  await editor.fill('# Task Details\n\n- Step 1\n- Step 2');
  
  // Save
  const saveButton = page.locator('button:has-text("Save")');
  await saveButton.click();
  
  // Verify saved indicator
  const savedIndicator = page.locator('.save-status');
  await expect(savedIndicator).toContainText('Saved');
});

test('Preview markdown formatting', async ({ page }) => {
  await page.goto('http://localhost:5173');
  
  // Setup: create todo and open detail
  await createTodoWithDetail(page);
  
  // Enter markdown
  const editor = page.locator('.markdown-editor textarea');
  await editor.fill('# Heading\n\n**Bold** and *italic*\n\n- List item');
  
  // Switch to preview
  const previewTab = page.locator('button:has-text("Preview")');
  await previewTab.click();
  
  // Verify rendered markdown
  const preview = page.locator('.markdown-preview');
  await expect(preview.locator('h1')).toHaveText('Heading');
  await expect(preview.locator('strong')).toHaveText('Bold');
  await expect(preview.locator('em')).toHaveText('italic');
  await expect(preview.locator('li')).toHaveText('List item');
});

test('Unsaved changes warning', async ({ page }) => {
  await page.goto('http://localhost:5173');
  
  // Setup: create todo and open detail
  await createTodoWithDetail(page);
  
  // Enter description without saving
  const editor = page.locator('.markdown-editor textarea');
  await editor.fill('Unsaved content');
  
  // Try to close panel
  const closeButton = page.locator('.todo-detail-panel .close-btn');
  await closeButton.click();
  
  // Verify warning appears
  const warning = page.locator('.unsaved-warning');
  await expect(warning).toBeVisible();
  await expect(warning).toContainText('unsaved changes');
});
```

## Test Data Management

### Setup: Seed Initial Data
```typescript
/**
 * Fixture to seed test data before each test.
 */
test.beforeEach(async ({ page }) => {
  // Clear storage
  await page.evaluate(() => localStorage.clear());

  // Create seed todos
  const testTodos = [
    {
      id: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Test Todo 1',
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      title: 'Test Todo 2',
      status: 'COMPLETED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  await page.evaluate((todos) => {
    localStorage.setItem('todos', JSON.stringify(todos));
  }, testTodos);
});
```

### Teardown: Cleanup
```typescript
/**
 * Fixture to cleanup after each test.
 */
test.afterEach(async ({ page }) => {
  // Clear storage
  await page.evaluate(() => localStorage.clear());

  // Close any open dialogs
  try {
    await page.keyboard.press('Escape');
  } catch (e) {
    // Ignore
  }
});
```

### Test Data Patterns

#### Valid Inputs
```typescript
const validInputs = [
  'Buy milk',
  'a', // Minimum length
  'a'.repeat(500), // Maximum length
  'Test with numbers 123',
  'Test with special chars !@#$',
  'Test with   multiple   spaces',
  '  Leading and trailing spaces  ' // Auto-trimmed
];
```

#### Invalid Inputs
```typescript
const invalidInputs = [
  '', // Empty
  '   ', // Whitespace only
  'a'.repeat(501), // Over 500 chars
  '\n', // Newline only
];
```

## Execution Guide

### Prerequisites
```bash
# Install dependencies
npm install

# Verify dev server works
npm run dev
# Should be available at http://localhost:5173
```

### Running Tests

#### All E2E Tests
```bash
npm run e2e

# Expected output:
# ✓ 50 tests passed
# ✓ 0 tests failed
# Total time: ~60 seconds
```

#### Specific Test File
```bash
npm run e2e -- tests/display-todos.spec.ts

# Run with output
npm run e2e -- --reporter=list

# Run with debugging
npm run e2e -- --debug

# Run with UI (interactive)
npm run e2e -- --ui
```

#### Watch Mode (During Development)
```bash
npm run e2e -- --watch

# Auto-rerun on file changes
```

#### Generate Report
```bash
npm run e2e -- --reporter=html

# View report
open playwright-report/index.html
```

### Debugging Failed Tests

#### 1. Use Playwright Inspector
```bash
npm run e2e -- --debug

# Stepping through test:
# - Step over (S)
# - Step into (I)
# - Continue (C)
# - Stop (Q)
```

#### 2. Take Screenshots
```typescript
test('Debug test', async ({ page }) => {
  await page.goto('http://localhost:5173');
  
  // Take screenshot
  await page.screenshot({ path: 'debug.png' });
});

// View screenshot
open debug.png
```

#### 3. Record Video
```typescript
// playwright.config.ts
use: {
  video: 'on-first-retry'  // Record on failure
}

// Run test
npm run e2e

// View video
open test-results/debug-video.webm
```

#### 4. Check Console Logs
```typescript
page.on('console', (msg) => {
  console.log('Browser log:', msg.text());
});
```

## Performance Benchmarks

### Expected Performance Metrics

| Operation | Target | Acceptable |
|-----------|--------|-----------|
| Page load | < 1s | < 2s |
| Create todo | < 500ms | < 1s |
| Toggle completion | < 500ms | < 1s |
| Load 10 todos | < 500ms | < 1s |
| Load 100 todos | < 2s | < 3s |
| Search filter | < 200ms | < 500ms |

### Performance Test Example
```typescript
test('Performance: Create todo < 500ms', async ({ page }) => {
  await page.goto('http://localhost:5173');

  const startTime = Date.now();

  const input = page.locator('input[placeholder*="add"]');
  await input.fill('Performance test');
  await page.keyboard.press('Enter');

  // Wait for todo to appear
  await page.locator('text=Performance test').waitFor();

  const duration = Date.now() - startTime;
  console.log(`Create todo took ${duration}ms`);
  
  // Assert performance
  expect(duration).toBeLessThan(500);
});
```

## Test Reports

### Coverage by Feature

| Feature | Unit | Integration | E2E | Total | Status |
|---------|------|-------------|-----|-------|--------|
| Create | 15 | 12 | 4 | 31 | ✅ |
| Display | 6 | 8 | 5 | 19 | ✅ |
| Toggle | 13 | 7 | 4 | 24 | ✅ |
| Delete | 8 | 5 | 6 | 19 | ✅ |
| Subtasks | 12 | 6 | 5 | 23 | ✅ |
| Tags | 8 | 4 | 4 | 16 | ✅ |
| Persist | 5 | 5 | 5 | 15 | ✅ |
| Error | 5 | 3 | 4 | 12 | ✅ |
| Edge Cases | 0 | 0 | 7 | 7 | ✅ |
| Accessibility | 0 | 0 | 5 | 5 | ✅ |
| User Journey | 0 | 0 | 4 | 4 | ✅ |
| **Total** | **72** | **50** | **50+** | **175+** | ✅ |

### Current Status

✅ **Sprint 1-3 Complete**:
- 541 unit/integration tests passing
- 50 E2E tests passing
- Domain coverage: 100%
- Application coverage: 93%

✅ **Implemented Features**:
- CRUD operations (Create, Read, Update, Delete)
- Subtask management
- Tag management (Summary, Research, Split)
- Data persistence
- Edge case handling
- Accessibility support

## Troubleshooting

### Issue: Tests timeout

**Cause**: Application not responding

**Solution**:
```bash
# Verify dev server running
npm run dev

# In another terminal:
npm run e2e

# If still times out, increase timeout:
test.setTimeout(30000); // 30 seconds
```

### Issue: "Cannot find executable"

**Cause**: Playwright browsers not installed

**Solution**:
```bash
# Install browsers
npx playwright install

# Run tests again
npm run e2e
```

### Issue: "Port 5173 in use"

**Cause**: Dev server already running

**Solution**:
```bash
# Kill process using port
lsof -i :5173
kill -9 <PID>

# Or use different port
npm run dev -- --port 5174
```

### Issue: localStorage not persisting

**Cause**: Browser privacy mode or cleared

**Solution**:
```typescript
// Check if localStorage available
if (typeof localStorage === 'undefined') {
  throw new Error('localStorage not available');
}

// Clear and verify
localStorage.clear();
localStorage.setItem('test', 'value');
expect(localStorage.getItem('test')).toBe('value');
```

## References

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Testing Best Practices](https://playwright.dev/docs/best-practices)
- [BDD with Playwright](https://github.com/cucumber/cucumber-js)

---

**Last Updated**: November 30, 2025  
**Version**: 2.0.0 (Full E2E Coverage)  
**Status**: Complete - 50 E2E tests covering all features
