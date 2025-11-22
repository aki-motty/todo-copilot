import {
  CloudWatchLogsClient,
  CreateLogGroupCommand,
  CreateLogStreamCommand,
  PutLogEventsCommand,
  DescribeLogGroupsCommand,
  DescribeLogStreamsCommand,
} from '@aws-sdk/client-cloudwatch-logs';

/**
 * CloudWatch Logs クライアント
 * 
 * Lambda 関数のロギングと監視を行います
 */
export class CloudWatchLogsClientService {
  private client: CloudWatchLogsClient;
  private logGroupName: string;
  private logStreamName: string;
  private sequenceToken: string | undefined;

  /**
   * コンストラクタ
   * @param logGroupName ロググループ名
   * @param logStreamName ログストリーム名
   * @param region AWS リージョン
   */
  constructor(
    logGroupName: string,
    logStreamName: string = 'default',
    region: string = process.env['AWS_REGION'] || 'ap-northeast-1'
  ) {
    this.logGroupName = logGroupName;
    this.logStreamName = logStreamName;
    this.client = new CloudWatchLogsClient({ region });
  }

  /**
   * ロググループを初期化（存在しない場合は作成）
   */
  async initialize(): Promise<void> {
    try {
      // ロググループの存在確認
      const groupsResponse = await this.client.send(
        new DescribeLogGroupsCommand({
          logGroupNamePrefix: this.logGroupName,
        })
      );

      const groupExists = groupsResponse.logGroups?.some(
        (group: any) => group.logGroupName === this.logGroupName
      );

      // ロググループが存在しなければ作成
      if (!groupExists) {
        await this.client.send(
          new CreateLogGroupCommand({
            logGroupName: this.logGroupName,
          })
        );
        console.log(`Created log group: ${this.logGroupName}`);
      }

      // ログストリームの存在確認
      const streamsResponse = await this.client.send(
        new DescribeLogStreamsCommand({
          logGroupName: this.logGroupName,
          logStreamNamePrefix: this.logStreamName,
        })
      );

      const streamExists = streamsResponse.logStreams?.some(
        (stream: any) => stream.logStreamName === this.logStreamName
      );

      // ログストリームが存在しなければ作成
      if (!streamExists) {
        await this.client.send(
          new CreateLogStreamCommand({
            logGroupName: this.logGroupName,
            logStreamName: this.logStreamName,
          })
        );
        console.log(`Created log stream: ${this.logStreamName}`);
      }
    } catch (error) {
      console.error('Failed to initialize CloudWatch Logs:', error);
      throw error;
    }
  }

  /**
   * ログメッセージを出力
   * @param message ログメッセージ
   * @param level ログレベル（INFO, WARN, ERROR, DEBUG）
   * @param metadata メタデータ
   */
  async log(
    message: string,
    level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG' = 'INFO',
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const timestamp = Date.now();
      const logMessage = {
        timestamp,
        level,
        message,
        ...(metadata && { metadata }),
      };

      const logEvent = {
        message: JSON.stringify(logMessage),
        timestamp,
      };

      const command = new PutLogEventsCommand({
        logGroupName: this.logGroupName,
        logStreamName: this.logStreamName,
        logEvents: [logEvent],
        sequenceToken: this.sequenceToken,
      });

      const response = await this.client.send(command);
      this.sequenceToken = response.nextSequenceToken;
    } catch (error) {
      // ロギングエラーは致命的ではない（警告レベル）
      console.warn('Failed to put log events:', error);
    }
  }

  /**
   * 情報ログを出力
   */
  async info(message: string, metadata?: Record<string, any>): Promise<void> {
    await this.log(message, 'INFO', metadata);
  }

  /**
   * 警告ログを出力
   */
  async warn(message: string, metadata?: Record<string, any>): Promise<void> {
    await this.log(message, 'WARN', metadata);
  }

  /**
   * エラーログを出力
   */
  async error(message: string, metadata?: Record<string, any>): Promise<void> {
    await this.log(message, 'ERROR', metadata);
  }

  /**
   * デバッグログを出力
   */
  async debug(message: string, metadata?: Record<string, any>): Promise<void> {
    if (process.env['LOG_LEVEL'] === 'DEBUG') {
      await this.log(message, 'DEBUG', metadata);
    }
  }

  /**
   * ヘルスチェック
   * @returns ヘルスチェック結果
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.send(
        new DescribeLogGroupsCommand({
          logGroupNamePrefix: this.logGroupName,
        })
      );
      return true;
    } catch (error) {
      console.error('CloudWatch health check failed:', error);
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
let instance: CloudWatchLogsClientService | null = null;

/**
 * CloudWatch Logs クライアントのシングルトンインスタンスを取得
 * @param logGroupName ロググループ名
 * @param logStreamName ログストリーム名
 * @returns CloudWatchLogsClientService インスタンス
 */
export async function getCloudWatchLogsClient(
  logGroupName?: string,
  logStreamName?: string
): Promise<CloudWatchLogsClientService> {
  const groupName = logGroupName || process.env['LOG_GROUP_NAME'] || '/aws/lambda/todo-copilot';
  const streamName = logStreamName || process.env['LOG_STREAM_NAME'] || process.env['ENVIRONMENT'] || 'default';

  if (!instance) {
    instance = new CloudWatchLogsClientService(groupName, streamName);
    await instance.initialize();
  }

  return instance;
}

/**
 * CloudWatch Logs クライアントをリセット（テスト用）
 */
export function resetCloudWatchLogsClient(): void {
  instance = null;
}

/**
 * グローバルロガーインスタンス
 */
let globalLogger: CloudWatchLogsClientService | null = null;

/**
 * グローバルロガーを初期化
 */
export async function initializeGlobalLogger(): Promise<void> {
  if (!globalLogger) {
    globalLogger = await getCloudWatchLogsClient();
  }
}

/**
 * グローバルロガーを取得
 */
export function getLogger(): CloudWatchLogsClientService {
  if (!globalLogger) {
    throw new Error('Logger not initialized. Call initializeGlobalLogger() first.');
  }
  return globalLogger;
}
