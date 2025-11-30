/**
 * Logger configuration for the application
 * Provides structured logging with consistent format
 * Implements ILogger interface for clean architecture compliance
 */

import type { ILogger, LogContext, LoggerFactory } from "../../application/ports/ILogger";

interface LogEntry {
  timestamp: string;
  level: "debug" | "info" | "warn" | "error";
  module?: string;
  message: string;
  data?: Record<string, unknown>;
}

/**
 * Console-based logger implementation
 * Implements ILogger interface from application layer
 */
class ConsoleLogger implements ILogger {
  private logLevel: "debug" | "info" | "warn" | "error" = "info";

  constructor(private moduleName?: string) {
    // Check for process.env first (Node.js/Lambda)
    if (typeof process !== "undefined" && process.env && process.env["LOG_LEVEL"]) {
      this.logLevel = process.env["LOG_LEVEL"] as any;
    }
    // Then check for window (Browser)
    else {
      try {
        if (typeof window !== "undefined" && (window as any).import?.meta?.env?.VITE_LOG_LEVEL) {
          this.logLevel = (window as any).import.meta.env.VITE_LOG_LEVEL;
        }
      } catch (e) {
        // Ignore error if window is not defined
      }
    }
  }

  private shouldLog(level: "debug" | "info" | "warn" | "error"): boolean {
    const levels = ["debug", "info", "warn", "error"];
    return levels.indexOf(level) >= levels.indexOf(this.logLevel);
  }

  private formatEntry(entry: LogEntry): string {
    const { timestamp, level, module, message, data } = entry;
    const moduleStr = module ? ` [${module}]` : "";
    const dataStr = data ? ` ${JSON.stringify(data)}` : "";
    return `${timestamp} ${level.toUpperCase()}${moduleStr}: ${message}${dataStr}`;
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog("debug")) {
      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level: "debug",
        module: this.moduleName,
        message,
        data: context,
      };
      console.debug(this.formatEntry(entry));
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog("info")) {
      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level: "info",
        module: this.moduleName,
        message,
        data: context,
      };
      console.info(this.formatEntry(entry));
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog("warn")) {
      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level: "warn",
        module: this.moduleName,
        message,
        data: context,
      };
      console.warn(this.formatEntry(entry));
    }
  }

  error(message: string, context?: LogContext | Error): void {
    if (this.shouldLog("error")) {
      const data = context instanceof Error 
        ? { message: context.message, stack: context.stack } 
        : context;
      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level: "error",
        module: this.moduleName,
        message,
        data,
      };
      console.error(this.formatEntry(entry));
    }
  }
}

/**
 * Factory function to create logger instances
 * Returns ILogger interface for dependency injection
 */
export const createLogger: LoggerFactory = (moduleName?: string): ILogger => {
  return new ConsoleLogger(moduleName);
};

// Export the class for testing purposes
export { ConsoleLogger };
