import { createLogger } from "../../infrastructure/config/logger";
import { NotFoundError } from "../../shared/types";
/**
 * Handler for DeleteTodoCommand.
 *
 * Responsibilities:
 * - Receive command
 * - Verify todo exists
 * - Delete from repository
 * - Log operation
 *
 * @class DeleteTodoCommandHandler
 */
export class DeleteTodoCommandHandler {
  /**
   * Initialize handler with repository.
   *
   * @param todoRepository - Repository for deletion
   */
  constructor(todoRepository) {
    this.todoRepository = todoRepository;
    this.logger = createLogger("DeleteTodoCommandHandler");
  }
  /**
   * Handle command to delete a todo.
   *
   * @param command - DeleteTodoCommand with id
   * @throws NotFoundError if todo not found
   * @throws StorageError if deletion fails
   *
   * @example
   * const handler = new DeleteTodoCommandHandler(repository);
   * await handler.handle({ id });
   */
  async handle(command) {
    // Verify todo exists before deletion
    const todo = await this.todoRepository.findById(command.id);
    if (!todo) {
      this.logger.warn("Attempted to delete non-existent todo", {
        id: command.id.valueOf(),
      });
      throw new NotFoundError(`Todo with id ${command.id.valueOf()} not found`);
    }
    // Delete from repository
    await this.todoRepository.remove(command.id);
    this.logger.info("Todo deleted", {
      id: command.id.valueOf(),
      title: todo.title.value,
    });
  }
}
