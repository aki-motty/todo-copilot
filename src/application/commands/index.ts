/**
 * Command definitions for Todo application
 * Commands represent user intentions to change state
 */

/**
 * Command to create a new Todo
 */
export interface CreateTodoCommand {
  title: string;
}

/**
 * Command to toggle Todo completion status
 */
export interface ToggleTodoCompletionCommand {
  id: string;
}

/**
 * Command to delete a Todo
 */
export interface DeleteTodoCommand {
  id: string;
}
