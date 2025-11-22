# REST API Specification: Todo List

**Specification**: OpenAPI 3.0.0  
**Version**: 1.0.0  
**Date**: 2025-11-22

---

## Overview

クライアント側（React/Vanilla JS）がローカルストレージを通じてToDoデータを管理するAPI。初版はブラウザのみでのオペレーション想定。将来的にはバックエンド API（Lambda/DynamoDB）に移行する際に拡張予定。

---

## API Endpoints

### 1. Create Todo

**Endpoint**: `POST /api/todos`  
**Handler**: `CreateTodoCommandHandler`  
**Aggregate**: `ToDo`

#### Request

```json
{
  "title": "明日の会議"
}
```

#### Response (201 Created)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "title": "明日の会議",
  "completed": false,
  "createdAt": "2025-11-22T10:30:00Z",
  "updatedAt": "2025-11-22T10:30:00Z"
}
```

#### Error Response (400 Bad Request)

```json
{
  "error": "ValidationError",
  "message": "タイトルは1-500文字で入力してください"
}
```

#### Error Response (413 Payload Too Large - Storage Full)

```json
{
  "error": "QuotaExceededError",
  "message": "ストレージ容量が満杯です。不要なToDoを削除してください"
}
```

---

### 2. Get All Todos

**Endpoint**: `GET /api/todos`  
**Handler**: `GetAllTodosQueryHandler`  
**Query Model**: 最適化された読み取りモデル

#### Request

No body

#### Response (200 OK)

```json
{
  "todos": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "title": "明日の会議",
      "completed": false,
      "createdAt": "2025-11-22T10:30:00Z",
      "updatedAt": "2025-11-22T10:30:00Z"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "title": "レポート作成",
      "completed": true,
      "createdAt": "2025-11-22T09:15:00Z",
      "updatedAt": "2025-11-22T14:00:00Z"
    }
  ],
  "count": 2
}
```

#### Response (200 OK - Empty)

```json
{
  "todos": [],
  "count": 0
}
```

---

### 3. Toggle Todo Completion

**Endpoint**: `PATCH /api/todos/{id}/toggle`  
**Handler**: `ToggleTodoCompletionCommandHandler`  
**Aggregate**: `ToDo`

#### Request

```
PATCH /api/todos/550e8400-e29b-41d4-a716-446655440001/toggle
```

No body (状態遷移: 自動トグル)

#### Response (200 OK)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "title": "明日の会議",
  "completed": true,
  "createdAt": "2025-11-22T10:30:00Z",
  "updatedAt": "2025-11-22T14:45:00Z"
}
```

#### Error Response (404 Not Found)

```json
{
  "error": "NotFoundError",
  "message": "指定のToDoが見つかりません"
}
```

---

### 4. Delete Todo

**Endpoint**: `DELETE /api/todos/{id}`  
**Handler**: `DeleteTodoCommandHandler`  
**Aggregate**: `ToDo`

#### Request

```
DELETE /api/todos/550e8400-e29b-41d4-a716-446655440001
```

#### Response (204 No Content)

No body

#### Error Response (404 Not Found)

```json
{
  "error": "NotFoundError",
  "message": "指定のToDoが見つかりません"
}
```

---

## Data Types

### TodoResponse

```typescript
interface TodoResponse {
  id: string;              // UUID
  title: string;           // 1-500文字
  completed: boolean;      // true = Completed, false = Pending
  createdAt: string;       // ISO 8601形式 (e.g., "2025-11-22T10:30:00Z")
  updatedAt: string;       // ISO 8601形式
}
```

### ErrorResponse

```typescript
interface ErrorResponse {
  error: string;           // エラータイプ（ValidationError, QuotaExceededError, NotFoundError）
  message: string;         // ユーザー向けメッセージ
}
```

---

## HTTP Status Codes

| Code | Status | 説明 |
|------|--------|------|
| 200 | OK | リクエスト成功（GET, PATCH） |
| 201 | Created | リソース作成成功（POST） |
| 204 | No Content | リソース削除成功（DELETE） |
| 400 | Bad Request | バリデーションエラー（タイトル無効など） |
| 404 | Not Found | リソースが存在しない（指定ToDoなし） |
| 413 | Payload Too Large | ストレージ容量超過 |
| 500 | Internal Server Error | 予期しないエラー |

---

## Request/Response Headers

### Request

```
Content-Type: application/json
```

### Response

```
Content-Type: application/json
Cache-Control: no-cache
```

---

## Validation Rules

### CreateTodo Request

```
title:
  - 必須: true
  - 型: string
  - 最小長: 1
  - 最大長: 500
  - パターン: .+ (非空文字列)
```

### Path Parameters

```
id (todos/{id} endpoints):
  - 型: string (UUID v4)
  - パターン: ^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$
```

---

## Error Handling Strategy

