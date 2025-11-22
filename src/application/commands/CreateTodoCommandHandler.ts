import type { CreateTodoCommand } from "./CreateTodoCommand";
import { CommandHandler } from "../handlers/base";
import { Todo } from "../../domain/entities/Todo";
import { TodoTitle } from "../../domain/entities/Todo";

/**
 * Handler for CreateTodoCommand
 * Validates input and delegates to domain model
 */
export class CreateTodoCommandHandler implements CommandHandler<CreateTodoCommand, Todo> {
  execute(command: CreateTodoCommand): Todo {
    // Validation happens in TodoTitle value object
    const title = TodoTitle.create(command.title);

    // Create new todo using domain factory
    const todo = Todo.create(title.value);

    return todo;
  }
}
