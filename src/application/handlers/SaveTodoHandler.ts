import { Subtask } from "../../domain/entities/Subtask";
import { Todo } from "../../domain/entities/Todo";
import type { ITodoRepository } from "../../domain/repositories/TodoRepository";
import type { TodoResponseDTO } from "../dto/TodoDTO";
import { ValidationError } from "../errors/AppError";

export interface SaveTodoRequest {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
  subtasks?: {
    id: string;
    title: string;
    completed: boolean;
    parentId: string;
  }[];
}

/**
 * Handler for saving a todo (Upsert)
 * Command: PUT /todos/{id}
 */
export class SaveTodoHandler {
  constructor(private readonly todoRepository: ITodoRepository) {}

  async execute(request: SaveTodoRequest): Promise<TodoResponseDTO> {
    // Validate input
    if (!request.id) {
      throw new ValidationError("Todo ID is required");
    }
    if (!request.title || request.title.trim().length === 0) {
      throw new ValidationError("Todo title cannot be empty");
    }

    const subtasks = request.subtasks
      ? request.subtasks.map((s) =>
          Subtask.fromPersistence(s.id, s.title, s.completed, s.parentId)
        )
      : [];

    // Reconstitute todo entity
    const todo = Todo.fromPersistence(
      request.id,
      request.title,
      request.completed,
      request.createdAt,
      request.updatedAt,
      subtasks
    );

    // Persist to repository
    await this.todoRepository.save(todo);

    // Return DTO
    return todo.toJSON();
  }
}