### Client-Side Error Handling

| エラー | HTTP Status | 対応 |
|--------|------------|------|
| ValidationError | 400 | ユーザーへ入力エラーメッセージ表示 |
| NotFoundError | 404 | リスト再読み込み・ユーザーへ「削除されました」通知 |
| QuotaExceededError | 413 | ユーザーへ「ストレージがいっぱいです」警告、削除提案 |
| StorageCorruptionError | 500 | ストレージクリア・ユーザーへ「データ初期化」通知 |

---

## Rate Limiting & Performance

**初版**: レート制限なし（クライアント側のみ）

**パフォーマンス目標**:
- Create Todo: < 100ms
- Get All Todos: < 1秒（最大1000個のToDoを想定）
- Toggle Completion: < 100ms
- Delete Todo: < 100ms

---

## Security Considerations

### 初版（クライアント側のみ）

- **XSS対策**: React の自動エスケープ + DOMPurify（オプション）
- **CSRF**: N/A（クライアント側のみ）
- **認証**: 不要（シングルユーザー）
- **HTTPS**: N/A（ローカルストレージ）

### 将来的（バックエンド統合時）

- **認証**: OAuth 2.0（Google ToDo API連携用）
- **HTTPS**: 必須
- **CSRF Token**: API エンドポイント実装時
- **レート制限**: 100 req/min（ユーザーあたり）

---

## OpenAPI YAML

```yaml
openapi: 3.0.0
info:
  title: Todo List API
  version: 1.0.0
  description: シンプルなToDoリスト管理API

servers:
  - url: /api
    description: API Base URL

paths:
  /todos:
    post:
      summary: 新しいToDoを作成
      operationId: createTodo
      tags:
        - Todos
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - title
              properties:
                title:
                  type: string
                  minLength: 1
                  maxLength: 500
                  description: ToDoのタイトル
      responses:
        '201':
          description: ToDoが作成されました
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TodoResponse'
        '400':
          description: バリデーションエラー
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '413':
          description: ストレージ容量超過
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

    get:
      summary: すべてのToDoを取得
      operationId: getAllTodos
      tags:
        - Todos
      responses:
        '200':
          description: ToDoリスト
          content:
            application/json:
              schema:
                type: object
                properties:
                  todos:
                    type: array
                    items:
                      $ref: '#/components/schemas/TodoResponse'
                  count:
                    type: integer
                    description: ToDoの総数

  /todos/{id}/toggle:
    patch:
      summary: ToDoの完了状態を切り替え
      operationId: toggleTodoCompletion
      tags:
        - Todos
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
            description: Todo ID
      responses:
        '200':
          description: 状態が更新されました
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TodoResponse'
        '404':
          description: ToDoが見つかりません
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /todos/{id}:
    delete:
      summary: ToDoを削除
      operationId: deleteTodo
      tags:
        - Todos
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
            description: Todo ID
      responses:
        '204':
          description: 削除されました
        '404':
          description: ToDoが見つかりません
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

components:
  schemas:
    TodoResponse:
      type: object
      required:
        - id
        - title
        - completed
        - createdAt
        - updatedAt
      properties:
        id:
          type: string
          format: uuid
          description: 一意のID
        title:
          type: string
          minLength: 1
          maxLength: 500
          description: ToDoのタイトル
        completed:
          type: boolean
          description: 完了状態
        createdAt:
          type: string
          format: date-time
          description: 作成時刻
        updatedAt:
          type: string
          format: date-time
          description: 最終更新時刻

    ErrorResponse:
      type: object
      required:
        - error
        - message
      properties:
        error:
          type: string
          enum:
            - ValidationError
            - NotFoundError
            - QuotaExceededError
            - InternalServerError
          description: エラータイプ
        message:
          type: string
          description: ユーザー向けメッセージ
```

---

## Contract Testing

### CreateTodo Contract Test

```typescript
describe('CreateTodo API Contract', () => {
  it('should create a todo with valid title', async () => {
    const request = { title: '明日の会議' };
    const response = await createTodo(request);
    
    expect(response.status).toBe(201);
    expect(response.body).toMatchSchema(TodoResponseSchema);
    expect(response.body.title).toBe('明日の会議');
    expect(response.body.completed).toBe(false);
  });

  it('should reject empty title', async () => {
    const request = { title: '' };
    const response = await createTodo(request);
    
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('ValidationError');
  });
});
```

---

## Future Extensions

### Google Todo API Integration

```
Sync Strategy:
  1. Create (local) → Push to Google Todo
  2. Update (local) → Patch Google Todo
  3. Delete (local) → Delete from Google Todo
  4. Conflict Resolution: Last-Write-Wins + User Override
```

### Multi-User Support

```
Authentication: OAuth 2.0
Authorization: User-scoped Todo access
Backend: Lambda + DynamoDB (Terraform IaC)
```
