# Data Model: Lambda-Powered Todo Backend

**Date**: 2025-11-23  
**Feature**: 004-lambda-backend  
**Database**: AWS DynamoDB (on-demand billing)

---

## Entity: Todo

**Purpose**: Represents a single todo item with lifecycle tracking

**Partition Key**: `id` (UUID v4)  
**Sort Key**: `createdAt` (ISO 8601 timestamp)

### Attributes

```typescript
{
  // Primary Keys
  id: string                    // UUID v4, auto-generated on create
  createdAt: string            // ISO 8601, e.g., "2025-11-23T12:34:56Z"
  
  // Core Properties
  title: string                // 1-500 characters (TodoTitle value object)
  completed: boolean           // Default: false
  
  // Metadata
  updatedAt: string           // ISO 8601, updated on any modification
  userId?: string             // Future: for multi-user support
  
  // Derived/Calculated (optional)
  completedAt?: string        // ISO 8601, when todo was marked complete
}
```

### Validation Rules

| Field | Constraint | Error Code |
|-------|-----------|-----------|
| `id` | UUID v4 format | INVALID_ID |
| `title` | 1-500 chars, non-empty | INVALID_TITLE |
| `completed` | boolean (true\|false) | INVALID_COMPLETED |
| `createdAt` | ISO 8601 timestamp | INVALID_TIMESTAMP |
| `updatedAt` | ISO 8601 timestamp ≥ createdAt | INVALID_UPDATED_AT |

### Domain Value Objects

**TodoTitle**:
- Immutable string value object
- Enforces 1-500 character constraint
- Implements equality by value (not reference)
- Used in Todo entity constructor

---

## DynamoDB Table Design

### Table: `todo-copilot-{environment}`

| Component | Configuration | Notes |
|-----------|--------------|-------|
| **Partition Key** | `id` (String) | UUID identifies unique todo |
| **Sort Key** | `createdAt` (String) | Enables time-series queries |
| **Billing Mode** | ON_DEMAND | Auto-scales, no provisioning |
| **TTL** | `completedAt` (optional) | Auto-delete after 90 days (configurable) |
| **Streams** | DISABLED | Not needed for current use cases |
| **Encryption** | AWS managed keys | Default DynamoDB encryption |
| **Point-in-time Recovery** | ENABLED | Automatic daily backups |

### Indexes (Optional, for Future Use)

**GSI: userId-createdAt (if multi-user support added)**
```
Partition Key: userId
Sort Key: createdAt
Projection: ALL
```
Enables queries: "Get all todos for user X, sorted by creation date"

---

## Data Access Patterns

### Primary Access Patterns

| Use Case | Query | Key Condition | Projection |
|----------|-------|--------------|-----------|
| Create todo | PUT | id, createdAt | N/A (full item stored) |
| Get todo by ID | GET_ITEM | id | All attributes |
| List all todos | QUERY + SCAN | Sort by createdAt DESC | [id, title, completed, updatedAt] |
| Toggle completion | UPDATE_ITEM | id | Updated item |
| Delete todo | DELETE_ITEM | id | N/A |

### Query Examples

```python
# Get single todo
dynamodb.get_item(
  TableName='todo-copilot-dev',
  Key={'id': {'S': 'uuid-here'}}
)

# List all todos (newest first)
dynamodb.scan(
  TableName='todo-copilot-dev',
  ScanFilter={'completed': {'AttributeValueList': [False], 'ComparisonOperator': 'EQ'}}  # Optional filter
) # Results sorted in application layer (DynamoDB SCAN doesn't guarantee order)

# Alternative: Full scan with sort in application
response = dynamodb.scan(TableName='todo-copilot-dev')
sorted_todos = sorted(response['Items'], key=lambda x: x['createdAt'], reverse=True)
```

---

## Entity Relationships

### Todo ↔ TodoTitle (Value Object)

```
Todo (Aggregate Root)
├── id: UUID
├── title: TodoTitle (value object, immutable)
│   └── Validates 1-500 chars
├── completed: boolean
└── timestamps: { createdAt, updatedAt, completedAt? }
```

**Relationship Type**: Composition (TodoTitle is part of Todo)  
**Cardinality**: 1:1 (One Todo has exactly one TodoTitle)  
**Lifecycle**: TodoTitle created with Todo, destroyed with Todo

### Users ↔ Todos (Future, Multi-User)

```
User (Future: Amazon Cognito or custom)
└── todos: Todo[] (via GSI: userId-createdAt)
```

**Relationship Type**: Composition  
**Cardinality**: 1:N (One User can have many Todos)  
**Implementation**: Add `userId` attribute to Todo, create GSI

---

## Data Consistency & Integrity

### Write Operations

**Create Todo**:
```
Input: title (string), userId? (optional)
Process:
  1. Validate TodoTitle (1-500 chars)
  2. Generate UUID v4 for id
  3. Set createdAt = now (UTC)
  4. Set updatedAt = createdAt
  5. Set completed = false
  6. PUT to DynamoDB
Output: Created Todo entity
```

