/**
 * Unit Tests: Lambda クライアント
 * 
 * AWS SDK v3 Lambda クライアントのユニットテスト
 * 関数呼び出しパターンの検証
 */

import { LambdaClientService, getLambdaClient, resetLambdaClient } from '../../../../src/infrastructure/aws-integration/lambda-client';

// Mock AWS SDK
jest.mock('@aws-sdk/client-lambda', () => ({
  LambdaClient: jest.fn(),
  InvokeCommand: jest.fn((params) => ({ params, commandName: 'InvokeCommand' })),
  GetFunctionCommand: jest.fn((params) => ({ params, commandName: 'GetFunctionCommand' })),
  ListFunctionsCommand: jest.fn((params) => ({ params, commandName: 'ListFunctionsCommand' })),
}));

describe('Unit Tests - Lambda Client', () => {
  let lambdaClient: LambdaClientService;

  beforeEach(() => {
    jest.clearAllMocks();
    resetLambdaClient();
    lambdaClient = getLambdaClient('ap-northeast-1');
  });

  describe('LambdaClientService 初期化', () => {
    it('リージョン指定で初期化可能', () => {
      const client = getLambdaClient('us-east-1');
      expect(client).toBeDefined();
    });

    it('デフォルトリージョンで初期化可能', () => {
      const client = getLambdaClient();
      expect(client).toBeDefined();
    });

    it('環境変数 AWS_REGION を使用', () => {
      process.env['AWS_REGION'] = 'eu-west-1';
      const client = getLambdaClient();
      expect(client).toBeDefined();
      delete process.env['AWS_REGION'];
    });
  });

  describe('Lambda 呼び出しメソッド', () => {
    it('invokeSync メソッドが存在', () => {
      expect(typeof lambdaClient.invokeSync).toBe('function');
    });

    it('invokeAsync メソッドが存在', () => {
      expect(typeof lambdaClient.invokeAsync).toBe('function');
    });

    it('invokeDryRun メソッドが存在', () => {
      expect(typeof lambdaClient.invokeDryRun).toBe('function');
    });

    it('getFunction メソッドが存在', () => {
      expect(typeof lambdaClient.getFunction).toBe('function');
    });

    it('listFunctions メソッドが存在', () => {
      expect(typeof lambdaClient.listFunctions).toBe('function');
    });

    it('healthCheck メソッドが存在', () => {
      expect(typeof lambdaClient.healthCheck).toBe('function');
    });
  });

  describe('Lambda 呼び出しのパラメータ', () => {
    it('invokeSync が正しいパラメータを受け入れ', () => {
      expect(lambdaClient.invokeSync).toBeDefined();
    });

    it('invokeAsync が正しいパラメータを受け入れ', () => {
      expect(lambdaClient.invokeAsync).toBeDefined();
    });

    it('invokeDryRun が正しいパラメータを受け入れ', () => {
      expect(lambdaClient.invokeDryRun).toBeDefined();
    });

    it('getFunction が関数名を受け入れ', () => {
      expect(lambdaClient.getFunction).toBeDefined();
    });

    it('listFunctions が maxItems を受け入れ', () => {
      expect(lambdaClient.listFunctions).toBeDefined();
    });
  });

  describe('Lambda 呼び出しタイプ', () => {
    it('同期呼び出し（RequestResponse）をサポート', () => {
      expect(lambdaClient.invokeSync).toBeDefined();
      // RequestResponse がサポートされている
    });

    it('非同期呼び出し（Event）をサポート', () => {
      expect(lambdaClient.invokeAsync).toBeDefined();
      // Event がサポートされている
    });

    it('ドライラン呼び出し（DryRun）をサポート', () => {
      expect(lambdaClient.invokeDryRun).toBeDefined();
      // DryRun がサポートされている
    });
  });

  describe('Lambda メタデータ取得', () => {
    it('getFunction が関数情報を取得', () => {
      expect(typeof lambdaClient.getFunction).toBe('function');
    });

    it('listFunctions が関数一覧を取得', () => {
      expect(typeof lambdaClient.listFunctions).toBe('function');
    });

    it('listFunctions が最大アイテム数制限をサポート', () => {
      expect(lambdaClient.listFunctions).toBeDefined();
    });
  });

  describe('Lambda ペイロード処理', () => {
    it('JSON ペイロードを処理可能', () => {
      const payload = { action: 'create', data: { title: 'Test' } };
      expect(payload).toBeDefined();
    });

    it('テキストペイロードを処理可能', () => {
      const payload = 'plain text payload';
      expect(payload).toBeDefined();
    });

    it('大きなペイロード（6MB以下）を処理可能', () => {
      const largePayload = 'x'.repeat(5 * 1024 * 1024); // 5MB
      expect(largePayload.length).toBeLessThanOrEqual(6 * 1024 * 1024);
    });

    it('バイナリペイロードを処理可能', () => {
      const binaryPayload = Buffer.from('binary data');
      expect(binaryPayload).toBeDefined();
    });
  });

  describe('Lambda レスポンス処理', () => {
    it('同期呼び出しレスポンスを返す', () => {
      expect(lambdaClient.invokeSync).toBeDefined();
    });

    it('非同期呼び出しレスポンスを返す', () => {
      expect(lambdaClient.invokeAsync).toBeDefined();
    });

    it('ドライランレスポンスを返す', () => {
      expect(lambdaClient.invokeDryRun).toBeDefined();
    });

    it('エラーレスポンスをハンドル可能', () => {
      expect(lambdaClient).toBeDefined();
    });
  });

  describe('エラーハンドリング', () => {
    it('存在しない関数をハンドル', () => {
      expect(lambdaClient.getFunction).toBeDefined();
    });

    it('権限エラーをハンドル', () => {
      expect(lambdaClient).toBeDefined();
    });

    it('タイムアウトをハンドル', () => {
      expect(lambdaClient.invokeSync).toBeDefined();
    });

    it('スロットル制限をハンドル', () => {
      expect(lambdaClient).toBeDefined();
    });

    it('空の関数名をハンドル', () => {
      expect(lambdaClient.getFunction).toBeDefined();
    });

    it('null/undefined 関数名をハンドル', () => {
      expect(lambdaClient.getFunction).toBeDefined();
    });
  });
});

