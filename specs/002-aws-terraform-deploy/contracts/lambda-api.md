# Contract: Lambda API

**Feature**: AWS上でTerraformを利用してTodo アプリケーションをデプロイするための準備  
**Feature Branch**: `002-aws-terraform-deploy`  
**Created**: 2025-11-22  
**Type**: Lambda Function Interface Contract

---

## 1. Overview

Lambda 関数の入出力インターフェース、実行環境、ハンドラーシグネチャの仕様。

### Purpose
- Lambda ハンドラー関数の標準化
- HTTP API Gateway との統合契約
- 環境変数とランタイム設定

### Scope
- Node.js 18.x Runtime
- HTTP API Gateway v2 統合
- TypeScript/JavaScript ハンドラー

---

## 2. Handler Function Signature

### 2.1 Event Type (API Gateway HTTP)

```typescript
// AWS SDK v3 types
import { APIGatewayProxyEventV2 } from 'aws-lambda';

interface APIGatewayProxyEventV2 {
  version: "2.0";
  routeKey: string;              // "$default" | "POST /todos" | "GET /todos/{id}"
  rawPath: string;               // "/todos" or "/todos/123"
  rawQueryString: string;        // "limit=10&offset=0" or ""
  headers: Record<string, string>;
  requestContext: {
    http: {
      method: "GET" | "POST" | "PUT" | "DELETE";
      path: string;
      protocol: "HTTP/1.1" | "HTTP/2.0";
      sourceIp: string;
      userAgent: string;
    };
    routeKey: string;
    stage: string;               // "$default"
    requestId: string;
    accountId: string;
    apiId: string;
    domainName: string;
    domainPrefix: string;
    requestTime: string;         // Unix timestamp (ms)
    timeEpoch: number;           // Unix timestamp (ms)
  };
  queryStringParameters?: Record<string, string>;
  pathParameters?: Record<string, string>;
  body?: string;                 // JSON string (POST/PUT)
  isBase64Encoded: boolean;
}
```

### 2.2 Response Type (API Gateway HTTP)

```typescript
interface APIGatewayProxyResultV2 {
  statusCode: number;            // 200, 201, 400, 404, 500 etc
  headers?: Record<string, string>;
  body: string;                  // JSON string
  isBase64Encoded?: boolean;
  cookies?: string[];
}
```

### 2.3 Handler Signature

```typescript
export const handler = async (
  event: APIGatewayProxyEventV2,
  context: Context
): Promise<APIGatewayProxyResultV2> => {
  console.log(`[${context.functionName}] Received request:`, {
    method: event.requestContext.http.method,
    path: event.rawPath,
    requestId: event.requestContext.requestId
  });
  
  try {
    // Route handling logic
    const method = event.requestContext.http.method;
    const path = event.rawPath;
    
    if (method === "GET" && path === "/todos") {
      return await getTodos(event);
    } else if (method === "POST" && path === "/todos") {
      return await createTodo(event);
    } else if (method === "GET" && path.startsWith("/todos/")) {
      return await getTodoById(event);
    } else if (method === "PUT" && path.startsWith("/todos/")) {
      return await updateTodo(event);
    } else if (method === "DELETE" && path.startsWith("/todos/")) {
      return await deleteTodo(event);
    } else {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Not found" })
      };
    }
  } catch (error) {
    console.error("[Error]", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" })
    };
  }
};
```

---

## 3. Lambda Context

### 3.1 Execution Context

```typescript
interface Context {
  functionName: string;          // "todo-copilot-api-prod"
  functionVersion: string;       // "$LATEST" or version number
  invokeId: string;              // Unique invocation ID
  memoryLimitInMB: string;       // "1024"
  awsRequestId: string;          // AWS request ID
  logGroupName: string;          // "/aws/lambda/todo-copilot-api-prod"
  logStreamName: string;         // "2025/11/22/[$LATEST]xxxxx"
  identity: {
    cognitoIdentityPoolId: null;
    cognitoIdentityId: null;
    accountId: string;           // AWS Account ID
    caller: string;              // IAM role ARN
    sourceIp: string;            // Client IP
  };
  getRemainingTimeInMillis(): number; // Milliseconds remaining
}
```

### 3.2 Execution Timeout

```
- Configured timeout: 300 seconds (production)
- API Gateway timeout: 29 seconds (hard limit)
- Effective timeout: min(300, 29) = 29 seconds

Lambda function must complete before 29s:
- Lambda cold start: 100-200ms
- Handler logic: <28s
- Warm start: 5-20ms (subsequent invocations)
```

---

## 4. Environment Variables

### 4.1 Lambda Environment Configuration

Terraform によって注入される環境変数。