**Update Todo (Toggle Completion)**:
```
Input: id, new completed value
Process:
  1. GET existing todo by id
  2. If not found: return 404 error
  3. Invert completed status
  4. Set updatedAt = now
  5. If completed=true: set completedAt = now
  6. UPDATE_ITEM in DynamoDB
Output: Updated Todo entity
```

**Delete Todo**:
```
Input: id
Process:
  1. GET todo to verify exists
  2. If not found: return 404 error
  3. DELETE_ITEM from DynamoDB
Output: Success confirmation (no entity returned)
```

### Optimistic Locking (Optional)

To prevent concurrent update conflicts, add `version` attribute:
- Version incremented on each update
- Client provides current version with update request
- If server version ≠ expected: reject update (ConditionalCheckFailedException)
- **Status**: Documented but NOT implemented in MVP (future enhancement)

---

## Schema Evolution

### Backward Compatibility

**Current (v1)**:
```json
{
  "id": "uuid",
  "title": "Buy milk",
  "completed": false,
  "createdAt": "2025-11-23T12:00:00Z",
  "updatedAt": "2025-11-23T12:00:00Z"
}
```

**Future (v2, multi-user)**:
```json
{
  "id": "uuid",
  "userId": "user-123",         // NEW
  "title": "Buy milk",
  "completed": false,
  "completedAt": "2025-11-23T13:00:00Z",  // NEW (optional)
  "createdAt": "2025-11-23T12:00:00Z",
  "updatedAt": "2025-11-23T13:00:00Z"
}
```

**Migration Strategy**:
- Add optional fields (don't remove existing)
- Default userId to null for existing items
- Queries filter by userId if present
- No downtime required

---

## Performance Characteristics

### Throughput (On-Demand Billing)

| Operation | Latency (P50) | Latency (P95) | Units |
|-----------|--------------|--------------|-------|
| GET_ITEM (single todo) | 5-10ms | 20-50ms | 1 RCU |
| SCAN (all todos) | 50-100ms | 200-500ms | Variable (1 RCU per 4KB) |
| PUT_ITEM (create) | 5-10ms | 20-50ms | 1 WCU |
| UPDATE_ITEM (toggle) | 5-10ms | 20-50ms | 1 WCU |
| DELETE_ITEM | 5-10ms | 20-50ms | 1 WCU |

### Scalability

- **On-Demand Billing**: Automatically scales to support 40k read/write units/second (AWS default)
- **Burst Capacity**: Handles 4x the baseline for 5 minutes
- **No provisioning needed**: Pay per request (good for variable load)

---

## Storage Estimates

### Per-Item Size

```
id: 36 bytes (UUID string)
title: ~50 bytes avg
completed: 1 byte
createdAt: 24 bytes (ISO timestamp)
updatedAt: 24 bytes
completedAt: 24 bytes (optional)
-------
~160 bytes per item (average)
```

### Storage for 100k Todos

```
100,000 todos × 160 bytes = 16 MB
DynamoDB minimum item size: 400 bytes
Effective storage: ~40 MB (with DynamoDB overhead)
Monthly cost (on-demand): ~$5-10 USD
```

---

## Testing Strategy

### Unit Tests (Domain Layer)

```typescript
// Test TodoTitle value object
✓ TodoTitle accepts 1-500 char strings
✓ TodoTitle rejects empty strings
✓ TodoTitle rejects > 500 char strings
✓ Two TodoTitles with same value are equal

// Test Todo entity
✓ Todo created with valid title, id=UUID, completed=false
✓ Todo.toggle() inverts completed status
✓ Todo.toggle() updates updatedAt timestamp
```

### Integration Tests (Repository Layer)

```typescript
// Test DynamoDBTodoRepository with mocked DynamoDB
✓ create() stores todo and returns it
✓ getById() retrieves todo by id
✓ getById() throws not found for missing id
✓ listAll() returns all todos sorted by createdAt DESC
✓ update() modifies completed status
✓ delete() removes todo from table
✓ Handles DynamoDB ConditionalCheckFailedException
```

### E2E Tests (API Gateway + Lambda)

```typescript
// Playwright tests against deployed API
✓ Create → Get → Toggle → Delete workflow
✓ List returns todos in correct order
✓ Concurrent updates don't cause data loss
```

---

## Security Considerations

### Data Protection

- ✅ DynamoDB encryption at rest (AWS managed keys)
- ✅ Encryption in transit (HTTPS via API Gateway)
- ✅ IAM roles restrict Lambda access to single table
- ✅ No PII stored (userId added in future with consent)

### Access Control

- Lambda execution role restricted to:
  - `dynamodb:GetItem` on specific table
  - `dynamodb:PutItem` on specific table
  - `dynamodb:UpdateItem` on specific table
  - `dynamodb:DeleteItem` on specific table
  - `dynamodb:Query` / `Scan` on specific table

---

## References

- AWS DynamoDB Best Practices: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html
- DynamoDB Pricing: https://aws.amazon.com/dynamodb/pricing/
- DynamoDB Performance: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.ReadWriteCapacityMode.html

