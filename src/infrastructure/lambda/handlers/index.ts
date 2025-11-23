/**
 * Lambda handler for todo operations
 * Main entry point for AWS Lambda function handling HTTP requests from API Gateway
 */

import type { CreateTodoCommand } from "../../../application/commands/CreateTodoCommand";
import type { DeleteTodoCommand } from "../../../application/commands/DeleteTodoCommand";
import type { ToggleTodoCompletionCommand } from "../../../application/commands/ToggleTodoCompletionCommand";
import { TodoApplicationService } from "../../../application/services/TodoApplicationService";
import type { TodoId } from "../../../domain/entities/Todo";
import type { ITodoRepository } from "../../../domain/repositories/TodoRepository";
import { createLogger } from "../../../infrastructure/config/logger";
import { LocalStorageTodoRepository } from "../../../infrastructure/persistence/LocalStorageTodoRepository";
import type { CreateTodoRequest, LambdaContext, LambdaEvent, LambdaResponse, TodoDTO, UpdateTodoRequest } from "../../../shared/api/types";
import {
    createErrorResponse,
    createSuccessResponse,
    getPathParameter,
    getQueryParameter,
    parseBody,
} from "../../../shared/api/types";

const logger = createLogger("LambdaHandler");
let todoRepository: ITodoRepository;
let applicationService: TodoApplicationService;

/**
 * Initialize repository and application service
 * Called once per Lambda container (cold start)
 */
function initializeHandlers(): void {
  if (!todoRepository) {
    todoRepository = new LocalStorageTodoRepository();
    applicationService = new TodoApplicationService(todoRepository);
  }
}

/**
 * Convert Todo domain entity to DTO for JSON response
 */
function todoToDTO(todo: any): TodoDTO {
  return {
    id: todo.id,
    title: todo.title.value || todo.title,
    completed: todo.completed,
    createdAt: todo.createdAt.toISOString?.() || todo.createdAt,
    updatedAt: todo.updatedAt.toISOString?.() || todo.updatedAt,
  };
}

/**
 * Handle GET /todos - Retrieve all todos
 */
async function handleGetTodos(event: LambdaEvent): Promise<LambdaResponse> {
  try {
    const page = parseInt(getQueryParameter(event, "page") || "1", 10);
    const pageSize = parseInt(getQueryParameter(event, "pageSize") || "50", 10);

    const result = applicationService.getAllTodos({});
    const todos = result.todos;
    const total = todos.length;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedTodos = todos.slice(startIndex, endIndex);

    const response = createSuccessResponse(200, {
      items: paginatedTodos.map(todoToDTO),
      total,
      page,
      pageSize,
      hasMore: endIndex < total,
    });

    return {
      statusCode: response.statusCode,
      body: JSON.stringify(response.body),
      headers: { "Content-Type": "application/json" },
    };
  } catch (error) {
    logger.error("Error fetching todos", error as any);
    const response = createErrorResponse(
      500,
      "Internal Server Error",
      error instanceof Error ? error.message : String(error)
    );
    return {
      statusCode: response.statusCode,
      body: JSON.stringify(response.body),
      headers: { "Content-Type": "application/json" },
    };
  }
}

/**
 * Handle GET /todos/{id} - Retrieve a specific todo
 */
async function handleGetTodoById(event: LambdaEvent): Promise<LambdaResponse> {
  try {
    const id = getPathParameter(event, "id");
    if (!id) {
      const response = createErrorResponse(400, "Bad Request", "Todo ID is required");
      return {
        statusCode: response.statusCode,
        body: JSON.stringify(response.body),
        headers: { "Content-Type": "application/json" },
      };
    }

    const todo = applicationService.getTodoById({ id: id as any as TodoId });
    if (!todo) {
      const response = createErrorResponse(404, "Not Found", `Todo with ID ${id} not found`);
      return {
        statusCode: response.statusCode,
        body: JSON.stringify(response.body),
        headers: { "Content-Type": "application/json" },
      };
    }

    const response = createSuccessResponse(200, todoToDTO(todo));
    return {
      statusCode: response.statusCode,
      body: JSON.stringify(response.body),
      headers: { "Content-Type": "application/json" },
    };
  } catch (error) {
    logger.error("Error fetching todo", error as any);
    const response = createErrorResponse(
      500,
      "Internal Server Error",
      error instanceof Error ? error.message : String(error)
    );
    return {
      statusCode: response.statusCode,
      body: JSON.stringify(response.body),
      headers: { "Content-Type": "application/json" },
    };
  }
}

/**
 * Handle POST /todos - Create a new todo
 */
async function handleCreateTodo(event: LambdaEvent): Promise<LambdaResponse> {
  try {
    const payload = parseBody<CreateTodoRequest>(event.body);

    if (!payload.title || payload.title.trim().length === 0) {
      const response = createErrorResponse(400, "Bad Request", "Title is required");
      return {
        statusCode: response.statusCode,
        body: JSON.stringify(response.body),
        headers: { "Content-Type": "application/json" },
      };
    }

    if (payload.title.length > 500) {
      const response = createErrorResponse(400, "Bad Request", "Title cannot exceed 500 characters");
      return {
        statusCode: response.statusCode,
        body: JSON.stringify(response.body),
        headers: { "Content-Type": "application/json" },
      };
    }

    const command: CreateTodoCommand = {
      title: payload.title,
    };

    const todo = applicationService.createTodo(command);
    const response = createSuccessResponse(201, todoToDTO(todo));

    return {
      statusCode: response.statusCode,
      body: JSON.stringify(response.body),
      headers: { "Content-Type": "application/json" },
    };
  } catch (error) {
    logger.error("Error creating todo", error as any);
    const response = createErrorResponse(
      500,
      "Internal Server Error",
      error instanceof Error ? error.message : String(error)
    );
    return {
      statusCode: response.statusCode,
      body: JSON.stringify(response.body),
      headers: { "Content-Type": "application/json" },
    };
  }
}

