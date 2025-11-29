/**
 * Shared type definitions for todo-copilot application
 * Used across all layers of the application
 */
/**
 * Factory for branded types
 */
export const brand = (value) => value;
/**
 * Application error types
 */
export class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = "ValidationError";
    }
}
export class NotFoundError extends Error {
    constructor(message) {
        super(message);
        this.name = "NotFoundError";
    }
}
export class QuotaExceededError extends Error {
    constructor(message) {
        super(message);
        this.name = "QuotaExceededError";
    }
}
export class StorageCorruptionError extends Error {
    constructor(message) {
        super(message);
        this.name = "StorageCorruptionError";
    }
}
export const success = (value) => ({ type: "success", value });
export const failure = (error) => ({
    type: "error",
    error,
});
