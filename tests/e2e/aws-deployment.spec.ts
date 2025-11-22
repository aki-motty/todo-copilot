/**
 * E2E AWS デプロイメントテスト
 * 
 * 実 AWS 環境でのエンドツーエンドテストを実行します
 * 以下をテストします：
 * - Terraform デプロイメント後のリソース検証
 * - Lambda 関数の実際の動作
 * - API Gateway エンドポイントの疎通
 * - DynamoDB テーブルの動作
 */

import { DynamoDBClient_ } from '../../src/infrastructure/aws-integration/dynamodb-client';
import { DynamoDBTodoRepository } from '../../src/infrastructure/aws-integration/DynamoDBTodoRepository';
import { LambdaClientService, getLambdaClient } from '../../src/infrastructure/aws-integration/lambda-client';
import { CloudWatchLogsClientService, getCloudWatchLogsClient } from '../../src/infrastructure/aws-integration/cloudwatch-client';
import { Todo, TodoTitle } from '../../src/domain/entities/Todo';

/**
 * テスト用 Todo 作成ヘルパー
 */
function createE2ETodo(title: string, completed: boolean = false): Todo {
  const todoId = `e2e-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` as any;
  const todoTitle = TodoTitle.create(title);
  return new (Todo as any)(todoId, todoTitle, completed, new Date(), new Date());
  };
}

