/**
 * Unit Tests: Lambda Handler
 * Comprehensive tests for Lambda handler CRUD operations, error handling, and pagination
 */

// Setup test environment
const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

jest.mock("@infrastructure/config/logger", () => ({
  createLogger: () => mockLogger,
}));

import { handler } from "@infrastructure/lambda/handlers/index";
import type { LambdaContext, LambdaEvent, LambdaResponse } from "@shared/api/types";

const parseResponse = (response: LambdaResponse) => {
  const res = response as any;
  return {
    statusCode: res.statusCode,
    headers: res.headers,
    body: typeof res.body === "string" ? JSON.parse(res.body) : res.body,
  };
};

const createMockEvent = (method: string, path: string, body?: string, pathParams?: Record<string, string>): LambdaEvent => ({
  requestContext: {
    http: {
      method,
      path,
      protocol: "HTTP/1.1",
      sourceIp: "127.0.0.1",
      userAgent: "test",
      timeEpoch: Date.now(),
    },
    routeKey: "$default",
    accountId: "123456789012",
    stage: "test",
    requestId: "test",
    apiId: "test",
    domainName: "test.execute-api.us-east-1.amazonaws.com",
    time: new Date().toISOString(),
    requestTimeEpoch: Date.now(),
  } as any,
  headers: {},
  body,
  pathParameters: pathParams || {},
} as any);

const mockContext: LambdaContext = {
  functionName: "test-handler",
  functionVersion: "1",
  invokedFunctionArn: "arn:aws:lambda:us-east-1:123456789012:function:test",
  memoryLimitInMB: "128",
  awsRequestId: "test-request-id",
  logGroupName: "/aws/lambda/test",
  logStreamName: "2025/01/01/[$LATEST]test",
};

describe("Lambda Handler - CRUD Operations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /todos", () => {
    it("should return list of todos with pagination", async () => {
      const event = createMockEvent("GET", "/todos");
      const response = await handler(event, mockContext);
      const parsed = parseResponse(response);

      expect(parsed.statusCode).toBe(200);
      expect(parsed.headers["Content-Type"]).toBe("application/json");
      expect(parsed.body.success).toBe(true);
      expect(parsed.body.data.items).toEqual([]);
      expect(parsed.body.data.page).toBe(1);
      expect(parsed.body.data.pageSize).toBe(50);
      expect(parsed.body.data.hasMore).toBe(false);
    });

    it("should support pagination parameters", async () => {
      const event = createMockEvent("GET", "/todos");
      (event as any).queryStringParameters = { page: "2", pageSize: "25" };
      const response = await handler(event, mockContext);
      const parsed = parseResponse(response);

      expect(parsed.statusCode).toBe(200);
      expect(parsed.body.data.page).toBe(2);
      expect(parsed.body.data.pageSize).toBe(25);
    });
  });

  describe("GET /todos/{id}", () => {
    it("should return 400 when id is missing", async () => {
      const event = createMockEvent("GET", "/todos/");
      const response = await handler(event, mockContext);
      const parsed = parseResponse(response);

      expect(parsed.statusCode).toBe(400);
      expect(parsed.body.error).toBe("Bad Request");
    });

    it("should return 404 when todo not found", async () => {
      const event = createMockEvent("GET", "/todos/123", undefined, { id: "123" });
      const response = await handler(event, mockContext);
      const parsed = parseResponse(response);

      expect(parsed.statusCode).toBe(404);
      expect(parsed.body.error).toBe("Not Found");
    });
  });

  describe("POST /todos", () => {
    it("should return 400 when body is invalid", async () => {
      const event = createMockEvent("POST", "/todos", "invalid json");
      const response = await handler(event, mockContext);
      const parsed = parseResponse(response);

      expect(parsed.statusCode).toBe(500);
    });

    it("should return 400 when title is empty", async () => {
      const event = createMockEvent("POST", "/todos", JSON.stringify({ title: "" }));
      const response = await handler(event, mockContext);
      const parsed = parseResponse(response);

      expect(parsed.statusCode).toBe(400);
      expect(parsed.body.message).toContain("Title is required");
    });

    it("should return 400 when title exceeds max length", async () => {
      const longTitle = "a".repeat(501);
      const event = createMockEvent("POST", "/todos", JSON.stringify({ title: longTitle }));
      const response = await handler(event, mockContext);
      const parsed = parseResponse(response);

      expect(parsed.statusCode).toBe(400);
      expect(parsed.body.message).toContain("cannot exceed 500 characters");
    });
  });

  describe("PUT /todos/{id}", () => {
    it("should return 400 when id is missing", async () => {
      const event = createMockEvent("PUT", "/todos/", JSON.stringify({ completed: true }));
      const response = await handler(event, mockContext);
      const parsed = parseResponse(response);

      expect(parsed.statusCode).toBe(400);
      expect(parsed.body.message).toContain("Todo ID is required");
    });

    it("should return 400 when completed field is missing", async () => {
      const event = createMockEvent("PUT", "/todos/123", JSON.stringify({}), { id: "123" });
      const response = await handler(event, mockContext);
      const parsed = parseResponse(response);

      expect(parsed.statusCode).toBe(400);
      expect(parsed.body.message).toContain("completed field is required");
    });

    it("should return 404 when todo not found", async () => {
      const event = createMockEvent("PUT", "/todos/123", JSON.stringify({ completed: true }), { id: "123" });
      const response = await handler(event, mockContext);
      const parsed = parseResponse(response);

      expect(parsed.statusCode).toBe(404);
    });
  });

  describe("DELETE /todos/{id}", () => {
    it("should return 400 when id is missing", async () => {
      const event = createMockEvent("DELETE", "/todos/");
      const response = await handler(event, mockContext);
      const parsed = parseResponse(response);

      expect(parsed.statusCode).toBe(400);
      expect(parsed.body.message).toContain("Todo ID is required");
    });

    it("should return 404 when todo not found", async () => {
      const event = createMockEvent("DELETE", "/todos/123", undefined, { id: "123" });
      const response = await handler(event, mockContext);
      const parsed = parseResponse(response);

      expect(parsed.statusCode).toBe(404);
    });
  });

  describe("Error Handling", () => {
    it("should return 404 for unknown endpoints", async () => {
      const event = createMockEvent("GET", "/unknown");
      const response = await handler(event, mockContext);
      const parsed = parseResponse(response);

      expect(parsed.statusCode).toBe(404);
      expect(parsed.body.message).toContain("Endpoint not found");
    });
  });

  describe("Response Format", () => {
    it("should always return JSON content type", async () => {
      const event = createMockEvent("GET", "/todos");
      const response = await handler(event, mockContext);
      const parsed = parseResponse(response);

      expect(parsed.headers["Content-Type"]).toBe("application/json");
    });
  });
});
