/**
 * Lambda 統合テスト - Description Endpoint
 *
 * PUT /todos/{id}/description エンドポイントの統合テストを実行します。
 * 以下をテストします：
 * - description の更新
 * - 空の description の設定
 * - 存在しない Todo への description 更新
 * - 長すぎる description のバリデーション
 *
 * ⚠️ NOTE: LocalStack または実 AWS が必要なため、開発環境ではスキップされます
 */

import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { handler } from "../../src/infrastructure/lambda/handlers/index";

// AWS 環境が利用可能かどうかを判定
const hasAWSEnvironment = () => {
  const hasLocalStack = !!process.env["LOCALSTACK_ENDPOINT"];
  const hasAWSCredentials =
    !!process.env["AWS_ACCESS_KEY_ID"] && !!process.env["AWS_SECRET_ACCESS_KEY"];
  return hasLocalStack || hasAWSCredentials;
};

// AWS環境が利用不可の場合はスキップ
const describeIfAWSAvailable = hasAWSEnvironment() ? describe : describe.skip;

/**
 * APIGatewayProxyEventV2 のモックを作成するヘルパー
 */
function createMockEvent(
  method: string,
  path: string,
  body?: Record<string, unknown>,
  pathParameters?: Record<string, string>,
  queryStringParameters?: Record<string, string>
): APIGatewayProxyEventV2 {
  return {
    version: "2.0",
    routeKey: `${method} ${path}`,
    rawPath: path,
    rawQueryString: "",
    headers: {
      "content-type": "application/json",
    },
    requestContext: {
      accountId: "123456789012",
      apiId: "test-api",
      domainName: "test.execute-api.us-east-1.amazonaws.com",
      domainPrefix: "test",
      http: {
        method,
        path,
        protocol: "HTTP/1.1",
        sourceIp: "127.0.0.1",
        userAgent: "test-agent",
      },
      requestId: `test-request-${Date.now()}`,
      routeKey: `${method} ${path}`,
      stage: "$default",
      time: new Date().toISOString(),
      timeEpoch: Date.now(),
    },
    pathParameters,
    queryStringParameters,
    body: body ? JSON.stringify(body) : undefined,
    isBase64Encoded: false,
  };
}

/**
 * レスポンスボディをパースするヘルパー
 */
function parseResponseBody<T>(response: APIGatewayProxyResultV2): T {
  if (typeof response === "object" && response !== null && "body" in response) {
    return JSON.parse((response as { body: string }).body);
  }
  throw new Error("Response does not have a body");
}

