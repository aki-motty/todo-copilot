import type {
  CreateTodoCommand,
  DeleteTodoCommand,
  ToggleTodoCompletionCommand,
} from "../../application/commands";
import type { TodoResponseDTO } from "../../application/dto/TodoDTO";
import type { GetAllTodosQuery } from "../../application/queries";
import type { TodoApplicationService } from "../../application/services/TodoApplicationService";
import type { TodoId } from "../../domain/entities/Todo";
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
      return response.todos.map((todo) => todo.toJSON());
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
   * Add a subtask to a todo
   */
  async addSubtask(todoId: string, title: string): Promise<TodoResponseDTO> {
    try {
      this.logger.debug("Controller: addSubtask", { todoId, title });
      const todo = await this.applicationService.addSubtask(todoId, title);
      return todo.toJSON();
    } catch (error) {
      this.logger.error("Controller: addSubtask failed", error as Error);
      throw error;
    }
  }

  /**
   * Toggle a subtask
   */
  async toggleSubtask(todoId: string, subtaskId: string): Promise<TodoResponseDTO> {
    try {
      this.logger.debug("Controller: toggleSubtask", { todoId, subtaskId });
      const todo = await this.applicationService.toggleSubtask(todoId, subtaskId);
      return todo.toJSON();
    } catch (error) {
      this.logger.error("Controller: toggleSubtask failed", error as Error);
      throw error;
    }
  }

  /**
   * Delete a subtask
   */
  async deleteSubtask(todoId: string, subtaskId: string): Promise<TodoResponseDTO> {
    try {
      this.logger.debug("Controller: deleteSubtask", { todoId, subtaskId });
      const todo = await this.applicationService.deleteSubtask(todoId, subtaskId);
      return todo.toJSON();
    } catch (error) {
      this.logger.error("Controller: deleteSubtask failed", error as Error);
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

  /**
   * Add a tag to a todo
   */
  async addTag(todoId: string, tagName: string): Promise<TodoResponseDTO> {
    try {
      this.logger.debug("Controller: addTag", { todoId, tagName });
      const todo = await this.applicationService.addTag(todoId, tagName);
      return todo.toJSON();
    } catch (error) {
      this.logger.error("Controller: addTag failed", error as Error);
      throw error;
    }
  }

  /**
   * Remove a tag from a todo
   */
  async removeTag(todoId: string, tagName: string): Promise<TodoResponseDTO> {
    try {
      this.logger.debug("Controller: removeTag", { todoId, tagName });
      const todo = await this.applicationService.removeTag(todoId, tagName);
      return todo.toJSON();
    } catch (error) {
      this.logger.error("Controller: removeTag failed", error as Error);
      throw error;
    }
  }

  /**
   * Update a todo's description
   */
  async updateTodoDescription(todoId: string, description: string): Promise<TodoResponseDTO> {
    try {
      this.logger.debug("Controller: updateTodoDescription", { todoId });
      const command = { todoId: todoId as TodoId, description };
      const todo = await this.applicationService.updateTodoDescription(command);
      return todo.toJSON();
    } catch (error) {
      this.logger.error("Controller: updateTodoDescription failed", error as Error);
      throw error;
    }
  }
}
