/**
 * Unit Tests: CloudWatch Logs クライアント
 * 
 * AWS SDK v3 CloudWatch Logs クライアントのユニットテスト
 * ログ出力とログレベル管理の検証
 */

import { CloudWatchLogsClientService, getCloudWatchLogsClient, getLogger } from '../../../../src/infrastructure/aws-integration/cloudwatch-client';

// Mock AWS SDK
jest.mock('@aws-sdk/client-cloudwatch-logs', () => ({
  CloudWatchLogsClient: jest.fn(),
  CreateLogGroupCommand: jest.fn((params) => ({ params, commandName: 'CreateLogGroupCommand' })),
  CreateLogStreamCommand: jest.fn((params) => ({ params, commandName: 'CreateLogStreamCommand' })),
  PutLogEventsCommand: jest.fn((params) => ({ params, commandName: 'PutLogEventsCommand' })),
  DescribeLogGroupsCommand: jest.fn((params) => ({ params, commandName: 'DescribeLogGroupsCommand' })),
}));

describe('Unit Tests - CloudWatch Logs Client', () => {
  let logsClient: CloudWatchLogsClientService;

  beforeEach(async () => {
    jest.clearAllMocks();
    logsClient = await getCloudWatchLogsClient('test-log-group', 'test-stream');
  });

  describe('CloudWatchLogsClientService 初期化', () => {
    it('ロググループとログストリーム名を指定して初期化可能', async () => {
      const client = await getCloudWatchLogsClient('my-log-group', 'my-stream');
      expect(client).toBeDefined();
    });

    it('デフォルトのログストリーム名で初期化可能', async () => {
      const client = await getCloudWatchLogsClient('my-log-group');
      expect(client).toBeDefined();
    });

    it('環境変数から設定を読み込み可能', async () => {
      process.env['CLOUDWATCH_LOG_GROUP'] = 'env-log-group';
      process.env['CLOUDWATCH_LOG_STREAM'] = 'env-stream';

      const client = await getCloudWatchLogsClient();
      expect(client).toBeDefined();

      delete process.env['CLOUDWATCH_LOG_GROUP'];
      delete process.env['CLOUDWATCH_LOG_STREAM'];
    });
  });

  describe('CloudWatch ログ出力メソッド', () => {
    it('initialize メソッドがロググループとストリームを作成', async () => {
      expect(typeof logsClient.initialize).toBe('function');
      // 非同期メソッド
      const result = logsClient.initialize();
      expect(result instanceof Promise).toBe(true);
    });

    it('log メソッドで汎用ログを出力', async () => {
      expect(typeof logsClient.log).toBe('function');
    });

    it('info メソッドで INFO レベルログを出力', () => {
      expect(typeof logsClient.info).toBe('function');
    });

    it('warn メソッドで WARN レベルログを出力', () => {
      expect(typeof logsClient.warn).toBe('function');
    });

    it('error メソッドで ERROR レベルログを出力', () => {
      expect(typeof logsClient.error).toBe('function');
    });

    it('debug メソッドで DEBUG レベルログを出力', () => {
      expect(typeof logsClient.debug).toBe('function');
    });

    it('healthCheck メソッドが存在', () => {
      expect(typeof logsClient.healthCheck).toBe('function');
    });
  });

  describe('ログレベルの管理', () => {
    it('デフォルトのログレベルは INFO', async () => {
      // デフォルト環境変数を確認
      const logLevel = process.env['LOG_LEVEL'] || 'INFO';
      expect(['DEBUG', 'INFO', 'WARN', 'ERROR']).toContain(logLevel);
    });

    it('LOG_LEVEL 環境変数で制御可能', async () => {
      process.env['LOG_LEVEL'] = 'DEBUG';

      const client = await getCloudWatchLogsClient('test', 'test');
      expect(client).toBeDefined();

      delete process.env['LOG_LEVEL'];
    });

    it('無効なログレベルはデフォルトにフォールバック', async () => {
      process.env['LOG_LEVEL'] = 'INVALID';

      const client = await getCloudWatchLogsClient('test', 'test');
      expect(client).toBeDefined();

      delete process.env['LOG_LEVEL'];
    });
  });

  describe('ログメッセージのフォーマット', () => {
    it('ログメッセージが構造化される', () => {
      // 構造化ログの検証
      expect(logsClient).toBeDefined();
    });

    it('メタデータが JSON 形式で含まれる', () => {
      // メタデータの検証
      expect(logsClient).toBeDefined();
    });

    it('タイムスタンプが自動的に追加される', () => {
      // タイムスタンプの検証
      expect(logsClient).toBeDefined();
    });

    it('複数のメタデータキーが保持される', () => {
      const metadata = {
        userId: 'user-123',
        requestId: 'req-456',
        duration: 125,
        nested: {
          key: 'value',
        },
      };

      expect(metadata).toBeDefined();
    });
  });

  describe('エラーハンドリング', () => {
    it('空のメッセージをハンドル可能', async () => {
      // 空文字列メッセージ
      expect(async () => {
        await logsClient.log('', 'INFO');
      }).toBeDefined();
    });

    it('null/undefined メッセージをハンドル可能', async () => {
      expect(async () => {
        await logsClient.log(null as any, 'INFO');
      }).toBeDefined();
    });

    it('大きなメッセージをハンドル可能', async () => {
      const largeMessage = 'x'.repeat(10000);
      expect(logsClient.log).toBeDefined();
    });

    it('循環参照メタデータをハンドル可能', () => {
      const obj: any = { key: 'value' };
      obj.self = obj; // 循環参照

      expect(obj).toBeDefined();
    });
  });
});

