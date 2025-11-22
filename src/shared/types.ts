/**
 * Shared type definitions for todo-copilot application
 * Used across all layers of the application
 */

/**
 * Branded type for unique identifiers
 * Provides type-level distinction while maintaining string runtime behavior
 */
export type Branded<T, Brand> = T & { readonly __brand: Brand };

/**
 * Factory for branded types
 */
export const brand = <T, B>(value: T): Branded<T, B> => value as Branded<T, B>;

/**
 * Application error types
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export class QuotaExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QuotaExceededError";
  }
}

export class StorageCorruptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageCorruptionError";
  }
}

/**
 * Base result type for operations
 */
export type Result<T, E = Error> = { type: "success"; value: T } | { type: "error"; error: E };

export const success = <T>(value: T): Result<T> => ({ type: "success", value });
export const failure = <E extends Error>(error: E): Result<never, E> => ({
  type: "error",
  error,
});

/**
 * Async result type
 */
export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;
