import type { ITodoRepository } from "../../domain/repositories/TodoRepository";
import type { ListTodosResponseDTO, TodoResponseDTO } from "../dto/TodoDTO";

/**
 * Handler for listing all todos
 * Query: GET /todos
 * Supports pagination via query parameters
 */
export class ListTodosHandler {
  constructor(private readonly todoRepository: ITodoRepository) {}

  async execute(options?: { limit?: number; cursor?: string }): Promise<ListTodosResponseDTO> {
    const limit = options?.limit || 50; // Default page size
    const cursor = options?.cursor;

    // Get all todos from repository
    const todos = this.todoRepository.findAll();

    // Sort by createdAt DESC (most recent first)
    const sorted = todos.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Apply pagination
    let items = sorted;
    if (cursor) {
      // Find cursor position and skip to next items
      const cursorIndex = sorted.findIndex((t) => t.id === cursor);
      if (cursorIndex >= 0) {
        items = sorted.slice(cursorIndex + 1);
      }
    }

    const hasMore = items.length > limit;
    const paginatedItems = items.slice(0, limit);
    const lastItem = paginatedItems[paginatedItems.length - 1];
    const nextCursor = hasMore && lastItem ? lastItem.id : undefined;

    return {
      todos: paginatedItems.map((todo) => this.toDTO(todo)),
      count: paginatedItems.length,
      hasMore,
      cursor: nextCursor,
    };
  }

  private toDTO(todo: any): TodoResponseDTO {
    const json = todo.toJSON();
    return {
      id: json.id,
      title: json.title,
      completed: json.completed,
      createdAt: json.createdAt,
      updatedAt: json.updatedAt,
    };
  }
}