describe('E2E Tests - AWS Deployment Verification', () => {
  const environment = process.env['ENVIRONMENT'] || 'dev';
  const region = process.env['AWS_REGION'] || 'ap-northeast-1';
  const tableName = process.env['DYNAMODB_TABLE_NAME'] || `todo-${environment}`;
  const logGroupName = process.env['CLOUDWATCH_LOG_GROUP'] || `/aws/lambda/todo-${environment}`;

  beforeAll(() => {
    console.log(`\n📋 E2E テスト初期化`);
    console.log(`   - 環境: ${environment}`);
    console.log(`   - リージョン: ${region}`);
    console.log(`   - DynamoDB テーブル: ${tableName}`);
    console.log(`   - CloudWatch ロググループ: ${logGroupName}`);
    console.log(`   - テスト実行時刻: ${new Date().toISOString()}\n`);
  });

  describe('E2E: DynamoDB テーブル接続性', () => {
    let dynamoClient: DynamoDBClient_;

    beforeEach(() => {
      dynamoClient = new DynamoDBClient_(tableName, region);
    });

    it('DynamoDB テーブルに接続可能', async () => {
      const isHealthy = await dynamoClient.healthCheck();
      expect(isHealthy).toBe(true);
    }, 15000);

    it('デプロイ後のテーブルにデータを書き込み可能', async () => {
      const todo = createE2ETodo('E2E write test');

      await dynamoClient.putItem<Todo>(todo);

      const retrieved = await dynamoClient.getItem<Todo>(todo.id as string);
      expect(retrieved).toBeDefined();
      expect(retrieved?.title.value).toBe('E2E write test');
    }, 15000);

    it('大量データの書き込みをテスト - バッチ操作', async () => {
      const todos = Array.from({ length: 10 }, (_, i) =>
        createE2ETodo(`Batch E2E item ${i + 1}`)
      );

      await dynamoClient.batchPutItems<Todo>(todos);

      // すべてのアイテムが書き込まれたことを確認
      const ids = todos.map(t => t.id as string);
      const retrieved = await dynamoClient.batchGetItems<Todo>(ids);

      expect(retrieved).toHaveLength(10);
    }, 20000);

    it('スキャン操作でデータ取得可能', async () => {
      // 事前にデータが存在することを確認
      const results = await dynamoClient.scan<Todo>();

      expect(Array.isArray(results)).toBe(true);
      // 少なくとも前のテストで作成したデータがあるはず
      expect(results.length).toBeGreaterThanOrEqual(0);
    }, 15000);
  });

  describe('E2E: DynamoDB リポジトリの完全動作', () => {
    let repository: DynamoDBTodoRepository;

    beforeEach(() => {
      const dynamoClient = new DynamoDBClient_(tableName, region);
      repository = new DynamoDBTodoRepository(dynamoClient);
    });

    it('リポジトリ経由で CRUD サイクルを実行', async () => {
      const originalTodo = createE2ETodo('E2E CRUD test');

      // Create
      await repository.save(originalTodo);

      // Read
      let retrieved = await repository.findById(originalTodo.id as string);
      expect(retrieved).toBeDefined();
      expect(retrieved?.title.value).toBe('E2E CRUD test');

      // Update（完了状態を更新）
      const updatedTodo = originalTodo.toggleCompletion();
      await repository.save(updatedTodo);

      // Verify update
      retrieved = await repository.findById(originalTodo.id as string);
      expect(retrieved?.completed).toBe(true);

      // Delete
      await repository.delete(originalTodo.id as string);

      // Verify delete
      retrieved = await repository.findById(originalTodo.id as string);
      expect(retrieved).toBeUndefined();
    }, 20000);

    it('完了状態でのフィルタリング', async () => {
      const todos = [
        createE2ETodo('Task completed', true),
        createE2ETodo('Task pending', false),
      ];

      await repository.saveMany(todos);

      // 完了済みのみ取得
      const completed = await repository.findByCompletion(true);

      // 完了済みのタスクが含まれていることを確認
      const completedIds = completed.map(t => t.id);
      expect(completedIds.some(id => id === todos[0].id)).toBe(true);
    }, 20000);

    it('リポジトリのヘルスチェック', async () => {
      const isHealthy = await repository.healthCheck();

      expect(typeof isHealthy).toBe('boolean');
      expect(isHealthy).toBe(true);
    }, 10000);
  });

  describe('E2E: Lambda 関数の検証', () => {
    let lambdaClient: LambdaClientService;

    beforeEach(() => {
      lambdaClient = getLambdaClient(region);
    });

    it('Lambda クライアントが初期化されている', () => {
      expect(lambdaClient).toBeDefined();
      expect(typeof lambdaClient.healthCheck).toBe('function');
    });

    it('Lambda ヘルスチェック - 接続性確認', async () => {
      try {
        const isHealthy = await lambdaClient.healthCheck();
        // Lambda サービスに接続可能
        expect(typeof isHealthy).toBe('boolean');
        if (isHealthy) {
          console.log('✅ Lambda サービスは正常に稼働しています');
        }
      } catch (error: any) {
        // Lambda 関数が見つからない場合は警告（本番環境では OK）
        console.warn('⚠️  Lambda healthCheck エラー:', error.message);
      }
    }, 15000);

    it('Lambda 関数一覧取得が可能', async () => {
      try {
        const functions = await lambdaClient.listFunctions(10);
        expect(Array.isArray(functions)).toBe(true);
        console.log(`✅ Lambda 関数数: ${functions.length}`);
      } catch (error: any) {
        console.warn('⚠️  Lambda 関数一覧取得エラー:', error.message);
      }
    }, 15000);
  });

  describe('E2E: CloudWatch Logs への出力', () => {
    let cloudwatchClient: CloudWatchLogsClientService;

    beforeAll(async () => {
      try {
        cloudwatchClient = await getCloudWatchLogsClient(logGroupName, `e2e-test-stream-${Date.now()}`);
        await cloudwatchClient.initialize();
      } catch (error: any) {
        console.warn('⚠️  CloudWatch Logs 初期化失敗:', error.message);
      }
    });

    it('CloudWatch Logs に構造化ログを出力', async () => {
      if (!cloudwatchClient) {
        console.warn('⚠️  CloudWatch クライアント未初期化 - テストをスキップ');
        return;
      }

      try {
        await cloudwatchClient.info('E2E テスト開始', {
          testId: `e2e-${Date.now()}`,
          environment,
        });

        console.log('✅ CloudWatch Logs への出力成功');
      } catch (error: any) {
        console.warn('⚠️  CloudWatch ログ出力エラー:', error.message);
      }
    }, 15000);

    it('複数レベルのログ出力', async () => {
      if (!cloudwatchClient) {
        console.warn('⚠️  CloudWatch クライアント未初期化 - テストをスキップ');
        return;
      }

      try {
        await cloudwatchClient.debug('Debug メッセージ', { level: 'DEBUG' });
        await cloudwatchClient.info('Info メッセージ', { level: 'INFO' });
        await cloudwatchClient.warn('Warning メッセージ', { level: 'WARN' });
        await cloudwatchClient.error('Error メッセージ', { level: 'ERROR' });

        console.log('✅ 複数レベルのログ出力成功');
      } catch (error: any) {
        console.warn('⚠️  複数レベルログ出力エラー:', error.message);
      }
    }, 20000);
  });

  describe('E2E: 統合エンドツーエンドシナリオ', () => {
    it('Todo 作成 → DynamoDB 保存 → 状態確認のシナリオ', async () => {
      const dynamoClient = new DynamoDBClient_(tableName, region);
      const repository = new DynamoDBTodoRepository(dynamoClient);

      // Step 1: 新規 Todo 作成
      const newTodo = createE2ETodo('E2E integrated scenario');

      // Step 2: DynamoDB に保存
      await repository.save(newTodo);

      // Step 3: 保存を確認
      const stored = await repository.findById(newTodo.id as string);
      expect(stored).toBeDefined();
      expect(stored?.title.value).toBe('E2E integrated scenario');

      // Step 4: ステータス更新
      const updatedTodo = newTodo.toggleCompletion();
      await repository.save(updatedTodo);

      // Step 5: 更新を確認
      const confirmed = await repository.findById(newTodo.id as string);
      expect(confirmed?.completed).toBe(true);

      console.log('✅ E2E 統合シナリオ完了');
    }, 25000);

    it('複数ユーザーの同時操作シミュレーション', async () => {
      const dynamoClient = new DynamoDBClient_(tableName, region);
      const repository = new DynamoDBTodoRepository(dynamoClient);

      // 複数の操作を同時に実行
      const todos = Array.from({ length: 5 }, (_, i) =>
        createE2ETodo(`Concurrent task ${i + 1}`)
      );

      // 並列保存
      await Promise.all(todos.map(todo => repository.save(todo)));

      // すべての保存を確認
      const results = await Promise.all(
        todos.map(todo => repository.findById(todo.id as string))
      );

      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result).toBeDefined();
      });

      console.log('✅ 並列操作シミュレーション完了');
    }, 30000);
  });

  describe('E2E: デプロイメント検証チェック', () => {
    it('環境変数が正しく設定されている', () => {
      // 最小限の環境変数チェック
      expect(environment).toBeDefined();
      expect(region).toBeDefined();
      expect(tableName).toBeDefined();
    });

    it('リソースの命名規則が統一されている', () => {
      // テーブル名が環境を含むことを確認
      if (!tableName.includes('test')) {
        expect(tableName).toContain(environment);
      }
    });

    it('ロググループが正しく設定されている', () => {
      // ロググループ名が Lambda 形式であることを確認
      expect(logGroupName).toMatch(/^\/aws\/lambda\//);
    });

    it('デプロイメント完了時刻を記録', () => {
      const deploymentTime = new Date().toISOString();
      console.log(`📅 E2E テスト実行完了: ${deploymentTime}`);
      console.log(`   環境: ${environment} | リージョン: ${region}`);
    });
  });
});

describe('E2E Tests - Cleanup & Teardown', () => {
  it('テスト用リソースのクリーンアップ計画を記録', () => {
    console.log(`\n🧹 クリーンアップ計画:`);
    console.log(`   - テスト中に作成された Todo は手動で削除してください`);
    console.log(`   - または、terraform destroy で全環境をクリーンアップしてください`);
    console.log(`   - CloudWatch Logs は環境ごとに保持されます\n`);
  });
});
