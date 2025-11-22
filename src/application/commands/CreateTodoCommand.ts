/**
 * Command to create a new Todo
 */
export interface CreateTodoCommand {
  title: string;
}

/**
 * Response containing the created Todo
 */
export interface CreateTodoCommandResponse {
  id: string;
  title: string;
  completed: boolean;
  createdAt: Date;
}
