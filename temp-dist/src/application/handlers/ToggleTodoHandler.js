import { NotFoundError } from "../errors/AppError";
/**
 * Handler for toggling a todo's completion status
 * Command: PUT /todos/{id}/toggle
 */
export class ToggleTodoHandler {
    constructor(todoRepository) {
        this.todoRepository = todoRepository;
    }
    async execute(id) {
        // Validate ID format
        if (!id || id.trim().length === 0) {
            throw new NotFoundError("Todo ID cannot be empty");
        }
        // Fetch existing todo
        const todo = await this.todoRepository.findById(id);
        if (!todo) {
            throw new NotFoundError(`Todo with ID "${id}" not found`);
        }
        // Toggle completion status (creates new instance via domain method)
        const updated = todo.toggleCompletion();
        // Persist updated todo
        await this.todoRepository.save(updated);
        return this.toDTO(updated);
    }
    toDTO(todo) {
        const json = todo.toJSON();
        return {
            id: json.id,
            title: json.title,
            completed: json.completed,
            createdAt: json.createdAt,
            updatedAt: json.updatedAt,
            subtasks: json.subtasks.map((s) => ({
                id: s.id,
                title: s.title,
                completed: s.completed
            }))
        };
    }
}
