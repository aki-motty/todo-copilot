# Data Model: Add Task Tags

## Entities

### Todo (Aggregate Root)

Updated to include `tags`.

```typescript
interface Todo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
  subtasks: Subtask[];
  tags: string[]; // New field
}
```

### Tag (Value Object)

Conceptually a Value Object, implemented as a string constrained to a specific set.

```typescript
type TagName = "Summary" | "Research" | "Split";

const ALLOWED_TAGS: TagName[] = ["Summary", "Research", "Split"];
```

## API Contracts

### 1. Get Available Tags

**Endpoint**: `GET /tags`

**Response**: `200 OK`
```json
{
  "tags": ["Summary", "Research", "Split"]
}
```

### 2. Add Tag to Todo

**Endpoint**: `POST /todos/{id}/tags`

**Request Body**:
```json
{
  "name": "Research"
}
```

**Response**: `201 Created`
```json
{
  "id": "todo-123",
  "tags": ["Research"]
}
```

**Error Responses**:
- `400 Bad Request`: If tag name is invalid or not in allowed list.
- `404 Not Found`: If Todo ID does not exist.
- `409 Conflict`: If tag already exists on the Todo (optional, or treat as success).

### 3. Remove Tag from Todo

**Endpoint**: `DELETE /todos/{id}/tags/{tagName}`

**Response**: `200 OK`
```json
{
  "id": "todo-123",
  "tags": []
}
```

**Error Responses**:
- `404 Not Found`: If Todo ID does not exist.
