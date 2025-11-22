import type { Todo, TodoId } from "../entities/Todo";

/**
 * Repository interface for Todo persistence abstraction
 * Defines contract for data access layer operations
 *
 * This interface allows different implementations:
 * - LocalStorageTodoRepository (v1 - client-side)
 * - ApiTodoRepository (future - server-side)
 */
export interface ITodoRepository {
  /**
   * Find a todo by its ID
   * @param id The ID of the todo to find
   * @returns The todo if found, null otherwise
   */
  findById(id: TodoId): Todo | null;

  /**
   * Find all todos
   * @returns Array of all todos, empty array if none exist
   */
  findAll(): Todo[];

  /**
   * Save a todo (create or update)
   * @param todo The todo to save
   * @throws QuotaExceededError if localStorage quota is exceeded
   */
  save(todo: Todo): void;

  /**
   * Remove a todo
   * @param id The ID of the todo to remove
   * @throws NotFoundError if todo doesn't exist
   */
  remove(id: TodoId): void;

  /**
   * Clear all todos
   * Used for testing and reset operations
   */
  clear(): void;

  /**
   * Get count of all todos
   */
  count(): number;
}
