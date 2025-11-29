import { NotFoundError } from "../errors/AppError";
/**
 * Handler for deleting a todo
 * Command: DELETE /todos/{id}
 */
export class DeleteTodoHandler {
    constructor(todoRepository) {
        this.todoRepository = todoRepository;
    }
    async execute(id) {
        // Validate ID format
        if (!id || id.trim().length === 0) {
            throw new NotFoundError("Todo ID cannot be empty");
        }
        // Check if todo exists
        const todo = await this.todoRepository.findById(id);
        if (!todo) {
            throw new NotFoundError(`Todo with ID "${id}" not found`);
        }
        // Remove from repository
        await this.todoRepository.remove(id);
        return {
            success: true,
            id,
        };
    }
}
