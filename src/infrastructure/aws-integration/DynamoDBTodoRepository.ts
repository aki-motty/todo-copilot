import type { Todo, TodoId } from "../../domain/entities/Todo";
import type { DynamoDBClient_ } from "./dynamodb-client";

/**
 * DynamoDB Todo リポジトリ（非同期版）
 *
 * DynamoDB をバックエンドとする非同期 Todo 永続化を提供します
 * ITodoRepository ではなく独立したインターフェースを実装します
 */
export interface IAsyncTodoRepository {
  findById(id: TodoId | string): Promise<Todo | undefined>;
  findAll(): Promise<Todo[]>;
  findByCompletion(completed: boolean): Promise<Todo[]>;
  save(todo: Todo): Promise<void>;
  saveMany(todos: Todo[]): Promise<void>;
  delete(id: TodoId | string): Promise<void>;
  deleteMany(ids: (TodoId | string)[]): Promise<void>;
  healthCheck(): Promise<boolean>;
}

/**
 * DynamoDB Todo リポジトリ
 *
 * IAsyncTodoRepository を実装し、
 * DynamoDB をバックエンドとする Todo の永続化を提供します
 */
export class DynamoDBTodoRepository implements IAsyncTodoRepository {
  /**
   * コンストラクタ
   * @param dynamoDBClient DynamoDB クライアント
   */
  constructor(private dynamoDBClient: DynamoDBClient_) {}

  /**
   * Todo を ID で検索
   * @param id Todo ID
   * @returns Todo または undefined
   */
  async findById(id: TodoId | string): Promise<Todo | undefined> {
    try {
      const idStr = id as string;
      const todo = await this.dynamoDBClient.getItem<Todo>(idStr);
      return todo || undefined;
    } catch (error) {
      console.error(`Failed to find todo by id: ${id}`, error);
      throw error;
    }
  }

  /**
   * すべての Todo を取得
   * @returns Todo の配列
   */
  async findAll(): Promise<Todo[]> {
    try {
      const todos = await this.dynamoDBClient.scan<Todo>({
        filterExpression: undefined,
        expressionAttributeValues: undefined,
      });
      return todos;
    } catch (error) {
      console.error("Failed to find all todos", error);
      throw error;
    }
  }

  /**
   * 完了状態で Todo を検索
   * @param completed 完了状態
   * @returns Todo の配列
   */
  async findByCompletion(completed: boolean): Promise<Todo[]> {
    try {
      const todos = await this.dynamoDBClient.scan<Todo>({
        filterExpression: "completed = :completed",
        expressionAttributeValues: {
          ":completed": completed,
        },
      });
      return todos;
    } catch (error) {
      console.error(`Failed to find todos by completion: ${completed}`, error);
      throw error;
    }
  }

  /**
   * Todo を保存
   * @param todo 保存する Todo
   */
  async save(todo: Todo): Promise<void> {
    try {
      await this.dynamoDBClient.putItem<Todo>(todo);
    } catch (error) {
      console.error(`Failed to save todo: ${todo.id}`, error);
      throw error;
    }
  }

  /**
   * Todo を複数保存
   * @param todos 保存する Todo の配列
   */
  async saveMany(todos: Todo[]): Promise<void> {
    if (todos.length === 0) {
      return;
    }

    try {
      await this.dynamoDBClient.batchPutItems<Todo>(todos);
    } catch (error) {
      console.error(`Failed to save ${todos.length} todos`, error);
      throw error;
    }
  }

  /**
   * Todo を削除
   * @param id 削除する Todo の ID
   */
  async delete(id: TodoId | string): Promise<void> {
    try {
      const idStr = id as string;
      await this.dynamoDBClient.deleteItem(idStr);
    } catch (error) {
      console.error(`Failed to delete todo: ${id}`, error);
      throw error;
    }
  }

  /**
   * 複数の Todo を削除
   * @param ids 削除する Todo ID の配列
   */
  async deleteMany(ids: (TodoId | string)[]): Promise<void> {
    if (ids.length === 0) {
      return;
    }

    try {
      const idStrs = ids.map((id) => id as string);
      await this.dynamoDBClient.batchDeleteItems(idStrs);
    } catch (error) {
      console.error(`Failed to delete ${ids.length} todos`, error);
      throw error;
    }
  }

  /**
   * ヘルスチェック
   * @returns ヘルスチェック結果
   */
  async healthCheck(): Promise<boolean> {
    try {
      return await this.dynamoDBClient.healthCheck();
    } catch (error) {
      console.error("DynamoDB health check failed", error);
      return false;
    }
  }
}

/**
 * DynamoDB Todo リポジトリ ファクトリ
 * @param dynamoDBClient DynamoDB クライアント
 * @returns DynamoDB Todo リポジトリ インスタンス
 */
export function createDynamoDBTodoRepository(
  dynamoDBClient: DynamoDBClient_
): DynamoDBTodoRepository {
  return new DynamoDBTodoRepository(dynamoDBClient);
}
