import type { CreateTodoCommand } from "../commands";
import type { TodoApplicationService } from "../services/TodoApplicationService";

/**
 * Command handler for creating a new todo
 * Implements CQRS command pattern
 * Responsibility: Delegate to application service
 */
export class CreateTodoCommandHandler {
  constructor(private readonly applicationService: TodoApplicationService) {}

  /**
   * Execute create todo command
   * @param command - Command containing todo title
   * @returns Created todo
   * @throws ValidationError if title is invalid
   */
  handle(command: CreateTodoCommand) {
    return this.applicationService.createTodo(command);
  }
}
