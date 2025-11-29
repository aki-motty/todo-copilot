import { Todo, TodoTitle } from "../../domain/entities/Todo";
/**
 * Handler for CreateTodoCommand
 * Validates input and delegates to domain model
 */
export class CreateTodoCommandHandler {
    execute(command) {
        // Validation happens in TodoTitle value object
        const title = TodoTitle.create(command.title);
        // Create new todo using domain factory
        const todo = Todo.create(title.value);
        return todo;
    }
}
