/**
 * Logger interface for application layer
 * Abstracts logging implementation to maintain clean architecture
 * Infrastructure layer provides the implementation
 */

/**
 * Log context data type
 */
export type LogContext = Record<string, unknown>;

/**
 * Logger interface following DIP (Dependency Inversion Principle)
 * Application layer depends on this interface, not on concrete implementation
 */
export interface ILogger {
  /**
   * Log debug-level message
   * Used for detailed debugging information
   */
  debug(message: string, context?: LogContext): void;

  /**
   * Log info-level message
   * Used for general operational information
   */
  info(message: string, context?: LogContext): void;

  /**
   * Log warning-level message
   * Used for potentially harmful situations
   */
  warn(message: string, context?: LogContext): void;

  /**
   * Log error-level message
   * Used for error events that might still allow the application to continue
   * Accepts Error objects or plain context objects
   */
  error(message: string, context?: LogContext | Error): void;
}

/**
 * Factory function type for creating loggers with module names
 */
export type LoggerFactory = (moduleName?: string) => ILogger;
