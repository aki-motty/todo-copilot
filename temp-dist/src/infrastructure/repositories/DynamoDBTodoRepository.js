import { DeleteItemCommand, DynamoDBClient, GetItemCommand, PutItemCommand, ScanCommand, } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { DatabaseError } from "../../application/errors/AppError";
import { Subtask } from "../../domain/entities/Subtask";
import { Todo } from "../../domain/entities/Todo";
/**
 * DynamoDB implementation of TodoRepository
 * Persists todos to AWS DynamoDB table
 *
 * Table structure:
 * - PK: id (string) - unique todo identifier
 * - Attributes: title, completed, createdAt, updatedAt
 */
export class DynamoDBTodoRepository {
    constructor(tableName) {
        this.cache = new Map();
        this.cacheAll = null;
        this.tableName = tableName || process.env["DYNAMODB_TABLE_NAME"] || "todo-copilot-dev";
        this.client = new DynamoDBClient({
            region: process.env["AWS_REGION"] || "ap-northeast-1",
            endpoint: process.env["DYNAMODB_ENDPOINT"],
        });
    }
    /**
     * Find a todo by its ID
     */
    async findById(id) {
        try {
            const command = new GetItemCommand({
                TableName: this.tableName,
                Key: marshall({ id }),
                ConsistentRead: true,
            });
            const response = await this.client.send(command);
            if (!response.Item) {
                return null;
            }
            const todo = this.unmarshallTodo(unmarshall(response.Item));
            // Update cache
            this.cache.set(id, todo);
            return todo;
        }
        catch (error) {
            throw this.handleError("findById", error);
        }
    }
    /**
     * Find all todos
     */
    async findAll() {
        if (this.cacheAll) {
            return this.cacheAll;
        }
        return [];
    }
    /**
     * Save a todo (create or update)
     */
    async save(todo) {
        // Update cache
        this.cache.set(todo.id, todo);
        // Update all-todos cache if present
        if (this.cacheAll) {
            const index = this.cacheAll.findIndex((t) => t.id === todo.id);
            if (index >= 0) {
                this.cacheAll[index] = todo;
            }
            else {
                this.cacheAll.push(todo);
            }
        }
        // Persist to DynamoDB
        await this.persistToDynamoDB(todo);
    }
    /**
     * Remove a todo
     */
    async remove(id) {
        // Update cache
        this.cache.delete(id);
        // Update all-todos cache if present
        if (this.cacheAll) {
            this.cacheAll = this.cacheAll.filter((t) => t.id !== id);
        }
        // Delete from DynamoDB
        await this.deleteFromDynamoDB(id);
    }
    async clear() {
        this.cache.clear();
        this.cacheAll = [];
        // Note: We don't clear DynamoDB table here as it's a dangerous operation
    }
    async count() {
        return this.cacheAll ? this.cacheAll.length : 0;
    }
    /**
     * Initialize repository with todos from DynamoDB
     * Must be called when Lambda handler is invoked
     */
    async initializeFromDynamoDB() {
        try {
            const response = await this.client.send(new ScanCommand({
                TableName: this.tableName,
                ConsistentRead: true,
            }));
            const todos = [];
            if (response.Items) {
                for (const item of response.Items) {
                    const unmarshalled = unmarshall(item);
                    const todo = this.unmarshallTodo(unmarshalled);
                    todos.push(todo);
                    this.cache.set(todo.id, todo);
                }
            }
            this.cacheAll = todos;
        }
        catch (error) {
            throw this.handleError("initializeFromDynamoDB", error);
        }
    }
    /**
     * Persist a todo to DynamoDB (async, non-blocking)
     */
    async persistToDynamoDB(todo) {
        try {
            const json = todo.toJSON();
            const item = {
                id: json.id,
                title: json.title,
                completed: json.completed,
                createdAt: json.createdAt,
                updatedAt: json.updatedAt,
                subtasks: json.subtasks,
            };
            await this.client.send(new PutItemCommand({
                TableName: this.tableName,
                Item: marshall(item, { removeUndefinedValues: true }),
            }));
        }
        catch (error) {
            throw this.handleError("persistToDynamoDB", error);
        }
    }
    /**
     * Delete a todo from DynamoDB (async, non-blocking)
     */
    async deleteFromDynamoDB(id) {
        try {
            await this.client.send(new DeleteItemCommand({
                TableName: this.tableName,
                Key: marshall({ id }),
            }));
        }
        catch (error) {
            throw this.handleError("deleteFromDynamoDB", error);
        }
    }
    /**
     * Convert DynamoDB item to Todo entity
     */
    unmarshallTodo(item) {
        const subtasks = item.subtasks
            ? item.subtasks.map((s) => Subtask.fromPersistence(s.id, s.title, s.completed, item.id))
            : [];
        return Todo.fromPersistence(item.id, item.title, item.completed, item.createdAt, item.updatedAt, subtasks);
    }
    /**
     * Handle and translate DynamoDB errors
     */
    handleError(operation, error) {
        const message = error instanceof Error ? error.message : String(error);
        return new DatabaseError(`DynamoDB ${operation} failed: ${message}`, {
            operation,
            originalError: message,
        });
    }
}
