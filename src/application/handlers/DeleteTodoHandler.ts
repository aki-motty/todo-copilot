import type { TodoId } from "../../domain/entities/Todo";
import type { ITodoRepository } from "../../domain/repositories/TodoRepository";
import { NotFoundError } from "../errors/AppError";

/**
 * Handler for deleting a todo
 * Command: DELETE /todos/{id}
 */
export class DeleteTodoHandler {
  constructor(private readonly todoRepository: ITodoRepository) {}

  async execute(id: string): Promise<{ success: boolean; id: string }> {
    // Validate ID format
    if (!id || id.trim().length === 0) {
      throw new NotFoundError("Todo ID cannot be empty");
    }

    // Check if todo exists
    const todo = await this.todoRepository.findById(id as TodoId);

    if (!todo) {
      throw new NotFoundError(`Todo with ID "${id}" not found`);
    }

    // Remove from repository
    await this.todoRepository.remove(id as TodoId);

    return {
      success: true,
      id,
    };
  }
}
