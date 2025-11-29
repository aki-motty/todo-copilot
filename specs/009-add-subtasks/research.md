# Research: Add Subtasks

**Feature**: Add Subtasks to ToDo List
**Branch**: 009-add-subtasks

## Decisions

### 1. Data Modeling
**Decision**: Model `Subtask` as an entity within the `Todo` aggregate root.
**Rationale**:
- Subtasks have no meaning outside of a Todo.
- They share the lifecycle of the Todo (cascade delete).
- Access patterns usually involve loading the Todo with its subtasks.
- DynamoDB item size limit (400KB) is sufficient for reasonable number of subtasks.
**Implementation**:
- Create `src/domain/entities/Subtask.ts`.
- Update `Todo.ts` to include `_subtasks: Subtask[]`.
- Update `DynamoDBTodoRepository` to persist subtasks as a list of maps.

### 2. API Design
**Decision**: Add RESTful sub-resources for subtasks.
**Rationale**:
- Follows REST conventions.
- Allows granular operations without sending the full Todo object (reducing race conditions).
**Endpoints**:
- `POST /todos/{id}/subtasks`: Create a subtask.
- `PATCH /todos/{id}/subtasks/{subtaskId}`: Update subtask (e.g. toggle completion).
- `DELETE /todos/{id}/subtasks/{subtaskId}`: Delete a subtask.

### 3. Application Layer
**Decision**: Create dedicated Command Handlers for subtask operations.
**Rationale**:
- Follows CQRS/Clean Architecture.
- Keeps handlers focused and testable.
**Handlers**:
- `AddSubtaskHandler`
- `ToggleSubtaskHandler`
- `DeleteSubtaskHandler`

### 4. Frontend
**Decision**: Update `TodoItem` component to render a recursive or nested list of subtasks.
**Rationale**:
- Meets the "tree view" requirement.
- Can reuse `TodoItem` or create `SubtaskItem` if styling differs significantly.
- For MVP (1 level), a simple nested list is sufficient.

## Alternatives Considered

### Separate DynamoDB Table for Subtasks
- **Pros**: Unlimited subtasks, independent scaling.
- **Cons**: Requires multiple round trips or complex queries (Query with PK=TodoID). Violates "Aggregate" boundary if Todo is the root.
- **Verdict**: Rejected. Overkill for simple subtasks and complicates consistency.

### Composite Key in Single Table
- **Pros**: Efficient querying.
- **Cons**: Complicates the repository logic (need to query PK=TodoID to get all parts).
- **Verdict**: Rejected. Storing in the same item is simpler and sufficient.
