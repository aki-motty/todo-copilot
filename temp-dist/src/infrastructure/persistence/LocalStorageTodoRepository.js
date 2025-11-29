import { Subtask } from "../../domain/entities/Subtask";
import { Todo } from "../../domain/entities/Todo";
import { NotFoundError, QuotaExceededError, StorageCorruptionError } from "../../shared/types";
/**
 * LocalStorage implementation of TodoRepository
 * Persists todos to browser's localStorage
 *
 * Storage schema:
 * Key: "todo_app:todos"
 * Value: JSON array of serialized todos
 */
export class LocalStorageTodoRepository {
    constructor(storage) {
        this.storageKey = "todo_app:todos";
        this.storagePrefix = "todo_app:version";
        this.version = 1;
        if (storage) {
            this.storage = storage;
        }
        else if (typeof window !== "undefined") {
            this.storage = window.localStorage;
        }
        else {
            // Fallback for non-browser environments or when window is not available
            // This allows the class to be imported in Node.js environments without crashing
            this.storage = {
                getItem: () => null,
                setItem: () => { },
                removeItem: () => { },
                clear: () => { },
                key: () => null,
                length: 0,
            };
        }
        this.initializeStorage();
    }
    /**
     * Initialize storage and verify integrity
     */
    initializeStorage() {
        try {
            const versionKey = `${this.storagePrefix}`;
            const storedVersion = this.storage.getItem(versionKey);
            if (!storedVersion) {
                this.storage.setItem(versionKey, this.version.toString());
            }
            else if (Number.parseInt(storedVersion, 10) !== this.version) {
                // Version mismatch - could implement migration logic here
                console.warn("Storage version mismatch, resetting todos");
                this.clear();
            }
            // Try to parse existing todos to verify integrity
            const data = this.storage.getItem(this.storageKey);
            if (data) {
                JSON.parse(data);
            }
        }
        catch (error) {
            throw new StorageCorruptionError(`Failed to initialize storage: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async findById(id) {
        const todos = this.getAllFromStorage();
        const todoData = todos.find((t) => t.id === id);
        if (!todoData)
            return null;
        const subtasks = (todoData.subtasks || []).map((s) => Subtask.fromPersistence(s.id, s.title, s.completed, s.parentId));
        return Todo.fromPersistence(todoData.id, todoData.title, todoData.completed, todoData.createdAt, todoData.updatedAt, subtasks);
    }
    async findAll() {
        const todos = this.getAllFromStorage();
        return todos.map((t) => {
            const subtasks = (t.subtasks || []).map((s) => Subtask.fromPersistence(s.id, s.title, s.completed, s.parentId));
            return Todo.fromPersistence(t.id, t.title, t.completed, t.createdAt, t.updatedAt, subtasks);
        });
    }
    async save(todo) {
        try {
            const todos = this.getAllFromStorage();
            const existingIndex = todos.findIndex((t) => t.id === todo.id);
            if (existingIndex >= 0) {
                todos[existingIndex] = todo.toJSON();
            }
            else {
                todos.push(todo.toJSON());
            }
            this.storage.setItem(this.storageKey, JSON.stringify(todos));
        }
        catch (error) {
            if (error instanceof DOMException && error.code === 22) {
                throw new QuotaExceededError("localStorage quota exceeded. Please delete some todos.");
            }
            throw error;
        }
    }
    async remove(id) {
        const todos = this.getAllFromStorage();
        const initialLength = todos.length;
        const filtered = todos.filter((t) => t.id !== id);
        if (filtered.length === initialLength) {
            throw new NotFoundError(`Todo with id ${id} not found`);
        }
        this.storage.setItem(this.storageKey, JSON.stringify(filtered));
    }
    async clear() {
        this.storage.removeItem(this.storageKey);
    }
    async count() {
        return this.getAllFromStorage().length;
    }
    /**
     * Get all todos from storage
     * @private
     */
    getAllFromStorage() {
        try {
            const data = this.storage.getItem(this.storageKey);
            if (!data) {
                return [];
            }
            return JSON.parse(data);
        }
        catch (error) {
            throw new StorageCorruptionError(`Failed to parse todos from storage: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