```hcl
# Terraform: modules/compute/lambda.tf

environment {
  variables = {
    ENVIRONMENT              = var.environment          # "prod"
    AWS_REGION              = var.aws_region            # "ap-northeast-1"
    DYNAMODB_TABLE          = aws_dynamodb_table.todos.name
    LOG_LEVEL               = var.environment == "prod" ? "INFO" : "DEBUG"
    API_VERSION             = "v1"
    NODE_ENV                = "production"
  }
}
```

### 4.2 Access in Lambda

```typescript
// Environment variables access
const environment = process.env.ENVIRONMENT || 'dev';
const dynamodbTableName = process.env.DYNAMODB_TABLE!;
const logLevel = process.env.LOG_LEVEL || 'INFO';

if (!dynamodbTableName) {
  throw new Error('DYNAMODB_TABLE environment variable is required');
}

logger.setLevel(logLevel);
```

---

## 5. API Endpoints Specification

### 5.1 GET /todos (Get All Todos)

#### Request
```bash
GET /todos?limit=10&offset=0 HTTP/1.1
Host: api.example.com
Authorization: Bearer TOKEN
```

#### Request Headers
```
Content-Type: application/json
Authorization: Bearer <token>
Accept: application/json
```

#### Query Parameters
```
limit: number (optional, default: 20, max: 100)
offset: number (optional, default: 0)
status: "completed" | "pending" (optional)
```

#### Lambda Handler Code
```typescript
async function getTodos(event: APIGatewayProxyEventV2) {
  const queryParams = event.queryStringParameters || {};
  const limit = Math.min(parseInt(queryParams.limit || '20'), 100);
  const offset = parseInt(queryParams.offset || '0');
  const status = queryParams.status; // "completed" | "pending"
  
  try {
    const dynamodb = new DynamoDBClient({ region: process.env.AWS_REGION });
    
    const params = {
      TableName: process.env.DYNAMODB_TABLE!,
      Limit: limit,
      ScanIndexForward: false // 新しい順
    };
    
    const command = new ScanCommand(params);
    const response = await dynamodb.send(command);
    
    let items = response.Items || [];
    if (status) {
      items = items.filter(item => 
        (status === 'completed' && item.completed) ||
        (status === 'pending' && !item.completed)
      );
    }
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: items.slice(offset, offset + limit),
        total: items.length,
        limit,
        offset
      })
    };
  } catch (error) {
    logger.error('Error fetching todos', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch todos' })
    };
  }
}
```

#### Response (200 OK)
```json
{
  "items": [
    {
      "id": "uuid-1",
      "userId": "user-1",
      "title": "Buy milk",
      "completed": true,
      "createdAt": "2025-11-22T10:00:00Z",
      "updatedAt": "2025-11-22T10:30:00Z",
      "completedAt": "2025-11-22T10:30:00Z"
    },
    {
      "id": "uuid-2",
      "userId": "user-1",
      "title": "Fix bug",
      "completed": false,
      "createdAt": "2025-11-22T09:00:00Z",
      "updatedAt": "2025-11-22T09:00:00Z"
    }
  ],
  "total": 2,
  "limit": 20,
  "offset": 0
}
```

---

### 5.2 POST /todos (Create Todo)

#### Request
```bash
POST /todos HTTP/1.1
Host: api.example.com
Content-Type: application/json

{
  "title": "Buy milk",
  "description": "2% milk from supermarket",
  "priority": "high"
}
```

#### Request Body Schema
```typescript
interface CreateTodoRequest {
  title: string;                 // 必須, 1-255 chars
  description?: string;          // 0-1000 chars
  priority?: "low" | "medium" | "high";
  tags?: string[];               // 0-10 items
}
```

#### Lambda Handler Code
```typescript
async function createTodo(event: APIGatewayProxyEventV2) {
  try {
    const body = JSON.parse(event.body || '{}');
    const { title, description, priority, tags } = body;
    
    // Validation
    if (!title || title.length > 255) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'title is required and must be <= 255 chars' })
      };
    }
    
    const todo = {
      id: generateUUID(),
      userId: 'user-1', // In real app, extract from JWT
      title,
      description: description || '',
      priority: priority || 'medium',
      completed: false,
      tags: tags || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const dynamodb = new DynamoDBClient({ region: process.env.AWS_REGION });
    await dynamodb.send(new PutCommand({
      TableName: process.env.DYNAMODB_TABLE!,
      Item: todo
    }));
    
    return {
      statusCode: 201,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(todo)
    };
  } catch (error) {
    logger.error('Error creating todo', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to create todo' })
    };
  }
}
```

#### Response (201 Created)
```json
{
  "id": "uuid-3",
  "userId": "user-1",
  "title": "Buy milk",
  "description": "2% milk from supermarket",
  "priority": "high",
  "completed": false,
  "tags": [],
  "createdAt": "2025-11-22T10:35:00Z",
  "updatedAt": "2025-11-22T10:35:00Z"
}
```

---

### 5.3 GET /todos/{id} (Get Todo)