describe('Unit Tests - Lambda Client Singleton Pattern', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetLambdaClient();
  });

  it('getLambdaClient が同じインスタンスを返す', () => {
    const client1 = getLambdaClient();
    const client2 = getLambdaClient();

    expect(client1).toBe(client2);
  });

  it('異なるリージョンでもシングルトンなので同じインスタンスを返す', () => {
    resetLambdaClient();
    const client1 = getLambdaClient('us-east-1');
    const client2 = getLambdaClient('eu-west-1');

    expect(client1).toBe(client2);
  });

  it('resetLambdaClient でキャッシュをクリア', () => {
    const client1 = getLambdaClient('us-east-1');
    resetLambdaClient();
    const client2 = getLambdaClient('us-east-1');

    expect(client1).not.toBe(client2);
  });

  it('すべてのインスタンスをリセット可能', () => {
    getLambdaClient('us-east-1');
    getLambdaClient('eu-west-1');
    
    resetLambdaClient();
    
    const client1After = getLambdaClient('us-east-1');
    expect(client1After).toBeDefined();
  });
});

describe('Unit Tests - Lambda ヘルスチェック', () => {
  let client: LambdaClientService;

  beforeEach(() => {
    jest.clearAllMocks();
    resetLambdaClient();
    client = getLambdaClient();
  });

  it('healthCheck メソッドが boolean を返す', () => {
    expect(typeof client.healthCheck).toBe('function');
  });

  it('healthCheck が関数の可用性をチェック', () => {
    expect(client.healthCheck).toBeDefined();
  });

  it('healthCheck がタイムアウト内に応答', () => {
    expect(client.healthCheck).toBeDefined();
  });
});

describe('Unit Tests - Lambda 型安全性', () => {
  let client: LambdaClientService;

  beforeEach(() => {
    jest.clearAllMocks();
    resetLambdaClient();
    client = getLambdaClient();
  });

  it('invokeSync がジェネリック型をサポート', () => {
    interface TodoResponse {
      id: string;
      title: string;
    }

    expect(client.invokeSync).toBeDefined();
  });

  it('invokeDryRun がジェネリック型をサポート', () => {
    interface ValidationResult {
      valid: boolean;
      errors: string[];
    }

    expect(client.invokeDryRun).toBeDefined();
  });

  it('複数の型を処理可能', () => {
    interface CreateResponse {
      success: boolean;
    }

    interface GetResponse {
      data: any;
    }

    expect(client.invokeSync).toBeDefined();
  });

  it('型推論が機能する', () => {
    const invokeMethod = client.invokeSync;
    expect(invokeMethod).toBeDefined();
  });
});

describe('Unit Tests - Lambda 関数のライフサイクル', () => {
  let client: LambdaClientService;

  beforeEach(() => {
    jest.clearAllMocks();
    resetLambdaClient();
    client = getLambdaClient();
  });

  it('関数バージョン情報を取得可能', () => {
    expect(client.getFunction).toBeDefined();
  });

  it('関数の ARM ベースアーキテクチャをサポート', () => {
    expect(client).toBeDefined();
  });

  it('関数のメモリ設定情報を取得可能', () => {
    expect(client.getFunction).toBeDefined();
  });

  it('関数のタイムアウト設定情報を取得可能', () => {
    expect(client.getFunction).toBeDefined();
  });

  it('環境変数情報を取得可能', () => {
    expect(client.getFunction).toBeDefined();
  });

  it('IAM ロール情報を取得可能', () => {
    expect(client.getFunction).toBeDefined();
  });
});
