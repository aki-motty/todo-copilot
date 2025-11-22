/**
 * Logger configuration for the application
 * Provides structured logging with consistent format
 */

interface LogEntry {
  timestamp: string;
  level: "debug" | "info" | "warn" | "error";
  module?: string;
  message: string;
  data?: Record<string, unknown>;
}

class Logger {
  private logLevel: "debug" | "info" | "warn" | "error" = "info";

  constructor(private moduleName?: string) {
    const envLogLevel = import.meta.env.VITE_LOG_LEVEL;
    if (envLogLevel) {
      this.logLevel = envLogLevel as "debug" | "info" | "warn" | "error";
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

  debug(message: string, data?: Record<string, unknown>): void {
    if (this.shouldLog("debug")) {
      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level: "debug",
        module: this.moduleName,
        message,
        data,
      };
      console.debug(this.formatEntry(entry));
    }
  }

  info(message: string, data?: Record<string, unknown>): void {
    if (this.shouldLog("info")) {
      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level: "info",
        module: this.moduleName,
        message,
        data,
      };
      console.info(this.formatEntry(entry));
    }
  }

  warn(message: string, data?: Record<string, unknown>): void {
    if (this.shouldLog("warn")) {
      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level: "warn",
        module: this.moduleName,
        message,
        data,
      };
      console.warn(this.formatEntry(entry));
    }
  }

  error(message: string, error?: Error | Record<string, unknown>): void {
    if (this.shouldLog("error")) {
      const data = error instanceof Error ? { message: error.message, stack: error.stack } : error;
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

export const createLogger = (moduleName?: string): Logger => {
  return new Logger(moduleName);
};
