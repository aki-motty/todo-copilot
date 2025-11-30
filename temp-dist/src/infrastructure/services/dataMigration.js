/**
 * Data Migration Script: localStorage → Lambda API (DynamoDB)
 *
 * This script migrates todos from browser localStorage to the Lambda API backend
 * Run this during initialization to preserve existing todos
 */
import { TodoApiClient } from "./todoApiClient";
/**
 * Retrieves todos from localStorage
 */
export function getLocalStorageTodos() {
  try {
    const stored = localStorage.getItem("todos");
    if (!stored) {
      return [];
    }
    return JSON.parse(stored);
  } catch (error) {
    console.error("Failed to parse localStorage todos:", error);
    return [];
  }
}
/**
 * Checks if todos exist in localStorage
 */
export function hasLocalStorageTodos() {
  const todos = getLocalStorageTodos();
  return todos.length > 0;
}
/**
 * Migrates todos from localStorage to Lambda API
 * Preserves all todo data and maintains order
 *
 * @param onProgress Optional callback for migration progress
 * @returns Migration statistics
 */
export async function migrateFromLocalStorage(onProgress) {
  const localTodos = getLocalStorageTodos();
  if (localTodos.length === 0) {
    console.info("No todos in localStorage to migrate");
    return { migrated: 0, failed: 0, skipped: 0 };
  }
  let migrated = 0;
  let failed = 0;
  const skipped = 0;
  console.info(`Starting migration of ${localTodos.length} todos...`);
  for (const todo of localTodos) {
    const index = localTodos.indexOf(todo);
    onProgress?.(index + 1, localTodos.length);
    try {
      // Create todo via API
      await TodoApiClient.createTodo(todo.title);
      migrated++;
      console.debug(`Migrated todo: ${todo.id} (${todo.title})`);
    } catch (error) {
      console.error(
        `Failed to migrate todo ${todo.id}:`,
        error instanceof Error ? error.message : String(error)
      );
      failed++;
    }
  }
  console.info(`Migration complete: ${migrated} migrated, ${failed} failed, ${skipped} skipped`);
  return { migrated, failed, skipped };
}
/**
 * Clears localStorage todos after successful migration
 * Should only be called after migration is complete
 */
export function clearLocalStorageTodos() {
  try {
    localStorage.removeItem("todos");
    console.info("Cleared localStorage todos");
  } catch (error) {
    console.error("Failed to clear localStorage:", error);
  }
}
/**
 * Performs full migration process:
 * 1. Checks for existing localStorage todos
 * 2. Migrates them to Lambda API
 * 3. Clears localStorage if successful
 *
 * @param onProgress Optional callback for migration progress
 * @returns true if migration was successful or not needed
 */
export async function performFullMigration(onProgress) {
  if (!hasLocalStorageTodos()) {
    console.info("No migration needed: no todos in localStorage");
    return true;
  }
  try {
    const stats = await migrateFromLocalStorage(onProgress);
    if (stats.failed === 0) {
      clearLocalStorageTodos();
      return true;
    }
    console.warn(
      `Migration completed with errors: ${stats.failed} failed. Keeping localStorage backup.`
    );
    return false;
  } catch (error) {
    console.error("Migration failed:", error);
    return false;
  }
}
