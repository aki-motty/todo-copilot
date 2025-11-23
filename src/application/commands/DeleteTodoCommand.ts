import type { TodoId } from '../../domain/entities/Todo';

/**
 * Command to delete a todo item.
 *
 * @interface DeleteTodoCommand
 * @property {TodoId} id - ID of todo to delete
 *
 * @example
 * const command: DeleteTodoCommand = { id: todo.id };
 * await todoService.deleteTodo(command);
 */
export interface DeleteTodoCommand {
  readonly id: TodoId;
}
