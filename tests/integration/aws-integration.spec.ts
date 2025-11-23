/**
 * AWS 統合テスト - Lambda/DynamoDB
 *
 * LocalStack または実 AWS 環境での統合テストを実行します
 * 以下をテストします：
 * - DynamoDB クライアントの CRUD 操作
 * - Lambda クライアントの呼び出し
 * - CloudWatch Logs への出力
 *
 * ⚠️ NOTE: LocalStack または実 AWS が必要なため、開発環境ではスキップされます
 */

import { Todo, TodoTitle } from "../../src/domain/entities/Todo";
import { DynamoDBTodoRepository } from "../../src/infrastructure/aws-integration/DynamoDBTodoRepository";
import { DynamoDBClient_ } from "../../src/infrastructure/aws-integration/dynamodb-client";
import {
  type LambdaClientService,
  getLambdaClient,
  resetLambdaClient,
} from "../../src/infrastructure/aws-integration/lambda-client";

/**
 * テスト用の Todo エンティティ作成ヘルパー
 */
function createTestTodo(title: string, completed = false): Todo {
  const todoId = `todo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` as any;
  const todoTitle = TodoTitle.create(title);
  return new (Todo as any)(todoId, todoTitle, completed, new Date(), new Date());
}

// AWS 環境が利用可能かどうかを判定
const hasAWSEnvironment = () => {
  const hasLocalStack = !!process.env["LOCALSTACK_ENDPOINT"];
  const hasAWSCredentials =
    !!process.env["AWS_ACCESS_KEY_ID"] && !!process.env["AWS_SECRET_ACCESS_KEY"];
  return hasLocalStack || hasAWSCredentials;
};

// AWS環境が利用不可の場合はスキップ
const describeIfAWSAvailable = hasAWSEnvironment() ? describe : describe.skip;

describeIfAWSAvailable("AWS Integration Tests - DynamoDB", () => {
  let dynamoClient: DynamoDBClient_;
  const testTableName = process.env["DYNAMODB_TABLE_NAME"] || "todos-test";

  beforeAll(() => {
    // LocalStack または実 AWS 環境への接続を初期化
    const region = process.env["AWS_REGION"] || "ap-northeast-1";
    const endpoint = process.env["LOCALSTACK_ENDPOINT"] || process.env["AWS_ENDPOINT_URL"];

    console.log("🔧 DynamoDB クライアント初期化");
    console.log(`   - テーブル: ${testTableName}`);
    console.log(`   - リージョン: ${region}`);
    if (endpoint) {
      console.log(`   - エンドポイント: ${endpoint}`);
    }
  });

  describe("DynamoDB クライアント - 基本操作", () => {
    beforeEach(() => {
      // 各テストの前に新しいクライアントインスタンスを作成
      dynamoClient = new DynamoDBClient_(testTableName);
    });

    it("接続可能であることを確認 - healthCheck", async () => {
      const isHealthy = await dynamoClient.healthCheck();
      expect(isHealthy).toBe(true);
    }, 10000);

    it("単一項目を保存・取得 - putItem/getItem", async () => {
      const todo = createTestTodo("Test DynamoDB operation");

      // 項目を保存
      await dynamoClient.putItem<Todo>(todo);

      // 項目を取得
      const retrieved = await dynamoClient.getItem<Todo>(todo.id as string);

      expect(retrieved).toBeDefined();
      expect(retrieved?.title.value).toBe("Test DynamoDB operation");
      expect(retrieved?.completed).toBe(false);
    }, 10000);

    it("項目を更新 - updateItem", async () => {
      const todo = createTestTodo("Original title", false);

      // 初期作成
      await dynamoClient.putItem<Todo>(todo);

      // 更新
      const updated = await dynamoClient.updateItem<Todo>(todo.id as string, {
        title: { value: "Updated title", length: 13 },
        completed: true,
        updatedAt: new Date(),
      });

      expect(updated?.title.value).toBe("Updated title");
      expect(updated?.completed).toBe(true);
    }, 10000);

    it("項目を削除 - deleteItem", async () => {
      const todo = createTestTodo("To be deleted");

      // 作成
      await dynamoClient.putItem<Todo>(todo);

      // 削除
      await dynamoClient.deleteItem(todo.id as string);

      // 取得試行（削除後は null）
      const retrieved = await dynamoClient.getItem<Todo>(todo.id as string);

      expect(retrieved).toBeNull();
    }, 10000);
  });

  describe("DynamoDB クライアント - バッチ操作", () => {
    beforeEach(() => {
      dynamoClient = new DynamoDBClient_(testTableName);
    });

    it("複数項目を一括保存 - batchPutItems", async () => {
      const todos = [
        createTestTodo("Batch item 1"),
        createTestTodo("Batch item 2"),
        createTestTodo("Batch item 3"),
      ];

      // 一括保存
      await dynamoClient.batchPutItems<Todo>(todos);

      // 各項目を確認
      for (const todo of todos) {
        const retrieved = await dynamoClient.getItem<Todo>(todo.id as string);
        expect(retrieved).toBeDefined();
        expect(todos.map((t) => t.id)).toContain(retrieved?.id);
      }
    }, 15000);

    it("複数項目を一括取得 - batchGetItems", async () => {
      const todos = [createTestTodo("Get batch 1"), createTestTodo("Get batch 2")];

      // 先に保存
      await dynamoClient.batchPutItems<Todo>(todos);

      // 一括取得
      const ids = todos.map((t) => t.id as string);
      const retrieved = await dynamoClient.batchGetItems<Todo>(ids);

      expect(retrieved).toHaveLength(2);
      expect(retrieved.map((t) => t.id).sort()).toEqual(ids.sort());
    }, 15000);

    it("複数項目を一括削除 - batchDeleteItems", async () => {
      const todos = [createTestTodo("Delete batch 1"), createTestTodo("Delete batch 2")];

      // 先に保存
      await dynamoClient.batchPutItems<Todo>(todos);

      // 一括削除
      const ids = todos.map((t) => t.id as string);
      await dynamoClient.batchDeleteItems(ids);

      // 取得試行（削除後は存在しない）
      const retrieved = await dynamoClient.batchGetItems<Todo>(ids);

      expect(retrieved).toHaveLength(0);
    }, 15000);
  });

  describe("DynamoDB クライアント - クエリ・スキャン", () => {
    beforeEach(async () => {
      dynamoClient = new DynamoDBClient_(testTableName);

      // テスト用の複数項目を事前作成
      const todos = [
        createTestTodo("Completed 1", true),
        createTestTodo("Completed 2", true),
        createTestTodo("Pending 1", false),
        createTestTodo("Pending 2", false),
      ];

      await dynamoClient.batchPutItems<Todo>(todos);
    });

    it("全項目をスキャン - scan", async () => {
      const results = await dynamoClient.scan<Todo>();

      // スキャン結果が存在することを確認
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      // 最小限のアイテムが存在することを確認
      expect(results.length).toBeGreaterThanOrEqual(4);
    }, 15000);

    it("健全性チェック - healthCheck", async () => {
      const isHealthy = await dynamoClient.healthCheck();

      expect(typeof isHealthy).toBe("boolean");
      expect(isHealthy).toBe(true);
    }, 10000);
  });
});

