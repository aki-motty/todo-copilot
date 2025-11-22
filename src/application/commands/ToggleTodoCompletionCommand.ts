/**
 * Command to toggle a todo's completion status
 * Used in CQRS pattern to represent a state change operation
 */
export interface ToggleTodoCompletionCommand {
  id: string; // UUID of the todo to toggle
}
