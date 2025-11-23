/**
 * AWS Lambda handler for Todo API
 * Main entry point for HTTP requests from API Gateway V2
 */

import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import type { ApiResponseDTO, ErrorResponseDTO } from "../../../application/dto/TodoDTO";
import { type AppError, isAppError } from "../../../application/errors/AppError";
import { CreateTodoHandler } from "../../../application/handlers/CreateTodoHandler";
import { DeleteTodoHandler } from "../../../application/handlers/DeleteTodoHandler";
import { GetTodoHandler } from "../../../application/handlers/GetTodoHandler";
import { ListTodosHandler } from "../../../application/handlers/ListTodosHandler";
import { SaveTodoHandler } from "../../../application/handlers/SaveTodoHandler";
import { ToggleTodoHandler } from "../../../application/handlers/ToggleTodoHandler";
import { DynamoDBTodoRepository } from "../../repositories/DynamoDBTodoRepository";

// Initialize repository and handlers
let repository: DynamoDBTodoRepository;
let handlers: {
  createTodo: CreateTodoHandler;
  listTodos: ListTodosHandler;
  getTodo: GetTodoHandler;
  saveTodo: SaveTodoHandler;
  toggleTodo: ToggleTodoHandler;
  deleteTodo: DeleteTodoHandler;
};

/**
 * Initialize handlers on first invocation
 */
async function initializeHandlers(): Promise<void> {
  if (!repository) {
    repository = new DynamoDBTodoRepository();
    await repository.initializeFromDynamoDB();

    handlers = {
      createTodo: new CreateTodoHandler(repository),
      listTodos: new ListTodosHandler(repository),
      getTodo: new GetTodoHandler(repository),
      saveTodo: new SaveTodoHandler(repository),
      toggleTodo: new ToggleTodoHandler(repository),
      deleteTodo: new DeleteTodoHandler(repository),
    };
  }
}

/**
 * Lambda handler function
 */
export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const requestId = event.requestContext.requestId || generateRequestId();

  try {
    // Initialize handlers on first invocation
    await initializeHandlers();

    // Add CORS headers
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "X-Request-ID": requestId,
    };

    // Handle OPTIONS requests (CORS preflight)
    if (event.requestContext.http.method === "OPTIONS") {
      return {
        statusCode: 200,
        headers,
      };
    }

    const method = event.requestContext.http.method;
    let path = event.requestContext.http.path;
    
    // Normalize path by removing stage prefix if present
    const stage = event.requestContext.stage;
    if (stage !== "$default" && path.startsWith(`/${stage}`)) {
      path = path.substring(stage.length + 1);
      if (!path.startsWith("/")) {
        path = `/${path}`;
      }
    }

    const requestBody = event.body ? JSON.parse(event.body) : null;

    let response: unknown;
    let statusCode = 200;

    // Health check
    if (method === "GET" && path === "/health") {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ status: "ok" }),
      };
    }

    // Route to appropriate handler
    if (method === "POST" && path === "/todos") {
      // Create todo
      const { title } = requestBody;
      response = await handlers.createTodo.execute(title);
      statusCode = 201;
    } else if (method === "GET" && path === "/todos") {
      // List todos
      const limit = event.queryStringParameters?.limit
        ? Number.parseInt(event.queryStringParameters.limit)
        : undefined;
      const cursor = event.queryStringParameters?.cursor;
      response = await handlers.listTodos.execute({ limit, cursor });
    } else if (method === "GET" && path.match(/^\/todos\/[^/]+$/) && !path.endsWith("/toggle")) {
      // Get single todo
      const id = path.split("/")[2];
      if (id) {
        response = await handlers.getTodo.execute(id);
      }
    } else if (method === "PUT" && path.match(/^\/todos\/[^/]+$/)) {
      // Update todo (SaveTodo)
      const id = path.split("/")[2];
      if (id) {
        const request = { ...requestBody, id };
        response = await handlers.saveTodo.execute(request);
      }
    } else if (method === "PUT" && path.match(/^\/todos\/[^/]+\/toggle$/)) {
      // Toggle todo
      const id = path.split("/")[2];
      if (id) {
        response = await handlers.toggleTodo.execute(id);
      }
    } else if (method === "DELETE" && path.match(/^\/todos\/[^/]+$/) && !path.endsWith("/toggle")) {
      // Delete todo
      const id = path.split("/")[2];
      if (id) {
        await handlers.deleteTodo.execute(id);
        response = { success: true, id };
      }
    } else {
      // Not found
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          status: 404,
          code: "NOT_FOUND",
          message: "Endpoint not found",
          timestamp: new Date().toISOString(),
          requestId,
        } as ErrorResponseDTO),
      };
    }

    // Return successful response
    return {
      statusCode,
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: statusCode,
        data: response,
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      } as ApiResponseDTO<unknown>),
    };
  } catch (error) {
    // Handle errors
    const statusCode = isAppError(error) ? (error as AppError).statusCode : 500;
    const code = isAppError(error) ? (error as AppError).code : "INTERNAL_ERROR";
    const message = error instanceof Error ? error.message : String(error);

    console.error(`Lambda error [${requestId}]:`, {
      statusCode,
      code,
      message,
      error,
    });

    return {
      statusCode,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
        "X-Request-ID": requestId,
      },
      body: JSON.stringify({
        status: statusCode,
        code,
        message,
        timestamp: new Date().toISOString(),
        requestId,
      } as ErrorResponseDTO),
    };
  }
}

/**
 * Generate request ID for tracing
 */
function generateRequestId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}
