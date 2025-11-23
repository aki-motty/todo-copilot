import type {
    CreateTodoCommand,
    DeleteTodoCommand,
    ToggleTodoCompletionCommand,
} from "../../application/commands";
import type { TodoResponseDTO } from "../../application/dto/TodoDTO";
import type { GetAllTodosQuery } from "../../application/queries";
import type { TodoApplicationService } from "../../application/services/TodoApplicationService";
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
  async createTodo(title: string): Promise<TodoResponseDTO> {
    try {
      this.logger.debug("Controller: createTodo", { title });
      const command: CreateTodoCommand = { title };
      const todo = await this.applicationService.createTodo(command);
      return todo.toJSON();
    } catch (error) {
      this.logger.error("Controller: createTodo failed", error as Error);
      throw error;
    }
  }

  /**
   * Get all todos
   */
  async getAllTodos(): Promise<TodoResponseDTO[]> {
    try {
      this.logger.debug("Controller: getAllTodos");
      const query: GetAllTodosQuery = {};
      const response = await this.applicationService.getAllTodos(query);
      return response.todos.map(todo => todo.toJSON());
    } catch (error) {
      this.logger.error("Controller: getAllTodos failed", error as Error);
      throw error;
    }
  }

  /**
   * Toggle todo completion
   */
  async toggleTodoCompletion(id: string): Promise<TodoResponseDTO> {
    try {
      this.logger.debug("Controller: toggleTodoCompletion", { id });
      const command: ToggleTodoCompletionCommand = { id };
      const todo = await this.applicationService.toggleTodoCompletion(command);
      return todo.toJSON();
    } catch (error) {
      this.logger.error("Controller: toggleTodoCompletion failed", error as Error);
      throw error;
    }
  }

  /**
   * Delete todo
   */
  async deleteTodo(id: string): Promise<void> {
    try {
      this.logger.debug("Controller: deleteTodo", { id });
      const command: DeleteTodoCommand = { id };
      await this.applicationService.deleteTodo(command);
    } catch (error) {
      this.logger.error("Controller: deleteTodo failed", error as Error);
      throw error;
    }
  }
}
