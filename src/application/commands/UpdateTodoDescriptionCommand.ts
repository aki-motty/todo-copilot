import type { TodoId } from "../../domain/entities/Todo";

/**
 * Command to update a todo's description
 * Used in CQRS pattern to represent a description update operation
 */
export interface UpdateTodoDescriptionCommand {
  /** UUID of the todo to update */
  todoId: TodoId;
  /** New description content (markdown format) */
  description: string;
}

/**
 * Factory function to create UpdateTodoDescriptionCommand
 */
export const createUpdateTodoDescriptionCommand = (
  todoId: TodoId,
  description: string
): UpdateTodoDescriptionCommand => ({
  todoId,
  description,
});
