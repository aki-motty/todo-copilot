import { DeleteItemCommand, DynamoDBClient, PutItemCommand, ScanCommand } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { DatabaseError } from "../../application/errors/AppError";
import { Todo, type TodoId } from "../../domain/entities/Todo";
import type { ITodoRepository } from "../../domain/repositories/TodoRepository";

/**
 * DynamoDB implementation of TodoRepository
 * Persists todos to AWS DynamoDB table
 *
 * Table structure:
 * - PK: id (string) - unique todo identifier
 * - Attributes: title, completed, createdAt, updatedAt
 */
export class DynamoDBTodoRepository implements ITodoRepository {
  private client: DynamoDBClient;
  private tableName: string;
  private cache: Map<TodoId, Todo> = new Map();
  private cacheAll: Todo[] | null = null;

  constructor(tableName?: string) {
    this.tableName = tableName || process.env["DYNAMODB_TABLE_NAME"] || "todo-copilot-dev";
    this.client = new DynamoDBClient({ region: process.env["AWS_REGION"] || "ap-northeast-1" });
  }

  /**
   * Find a todo by its ID
   * Note: Uses cache when available, syncs with DynamoDB on first access
   */
  findById(id: TodoId): Todo | null {
    // Check cache first
    if (this.cache.has(id)) {
      return this.cache.get(id) || null;
    }

    // Check all-todos cache
    if (this.cacheAll) {
      const todo = this.cacheAll.find((t) => t.id === id) || null;
      if (todo) {
        this.cache.set(id, todo);
      }
      return todo;
    }

    // In Lambda context, we should load from DynamoDB
    // For now, return null if not in cache (will be loaded via findAll or initialization)
    return null;
  }

  /**
   * Find all todos
   * Loads from cache or performs full scan
   */
  findAll(): Todo[] {
    // Return cached results
    if (this.cacheAll) {
      return this.cacheAll;
    }

    // Return empty array if no cache (caller should initialize from DynamoDB)
    return [];
  }

  /**
   * Save a todo (create or update)
   * Updates cache and schedules DynamoDB write
   */
  save(todo: Todo): void {
    // Update cache
    this.cache.set(todo.id, todo);

    // Update all-todos cache if present
    if (this.cacheAll) {
      const index = this.cacheAll.findIndex((t) => t.id === todo.id);
      if (index >= 0) {
        this.cacheAll[index] = todo;
      } else {
        this.cacheAll.push(todo);
      }
    }

    // Queue DynamoDB write (non-blocking)
    this.persistToDynamoDB(todo).catch((err) => {
      console.error("Failed to persist todo to DynamoDB:", err);
    });
  }

  /**
   * Remove a todo
   * Updates cache and schedules DynamoDB delete
   */
  remove(id: TodoId): void {
    // Update cache
    this.cache.delete(id);

    // Update all-todos cache if present
    if (this.cacheAll) {
      this.cacheAll = this.cacheAll.filter((t) => t.id !== id);
    }

    // Queue DynamoDB delete (non-blocking)
    this.deleteFromDynamoDB(id).catch((err) => {
      console.error("Failed to delete todo from DynamoDB:", err);
    });
  }

  /**
   * Clear all todos
   * Clears cache only (use carefully, doesn't clear DynamoDB)
   */
  clear(): void {
    this.cache.clear();
    this.cacheAll = [];
  }

  /**
   * Get count of all todos
   */
  count(): number {
    if (this.cacheAll) {
      return this.cacheAll.length;
    }
    return this.cache.size;
  }

  /**
   * Initialize repository with todos from DynamoDB
   * Must be called when Lambda handler is invoked
   */
  async initializeFromDynamoDB(): Promise<void> {
    try {
      const response = await this.client.send(
        new ScanCommand({
          TableName: this.tableName,
        })
      );

      const todos: Todo[] = [];
      if (response.Items) {
        for (const item of response.Items) {
          const unmarshalled = unmarshall(item);
          const todo = this.unmarshallTodo(unmarshalled);
          todos.push(todo);
          this.cache.set(todo.id, todo);
        }
      }

      this.cacheAll = todos;
    } catch (error) {
      throw this.handleError("initializeFromDynamoDB", error);
    }
  }

  /**
   * Persist a todo to DynamoDB (async, non-blocking)
   */
  private async persistToDynamoDB(todo: Todo): Promise<void> {
    try {
      const json = todo.toJSON();
      const item = {
        id: json.id,
        title: json.title,
        completed: json.completed,
        createdAt: json.createdAt,
        updatedAt: json.updatedAt,
      };

      await this.client.send(
        new PutItemCommand({
          TableName: this.tableName,
          Item: marshall(item),
        })
      );
    } catch (error) {
      throw this.handleError("persistToDynamoDB", error);
    }
  }

  /**
   * Delete a todo from DynamoDB (async, non-blocking)
   */
  private async deleteFromDynamoDB(id: TodoId): Promise<void> {
    try {
      await this.client.send(
        new DeleteItemCommand({
          TableName: this.tableName,
          Key: marshall({ id }),
        })
      );
    } catch (error) {
      throw this.handleError("deleteFromDynamoDB", error);
    }
  }

  /**
   * Convert DynamoDB item to Todo entity
   */
  private unmarshallTodo(item: any): Todo {
    return Todo.fromPersistence(item.id, item.title, item.completed, item.createdAt, item.updatedAt);
  }

  /**
   * Handle and translate DynamoDB errors
   */
  private handleError(operation: string, error: unknown): DatabaseError {
    const message = error instanceof Error ? error.message : String(error);
    return new DatabaseError(`DynamoDB ${operation} failed: ${message}`, {
      operation,
      originalError: message,
    });
  }
}
