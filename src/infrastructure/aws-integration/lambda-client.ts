import {
    GetFunctionCommand,
    InvokeCommand,
    LambdaClient,
    ListFunctionsCommand,
    type InvokeCommandInput,
} from '@aws-sdk/client-lambda';

/**
 * Lambda クライアント
 * 
 * Lambda 関数の呼び出しと管理を行います
 */
export class LambdaClientService {
  private client: LambdaClient;

  /**
   * コンストラクタ
   * @param region AWS リージョン
   */
  constructor(region: string = process.env['AWS_REGION'] || 'ap-northeast-1') {
    this.client = new LambdaClient({ region });
  }

  /**
   * Lambda 関数を同期的に呼び出し
   * @param functionName 関数名
   * @param payload ペイロード
   * @returns 実行結果
   */
  async invokeSync<T = any>(
    functionName: string,
    payload?: Record<string, any>
  ): Promise<T> {
    try {
      const command = new InvokeCommand({
        FunctionName: functionName,
        InvocationType: 'RequestResponse',
        Payload: payload ? JSON.stringify(payload) : undefined,
      } as InvokeCommandInput);

      const response = await this.client.send(command);

      if (response.FunctionError) {
        throw new Error(
          `Lambda function error: ${response.FunctionError}. LogResult: ${response.LogResult}`
        );
      }

      if (!response.Payload) {
        return {} as T;
      }

      // Payload を文字列から解析
      const payloadStr =
        response.Payload instanceof Uint8Array
          ? new TextDecoder().decode(response.Payload)
          : (response.Payload as any)?.toString() || '{}';

      return JSON.parse(payloadStr) as T;
    } catch (error) {
      console.error(`Failed to invoke Lambda function ${functionName}:`, error);
      throw error;
    }
  }

  /**
   * Lambda 関数を非同期的に呼び出し
   * @param functionName 関数名
   * @param payload ペイロード
   */
  async invokeAsync(
    functionName: string,
    payload?: Record<string, any>
  ): Promise<void> {
    try {
      const command = new InvokeCommand({
        FunctionName: functionName,
        InvocationType: 'Event',
        Payload: payload ? JSON.stringify(payload) : undefined,
      } as InvokeCommandInput);

      await this.client.send(command);
    } catch (error) {
      console.error(
        `Failed to invoke Lambda function ${functionName} asynchronously:`,
        error
      );
      throw error;
    }
  }

  /**
   * Lambda 関数を Dry-run で呼び出し
   * @param functionName 関数名
   * @param payload ペイロード
   * @returns 検証結果
   */
  async invokeDryRun<T = any>(
    functionName: string,
    payload?: Record<string, any>
  ): Promise<T> {
    try {
      const command = new InvokeCommand({
        FunctionName: functionName,
        InvocationType: 'DryRun',
        Payload: payload ? JSON.stringify(payload) : undefined,
      } as InvokeCommandInput);

      const response = await this.client.send(command);

      if (response.FunctionError) {
        throw new Error(
          `Lambda function validation error: ${response.FunctionError}`
        );
      }

      return { success: true } as T;
    } catch (error) {
      console.error(
        `Failed to validate Lambda function ${functionName}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Lambda 関数情報を取得
   * @param functionName 関数名
   * @returns 関数情報
   */
  async getFunction(functionName: string) {
    try {
      const command = new GetFunctionCommand({
        FunctionName: functionName,
      });

      const response = await this.client.send(command);
      return {
        name: response.Configuration?.FunctionName,
        arn: response.Configuration?.FunctionArn,
        runtime: response.Configuration?.Runtime,
        handler: response.Configuration?.Handler,
        codeSize: response.Configuration?.CodeSize,
        description: response.Configuration?.Description,
        timeout: response.Configuration?.Timeout,
        memorySize: response.Configuration?.MemorySize,
        role: response.Configuration?.Role,
        environment: response.Configuration?.Environment?.Variables,
        lastModified: response.Configuration?.LastModified,
        state: response.Configuration?.State,
        version: response.Configuration?.Version,
      };
    } catch (error) {
      console.error(`Failed to get Lambda function ${functionName}:`, error);
      throw error;
    }
  }

  /**
   * Lambda 関数一覧を取得
   * @param maxItems 最大件数
   * @returns 関数一覧
   */
  async listFunctions(maxItems: number = 50) {
    try {
      const command = new ListFunctionsCommand({
        MaxItems: maxItems,
      });

      const response = await this.client.send(command);
      return (response.Functions || []).map((func) => ({
        name: func.FunctionName,
        arn: func.FunctionArn,
        runtime: func.Runtime,
        handler: func.Handler,
        codeSize: func.CodeSize,
        description: func.Description,
        timeout: func.Timeout,
        memorySize: func.MemorySize,
        role: func.Role,
        lastModified: func.LastModified,
        state: func.State,
        version: func.Version,
      }));
    } catch (error) {
      console.error('Failed to list Lambda functions:', error);
      throw error;
    }
  }

  /**
   * ヘルスチェック
   * @param functionName 関数名
   * @returns ヘルスチェック結果
   */
  async healthCheck(functionName?: string): Promise<boolean> {
    try {
      if (functionName) {
        await this.getFunction(functionName);
      } else {
        await this.listFunctions(1);
      }
      return true;
    } catch (error) {
      console.error('Lambda health check failed:', error);
      return false;
    }
  }

  /**
   * クライアントを破棄
   */
  async destroy(): Promise<void> {
    await this.client.destroy();
  }
}

// シングルトンインスタンス
let instance: LambdaClientService | null = null;

/**
 * Lambda クライアントのシングルトンインスタンスを取得
 * @param region AWS リージョン
 * @returns LambdaClientService インスタンス
 */
export function getLambdaClient(
  region?: string
): LambdaClientService {
  if (!instance) {
    instance = new LambdaClientService(region);
  }
  return instance;
}

/**
 * Lambda クライアントをリセット（テスト用）
 */
export function resetLambdaClient(): void {
  instance = null;
}
