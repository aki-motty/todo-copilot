/**
 * Base classes for CQRS command and query handlers
 * Defines the contract for handling operations in the application layer
 */

/**
 * Base command handler
 * Commands represent actions that change state
 */
export abstract class CommandHandler<T, R> {
  /**
   * Execute the command
   * @param command The command to execute
   * @returns The result of the command execution
   * @throws Errors specific to the command implementation
   */
  abstract execute(command: T): R | Promise<R>;
}

/**
 * Base query handler
 * Queries represent read-only operations
 */
export abstract class QueryHandler<T, R> {
  /**
   * Execute the query
   * @param query The query to execute
   * @returns The result of the query
   * @throws Errors specific to the query implementation
   */
  abstract execute(query: T): R | Promise<R>;
}
