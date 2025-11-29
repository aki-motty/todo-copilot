import {
    DeleteItemCommand,
    DynamoDBClient,
    GetItemCommand,
    PutItemCommand,
    ScanCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { DatabaseError } from "../../application/errors/AppError";
import { Subtask } from "../../domain/entities/Subtask";
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
  // Cache is removed to ensure statelessness in Lambda environment
  // private cache: Map<TodoId, Todo> = new Map();
  // private cacheAll: Todo[] | null = null;

  constructor(tableName?: string) {
    this.tableName = tableName || process.env["DYNAMODB_TABLE_NAME"] || "todo-copilot-dev";
    this.client = new DynamoDBClient({
      region: process.env["AWS_REGION"] || "ap-northeast-1",
      endpoint: process.env["DYNAMODB_ENDPOINT"],
    });
  }

  /**
   * Find a todo by its ID
   */
  async findById(id: TodoId): Promise<Todo | null> {
    try {
      const command = new GetItemCommand({
        TableName: this.tableName,
        Key: marshall({ id }),
        ConsistentRead: true,
      });

      const response = await this.client.send(command);

      if (!response.Item) {
        return null;
      }

      return this.unmarshallTodo(unmarshall(response.Item));
    } catch (error) {
      throw this.handleError("findById", error);
    }
  }

  /**
   * Find all todos
   */
  async findAll(): Promise<Todo[]> {
    try {
      const response = await this.client.send(
        new ScanCommand({
          TableName: this.tableName,
          ConsistentRead: true,
        })
      );

      const todos: Todo[] = [];
      if (response.Items) {
        for (const item of response.Items) {
          const unmarshalled = unmarshall(item);
          const todo = this.unmarshallTodo(unmarshalled);
          todos.push(todo);
        }
      }
      return todos;
    } catch (error) {
      throw this.handleError("findAll", error);
    }
  }

  /**
   * Save a todo (create or update)
   */
  async save(todo: Todo): Promise<void> {
    // Persist to DynamoDB
    await this.persistToDynamoDB(todo);
  }

  /**
   * Remove a todo
   */
  async remove(id: TodoId): Promise<void> {
    // Delete from DynamoDB
    await this.deleteFromDynamoDB(id);
  }

  async clear(): Promise<void> {
    // No-op for stateless repository
    // Note: We don't clear DynamoDB table here as it's a dangerous operation
  }

  async count(): Promise<number> {
    const todos = await this.findAll();
    return todos.length;
  }

  /**
   * Initialize repository with todos from DynamoDB
   * No-op for stateless repository, kept for compatibility
   */
  async initializeFromDynamoDB(): Promise<void> {
    // No initialization needed for stateless repository
    return Promise.resolve();
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
        subtasks: json.subtasks,
      };

      await this.client.send(
        new PutItemCommand({
          TableName: this.tableName,
          Item: marshall(item, { removeUndefinedValues: true }),
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
    const subtasks = item.subtasks
      ? item.subtasks.map((s: any) =>
          Subtask.fromPersistence(s.id, s.title, s.completed, item.id)
        )
      : [];

    return Todo.fromPersistence(
      item.id,
      item.title,
      item.completed,
      item.createdAt,
      item.updatedAt,
      subtasks
    );
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
