import { Todo } from "../../domain/entities/Todo";
import type { ITodoRepository } from "../../domain/repositories/TodoRepository";
import type { TodoResponseDTO } from "../dto/TodoDTO";
import { ValidationError } from "../errors/AppError";

/**
 * Handler for creating a new todo
 * Command: POST /todos
 */
export class CreateTodoHandler {
  constructor(private readonly todoRepository: ITodoRepository) {}

  async execute(title: string): Promise<TodoResponseDTO> {
    // Validate input
    if (!title || title.trim().length === 0) {
      throw new ValidationError("Todo title cannot be empty");
    }

    if (title.length > 500) {
      throw new ValidationError("Todo title cannot exceed 500 characters");
    }

    // Create todo entity using domain factory
    const todo = Todo.create(title);

    // Persist to repository
    this.todoRepository.save(todo);

    // Return DTO
    return this.toDTO(todo);
  }

  private toDTO(todo: Todo): TodoResponseDTO {
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