// メインのテストスイートはAWS/LocalStack環境でのみ実行
describeIfAWSAvailable("Lambda Description Endpoint Integration Tests", () => {
  let testTodoId: string;

  /**
   * テスト前に Todo を作成
   */
  beforeEach(async () => {
    // Create a todo for testing
    const createEvent = createMockEvent("POST", "/todos", {
      title: `Test Todo for Description ${Date.now()}`,
    });
    const createResponse = await handler(createEvent);
    const createBody = parseResponseBody<{ data: { id: string } }>(createResponse);
    testTodoId = createBody.data.id;
  });

  /**
   * テスト後にクリーンアップ
   */
  afterEach(async () => {
    if (testTodoId) {
      const deleteEvent = createMockEvent("DELETE", `/todos/${testTodoId}`);
      await handler(deleteEvent);
    }
  });

  describe("PUT /todos/{id}/description", () => {
    it("should update description successfully", async () => {
      // Arrange
      const description = "This is a **markdown** description with:\n- Item 1\n- Item 2";
      const event = createMockEvent("PUT", `/todos/${testTodoId}/description`, {
        description,
      });

      // Act
      const response = await handler(event);
      const body = parseResponseBody<{
        status: number;
        data: { id: string; description: string };
      }>(response);

      // Assert
      expect(response).toHaveProperty("statusCode", 200);
      expect(body.status).toBe(200);
      expect(body.data.id).toBe(testTodoId);
      expect(body.data.description).toBe(description);
    });

    it("should allow empty description", async () => {
      // Arrange - First set a description
      const setEvent = createMockEvent("PUT", `/todos/${testTodoId}/description`, {
        description: "Initial description",
      });
      await handler(setEvent);

      // Act - Clear the description
      const clearEvent = createMockEvent("PUT", `/todos/${testTodoId}/description`, {
        description: "",
      });
      const response = await handler(clearEvent);
      const body = parseResponseBody<{
        status: number;
        data: { id: string; description: string };
      }>(response);

      // Assert
      expect(response).toHaveProperty("statusCode", 200);
      expect(body.data.description).toBe("");
    });

    it("should handle undefined description as empty string", async () => {
      // Arrange - Request without description property
      const event = createMockEvent("PUT", `/todos/${testTodoId}/description`, {});

      // Act
      const response = await handler(event);
      const body = parseResponseBody<{
        status: number;
        data: { id: string; description: string };
      }>(response);

      // Assert
      expect(response).toHaveProperty("statusCode", 200);
      expect(body.data.description).toBe("");
    });

    it("should preserve markdown formatting", async () => {
      // Arrange
      const markdownContent = `# Heading 1

## Heading 2

**Bold text** and *italic text*

\`\`\`typescript
const code = "example";
\`\`\`

- List item 1
- List item 2

1. Ordered item 1
2. Ordered item 2

[Link](https://example.com)

> Blockquote`;

      const event = createMockEvent("PUT", `/todos/${testTodoId}/description`, {
        description: markdownContent,
      });

      // Act
      const response = await handler(event);
      const body = parseResponseBody<{
        status: number;
        data: { id: string; description: string };
      }>(response);

      // Assert
      expect(response).toHaveProperty("statusCode", 200);
      expect(body.data.description).toBe(markdownContent);
    });

    it("should persist description across retrieval", async () => {
      // Arrange
      const description = "Persistent description content";
      const updateEvent = createMockEvent("PUT", `/todos/${testTodoId}/description`, {
        description,
      });
      await handler(updateEvent);

      // Act - Retrieve the todo
      const getEvent = createMockEvent("GET", `/todos/${testTodoId}`);
      const response = await handler(getEvent);
      const body = parseResponseBody<{
        status: number;
        data: { id: string; description: string };
      }>(response);

      // Assert
      expect(response).toHaveProperty("statusCode", 200);
      expect(body.data.description).toBe(description);
    });

    it("should return 404 for non-existent todo", async () => {
      // Arrange
      const nonExistentId = "non-existent-todo-id-12345";
      const event = createMockEvent("PUT", `/todos/${nonExistentId}/description`, {
        description: "Some description",
      });

      // Act
      const response = await handler(event);
      const body = parseResponseBody<{
        status: number;
        code: string;
        message: string;
      }>(response);

      // Assert
      expect(response).toHaveProperty("statusCode", 404);
      expect(body.code).toBe("TODO_NOT_FOUND");
    });

    it("should reject description exceeding maximum length", async () => {
      // Arrange - Create a description that exceeds 10,000 characters
      const longDescription = "x".repeat(10001);
      const event = createMockEvent("PUT", `/todos/${testTodoId}/description`, {
        description: longDescription,
      });

      // Act
      const response = await handler(event);
      const body = parseResponseBody<{
        status: number;
        code: string;
        message: string;
      }>(response);

      // Assert
      expect(response).toHaveProperty("statusCode", 400);
      expect(body.code).toBe("VALIDATION_ERROR");
    });

    it("should accept description at maximum length boundary", async () => {
      // Arrange - Create a description exactly at the 10,000 character limit
      const maxDescription = "x".repeat(10000);
      const event = createMockEvent("PUT", `/todos/${testTodoId}/description`, {
        description: maxDescription,
      });

      // Act
      const response = await handler(event);
      const body = parseResponseBody<{
        status: number;
        data: { id: string; description: string };
      }>(response);

      // Assert
      expect(response).toHaveProperty("statusCode", 200);
      expect(body.data.description.length).toBe(10000);
    });

    it("should include proper meta information in response", async () => {
      // Arrange
      const event = createMockEvent("PUT", `/todos/${testTodoId}/description`, {
        description: "Test description",
      });

      // Act
      const response = await handler(event);
      const body = parseResponseBody<{
        status: number;
        data: unknown;
        meta: { timestamp: string; requestId: string };
      }>(response);

      // Assert
      expect(body.meta).toBeDefined();
      expect(body.meta.timestamp).toBeDefined();
      expect(body.meta.requestId).toBeDefined();
      expect(new Date(body.meta.timestamp).getTime()).toBeLessThanOrEqual(Date.now());
    });
  });

  describe("Description field in other endpoints", () => {
    it("should include description in GET /todos/{id} response", async () => {
      // Arrange - Set description first
      const description = "Description for GET test";
      await handler(
        createMockEvent("PUT", `/todos/${testTodoId}/description`, {
          description,
        })
      );

      // Act
      const event = createMockEvent("GET", `/todos/${testTodoId}`);
      const response = await handler(event);
      const body = parseResponseBody<{
        data: { id: string; description: string };
      }>(response);

      // Assert
      expect(body.data.description).toBe(description);
    });

    it("should include description in GET /todos list response", async () => {
      // Arrange - Set description first
      const description = "Description for list test";
      await handler(
        createMockEvent("PUT", `/todos/${testTodoId}/description`, {
          description,
        })
      );

      // Act
      const event = createMockEvent("GET", "/todos");
      const response = await handler(event);
      const body = parseResponseBody<{
        data: Array<{ id: string; description: string }>;
      }>(response);

      // Assert
      const testTodo = body.data.find((t) => t.id === testTodoId);
      expect(testTodo).toBeDefined();
      expect(testTodo?.description).toBe(description);
    });

    it("should preserve description when toggling todo completion", async () => {
      // Arrange - Set description first
      const description = "Description preserved after toggle";
      await handler(
        createMockEvent("PUT", `/todos/${testTodoId}/description`, {
          description,
        })
      );

      // Act - Toggle the todo
      const toggleEvent = createMockEvent("PUT", `/todos/${testTodoId}/toggle`);
      const toggleResponse = await handler(toggleEvent);
      const body = parseResponseBody<{
        data: { id: string; description: string; completed: boolean };
      }>(toggleResponse);

      // Assert
      expect(body.data.description).toBe(description);
      expect(body.data.completed).toBe(true);
    });

    it("should preserve description when updating todo title", async () => {
      // Arrange - Set description first
      const description = "Description preserved after title update";
      await handler(
        createMockEvent("PUT", `/todos/${testTodoId}/description`, {
          description,
        })
      );

      // Act - Update the todo title
      const updateEvent = createMockEvent("PUT", `/todos/${testTodoId}`, {
        title: "Updated Title",
      });
      const updateResponse = await handler(updateEvent);
      const body = parseResponseBody<{
        data: { id: string; title: string; description: string };
      }>(updateResponse);

      // Assert
      expect(body.data.title).toBe("Updated Title");
      expect(body.data.description).toBe(description);
    });

    it("should include empty description for newly created todos", async () => {
      // Act
      const createEvent = createMockEvent("POST", "/todos", {
        title: "New Todo Without Description",
      });
      const response = await handler(createEvent);
      const body = parseResponseBody<{
        data: { id: string; description: string };
      }>(response);

      // Cleanup
      const newTodoId = body.data.id;

      // Assert
      expect(body.data.description).toBe("");

      // Cleanup
      await handler(createMockEvent("DELETE", `/todos/${newTodoId}`));
    });
  });
});
