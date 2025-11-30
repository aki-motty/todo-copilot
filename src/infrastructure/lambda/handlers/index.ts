/**
 * AWS Lambda handler for Todo API
 * Main entry point for HTTP requests from API Gateway V2
 */

import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import type { ApiResponseDTO, ErrorResponseDTO } from "../../../application/dto/TodoDTO";
import { type AppError, isAppError } from "../../../application/errors/AppError";
import { AddSubtaskHandler } from "../../../application/handlers/AddSubtaskHandler";
import { AddTagHandler } from "../../../application/handlers/AddTagHandler";
import { CreateTodoHandler } from "../../../application/handlers/CreateTodoHandler";
import { DeleteSubtaskHandler } from "../../../application/handlers/DeleteSubtaskHandler";
import { DeleteTodoHandler } from "../../../application/handlers/DeleteTodoHandler";
import { GetTagsHandler } from "../../../application/handlers/GetTagsHandler";
import { GetTodoHandler } from "../../../application/handlers/GetTodoHandler";
import { ListTodosHandler } from "../../../application/handlers/ListTodosHandler";
import { RemoveTagHandler } from "../../../application/handlers/RemoveTagHandler";
import { SaveTodoHandler } from "../../../application/handlers/SaveTodoHandler";
import { ToggleSubtaskHandler } from "../../../application/handlers/ToggleSubtaskHandler";
import { ToggleTodoHandler } from "../../../application/handlers/ToggleTodoHandler";
import { UpdateDescriptionHandler } from "../../../application/handlers/UpdateDescriptionHandler";
import { TodoApplicationService } from "../../../application/services/TodoApplicationService";
import { createLogger } from "../../config/logger";
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
  addSubtask: AddSubtaskHandler;
  toggleSubtask: ToggleSubtaskHandler;
  deleteSubtask: DeleteSubtaskHandler;
  addTag: AddTagHandler;
  getTags: GetTagsHandler;
  removeTag: RemoveTagHandler;
  updateDescription: UpdateDescriptionHandler;
};

/**
 * Initialize handlers on first invocation
 */
async function initializeHandlers(): Promise<void> {
  if (!repository) {
    repository = new DynamoDBTodoRepository();
    await repository.initializeFromDynamoDB();

    const logger = createLogger("TodoApplicationService");
    const service = new TodoApplicationService(repository, logger);

    handlers = {
      createTodo: new CreateTodoHandler(repository),
      listTodos: new ListTodosHandler(repository),
      getTodo: new GetTodoHandler(repository),
      saveTodo: new SaveTodoHandler(repository),
      toggleTodo: new ToggleTodoHandler(repository),
      deleteTodo: new DeleteTodoHandler(repository),
      addSubtask: new AddSubtaskHandler(repository),
      toggleSubtask: new ToggleSubtaskHandler(repository),
      deleteSubtask: new DeleteSubtaskHandler(repository),
      addTag: new AddTagHandler(service),
      getTags: new GetTagsHandler(),
      removeTag: new RemoveTagHandler(service),
      updateDescription: new UpdateDescriptionHandler(repository),
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
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
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
      const limit = event.queryStringParameters?.["limit"]
        ? Number.parseInt(event.queryStringParameters["limit"])
        : undefined;
      const cursor = event.queryStringParameters?.["cursor"];
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
    } else if (method === "POST" && path.match(/^\/todos\/[^/]+\/subtasks$/)) {
      // Add subtask
      const id = path.split("/")[2];
      const { title } = requestBody;
      if (id) {
        response = await handlers.addSubtask.execute(id, title);
        statusCode = 201;
      }
    } else if (method === "PATCH" && path.match(/^\/todos\/[^/]+\/subtasks\/[^/]+$/)) {
      // Toggle subtask
      const parts = path.split("/");
      const todoId = parts[2];
      const subtaskId = parts[4];
      if (todoId && subtaskId) {
        response = await handlers.toggleSubtask.execute(todoId, subtaskId);
      }
    } else if (method === "DELETE" && path.match(/^\/todos\/[^/]+\/subtasks\/[^/]+$/)) {
      // Delete subtask
      const parts = path.split("/");
      const todoId = parts[2];
      const subtaskId = parts[4];
      if (todoId && subtaskId) {
        response = await handlers.deleteSubtask.execute(todoId, subtaskId);
      }
    } else if (method === "GET" && path === "/tags") {
      // Get allowed tags
      const result = await handlers.getTags.handle();
      response = result;
    } else if (method === "POST" && path.match(/^\/todos\/[^/]+\/tags$/)) {
      // Add tag
      const id = path.split("/")[2];
      const { tagName } = requestBody;
      if (id) {
        response = await handlers.addTag.handle({ id, tagName });
        statusCode = 201;
      }
    } else if (method === "DELETE" && path.match(/^\/todos\/[^\/]+\/tags\/[^\/]+$/)) {
      // Remove tag
      const parts = path.split("/");
      const id = parts[2];
      const tagPart = parts[4];
      if (id && tagPart) {
        const tagName = decodeURIComponent(tagPart);
        response = await handlers.removeTag.handle({ id, tagName });
      }
    } else if (method === "PUT" && path.match(/^\/todos\/[^/]+\/description$/)) {
      // Update description
      const id = path.split("/")[2];
      const { description } = requestBody;
      if (id) {
        response = await handlers.updateDescription.execute(id, description || "");
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