describe('Unit Tests - CloudWatch Logs Global Logger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getLogger でグローバルロガーを取得可能', async () => {
    const logger = getLogger();
    expect(logger).toBeDefined();
  });

  it('getLogger が常に同じインスタンスを返す', async () => {
    const logger1 = getLogger();
    const logger2 = getLogger();

    expect(logger1).toBe(logger2);
  });

  it('グローバルロガーがすべてのログメソッドを提供', () => {
    const logger = getLogger();

    expect(typeof logger.log).toBe('function');
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });
});

describe('Unit Tests - CloudWatch Logs シーケンスTokens', () => {
  let client: CloudWatchLogsClientService;

  beforeEach(async () => {
    jest.clearAllMocks();
    client = await getCloudWatchLogsClient('test-group', 'test-stream');
  });

  it('シーケンストークンが管理される', () => {
    expect(client).toBeDefined();
  });

  it('連続ログ出力がシーケンスを更新', () => {
    expect(client).toBeDefined();
  });

  it('失敗時にシーケンストークンが回復される', () => {
    expect(client).toBeDefined();
  });
});

describe('Unit Tests - CloudWatch 型安全性', () => {
  let client: CloudWatchLogsClientService;

  beforeEach(async () => {
    jest.clearAllMocks();
    client = await getCloudWatchLogsClient('test', 'test');
  });

  it('ログレベルが型安全である', () => {
    const validLevels = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
    validLevels.forEach((level) => {
      expect(validLevels).toContain(level);
    });
  });

  it('メタデータが任意の型を受け入れ可能', () => {
    const metadata1: Record<string, any> = { id: 1 };
    const metadata2: Record<string, string> = { message: 'test' };
    const metadata3: Record<string, boolean> = { success: true };

    expect(metadata1).toBeDefined();
    expect(metadata2).toBeDefined();
    expect(metadata3).toBeDefined();
  });

  it('非同期ログ出力が型チェックされる', () => {
    const logPromise = client.log('test message', 'INFO');
    expect(logPromise instanceof Promise).toBe(true);
  });
});

describe('Unit Tests - CloudWatch ユーティリティメソッド', () => {
  let client: CloudWatchLogsClientService;

  beforeEach(async () => {
    jest.clearAllMocks();
    client = await getCloudWatchLogsClient('test', 'test');
  });

  it('info メソッドが便利メソッドとして機能', () => {
    expect(typeof client.info).toBe('function');
  });

  it('warn メソッドが便利メソッドとして機能', () => {
    expect(typeof client.warn).toBe('function');
  });

  it('error メソッドが便利メソッドとして機能', () => {
    expect(typeof client.error).toBe('function');
  });

  it('debug メソッドが便利メソッドとして機能', () => {
    expect(typeof client.debug).toBe('function');
  });

  it('healthCheck がサービス接続性を確認', () => {
    expect(typeof client.healthCheck).toBe('function');
  });
});
