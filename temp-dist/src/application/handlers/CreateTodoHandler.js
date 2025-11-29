import { Todo } from "../../domain/entities/Todo";
import { ValidationError } from "../errors/AppError";
/**
 * Handler for creating a new todo
 * Command: POST /todos
 */
export class CreateTodoHandler {
    constructor(todoRepository) {
        this.todoRepository = todoRepository;
    }
    async execute(title) {
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
        await this.todoRepository.save(todo);
        // Return DTO
        return this.toDTO(todo);
    }
    toDTO(todo) {
        const json = todo.toJSON();
        return {
            id: json.id,
            title: json.title,
            completed: json.completed,
            createdAt: json.createdAt,
            updatedAt: json.updatedAt,
            subtasks: json.subtasks.map(s => ({
                id: s.id,
                title: s.title,
                completed: s.completed
            }))
        };
    }
}
