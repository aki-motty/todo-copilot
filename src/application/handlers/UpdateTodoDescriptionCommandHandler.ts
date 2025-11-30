import type { UpdateTodoDescriptionCommand } from "../commands/UpdateTodoDescriptionCommand";
import type { TodoApplicationService } from "../services/TodoApplicationService";

/**
 * Command handler for updating todo description
 * Implements CQRS command pattern
 * Responsibility: Delegate to application service
 */
export class UpdateTodoDescriptionCommandHandler {
  constructor(private readonly applicationService: TodoApplicationService) {}

  /**
   * Execute update description command
   * @param command - Command containing todo ID and new description
   * @returns Updated todo with new description
   * @throws NotFoundError if todo not found
   * @throws Error if description exceeds max length (10,000 characters)
   */
  handle(command: UpdateTodoDescriptionCommand) {
    return this.applicationService.updateTodoDescription(command);
  }
}
