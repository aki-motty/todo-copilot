import type { ToggleTodoCompletionCommand } from "../commands";
import type { TodoApplicationService } from "../services/TodoApplicationService";

/**
 * Command handler for toggling todo completion status
 * Implements CQRS command pattern
 * Responsibility: Delegate to application service
 */
export class ToggleTodoCompletionCommandHandler {
  constructor(private readonly applicationService: TodoApplicationService) {}

  /**
   * Execute toggle completion command
   * @param command - Command containing todo ID to toggle
   * @returns Updated todo with toggled completion status
   * @throws NotFoundError if todo not found
   */
  handle(command: ToggleTodoCompletionCommand) {
    return this.applicationService.toggleTodoCompletion(command);
  }
}
