import { brandTodoId } from "../../domain/value-objects/TodoId";
import { NotFoundError } from "../errors/AppError";
/**
 * Handler for deleting a subtask
 * Command: DELETE /todos/{id}/subtasks/{subtaskId}
 */
export class DeleteSubtaskHandler {
    constructor(todoRepository) {
        this.todoRepository = todoRepository;
    }
    async execute(todoId, subtaskId) {
        const id = brandTodoId(todoId);
        const todo = await this.todoRepository.findById(id);
        if (!todo) {
            throw new NotFoundError(`Todo with ID ${todoId} not found`);
        }
        const subtaskExists = todo.subtasks.some((s) => s.id === subtaskId);
        if (!subtaskExists) {
            throw new NotFoundError(`Subtask with ID ${subtaskId} not found`);
        }
        const updatedTodo = todo.removeSubtask(subtaskId);
        await this.todoRepository.save(updatedTodo);
        return { success: true, id: subtaskId };
    }
}
