import type { ITodoRepository } from "../../domain/repositories/TodoRepository";
import { brandTodoId } from "../../domain/value-objects/TodoId";
import type { SubtaskDTO } from "../dto/TodoDTO";
import { NotFoundError } from "../errors/AppError";

/**
 * Handler for toggling a subtask's completion status
 * Command: PATCH /todos/{id}/subtasks/{subtaskId}
 */
export class ToggleSubtaskHandler {
  constructor(private readonly todoRepository: ITodoRepository) {}

  async execute(todoId: string, subtaskId: string): Promise<SubtaskDTO> {
    const id = brandTodoId(todoId);
    const todo = await this.todoRepository.findById(id);

    if (!todo) {
      throw new NotFoundError(`Todo with ID ${todoId} not found`);
    }

    // Check if subtask exists before toggling
    const subtaskExists = todo.subtasks.some((s) => s.id === subtaskId);
    if (!subtaskExists) {
      throw new NotFoundError(`Subtask with ID ${subtaskId} not found`);
    }

    const updatedTodo = todo.toggleSubtask(subtaskId);
    await this.todoRepository.save(updatedTodo);

    const updatedSubtask = updatedTodo.subtasks.find((s) => s.id === subtaskId);
    
    if (!updatedSubtask) {
      // This should theoretically not happen if subtaskExists check passed
      throw new NotFoundError(`Subtask with ID ${subtaskId} not found after update`);
    }

    return {
      id: updatedSubtask.id,
      title: updatedSubtask.title.value,
      completed: updatedSubtask.completed,
    };
  }
}