#### Request
```bash
GET /todos/uuid-1 HTTP/1.1
Host: api.example.com
```

#### Lambda Handler Code
```typescript
async function getTodoById(event: APIGatewayProxyEventV2) {
  const id = event.pathParameters?.id;
  
  if (!id) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'id is required' })
    };
  }
  
  try {
    const dynamodb = new DynamoDBClient({ region: process.env.AWS_REGION });
    const response = await dynamodb.send(new GetCommand({
      TableName: process.env.DYNAMODB_TABLE!,
      Key: { id }
    }));
    
    if (!response.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Todo not found' })
      };
    }
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(response.Item)
    };
  } catch (error) {
    logger.error('Error fetching todo', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch todo' })
    };
  }
}
```

#### Response (200 OK)
```json
{
  "id": "uuid-1",
  "userId": "user-1",
  "title": "Buy milk",
  "description": "2% milk from supermarket",
  "completed": true,
  "createdAt": "2025-11-22T10:00:00Z",
  "updatedAt": "2025-11-22T10:30:00Z",
  "completedAt": "2025-11-22T10:30:00Z"
}
```

---

### 5.4 PUT /todos/{id} (Update Todo)

#### Request
```bash
PUT /todos/uuid-1 HTTP/1.1
Host: api.example.com
Content-Type: application/json

{
  "title": "Buy milk (updated)",
  "completed": true
}
```

#### Request Body Schema
```typescript
interface UpdateTodoRequest {
  title?: string;
  description?: string;
  completed?: boolean;
  priority?: "low" | "medium" | "high";
  tags?: string[];
}
```

#### Response (200 OK)
```json
{
  "id": "uuid-1",
  "userId": "user-1",
  "title": "Buy milk (updated)",
  "description": "2% milk from supermarket",
  "completed": true,
  "createdAt": "2025-11-22T10:00:00Z",
  "updatedAt": "2025-11-22T10:35:00Z",
  "completedAt": "2025-11-22T10:35:00Z"
}
```

---

### 5.5 DELETE /todos/{id} (Delete Todo)

#### Request
```bash
DELETE /todos/uuid-1 HTTP/1.1
Host: api.example.com
```

#### Response (204 No Content)
```
Status: 204 No Content
Body: (empty)
```

---

## 6. Error Responses

### 6.1 HTTP Status Codes

| Status | Meaning | Use Case |
|--------|---------|----------|
| 200 | OK | GET succeeded |
| 201 | Created | POST succeeded |
| 204 | No Content | DELETE succeeded |
| 400 | Bad Request | Invalid input validation |
| 404 | Not Found | Resource doesn't exist |
| 500 | Server Error | Unexpected error |
| 502 | Bad Gateway | Lambda function crash |
| 503 | Service Unavailable | DynamoDB throttled |

### 6.2 Error Response Format

```json
{
  "error": "Invalid todo title",
  "code": "VALIDATION_ERROR",
  "details": {
    "field": "title",
    "message": "title must be 1-255 characters"
  }
}
```

---

## 7. Logging

### 7.1 Structured Logging

```typescript
import { Logger } from 'winston';

const logger = createLogger({
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()
  ),
  transports: [
    new transports.Console()
  ]
});

// Usage in handler
logger.info('Request received', {
  requestId: event.requestContext.requestId,
  method: event.requestContext.http.method,
  path: event.rawPath,
  timestamp: new Date().toISOString()
});

// Error logging
logger.error('DynamoDB error', {
  requestId: event.requestContext.requestId,
  error: error.message,
  stack: error.stack
});
```

### 7.1 Log Output Format (CloudWatch)

```
{
  "timestamp": "2025-11-22T10:35:00.123Z",
  "level": "info",
  "message": "Request received",
  "requestId": "abc123",
  "method": "POST",
  "path": "/todos",
  "functionName": "todo-copilot-api-prod"
}
```

---

## 8. Performance Targets

### 8.1 Response Time SLA

| Operation | Target | Environment |
|-----------|--------|-------------|
| GET /todos | < 500ms | prod |
| POST /todos | < 1000ms | prod |
| GET /todos/{id} | < 300ms | prod |
| PUT /todos/{id} | < 1000ms | prod |
| DELETE /todos/{id} | < 500ms | prod |

### 8.2 Cold Start Mitigation

```
Strategies:
1. Provisioned Concurrency (prod only)
   - Keep 2-3 instances warm
   - Cost: ~$0.015/hour per instance

2. Scheduled Warm-up (all environments)
   - CloudWatch Events trigger every 5 minutes
   - Minimal function: 100ms execution

3. Code Optimization
   - Tree-shaking, minification via esbuild
   - Reduce bundle size to <50MB
```

---

**Version**: 1.0  
**Last Updated**: 2025-11-22  
**Next Contract**: AWS Resource Specification (T012)
