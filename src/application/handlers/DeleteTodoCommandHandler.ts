import { DeleteTodoCommand } from '../commands/DeleteTodoCommand';
import { ITodoRepository } from '../../domain/repositories/TodoRepository';
import { NotFoundError } from '../../shared/types';
import { logger } from '../../infrastructure/config/logger';

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
  constructor(private todoRepository: ITodoRepository) {}

  /**
   * Handle command to delete a todo.
   *
   * @param command - DeleteTodoCommand with todoId
   * @throws NotFoundError if todo not found
   * @throws StorageError if deletion fails
   *
   * @example
   * const handler = new DeleteTodoCommandHandler(repository);
   * await handler.handle({ todoId });
   */
  async handle(command: DeleteTodoCommand): Promise<void> {
    // Verify todo exists before deletion
    const todo = await this.todoRepository.findById(command.todoId);

    if (!todo) {
      logger.warn('Attempted to delete non-existent todo', {
        todoId: (command.todoId as any).value,
      });
      throw new NotFoundError(`Todo with id ${(command.todoId as any).value} not found`);
    }

    // Delete from repository
    await this.todoRepository.delete(command.todoId);

    logger.info('Todo deleted', {
      todoId: (command.todoId as any).value,
      title: todo.title.value,
    });
  }
}
