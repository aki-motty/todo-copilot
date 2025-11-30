import { createLogger } from "../config/logger";
/**
 * HTTP client error types
 */
export class HttpError extends Error {
  constructor(statusCode, statusText, message) {
    super(message);
    this.statusCode = statusCode;
    this.statusText = statusText;
    this.name = "HttpError";
  }
}
export class NetworkError extends Error {
  constructor(message) {
    super(message);
    this.name = "NetworkError";
  }
}
export class TimeoutError extends Error {
  constructor(message) {
    super(message);
    this.name = "TimeoutError";
  }
}
/**
 * HTTP Client for Lambda API communication
 * Provides type-safe, request/response logging, and error handling
 *
 * Features:
 * - POST, GET, PUT, DELETE methods
 * - Configurable timeout (default 5 seconds)
 * - Request/response logging
 * - Meaningful error messages
 * - Type-safe with TypeScript
 */
export class HttpClient {
  constructor(baseUrl, options) {
    this.baseUrl = baseUrl;
    this.logger = createLogger("HttpClient");
    this.timeout = options?.timeout ?? 5000; // 5 seconds default
    this.logger.debug("HttpClient initialized", { baseUrl, timeout: this.timeout });
  }
  /**
   * Perform a GET request
   */
  async get(path, options) {
    return this.request("GET", path, undefined, options);
  }
  /**
   * Perform a POST request
   */
  async post(path, body, options) {
    return this.request("POST", path, body, options);
  }
  /**
   * Perform a PUT request
   */
  async put(path, body, options) {
    return this.request("PUT", path, body, options);
  }
  /**
   * Perform a PATCH request
   */
  async patch(path, body, options) {
    return this.request("PATCH", path, body, options);
  }
  /**
   * Perform a DELETE request
   */
  async delete(path, options) {
    return this.request("DELETE", path, undefined, options);
  }
  /**
   * Internal method to perform HTTP request with timeout and error handling
   */
  async request(method, path, body, options) {
    const url = this.buildUrl(path);
    const headers = this.buildHeaders(options?.headers);
    const timeout = options?.timeout ?? this.timeout;
    this.logger.debug(`${method} ${path}`, {
      url,
      timeout,
      hasBody: !!body,
    });
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const contentType = response.headers.get("content-type") || "";
      const isJson = contentType.includes("application/json");
      let data;
      if (isJson) {
        data = await response.json();
      } else {
        data = await response.text();
      }
      this.logger.debug(`${method} ${path} - Response received`, {
        status: response.status,
        statusText: response.statusText,
        isJson,
      });
      if (!response.ok) {
        const errorMessage = this.extractErrorMessage(data, response.statusText);
        this.logger.error(`${method} ${path} - HTTP Error`, {
          status: response.status,
          statusText: response.statusText,
          error: errorMessage,
        });
        throw new HttpError(response.status, response.statusText, errorMessage);
      }
      // Extract data from API response wrapper if present
      if (isJson && typeof data === "object" && data !== null) {
        const apiData = data;
        // Handle standard API response format { status, data, meta }
        if ("status" in apiData && "data" in apiData) {
          return apiData.data;
        }
        if ("body" in apiData && typeof apiData.body === "object") {
          const apiBody = apiData.body;
          if ("data" in apiBody) {
            return apiBody.data;
          }
          if ("success" in apiBody && apiBody.success) {
            return apiBody;
          }
        }
      }
      return data;
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      if (error instanceof TypeError && error.message.includes("Failed to fetch")) {
        const networkError = new NetworkError(
          `Network error: Unable to connect to ${url}. Check if the server is running.`
        );
        this.logger.error(`${method} ${path} - Network Error`, networkError);
        throw networkError;
      }
      if (error instanceof Error && error.name === "AbortError") {
        const timeoutError = new TimeoutError(
          `Request timeout: ${method} ${path} took longer than ${timeout}ms`
        );
        this.logger.error(`${method} ${path} - Timeout`, timeoutError);
        throw timeoutError;
      }
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`${method} ${path} - Unknown Error`, err);
      throw err;
    }
  }
  /**
   * Build full URL from base URL and path
   */
  buildUrl(path) {
    const normalizedBase = this.baseUrl.endsWith("/") ? this.baseUrl.slice(0, -1) : this.baseUrl;
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `${normalizedBase}${normalizedPath}`;
  }
  /**
   * Build request headers with defaults
   */
  buildHeaders(customHeaders) {
    return {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...customHeaders,
    };
  }
  /**
   * Extract error message from API response
   */
  extractErrorMessage(data, defaultMessage) {
    if (typeof data === "object" && data !== null) {
      const apiData = data;
      // Check for wrapped API response
      if ("body" in apiData && typeof apiData.body === "object") {
        const body = apiData.body;
        if ("error" in body && typeof body.error === "string") {
          return body.error;
        }
        if ("message" in body && typeof body.message === "string") {
          return body.message;
        }
      }
      // Check for direct error field
      if ("error" in apiData && typeof apiData.error === "string") {
        return apiData.error;
      }
      if ("message" in apiData && typeof apiData.message === "string") {
        return apiData.message;
      }
    }
    return defaultMessage;
  }
}
