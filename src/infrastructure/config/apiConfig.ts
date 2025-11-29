/**
 * API Configuration Validation and Utilities
 *
 * Validates environment variables for Lambda API integration
 * Provides utilities for API endpoint configuration
 */

/**
 * API Configuration Interface
 */
export interface ApiConfig {
  baseUrl: string;
  timeout?: number;
  retryAttempts?: number;
}

/**
 * Gets API configuration from environment variables
 * Falls back to localhost for development
 */
export function getApiConfig(): ApiConfig {
  const baseUrl = import.meta.env["VITE_API_URL"] || "http://localhost:3000";

  return {
    baseUrl,
    timeout: 30000,
    retryAttempts: 3,
  };
}

/**
 * Validates API URL format
 */
export function isValidApiUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates that VITE_API_URL is properly configured
 */
export function validateApiConfiguration(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const apiUrl = import.meta.env["VITE_API_URL"];

  if (!apiUrl) {
    errors.push("VITE_API_URL environment variable is not set");
  } else if (!isValidApiUrl(apiUrl)) {
    errors.push(`VITE_API_URL is not a valid URL: ${apiUrl}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Logs API configuration (sanitized for security)
 */
export function logApiConfiguration(): void {
  const config = getApiConfig();
  console.info("API Configuration:", {
    baseUrl: config.baseUrl.replace(/\/\/.*@/, "//***@"), // Mask credentials
    timeout: config.timeout,
    retryAttempts: config.retryAttempts,
  });
}

/**
 * Gets API endpoint URL for a given path
 */
export function getApiEndpoint(path: string): string {
  const config = getApiConfig();
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${config.baseUrl}${cleanPath}`;
}

/**
 * Checks if API is configured for production
 */
export function isProduction(): boolean {
  const baseUrl = import.meta.env["VITE_API_URL"];
  return baseUrl !== undefined && !baseUrl.includes("localhost") && !baseUrl.includes("127.0.0.1");
}