/**
 * Handle PUT /todos/{id} - Update a todo
 */
async function handleUpdateTodo(event: LambdaEvent): Promise<LambdaResponse> {
  try {
    const id = getPathParameter(event, "id");
    if (!id) {
      const response = createErrorResponse(400, "Bad Request", "Todo ID is required");
      return {
        statusCode: response.statusCode,
        body: JSON.stringify(response.body),
        headers: { "Content-Type": "application/json" },
      };
    }

    const payload = parseBody<UpdateTodoRequest>(event.body);

    if (payload.completed === undefined) {
      const response = createErrorResponse(400, "Bad Request", "completed field is required");
      return {
        statusCode: response.statusCode,
        body: JSON.stringify(response.body),
        headers: { "Content-Type": "application/json" },
      };
    }

    const command: ToggleTodoCompletionCommand = {
      id: id as any as TodoId,
    };

    const todo = applicationService.toggleTodoCompletion(command);
    const response = createSuccessResponse(200, todoToDTO(todo));

    return {
      statusCode: response.statusCode,
      body: JSON.stringify(response.body),
      headers: { "Content-Type": "application/json" },
    };
  } catch (error) {
    logger.error("Error updating todo", error as any);

    if (error instanceof Error && error.message.includes("not found")) {
      const response = createErrorResponse(404, "Not Found", "Todo not found");
      return {
        statusCode: response.statusCode,
        body: JSON.stringify(response.body),
        headers: { "Content-Type": "application/json" },
      };
    }

    const response = createErrorResponse(
      500,
      "Internal Server Error",
      error instanceof Error ? error.message : String(error)
    );
    return {
      statusCode: response.statusCode,
      body: JSON.stringify(response.body),
      headers: { "Content-Type": "application/json" },
    };
  }
}

/**
 * Handle DELETE /todos/{id} - Delete a todo
 */
async function handleDeleteTodo(event: LambdaEvent): Promise<LambdaResponse> {
  try {
    const id = getPathParameter(event, "id");
    if (!id) {
      const response = createErrorResponse(400, "Bad Request", "Todo ID is required");
      return {
        statusCode: response.statusCode,
        body: JSON.stringify(response.body),
        headers: { "Content-Type": "application/json" },
      };
    }

    const command: DeleteTodoCommand = {
      id: id as any as TodoId,
    };

    applicationService.deleteTodo(command);
    const response = createSuccessResponse(204, null);

    return {
      statusCode: response.statusCode,
      body: JSON.stringify({ success: true }),
      headers: { "Content-Type": "application/json" },
    };
  } catch (error) {
    logger.error("Error deleting todo", error as any);

    if (error instanceof Error && error.message.includes("not found")) {
      const response = createErrorResponse(404, "Not Found", "Todo not found");
      return {
        statusCode: response.statusCode,
        body: JSON.stringify(response.body),
        headers: { "Content-Type": "application/json" },
      };
    }

    const response = createErrorResponse(
      500,
      "Internal Server Error",
      error instanceof Error ? error.message : String(error)
    );
    return {
      statusCode: response.statusCode,
      body: JSON.stringify(response.body),
      headers: { "Content-Type": "application/json" },
    };
  }
}

/**
 * Main Lambda handler
 * Routes requests to appropriate handlers based on HTTP method and path
 */
export async function handler(event: LambdaEvent, context: LambdaContext): Promise<LambdaResponse> {
  logger.info("Received Lambda event", {
    method: event.requestContext.http.method,
    path: event.requestContext.http.path,
    requestId: context.awsRequestId,
  });

  try {
    initializeHandlers();

    const method = event.requestContext.http.method;
    const path = event.requestContext.http.path;

    // Route requests to appropriate handlers
    if (method === "GET" && path === "/todos") {
      return await handleGetTodos(event);
    }

    if (method === "GET" && path.startsWith("/todos/")) {
      return await handleGetTodoById(event);
    }

    if (method === "POST" && path === "/todos") {
      return await handleCreateTodo(event);
    }

    if (method === "PUT" && path.startsWith("/todos/")) {
      return await handleUpdateTodo(event);
    }

    if (method === "DELETE" && path.startsWith("/todos/")) {
      return await handleDeleteTodo(event);
    }

    // 404 for unknown routes
    const response = createErrorResponse(404, "Not Found", "Endpoint not found");
    return {
      statusCode: response.statusCode,
      body: JSON.stringify(response.body),
      headers: { "Content-Type": "application/json" },
    };
  } catch (error) {
    logger.error("Unhandled error in Lambda handler", error as any);
    const response = createErrorResponse(
      500,
      "Internal Server Error",
      error instanceof Error ? error.message : String(error)
    );
    return {
      statusCode: response.statusCode,
      body: JSON.stringify(response.body),
      headers: { "Content-Type": "application/json" },
    };
  }
}
