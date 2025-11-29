import type { ITodoRepository } from "../../domain/repositories/TodoRepository";
import { brandTodoId } from "../../domain/value-objects/TodoId";
import type { SubtaskDTO } from "../dto/TodoDTO";
import { NotFoundError, ValidationError } from "../errors/AppError";

/**
 * Handler for adding a subtask to a todo
 * Command: POST /todos/{id}/subtasks
 */
export class AddSubtaskHandler {
  constructor(private readonly todoRepository: ITodoRepository) {}

  async execute(todoId: string, title: string): Promise<SubtaskDTO> {
    if (!title || title.trim().length === 0) {
      throw new ValidationError("Subtask title cannot be empty");
    }

    if (title.length > 500) {
      throw new ValidationError("Subtask title cannot exceed 500 characters");
    }

    const id = brandTodoId(todoId);
    const todo = await this.todoRepository.findById(id);

    if (!todo) {
      throw new NotFoundError(`Todo with ID ${todoId} not found`);
    }

    const updatedTodo = todo.addSubtask(title);
    await this.todoRepository.save(updatedTodo);

    // Get the last added subtask
    const subtasks = updatedTodo.subtasks;
    const newSubtask = subtasks[subtasks.length - 1];

    if (!newSubtask) {
      throw new Error("Failed to retrieve added subtask");
    }

    return {
      id: newSubtask.id,
      title: newSubtask.title.value,
      completed: newSubtask.completed,
    };
  }
}
