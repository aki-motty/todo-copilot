/**
 * Data Transfer Objects for Lambda API
 * Serializes/deserializes Todo entities for HTTP communication
 */

/**
 * DTO for todo in API responses
 * Flattens Todo entity structure for JSON serialization
 */
export interface TodoResponseDTO {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string; // ISO 8601 format
  updatedAt: string; // ISO 8601 format
}

/**
 * DTO for create todo request
 */
export interface CreateTodoRequestDTO {
  title: string;
}

/**
 * DTO for toggle todo request
 */
export interface ToggleTodoRequestDTO {
  id: string;
}

/**
 * DTO for delete todo request
 */
export interface DeleteTodoRequestDTO {
  id: string;
}

/**
 * DTO for list todos response with pagination metadata
 */
export interface ListTodosResponseDTO {
  todos: TodoResponseDTO[];
  count: number;
  hasMore?: boolean;
  cursor?: string; // For pagination continuation
}

/**
 * DTO for API error response
 */
export interface ErrorResponseDTO {
  status: number;
  code: string;
  message: string;
  timestamp: string;
  requestId?: string;
}

/**
 * DTO for successful API response
 */
export interface ApiResponseDTO<T> {
  status: number;
  data: T;
  meta?: {
    timestamp: string;
    requestId?: string;
  };
}
