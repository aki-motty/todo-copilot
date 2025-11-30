/**
 * Command handler for creating a new todo
 * Implements CQRS command pattern
 * Responsibility: Delegate to application service
 */
export class CreateTodoCommandHandler {
  constructor(applicationService) {
    this.applicationService = applicationService;
  }
  /**
   * Execute create todo command
   * @param command - Command containing todo title
   * @returns Created todo
   * @throws ValidationError if title is invalid
   */
  handle(command) {
    return this.applicationService.createTodo(command);
  }
}