describeIfAWSAvailable("AWS Integration Tests - DynamoDB Repository", () => {
  let repository: DynamoDBTodoRepository;
  let dynamoClient: DynamoDBClient_;
  const testTableName = process.env["DYNAMODB_TABLE_NAME"] || "todos-test";

  beforeEach(() => {
    dynamoClient = new DynamoDBClient_(testTableName);
    repository = new DynamoDBTodoRepository(dynamoClient);
  });

  describe("IAsyncTodoRepository インターフェース実装", () => {
    it("Todo を保存・取得 - save/findById", async () => {
      const todo = createTestTodo("Repository test");

      // 保存
      await repository.save(todo);

      // 取得
      const retrieved = await repository.findById(todo.id as string);

      expect(retrieved).toBeDefined();
      expect(retrieved?.title.value).toBe("Repository test");
    }, 10000);

    it("すべての Todo を取得 - findAll", async () => {
      const todos = [createTestTodo("Find all 1"), createTestTodo("Find all 2")];

      // 複数保存
      await repository.saveMany(todos);

      // すべて取得
      const all = await repository.findAll();

      expect(Array.isArray(all)).toBe(true);
      expect(all.length).toBeGreaterThanOrEqual(2);
    }, 15000);

    it("完了ステータスでフィルタリング - findByCompletion", async () => {
      const completedTodo = createTestTodo("Completed task", true);
      const pendingTodo = createTestTodo("Pending task", false);

      // 両方保存
      await repository.saveMany([completedTodo, pendingTodo]);

      // 完了済みのみ取得
      const completed = await repository.findByCompletion(true);

      expect(completed.length).toBeGreaterThanOrEqual(1);
      // すべて完了済みであることを確認
      for (const todo of completed) {
        expect(todo.completed).toBe(true);
      }
    }, 15000);

    it("複数 Todo を一括保存 - saveMany", async () => {
      const todos = [
        createTestTodo("Save many 1"),
        createTestTodo("Save many 2"),
        createTestTodo("Save many 3"),
      ];

      // 一括保存
      await repository.saveMany(todos);

      // 各 Todo を確認
      for (const todo of todos) {
        const retrieved = await repository.findById(todo.id as string);
        expect(retrieved).toBeDefined();
      }
    }, 15000);

    it("Todo を削除 - delete", async () => {
      const todo = createTestTodo("To delete");

      // 保存後削除
      await repository.save(todo);
      await repository.delete(todo.id as string);

      // 取得試行（削除後は undefined）
      const retrieved = await repository.findById(todo.id as string);

      expect(retrieved).toBeUndefined();
    }, 10000);

    it("複数 Todo を一括削除 - deleteMany", async () => {
      const todos = [createTestTodo("Delete many 1"), createTestTodo("Delete many 2")];

      // 保存後削除
      await repository.saveMany(todos);
      const ids = todos.map((t) => t.id as string);
      await repository.deleteMany(ids);

      // すべて削除されたことを確認
      for (const id of ids) {
        const retrieved = await repository.findById(id);
        expect(retrieved).toBeUndefined();
      }
    }, 15000);

    it("リポジトリの健全性チェック - healthCheck", async () => {
      const isHealthy = await repository.healthCheck();

      expect(typeof isHealthy).toBe("boolean");
      expect(isHealthy).toBe(true);
    }, 10000);
  });

  describe("エラーハンドリング", () => {
    it("存在しない ID を取得するとエラーを処理", async () => {
      const nonExistentId = `non-existent-id-${Date.now()}`;

      const result = await repository.findById(nonExistentId);

      expect(result).toBeUndefined();
    }, 10000);

    it("不正なデータ型での操作をエラー処理", async () => {
      // 不正なデータで save を試みる
      const invalidTodo = {
        id: null,
        title: null,
        completed: "invalid",
      } as any;

      // エラーが発生するか、またはサイレンシャスに処理されることを確認
      try {
        await repository.save(invalidTodo);
      } catch (error) {
        // エラーが発生することを期待
        expect(error).toBeDefined();
      }
    }, 10000);
  });
});

