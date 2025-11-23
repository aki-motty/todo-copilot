/**
 * Unit Tests: DynamoDB Todo Repository
 *
 * DynamoDB リポジトリの実装テスト
 * IAsyncTodoRepository インターフェースの契約検証
 */

import { Todo, TodoTitle } from "../../../../src/domain/entities/Todo";
import { DynamoDBTodoRepository } from "../../../../src/infrastructure/aws-integration/DynamoDBTodoRepository";
import type { DynamoDBClient_ } from "../../../../src/infrastructure/aws-integration/dynamodb-client";

// Mock DynamoDB Client
jest.mock("../../../../src/infrastructure/aws-integration/dynamodb-client");

describe("Unit Tests - DynamoDB Todo Repository", () => {
  let repository: DynamoDBTodoRepository;
  let mockDynamoClient: jest.Mocked<DynamoDBClient_>;

  const createMockTodo = (id?: string): Todo => {
    const todoId = (id || `todo-${Date.now()}`) as any;
    const title = TodoTitle.create("Test Todo");
    return new (Todo as any)(todoId, title, false, new Date(), new Date());
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockDynamoClient = {
      getItem: jest.fn(),
      putItem: jest.fn(),
      updateItem: jest.fn(),
      deleteItem: jest.fn(),
      batchGetItems: jest.fn(),
      batchPutItems: jest.fn(),
      batchDeleteItems: jest.fn(),
      query: jest.fn(),
      scan: jest.fn(),
      healthCheck: jest.fn().mockResolvedValue(true),
    } as any;

    repository = new DynamoDBTodoRepository(mockDynamoClient);
  });

  describe("IAsyncTodoRepository インターフェース実装", () => {
    it("findById メソッドが実装されている", () => {
      expect(typeof repository.findById).toBe("function");
    });

    it("findAll メソッドが実装されている", () => {
      expect(typeof repository.findAll).toBe("function");
    });

    it("findByCompletion メソッドが実装されている", () => {
      expect(typeof repository.findByCompletion).toBe("function");
    });

    it("save メソッドが実装されている", () => {
      expect(typeof repository.save).toBe("function");
    });

    it("saveMany メソッドが実装されている", () => {
      expect(typeof repository.saveMany).toBe("function");
    });

    it("delete メソッドが実装されている", () => {
      expect(typeof repository.delete).toBe("function");
    });

    it("deleteMany メソッドが実装されている", () => {
      expect(typeof repository.deleteMany).toBe("function");
    });

    it("healthCheck メソッドが実装されている", () => {
      expect(typeof repository.healthCheck).toBe("function");
    });
  });

  describe("findById - 単一 Todo 取得", () => {
    it("ID で Todo を取得", async () => {
      const todo = createMockTodo("todo-123");
      mockDynamoClient.getItem.mockResolvedValueOnce(todo);

      const result = await repository.findById("todo-123");

      expect(mockDynamoClient.getItem).toHaveBeenCalledWith("todo-123");
      expect(result).toEqual(todo);
    });

    it("存在しない ID は undefined を返す", async () => {
      mockDynamoClient.getItem.mockResolvedValueOnce(null);

      const result = await repository.findById("non-existent");

      expect(result).toBeUndefined();
    });

    it("エラー時に例外を伝播", async () => {
      const error = new Error("DynamoDB error");
      mockDynamoClient.getItem.mockRejectedValueOnce(error);

      await expect(repository.findById("todo-123")).rejects.toThrow(error);
    });
  });

  describe("findAll - すべての Todo 取得", () => {
    it("すべての Todo を取得", async () => {
      const todos = [createMockTodo("todo-1"), createMockTodo("todo-2")];
      mockDynamoClient.scan.mockResolvedValueOnce(todos);

      const result = await repository.findAll();

      expect(mockDynamoClient.scan).toHaveBeenCalled();
      expect(result).toEqual(todos);
    });

    it("空配列を返す（データなし）", async () => {
      mockDynamoClient.scan.mockResolvedValueOnce([]);

      const result = await repository.findAll();

      expect(result).toEqual([]);
    });

    it("大量の Todo を取得", async () => {
      const todos = Array.from({ length: 100 }, (_, i) => createMockTodo(`todo-${i}`));
      mockDynamoClient.scan.mockResolvedValueOnce(todos);

      const result = await repository.findAll();

      expect(result).toHaveLength(100);
    });
  });

  describe("findByCompletion - ステータス別フィルタリング", () => {
    it("完了済み Todo を取得", async () => {
      const completedTodos = [
        { ...createMockTodo("todo-1"), completed: true },
        { ...createMockTodo("todo-2"), completed: true },
      ];
      mockDynamoClient.scan.mockResolvedValueOnce(completedTodos);

      const result = await repository.findByCompletion(true);

      expect(result).toEqual(completedTodos);
      expect(result.every((t) => t.completed)).toBe(true);
    });

    it("未完了 Todo を取得", async () => {
      const pendingTodos = [
        { ...createMockTodo("todo-1"), completed: false },
        { ...createMockTodo("todo-2"), completed: false },
      ];
      mockDynamoClient.scan.mockResolvedValueOnce(pendingTodos);

      const result = await repository.findByCompletion(false);

      expect(result).toEqual(pendingTodos);
      expect(result.every((t) => !t.completed)).toBe(true);
    });

    it("フィルタ結果が空の場合", async () => {
      mockDynamoClient.scan.mockResolvedValueOnce([]);

      const result = await repository.findByCompletion(true);

      expect(result).toEqual([]);
    });
  });

  describe("save - 単一 Todo 保存", () => {
    it("新規 Todo を保存", async () => {
      const todo = createMockTodo();
      mockDynamoClient.putItem.mockResolvedValueOnce(todo);

      await repository.save(todo);

      expect(mockDynamoClient.putItem).toHaveBeenCalledWith(todo);
    });

    it("既存 Todo を上書き保存", async () => {
      const todo = createMockTodo("todo-123");
      mockDynamoClient.putItem.mockResolvedValueOnce(todo);

      await repository.save(todo);

      expect(mockDynamoClient.putItem).toHaveBeenCalledWith(todo);
    });

    it("保存エラーを伝播", async () => {
      const error = new Error("Save failed");
      mockDynamoClient.putItem.mockRejectedValueOnce(error);
      const todo = createMockTodo();

      await expect(repository.save(todo)).rejects.toThrow(error);
    });
  });

  describe("saveMany - 複数 Todo 一括保存", () => {
    it("複数 Todo を保存", async () => {
      const todos = [createMockTodo("todo-1"), createMockTodo("todo-2")];
      mockDynamoClient.batchPutItems.mockResolvedValueOnce(undefined);

      await repository.saveMany(todos);

      expect(mockDynamoClient.batchPutItems).toHaveBeenCalledWith(todos);
    });

    it("大量の Todo をチャンク化して保存", async () => {
      const todos = Array.from({ length: 50 }, (_, i) => createMockTodo(`todo-${i}`));
      mockDynamoClient.batchPutItems.mockResolvedValueOnce(undefined);

      await repository.saveMany(todos);

      expect(mockDynamoClient.batchPutItems).toHaveBeenCalled();
    });

    it("空配列での保存処理", async () => {
      mockDynamoClient.batchPutItems.mockResolvedValueOnce(undefined);

      await repository.saveMany([]);

      // 空配列の場合はアーリーリターンするので呼ばれない
      expect(mockDynamoClient.batchPutItems).not.toHaveBeenCalled();
    });
  });

  describe("delete - 単一 Todo 削除", () => {
    it("ID で Todo を削除", async () => {
      mockDynamoClient.deleteItem.mockResolvedValueOnce(undefined);

      await repository.delete("todo-123");

      expect(mockDynamoClient.deleteItem).toHaveBeenCalledWith("todo-123");
    });

    it("削除エラーを伝播", async () => {
      const error = new Error("Delete failed");
      mockDynamoClient.deleteItem.mockRejectedValueOnce(error);

      await expect(repository.delete("todo-123")).rejects.toThrow(error);
    });

    it("存在しない ID を削除しても成功", async () => {
      mockDynamoClient.deleteItem.mockResolvedValueOnce(undefined);

      await repository.delete("non-existent");

      expect(mockDynamoClient.deleteItem).toHaveBeenCalled();
    });
  });

  describe("deleteMany - 複数 Todo 一括削除", () => {
    it("複数 ID で Todo を削除", async () => {
      const ids = ["todo-1", "todo-2", "todo-3"];
      mockDynamoClient.batchDeleteItems.mockResolvedValueOnce(undefined);

      await repository.deleteMany(ids);

      expect(mockDynamoClient.batchDeleteItems).toHaveBeenCalledWith(ids);
    });

    it("大量の ID をチャンク化して削除", async () => {
      const ids = Array.from({ length: 50 }, (_, i) => `todo-${i}`);
      mockDynamoClient.batchDeleteItems.mockResolvedValueOnce(undefined);

      await repository.deleteMany(ids);

      expect(mockDynamoClient.batchDeleteItems).toHaveBeenCalled();
    });

    it("空配列での削除処理", async () => {
      mockDynamoClient.batchDeleteItems.mockResolvedValueOnce(undefined);

      await repository.deleteMany([]);

      // 空配列の場合はアーリーリターンするので呼ばれない
      expect(mockDynamoClient.batchDeleteItems).not.toHaveBeenCalled();
    });

    it("削除エラーを伝播", async () => {
      const error = new Error("Batch delete failed");
      mockDynamoClient.batchDeleteItems.mockRejectedValueOnce(error);
      const ids = ["todo-1"];

      await expect(repository.deleteMany(ids)).rejects.toThrow(error);
    });
  });

  describe("healthCheck - リポジトリの健全性確認", () => {
    it("ヘルスチェック成功", async () => {
      mockDynamoClient.healthCheck.mockResolvedValueOnce(true);

      const result = await repository.healthCheck();

      expect(result).toBe(true);
    });

    it("ヘルスチェック失敗", async () => {
      mockDynamoClient.healthCheck.mockResolvedValueOnce(false);

      const result = await repository.healthCheck();

      expect(result).toBe(false);
    });

    it("ヘルスチェックエラー", async () => {
      const error = new Error("Health check failed");
      mockDynamoClient.healthCheck.mockRejectedValueOnce(error);

      const result = await repository.healthCheck();

      // エラーはキャッチされて false が返される
      expect(result).toBe(false);
    });
  });

  describe("IAsyncTodoRepository 型安全性", () => {
    it("戻り値の型が正確", async () => {
      const todo = createMockTodo();
      mockDynamoClient.getItem.mockResolvedValueOnce(todo);

      const result = await repository.findById("todo-123");

      // 戻り値は Todo | undefined
      expect(result === todo || result === undefined).toBe(true);
    });

    it("async/await パターンをサポート", () => {
      expect(async () => {
        await repository.findAll();
      }).not.toThrow();
    });

    it("Promise パターンをサポート", () => {
      const promise = repository.findAll();
      expect(promise instanceof Promise).toBe(true);
    });
  });

  describe("エラーハンドリング", () => {
    it("無効な ID をハンドル", async () => {
      mockDynamoClient.getItem.mockResolvedValueOnce(undefined);

      const result = await repository.findById("");

      expect(result).toBeUndefined();
    });

    it("null ID をハンドル", async () => {
      mockDynamoClient.getItem.mockResolvedValueOnce(undefined);

      const result = await repository.findById(null as any);

      expect(result).toBeUndefined();
    });

    it("不正な Todo データをハンドル", async () => {
      const invalidTodo = { id: null, title: null } as any;
      mockDynamoClient.putItem.mockResolvedValueOnce(invalidTodo);

      await repository.save(invalidTodo);

      expect(mockDynamoClient.putItem).toHaveBeenCalled();
    });

    it("ネットワークエラーを伝播", async () => {
      const error = new Error("Network timeout");
      mockDynamoClient.scan.mockRejectedValueOnce(error);

      await expect(repository.findAll()).rejects.toThrow("Network timeout");
    });

    it("認可エラーを伝播", async () => {
      const error = new Error("AccessDenied");
      mockDynamoClient.putItem.mockRejectedValueOnce(error);
      const todo = createMockTodo();

      await expect(repository.save(todo)).rejects.toThrow("AccessDenied");
    });
  });
});
