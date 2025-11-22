import type { Todo } from "../../domain/entities/Todo";
import type { TodoApplicationService } from "../../application/services/TodoApplicationService";
import type {
  CreateTodoCommand,
  ToggleTodoCompletionCommand,
  DeleteTodoCommand,
} from "../../application/commands";
import type { GetAllTodosQuery } from "../../application/queries";
import { createLogger } from "../../infrastructure/config/logger";

/**
 * Controller for Todo presentation layer
 * Bridges UI components with application service
 * Handles HTTP-like operations for React components
 */
export class TodoController {
  private logger = createLogger("TodoController");

  constructor(private applicationService: TodoApplicationService) {}

  /**
   * Create a new todo
   */
  async createTodo(title: string): Promise<Todo> {
    try {
      this.logger.debug("Controller: createTodo", { title });
      const command: CreateTodoCommand = { title };
      return this.applicationService.createTodo(command);
    } catch (error) {
      this.logger.error("Controller: createTodo failed", error as Error);
      throw error;
    }
  }

  /**
   * Get all todos
   */
  async getAllTodos(): Promise<Todo[]> {
    try {
      this.logger.debug("Controller: getAllTodos");
      const query: GetAllTodosQuery = {};
      const response = this.applicationService.getAllTodos(query);
      return response.todos;
    } catch (error) {
      this.logger.error("Controller: getAllTodos failed", error as Error);
      throw error;
    }
  }

  /**
   * Toggle todo completion
   */
  async toggleTodoCompletion(id: string): Promise<Todo> {
    try {
      this.logger.debug("Controller: toggleTodoCompletion", { id });
      const command: ToggleTodoCompletionCommand = { id };
      return this.applicationService.toggleTodoCompletion(command);
    } catch (error) {
      this.logger.error("Controller: toggleTodoCompletion failed", error as Error);
      throw error;
    }
  }

  /**
   * Delete a todo
   */
  async deleteTodo(id: string): Promise<void> {
    try {
      this.logger.debug("Controller: deleteTodo", { id });
      const command: DeleteTodoCommand = { id };
      this.applicationService.deleteTodo(command);
    } catch (error) {
      this.logger.error("Controller: deleteTodo failed", error as Error);
      throw error;
    }
  }
}
