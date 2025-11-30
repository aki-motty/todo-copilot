/**
 * Mock Logger for testing
 * Implements ILogger interface but does nothing (no-op)
 */

import type { ILogger, LogContext } from "../../src/application/ports/ILogger";

/**
 * No-op logger implementation for testing
 * All methods are empty to avoid console output during tests
 */
export const mockLogger: ILogger = {
  debug: (_message: string, _context?: LogContext): void => {},
  info: (_message: string, _context?: LogContext): void => {},
  warn: (_message: string, _context?: LogContext): void => {},
  error: (_message: string, _context?: LogContext | Error): void => {},
};

/**
 * Factory function to create mock logger
 * Can be used to create spied versions for assertion
 */
export const createMockLogger = (): ILogger => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
});
