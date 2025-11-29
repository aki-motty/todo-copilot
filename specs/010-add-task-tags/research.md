# Research: Add Task Tags

**Feature**: `010-add-task-tags`
**Date**: 2025-11-29

## Decisions

### 1. Storage Strategy
- **Decision**: Store tags as an array of strings (`tags: string[]`) directly within the `Todo` item in DynamoDB.
- **Rationale**:
  - **Performance**: No need for extra table lookups or joins. Tags are always retrieved with the Todo.
  - **Simplicity**: Matches the "Single Table Design" philosophy and current access patterns.
  - **Scale**: The number of tags per task is expected to be small (3-5), so item size limits are not a concern.
- **Alternatives Considered**:
  - *Separate Tags Table*: Overkill for a fixed set of tags. Would require complex joins or multiple queries.

### 2. Tag Definition & Validation
- **Decision**: Hardcode allowed tags (`["Summary", "Research", "Split"]`) in the backend application code.
- **Rationale**:
  - **Consistency**: Ensures all users see and use the same tags, facilitating future AI processing.
  - **Simplicity**: No need for a "Tag Management" UI or database table.
  - **Versioning**: Changes to allowed tags are code changes, which are version-controlled and deployed safely.
- **Alternatives Considered**:
  - *Database Config*: Storing allowed tags in DB would allow runtime updates but adds read latency/complexity.

### 3. API Design
- **Decision**: RESTful sub-resources.
  - `POST /todos/{id}/tags` (Body: `{ "name": "Research" }`)
  - `DELETE /todos/{id}/tags/{tagName}`
  - `GET /tags` (Returns `["Summary", "Research", "Split"]`)
- **Rationale**:
  - **Clarity**: Explicit actions for adding/removing tags.
  - **Idempotency**: Adding the same tag twice should be handled gracefully (idempotent).
  - **Discoverability**: `GET /tags` allows the frontend to dynamically render the selection list.

### 4. Frontend UX
- **Decision**: Selection-only interface (Dropdown or Chips).
- **Rationale**: Prevents typos and enforces the use of supported tags.

## Unknowns Resolved

- **List of Tags**: Confirmed as "Summary", "Research", "Split".
- **Storage**: Confirmed as embedded strings.
- **Validation**: Confirmed as strict backend validation.
