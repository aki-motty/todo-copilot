import type { TodoId } from "../../domain/entities/Todo";
import type { ITodoRepository } from "../../domain/repositories/TodoRepository";
import type { TodoResponseDTO } from "../dto/TodoDTO";
import { NotFoundError } from "../errors/AppError";

/**
 * Handler for toggling a todo's completion status
 * Command: PUT /todos/{id}/toggle
 */
export class ToggleTodoHandler {
  constructor(private readonly todoRepository: ITodoRepository) {}

  async execute(id: string): Promise<TodoResponseDTO> {
    // Validate ID format
    if (!id || id.trim().length === 0) {
      throw new NotFoundError("Todo ID cannot be empty");
    }

    // Fetch existing todo
    const todo = this.todoRepository.findById(id as TodoId);

    if (!todo) {
      throw new NotFoundError(`Todo with ID "${id}" not found`);
    }

    // Toggle completion status (creates new instance via domain method)
    const updated = todo.toggleCompletion();

    // Persist updated todo
    this.todoRepository.save(updated);

    return this.toDTO(updated);
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
