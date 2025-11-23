import { Todo, type TodoId } from "../../domain/entities/Todo";
import type { TodoDTO } from "../../shared/api/types";
import { NotFoundError } from "../../shared/types";
import { createLogger } from "../config/logger";
import { HttpClient, HttpError, NetworkError, TimeoutError } from "./HttpClient";

/**
 * Async API-based implementation of TodoRepository
 * Communicates with Lambda backend via HTTP
 *
 * Features:
 * - Maps API responses (TodoDTO) to domain Todo entities
 * - Handles network errors gracefully
 * - Error mapping (404 → Not Found, 500 → Server Error)
 * - Proper logging and error handling
 * - All operations are async to handle network I/O
 *
 * Note: This repository is async-based to handle HTTP requests,
 * unlike LocalStorageTodoRepository which is synchronous.
 * The hook layer handles the conversion.
 */
export class AsyncApiTodoRepository {
  private logger = createLogger("AsyncApiTodoRepository");
  private httpClient: HttpClient;

  constructor(baseUrl: string) {
    this.httpClient = new HttpClient(baseUrl, { timeout: 5000 });
    this.logger.debug("AsyncApiTodoRepository initialized", { baseUrl });
  }

  /**
   * Find a todo by its ID
   * Makes GET request to /todos/{id}
   */
  async findById(id: TodoId): Promise<Todo | null> {
    try {
      this.logger.debug("Finding todo by id", { id });
      const todoDto = await this.httpClient.get<TodoDTO>(`/todos/${id}`);
      const todo = this.mapTodoFromDTO(todoDto);
      this.logger.debug("Todo found", { id });
      return todo;
    } catch (error) {
      if (error instanceof HttpError && error.statusCode === 404) {
        this.logger.debug("Todo not found", { id });
        return null;
      }

      this.logger.error("Error finding todo by id", error instanceof Error ? error : new Error(String(error)));
      throw this.mapApiError(error);
    }
  }

  /**
   * Find all todos
   * Makes GET request to /todos with pagination support
   */
  async findAll(): Promise<Todo[]> {
    try {
      this.logger.debug("Finding all todos");
      const response = await this.httpClient.get<{
        items: TodoDTO[];
        total: number;
        page: number;
        pageSize: number;
        hasMore: boolean;
      }>("/todos");

      const todos = response.items.map((dto) => this.mapTodoFromDTO(dto));
      this.logger.debug("Todos retrieved", { count: todos.length, total: response.total });
      return todos;
    } catch (error) {
      this.logger.error(
        "Error finding all todos",
        error instanceof Error ? error : new Error(String(error)),
      );
      throw this.mapApiError(error);
    }
  }

  /**
   * Save a todo (create or update)
   * Makes POST request to /todos for new todos
   * Makes PUT request to /todos/{id} for updates
   */
  async save(todo: Todo): Promise<void> {
    try {
      const isNew = !todo.id;
      const method = isNew ? "create" : "update";

      this.logger.debug("Saving todo", { id: todo.id, method });

      const payload = {
        id: todo.id,
        title: todo.title.toString(),
        completed: todo.status === "Completed",
        createdAt: todo.createdAt.toISOString(),
        updatedAt: todo.updatedAt.toISOString(),
      };

      if (isNew) {
        await this.httpClient.post("/todos", { title: payload.title });
      } else {
        await this.httpClient.put(`/todos/${todo.id}`, payload);
      }

      this.logger.info("Todo saved", { id: todo.id, method });
    } catch (error) {
      this.logger.error(
        "Error saving todo",
        error instanceof Error ? error : new Error(String(error)),
      );
      throw this.mapApiError(error);
    }
  }

  /**
   * Remove a todo
   * Makes DELETE request to /todos/{id}
   */
  async remove(id: TodoId): Promise<void> {
    try {
      this.logger.debug("Removing todo", { id });
      await this.httpClient.delete(`/todos/${id}`);
      this.logger.info("Todo removed", { id });
    } catch (error) {
      if (error instanceof HttpError && error.statusCode === 404) {
        throw new NotFoundError(`Todo with id ${id} not found`);
      }

      this.logger.error("Error removing todo", error instanceof Error ? error : new Error(String(error)));
      throw this.mapApiError(error);
    }
  }

  /**
   * Clear all todos
   * Makes DELETE request to /todos
   */
  async clear(): Promise<void> {
    try {
      this.logger.debug("Clearing all todos");
      await this.httpClient.delete("/todos");
      this.logger.info("All todos cleared");
    } catch (error) {
      this.logger.error("Error clearing todos", error instanceof Error ? error : new Error(String(error)));
      throw this.mapApiError(error);
    }
  }

  /**
   * Get count of all todos
   * Makes GET request to /todos/count
   */
  async count(): Promise<number> {
    try {
      this.logger.debug("Getting todo count");
      const response = await this.httpClient.get<{ count: number }>("/todos/count");
      this.logger.debug("Todo count retrieved", { count: response.count });
      return response.count;
    } catch (error) {
      this.logger.error("Error getting todo count", error instanceof Error ? error : new Error(String(error)));
      throw this.mapApiError(error);
    }
  }

  /**
   * Map TodoDTO from API to domain Todo entity
   */
  private mapTodoFromDTO(dto: TodoDTO): Todo {
    return Todo.fromPersistence(
      dto.id,
      dto.title,
      dto.completed,
      dto.createdAt,
      dto.updatedAt,
    );
  }

  /**
   * Map API errors to domain-specific errors
   */
  private mapApiError(error: unknown): Error {
    if (error instanceof HttpError) {
      switch (error.statusCode) {
        case 400:
          return new Error(`Bad Request: ${error.message}`);
        case 404:
          return new NotFoundError(error.message);
        case 409:
          return new Error(`Conflict: ${error.message}`);
        case 500:
          return new Error(`Server Error: ${error.message}`);
        case 503:
          return new Error(`Service Unavailable: ${error.message}`);
        default:
          return new Error(`HTTP Error ${error.statusCode}: ${error.message}`);
      }
    }

    if (error instanceof NetworkError) {
      return new Error(`Network Error: API is unreachable. ${error.message}`);
    }

    if (error instanceof TimeoutError) {
      return new Error(`Request Timeout: The API request took too long. ${error.message}`);
    }

    return error instanceof Error ? error : new Error(String(error));
  }
}
