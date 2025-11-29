/**
 * Shared types for Lambda API integration
 * Defines DTOs and response formats for the REST API
 */

import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";

/**
 * Unified API response format for all Lambda endpoints
 * Ensures consistent response structure across all operations
 */
export interface ApiResponse<T = unknown> {
  statusCode: number;
  body: {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
  };
}

/**
 * Todo data transfer object for API responses
 * Minimal serializable representation of Todo domain entity
 */
export interface SubtaskDTO {
  id: string;
  title: string;
  completed: boolean;
}

export interface TodoDTO {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string; // ISO 8601 timestamp
  updatedAt: string; // ISO 8601 timestamp
  subtasks: SubtaskDTO[];
}

/**
 * Paginated list response for get todos endpoint
 */
export interface TodoListResponse {
  items: TodoDTO[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/**
 * Create todo request payload
 */
export interface CreateTodoRequest {
  title: string;
}

/**
 * Update todo request payload
 */
export interface UpdateTodoRequest {
  completed?: boolean;
}

/**
 * Lambda handler event type (alias for clarity)
 */
export type LambdaEvent = APIGatewayProxyEventV2;

/**
 * Lambda handler context type
 */
export type LambdaContext = {
  functionName: string;
  functionVersion: string;
  invokedFunctionArn: string;
  memoryLimitInMB: string;
  awsRequestId: string;
  logGroupName: string;
  logStreamName: string;
  callbackWaitsForEmptyEventLoop?: boolean;
};

/**
 * Lambda handler return type
 */
export type LambdaResponse = APIGatewayProxyResultV2;

/**
 * Utility function to extract path parameters from Lambda event
 */
export function getPathParameter(event: LambdaEvent, paramName: string): string | undefined {
  return event.pathParameters?.[paramName];
}

/**
 * Utility function to extract query parameters from Lambda event
 */
export function getQueryParameter(event: LambdaEvent, paramName: string): string | undefined {
  return event.queryStringParameters?.[paramName];
}

/**
 * Utility function to parse request body
 */
export function parseBody<T>(body: string | undefined): T {
  if (!body) {
    throw new Error("Request body is required");
  }
  try {
    return JSON.parse(body) as T;
  } catch (error) {
    throw new Error(
      `Failed to parse request body: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Create a successful API response
 */
export function createSuccessResponse<T>(statusCode: number, data: T): ApiResponse<T> {
  return {
    statusCode,
    body: {
      success: true,
      data,
    },
  };
}

/**
 * Create an error API response
 */
export function createErrorResponse(
  statusCode: number,
  error: string,
  message?: string
): ApiResponse {
  return {
    statusCode,
    body: {
      success: false,
      error,
      message,
    },
  };
}
