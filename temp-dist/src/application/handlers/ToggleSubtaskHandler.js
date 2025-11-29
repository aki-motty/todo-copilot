import { brandTodoId } from "../../domain/value-objects/TodoId";
import { NotFoundError } from "../errors/AppError";
/**
 * Handler for toggling a subtask's completion status
 * Command: PATCH /todos/{id}/subtasks/{subtaskId}
 */
export class ToggleSubtaskHandler {
    constructor(todoRepository) {
        this.todoRepository = todoRepository;
    }
    async execute(todoId, subtaskId) {
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
