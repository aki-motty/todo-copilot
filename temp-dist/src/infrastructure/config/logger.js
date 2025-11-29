/**
 * Logger configuration for the application
 * Provides structured logging with consistent format
 */
class Logger {
    constructor(moduleName) {
        this.moduleName = moduleName;
        this.logLevel = "info";
        // Check for process.env first (Node.js/Lambda)
        if (typeof process !== "undefined" && process.env && process.env["LOG_LEVEL"]) {
            this.logLevel = process.env["LOG_LEVEL"];
        }
        // Then check for window (Browser)
        else {
            try {
                if (typeof window !== "undefined" && window.import?.meta?.env?.VITE_LOG_LEVEL) {
                    this.logLevel = window.import.meta.env.VITE_LOG_LEVEL;
                }
            }
            catch (e) {
                // Ignore error if window is not defined
            }
        }
    }
    shouldLog(level) {
        const levels = ["debug", "info", "warn", "error"];
        return levels.indexOf(level) >= levels.indexOf(this.logLevel);
    }
    formatEntry(entry) {
        const { timestamp, level, module, message, data } = entry;
        const moduleStr = module ? ` [${module}]` : "";
        const dataStr = data ? ` ${JSON.stringify(data)}` : "";
        return `${timestamp} ${level.toUpperCase()}${moduleStr}: ${message}${dataStr}`;
    }
    debug(message, data) {
        if (this.shouldLog("debug")) {
            const entry = {
                timestamp: new Date().toISOString(),
                level: "debug",
                module: this.moduleName,
                message,
                data,
            };
            console.debug(this.formatEntry(entry));
        }
    }
    info(message, data) {
        if (this.shouldLog("info")) {
            const entry = {
                timestamp: new Date().toISOString(),
                level: "info",
                module: this.moduleName,
                message,
                data,
            };
            console.info(this.formatEntry(entry));
        }
    }
    warn(message, data) {
        if (this.shouldLog("warn")) {
            const entry = {
                timestamp: new Date().toISOString(),
                level: "warn",
                module: this.moduleName,
                message,
                data,
            };
            console.warn(this.formatEntry(entry));
        }
    }
    error(message, error) {
        if (this.shouldLog("error")) {
            const data = error instanceof Error ? { message: error.message, stack: error.stack } : error;
            const entry = {
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
export const createLogger = (moduleName) => {
    return new Logger(moduleName);
};
