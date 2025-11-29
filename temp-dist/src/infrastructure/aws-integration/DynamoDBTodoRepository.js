/**
 * DynamoDB Todo リポジトリ
 *
 * IAsyncTodoRepository を実装し、
 * DynamoDB をバックエンドとする Todo の永続化を提供します
 */
export class DynamoDBTodoRepository {
    /**
     * コンストラクタ
     * @param dynamoDBClient DynamoDB クライアント
     */
    constructor(dynamoDBClient) {
        this.dynamoDBClient = dynamoDBClient;
    }
    /**
     * Todo を ID で検索
     * @param id Todo ID
     * @returns Todo または undefined
     */
    async findById(id) {
        try {
            const idStr = id;
            const todo = await this.dynamoDBClient.getItem(idStr);
            return todo || undefined;
        }
        catch (error) {
            console.error(`Failed to find todo by id: ${id}`, error);
            throw error;
        }
    }
    /**
     * すべての Todo を取得
     * @returns Todo の配列
     */
    async findAll() {
        try {
            const todos = await this.dynamoDBClient.scan({
                filterExpression: undefined,
                expressionAttributeValues: undefined,
            });
            return todos;
        }
        catch (error) {
            console.error("Failed to find all todos", error);
            throw error;
        }
    }
    /**
     * 完了状態で Todo を検索
     * @param completed 完了状態
     * @returns Todo の配列
     */
    async findByCompletion(completed) {
        try {
            const todos = await this.dynamoDBClient.scan({
                filterExpression: "completed = :completed",
                expressionAttributeValues: {
                    ":completed": completed,
                },
            });
            return todos;
        }
        catch (error) {
            console.error(`Failed to find todos by completion: ${completed}`, error);
            throw error;
        }
    }
    /**
     * Todo を保存
     * @param todo 保存する Todo
     */
    async save(todo) {
        try {
            await this.dynamoDBClient.putItem(todo);
        }
        catch (error) {
            console.error(`Failed to save todo: ${todo.id}`, error);
            throw error;
        }
    }
    /**
     * Todo を複数保存
     * @param todos 保存する Todo の配列
     */
    async saveMany(todos) {
        if (todos.length === 0) {
            return;
        }
        try {
            await this.dynamoDBClient.batchPutItems(todos);
        }
        catch (error) {
            console.error(`Failed to save ${todos.length} todos`, error);
            throw error;
        }
    }
    /**
     * Todo を削除
     * @param id 削除する Todo の ID
     */
    async delete(id) {
        try {
            const idStr = id;
            await this.dynamoDBClient.deleteItem(idStr);
        }
        catch (error) {
            console.error(`Failed to delete todo: ${id}`, error);
            throw error;
        }
    }
    /**
     * 複数の Todo を削除
     * @param ids 削除する Todo ID の配列
     */
    async deleteMany(ids) {
        if (ids.length === 0) {
            return;
        }
        try {
            const idStrs = ids.map((id) => id);
            await this.dynamoDBClient.batchDeleteItems(idStrs);
        }
        catch (error) {
            console.error(`Failed to delete ${ids.length} todos`, error);
            throw error;
        }
    }
    /**
     * ヘルスチェック
     * @returns ヘルスチェック結果
     */
    async healthCheck() {
        try {
            return await this.dynamoDBClient.healthCheck();
        }
        catch (error) {
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
export function createDynamoDBTodoRepository(dynamoDBClient) {
    return new DynamoDBTodoRepository(dynamoDBClient);
}
