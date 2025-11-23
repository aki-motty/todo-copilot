import type React from "react";
import { createContext, useContext, useMemo } from "react";
import { createLogger } from "../../infrastructure/config/logger";

const logger = createLogger("ApiConfigProvider");

/**
 * API configuration context
 * Provides API base URL and enabled state to the application
 */
interface ApiConfig {
  baseUrl: string | null;
  isEnabled: boolean;
  logMessage: string;
}

interface ApiConfigContextType extends ApiConfig {
  isLocalStorageMode: boolean;
}

const ApiConfigContext = createContext<ApiConfigContextType | undefined>(undefined);

interface ApiConfigProviderProps {
  children: React.ReactNode;
}

/**
 * API Configuration Provider
 * Determines whether to use API or localStorage based on environment variables
 *
 * Priority:
 * 1. VITE_API_BASE_URL environment variable
 * 2. Falls back to localStorage if not set
 */
export const ApiConfigProvider: React.FC<ApiConfigProviderProps> = ({ children }) => {
  const config = useMemo(() => {
    // @ts-ignore - Accessing Vite environment variable
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;

    // Check for localStorage override (useful for testing)
    const forceLocalStorage =
      typeof window !== "undefined" && window.localStorage.getItem("forceLocalStorage") === "true";

    const isEnabled = Boolean(apiBaseUrl) && !forceLocalStorage;
    const isLocalStorageMode = !isEnabled;

    let logMessage = "";
    if (isEnabled && apiBaseUrl) {
      logMessage = `API backend enabled: ${apiBaseUrl}`;
      logger.info("API Configuration", {
        backend: "API",
        baseUrl: apiBaseUrl,
      });
    } else {
      logMessage = forceLocalStorage
        ? "Using localStorage backend (forced via localStorage)"
        : "Using localStorage backend (no VITE_API_BASE_URL configured)";

      logger.info("API Configuration", {
        backend: "localStorage",
        baseUrl: null,
        forced: forceLocalStorage,
      });
    }

    return {
      baseUrl: isEnabled ? apiBaseUrl || null : null,
      isEnabled,
      isLocalStorageMode,
      logMessage,
    };
  }, []);

  return <ApiConfigContext.Provider value={config}>{children}</ApiConfigContext.Provider>;
};

/**
 * Hook to access API configuration
 * Returns configuration and backend mode information
 */
export const useApiConfig = (): ApiConfigContextType => {
  const context = useContext(ApiConfigContext);
  if (!context) {
    throw new Error("useApiConfig must be used within ApiConfigProvider");
  }
  return context;
};
