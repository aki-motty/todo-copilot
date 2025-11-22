import {
  DynamoDBClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
  BatchGetCommand,
  BatchWriteCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

/**
 * DynamoDB クライアント
 * 
 * Todo アプリケーション用の DynamoDB 操作をラップします
 * AWS SDK v3 を使用した型安全な操作を提供します
 */
export class DynamoDBClient_ {
  private client: DynamoDBClient;
  private tableName: string;
  private region: string;

  /**
   * コンストラクタ
   * @param tableName DynamoDB テーブル名
   * @param region AWS リージョン
   */
  constructor(tableName: string, region: string = process.env.AWS_REGION || 'ap-northeast-1') {
    this.tableName = tableName;
    this.region = region;
    this.client = new DynamoDBClient({ region });
  }

  /**
   * 単一項目を取得
   * @param id 項目 ID
   * @returns 取得した項目
   */
  async getItem<T>(id: string): Promise<T | null> {
    try {
      const command = new GetCommand({
        TableName: this.tableName,
        Key: marshall({ id }),
      });

      const response = await this.client.send(command);
      return response.Item ? (unmarshall(response.Item) as T) : null;
    } catch (error) {
      console.error(`DynamoDB GetItem error for id ${id}:`, error);
      throw error;
    }
  }

  /**
   * 単一項目を追加または更新
   * @param item 保存する項目
   * @returns 保存した項目
   */
  async putItem<T extends { id: string }>(item: T): Promise<T> {
    try {
      const command = new PutCommand({
        TableName: this.tableName,
        Item: marshall(item),
      });

      await this.client.send(command);
      return item;
    } catch (error) {
      console.error(`DynamoDB PutItem error:`, error);
      throw error;
    }
  }

  /**
   * 複数項目を一括保存
   * @param items 保存する項目の配列
   * @returns 保存結果
   */
  async batchPutItems<T extends { id: string }>(items: T[]): Promise<void> {
    if (items.length === 0) {
      return;
    }

    // DynamoDB では最大 25 項目までしかバッチ処理できない
    const chunks = this.chunkArray(items, 25);

    for (const chunk of chunks) {
      try {
        const command = new BatchWriteCommand({
          RequestItems: {
            [this.tableName]: chunk.map((item) => ({
              PutRequest: {
                Item: marshall(item),
              },
            })),
          },
        });

        await this.client.send(command);
      } catch (error) {
        console.error(`DynamoDB BatchWriteItem error:`, error);
        throw error;
      }
    }
  }

  /**
   * 項目を更新
   * @param id 項目 ID
   * @param updates 更新内容（キーと値のマップ）
   * @returns 更新後の項目
   */
  async updateItem<T>(id: string, updates: Record<string, any>): Promise<T> {
    try {
      // UpdateExpression と ExpressionAttributeValues を構築
      const updateParts: string[] = [];
      const expressionAttributeValues: Record<string, any> = {};

      Object.entries(updates).forEach(([key, value], index) => {
        const placeholder = `:val${index}`;
        updateParts.push(`${key} = ${placeholder}`);
        expressionAttributeValues[placeholder] = value;
      });

      const command = new UpdateCommand({
        TableName: this.tableName,
        Key: marshall({ id }),
        UpdateExpression: `SET ${updateParts.join(', ')}`,
        ExpressionAttributeValues: marshall(expressionAttributeValues),
        ReturnValues: 'ALL_NEW',
      });

      const response = await this.client.send(command);
      return response.Attributes ? (unmarshall(response.Attributes) as T) : ({} as T);
    } catch (error) {
      console.error(`DynamoDB UpdateItem error for id ${id}:`, error);
      throw error;
    }
  }

  /**
   * 項目を削除
   * @param id 項目 ID
   */
  async deleteItem(id: string): Promise<void> {
    try {
      const command = new DeleteCommand({
        TableName: this.tableName,
        Key: marshall({ id }),
      });

      await this.client.send(command);
    } catch (error) {
      console.error(`DynamoDB DeleteItem error for id ${id}:`, error);
      throw error;
    }
  }

  /**
   * 複数項目を一括削除
   * @param ids 削除する項目の ID 配列
   */
  async batchDeleteItems(ids: string[]): Promise<void> {
    if (ids.length === 0) {
      return;
    }

    // DynamoDB では最大 25 項目までしかバッチ処理できない
    const chunks = this.chunkArray(ids, 25);

    for (const chunk of chunks) {
      try {
        const command = new BatchWriteCommand({
          RequestItems: {
            [this.tableName]: chunk.map((id) => ({
              DeleteRequest: {
                Key: marshall({ id }),
              },
            })),
          },
        });

        await this.client.send(command);
      } catch (error) {
        console.error(`DynamoDB BatchDeleteItem error:`, error);
        throw error;
      }
    }
  }

  /**
   * クエリを実行（パーティションキーで検索）
   * @param partitionKey パーティションキーの値
   * @param options クエリオプション
   * @returns 検索結果
   */
  async query<T>(
    partitionKey: string,
    options?: {
      indexName?: string;
      keyConditionExpression?: string;
      expressionAttributeValues?: Record<string, any>;
      limit?: number;
      descending?: boolean;
    }
  ): Promise<T[]> {
    try {
      const command = new QueryCommand({
        TableName: this.tableName,
        IndexName: options?.indexName,
        KeyConditionExpression:
          options?.keyConditionExpression || 'pk = :pk',
        ExpressionAttributeValues: marshall(
          options?.expressionAttributeValues || { ':pk': partitionKey }
        ),
        Limit: options?.limit,
        ScanIndexForward: !options?.descending,
      });

      const response = await this.client.send(command);
      return (response.Items || []).map((item) => unmarshall(item) as T);
    } catch (error) {
      console.error(`DynamoDB Query error:`, error);
      throw error;
    }
  }

  /**
   * テーブル全体をスキャン
   * @param options スキャンオプション
   * @returns スキャン結果
   */
  async scan<T>(options?: {
    filterExpression?: string;
    expressionAttributeValues?: Record<string, any>;
    limit?: number;
  }): Promise<T[]> {
    try {
      const command = new ScanCommand({
        TableName: this.tableName,
        FilterExpression: options?.filterExpression,
        ExpressionAttributeValues: options?.expressionAttributeValues
          ? marshall(options.expressionAttributeValues)
          : undefined,
        Limit: options?.limit,
      });

      const response = await this.client.send(command);
      return (response.Items || []).map((item) => unmarshall(item) as T);
    } catch (error) {
      console.error(`DynamoDB Scan error:`, error);
      throw error;
    }
  }

  /**
   * 複数項目を一括取得
   * @param ids 取得する項目の ID 配列
   * @returns 取得結果
   */
  async batchGetItems<T>(ids: string[]): Promise<T[]> {
    if (ids.length === 0) {
      return [];
    }

    const chunks = this.chunkArray(ids, 100); // BatchGetItem は最大 100 キー
    const results: T[] = [];

    for (const chunk of chunks) {
      try {
        const command = new BatchGetCommand({
          RequestItems: {
            [this.tableName]: {
              Keys: chunk.map((id) => marshall({ id })),
            },
          },
        });

        const response = await this.client.send(command);
        const items = response.Responses?.[this.tableName] || [];
        results.push(...items.map((item) => unmarshall(item) as T));
      } catch (error) {
        console.error(`DynamoDB BatchGetItem error:`, error);
        throw error;
      }
    }

    return results;
  }

  /**
   * ヘルスチェック
   * @returns ヘルスチェック結果
   */
  async healthCheck(): Promise<boolean> {
    try {
      // テーブル情報を取得してヘルスチェック
      const command = new ScanCommand({
        TableName: this.tableName,
        Limit: 1,
      });

      await this.client.send(command);
      return true;
    } catch (error) {
      console.error('DynamoDB health check failed:', error);
      return false;
    }
  }

  /**
   * クライアントを破棄
   */
  async destroy(): Promise<void> {
    await this.client.destroy();
  }

  /**
   * 配列をチャンクに分割（ヘルパーメソッド）
   * @param array 分割する配列
   * @param chunkSize チャンクサイズ
   * @returns チャンク化された配列
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}

// シングルトンインスタンス
let instance: DynamoDBClient_ | null = null;

/**
 * DynamoDB クライアントのシングルトンインスタンスを取得
 * @param tableName テーブル名（デフォルト: 環境変数から取得）
 * @returns DynamoDBClient インスタンス
 */
export function getDynamoDBClient(tableName?: string): DynamoDBClient_ {
  const table = tableName || process.env.DYNAMODB_TABLE || 'todo-copilot-dev';
  
  if (!instance) {
    instance = new DynamoDBClient_(table);
  }
  
  return instance;
}

/**
 * DynamoDB クライアントをリセット（テスト用）
 */
export function resetDynamoDBClient(): void {
  instance = null;
}
