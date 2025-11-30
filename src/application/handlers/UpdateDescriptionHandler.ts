/**
 * Handler for updating a todo's description
 * Endpoint: PUT /todos/{id}/description
 */

import type { TodoId } from "../../domain/entities/Todo";
import type { ITodoRepository } from "../../domain/repositories/TodoRepository";
import type { TodoResponseDTO } from "../dto/TodoDTO";
import { NotFoundError } from "../errors/AppError";

/**
 * Handler for updating todo description
 */
export class UpdateDescriptionHandler {
  constructor(private readonly todoRepository: ITodoRepository) {}

  async execute(id: string, description: string): Promise<TodoResponseDTO> {
    // Validate ID format
    if (!id || id.trim().length === 0) {
      throw new NotFoundError("Todo ID cannot be empty");
    }

    // Fetch existing todo
    const todo = await this.todoRepository.findById(id as TodoId);

    if (!todo) {
      throw new NotFoundError(`Todo with ID "${id}" not found`);
    }

    // Update description (value object is created inside entity)
    const updated = todo.updateDescription(description);

    // Persist updated todo
    await this.todoRepository.save(updated);

    return this.toDTO(updated);
  }

  private toDTO(todo: any): TodoResponseDTO {
    const json = todo.toJSON();
    return {
      id: json.id,
      title: json.title,
      completed: json.completed,
      description: json.description || "",
      createdAt: json.createdAt,
      updatedAt: json.updatedAt,
      subtasks: json.subtasks.map((s: any) => ({
        id: s.id,
        title: s.title,
        completed: s.completed,
      })),
      tags: json.tags || [],
    };
  }
}