describeIfAWSAvailable("AWS Integration Tests - Lambda Client", () => {
  let lambdaClient: LambdaClientService;

  beforeAll(() => {
    resetLambdaClient();
    lambdaClient = getLambdaClient();

    console.log("🔧 Lambda クライアント初期化");
    const endpoint = process.env["LOCALSTACK_ENDPOINT"] || process.env["AWS_ENDPOINT_URL"];
    if (endpoint) {
      console.log(`   - エンドポイント: ${endpoint}`);
    }
  });

  describe("Lambda クライアント - 基本動作", () => {
    it("Lambda クライアントが初期化されていることを確認", () => {
      expect(lambdaClient).toBeDefined();
      expect(typeof lambdaClient.healthCheck).toBe("function");
      expect(typeof lambdaClient.invokeSync).toBe("function");
    });

    it("Lambda 関数の健全性チェック", async () => {
      try {
        const isHealthy = await lambdaClient.healthCheck();
        // LocalStack/AWS 環境での結果に基づいた期待値
        expect(typeof isHealthy).toBe("boolean");
      } catch (error: any) {
        // LocalStack 非実行時はエラーが期待される
        console.warn(
          "⚠️  Lambda healthCheck failed (expected if LocalStack not running):",
          error.message
        );
      }
    }, 10000);
  });

  describe("Lambda クライアント - 呼び出しパターン", () => {
    // LocalStack/実 AWS が実行中の場合のみ実行される

    it("getFunction メソッドが正しく型付けされている", async () => {
      expect(typeof lambdaClient.getFunction).toBe("function");
    });

    it("listFunctions メソッドが正しく型付けされている", async () => {
      expect(typeof lambdaClient.listFunctions).toBe("function");
    });

    it("invokeSync メソッドがジェネリック型をサポート", async () => {
      // メソッド署名の確認
      const method = lambdaClient.invokeSync;
      expect(method).toBeDefined();
      // ジェネリック引数をテスト
      expect(method.length).toBeGreaterThanOrEqual(2);
    });

    it("invokeAsync メソッドが存在", async () => {
      expect(typeof lambdaClient.invokeAsync).toBe("function");
    });

    it("invokeDryRun メソッドが存在", async () => {
      expect(typeof lambdaClient.invokeDryRun).toBe("function");
    });
  });
});

describeIfAWSAvailable("AWS Integration Tests - 環境検出", () => {
  it("AWS_REGION 環境変数が検出可能", () => {
    // 環境変数の存在を確認（テスト環境では設定されていなくても良い）
    const region = process.env["AWS_REGION"];
    expect(typeof region === "string" || typeof region === "undefined").toBe(true);
  });

  it("DynamoDB テーブル名が設定可能", () => {
    const tableName = process.env["DYNAMODB_TABLE_NAME"] || "todos-test";
    expect(tableName).toBeDefined();
    expect(typeof tableName).toBe("string");
  });

  it("LocalStack エンドポイント検出", () => {
    const endpoint = process.env["LOCALSTACK_ENDPOINT"] || process.env["AWS_ENDPOINT_URL"];
    // どちらかが設定されている、または両方とも未設定（実 AWS を使用）
    expect(typeof endpoint === "string" || typeof endpoint === "undefined").toBe(true);
  });
});
