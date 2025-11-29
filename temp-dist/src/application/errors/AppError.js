/**
 * Application layer error handling
 * Provides typed error classes for different error scenarios
 */
/**
 * Base error class for application layer
 */
export class AppError extends Error {
    constructor(code, statusCode, message, details) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;
        this.name = "AppError";
        Object.setPrototypeOf(this, AppError.prototype);
    }
}
/**
 * Validation error (400 Bad Request)
 */
export class ValidationError extends AppError {
    constructor(message, details) {
        super("VALIDATION_ERROR", 400, message, details);
        this.name = "ValidationError";
        Object.setPrototypeOf(this, ValidationError.prototype);
    }
}
/**
 * Not found error (404 Not Found)
 */
export class NotFoundError extends AppError {
    constructor(message, details) {
        super("NOT_FOUND", 404, message, details);
        this.name = "NotFoundError";
        Object.setPrototypeOf(this, NotFoundError.prototype);
    }
}
/**
 * Conflict error (409 Conflict)
 * Typically used when attempting duplicate operations
 */
export class ConflictError extends AppError {
    constructor(message, details) {
        super("CONFLICT", 409, message, details);
        this.name = "ConflictError";
        Object.setPrototypeOf(this, ConflictError.prototype);
    }
}
/**
 * Database error (500 Internal Server Error)
 */
export class DatabaseError extends AppError {
    constructor(message, details) {
        super("DATABASE_ERROR", 500, message, details);
        this.name = "DatabaseError";
        Object.setPrototypeOf(this, DatabaseError.prototype);
    }
}
/**
 * Internal server error (500 Internal Server Error)
 */
export class InternalServerError extends AppError {
    constructor(message, details) {
        super("INTERNAL_ERROR", 500, message, details);
        this.name = "InternalServerError";
        Object.setPrototypeOf(this, InternalServerError.prototype);
    }
}
/**
 * Check if error is an application error
 */
export const isAppError = (error) => {
    return error instanceof AppError;
};
/**
 * Convert error to API response status code
 */
export const getStatusCode = (error) => {
    if (isAppError(error)) {
        return error.statusCode;
    }
    return 500;
};
