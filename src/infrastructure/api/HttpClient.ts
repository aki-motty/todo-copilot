import { createLogger } from "../config/logger";

/**
 * HTTP client error types
 */
export class HttpError extends Error {
  constructor(
    public statusCode: number,
    public statusText: string,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NetworkError";
  }
}

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimeoutError";
  }
}

/**
 * HTTP request options
 */
export interface HttpRequestOptions {
  headers?: Record<string, string>;
  timeout?: number;
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
  private logger = createLogger("HttpClient");
  private readonly timeout: number;

  constructor(private readonly baseUrl: string, options?: { timeout?: number }) {
    this.timeout = options?.timeout ?? 5000; // 5 seconds default
    this.logger.debug("HttpClient initialized", { baseUrl, timeout: this.timeout });
  }

  /**
   * Perform a GET request
   */
  async get<T>(path: string, options?: HttpRequestOptions): Promise<T> {
    return this.request<T>("GET", path, undefined, options);
  }

  /**
   * Perform a POST request
   */
  async post<T>(path: string, body: unknown, options?: HttpRequestOptions): Promise<T> {
    return this.request<T>("POST", path, body, options);
  }

  /**
   * Perform a PUT request
   */
  async put<T>(path: string, body: unknown, options?: HttpRequestOptions): Promise<T> {
    return this.request<T>("PUT", path, body, options);
  }

  /**
   * Perform a DELETE request
   */
  async delete<T>(path: string, options?: HttpRequestOptions): Promise<T> {
    return this.request<T>("DELETE", path, undefined, options);
  }

  /**
   * Internal method to perform HTTP request with timeout and error handling
   */
  private async request<T>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    body?: unknown,
    options?: HttpRequestOptions,
  ): Promise<T> {
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

      let data: unknown;
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
        const apiData = data as Record<string, unknown>;
        
        // Handle standard API response format { status, data, meta }
        if ("status" in apiData && "data" in apiData) {
          return apiData.data as T;
        }

        if ("body" in apiData && typeof apiData.body === "object") {
          const apiBody = apiData.body as Record<string, unknown>;
          if ("data" in apiBody) {
            return apiBody.data as T;
          }
          if ("success" in apiBody && apiBody.success) {
            return apiBody as T;
          }
        }
      }

      return data as T;
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }

      if (error instanceof TypeError && error.message.includes("Failed to fetch")) {
        const networkError = new NetworkError(
          `Network error: Unable to connect to ${url}. Check if the server is running.`,
        );
        this.logger.error(`${method} ${path} - Network Error`, networkError);
        throw networkError;
      }

      if (error instanceof Error && error.name === "AbortError") {
        const timeoutError = new TimeoutError(
          `Request timeout: ${method} ${path} took longer than ${timeout}ms`,
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
  private buildUrl(path: string): string {
    const normalizedBase = this.baseUrl.endsWith("/") ? this.baseUrl.slice(0, -1) : this.baseUrl;
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `${normalizedBase}${normalizedPath}`;
  }

  /**
   * Build request headers with defaults
   */
  private buildHeaders(customHeaders?: Record<string, string>): Record<string, string> {
    return {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...customHeaders,
    };
  }

  /**
   * Extract error message from API response
   */
  private extractErrorMessage(data: unknown, defaultMessage: string): string {
    if (typeof data === "object" && data !== null) {
      const apiData = data as Record<string, unknown>;

      // Check for wrapped API response
      if ("body" in apiData && typeof apiData.body === "object") {
        const body = apiData.body as Record<string, unknown>;
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
