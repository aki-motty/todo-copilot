/**
 * HTTP Client for Todo API
 * Communicates with AWS Lambda backend
 * Handles request/response serialization and error handling
 */
function getApiBaseUrl() {
  // Try various sources for API URL
  if (typeof __VITE_API_URL__ !== "undefined") {
    return __VITE_API_URL__;
  }
  if (typeof process !== "undefined" && process.env?.VITE_API_URL) {
    return process.env.VITE_API_URL;
  }
  // Default fallback
  return "http://localhost:3000";
}
const REQUEST_TIMEOUT = 30000; // 30 seconds
const RETRY_MAX_ATTEMPTS = 3;
const RETRY_DELAY = 1000; // 1 second
/**
 * HTTP error wrapper
 */
export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
    this.name = "ApiError";
  }
}
/**
 * Todo API Client
 * Provides methods for all CRUD operations
 */
export const TodoApiClient = {
  /**
   * Create a new todo
   */
  async createTodo(title) {
    const response = await TodoApiClient.fetch("/todos", "POST", { title });
    return response.data;
  },
  /**
   * Get all todos with pagination support
   */
  async listTodos(options) {
    const params = new URLSearchParams();
    if (options?.limit) {
      params.append("limit", String(options.limit));
    }
    if (options?.cursor) {
      params.append("cursor", options.cursor);
    }
    const queryString = params.toString();
    const url = `/todos${queryString ? `?${queryString}` : ""}`;
    const response = await TodoApiClient.fetch(url, "GET");
    return response.data;
  },
  /**
   * Get a single todo by ID
   */
  async getTodo(id) {
    const response = await TodoApiClient.fetch(`/todos/${id}`, "GET");
    return response.data;
  },
  /**
   * Toggle todo completion status
   */
  async toggleTodo(id) {
    const response = await TodoApiClient.fetch(`/todos/${id}/toggle`, "PUT", {});
    return response.data;
  },
  /**
   * Delete a todo
   */
  async deleteTodo(id) {
    const response = await TodoApiClient.fetch(`/todos/${id}`, "DELETE");
    return response.data;
  },
  /**
   * Add a subtask to a todo
   */
  async addSubtask(todoId, title) {
    const response = await TodoApiClient.fetch(`/todos/${todoId}/subtasks`, "POST", { title });
    return response.data;
  },
  /**
   * Toggle subtask completion status
   */
  async toggleSubtask(todoId, subtaskId) {
    const response = await TodoApiClient.fetch(
      `/todos/${todoId}/subtasks/${subtaskId}`,
      "PATCH",
      {}
    );
    return response.data;
  },
  /**
   * Delete a subtask
   */
  async deleteSubtask(todoId, subtaskId) {
    const response = await TodoApiClient.fetch(`/todos/${todoId}/subtasks/${subtaskId}`, "DELETE");
    return response.data;
  },
  /**
   * Internal fetch method with retry logic and error handling
   */
  async fetch(endpoint, method, body, attempt = 1) {
    try {
      const url = `${getApiBaseUrl()}${endpoint}`;
      const options = {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT),
      };
      if (body) {
        options.body = JSON.stringify(body);
      }
      const response = await fetch(url, options);
      // Parse response
      let data;
      try {
        data = await response.json();
      } catch {
        throw new ApiError(response.status, "PARSE_ERROR", "Failed to parse API response");
      }
      // Handle error responses
      if (!response.ok) {
        const errorData = data;
        throw new ApiError(
          response.status,
          errorData.code || "API_ERROR",
          errorData.message || "API request failed",
          {
            code: errorData.code,
            message: errorData.message,
            requestId: errorData.requestId,
          }
        );
      }
      return data;
    } catch (error) {
      // Handle specific error types
      if (error instanceof ApiError) {
        throw error;
      }
      if (error instanceof TypeError && error.message.includes("Failed to fetch")) {
        // Network error - retry if attempts remain
        if (attempt < RETRY_MAX_ATTEMPTS) {
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY * attempt));
          return TodoApiClient.fetch(endpoint, method, body, attempt + 1);
        }
        throw new ApiError(0, "NETWORK_ERROR", "Failed to connect to API", {
          originalMessage: error.message,
          attempts: attempt,
        });
      }
      if (error instanceof Error && error.name === "AbortError") {
        throw new ApiError(408, "TIMEOUT_ERROR", "Request timeout after 30 seconds", {
          timeout: REQUEST_TIMEOUT,
        });
      }
      throw new ApiError(
        500,
        "UNKNOWN_ERROR",
        error instanceof Error ? error.message : "Unknown error occurred",
        {
          originalError: error,
        }
      );
    }
  },
};
/**
 * API health check
 * Verifies that the Lambda backend is accessible
 */
export async function checkApiHealth() {
  try {
    const response = await fetch(`${getApiBaseUrl()}/todos`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
