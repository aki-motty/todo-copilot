/**
 * Command handler for toggling todo completion status
 * Implements CQRS command pattern
 * Responsibility: Delegate to application service
 */
export class ToggleTodoCompletionCommandHandler {
  constructor(applicationService) {
    this.applicationService = applicationService;
  }
  /**
   * Execute toggle completion command
   * @param command - Command containing todo ID to toggle
   * @returns Updated todo with toggled completion status
   * @throws NotFoundError if todo not found
   */
  handle(command) {
    return this.applicationService.toggleTodoCompletion(command);
  }
}
