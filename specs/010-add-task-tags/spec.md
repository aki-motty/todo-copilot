# Feature Specification: Add Task Tags

**Feature Branch**: `010-add-task-tags`
**Created**: 2025-11-29
**Status**: Draft
**Input**: User description: "タスクに対してタグをつけられるようにしたいです。最終的にはこのタグを利用して、AIに指示を出す形にしたいです。タグはタスクに対して複数つけられる。タグの種類としては要約、調査、サブタスクに分割、などが考えられる気がします。"

## Clarifications

### Session 2025-11-29
- Q: How should tags be stored in the database? → A: **Embedded Strings**: Store as a simple list of strings within the Todo item for performance and simplicity.
- Q: How should the tag input UI behave? → A: **Selection Only**: Users can only select from a predefined list of tags (e.g., "Summary", "Research", "Split") to ensure data consistency and simplify AI processing.
- Q: How should the API be structured for tag operations? → A: **Add/Remove Endpoints**: Create dedicated endpoints `POST /todos/{id}/tags` and `DELETE /todos/{id}/tags/{tagName}` for clear, RESTful operations.
- Q: Where should the list of available tags be defined? → A: **Hardcoded in Backend Code**: Define the allowed tags as a constant array in the backend code to keep it simple and version-controlled.
- Q: How should the API validate incoming tags? → A: **Strict Validation**: The API must validate that any tag being added is present in the predefined list. If not, it must return a 400 Bad Request error.

## User Scenarios & Testing

### User Story 1 - Add Tags to Task (Priority: P1)

As a user, I want to add descriptive tags (e.g., "Research", "Summary") to my tasks so that I can categorize them and prepare them for future AI processing.

**Why this priority**: This is the core functionality requested. Without adding tags, the feature doesn't exist.

**Independent Test**: Can be fully tested by creating a task and adding a tag to it. The tag should be persisted.

**Acceptance Scenarios**:

1. **Given** a task exists, **When** I enter a tag name and confirm, **Then** the tag is added to the task.
2. **Given** a task with existing tags, **When** I add another tag, **Then** the new tag is added alongside the existing ones.
3. **Given** a task, **When** I try to add a duplicate tag, **Then** the system prevents it or ignores the duplicate.

---

### User Story 2 - View Tags on Task (Priority: P1)

As a user, I want to see the tags assigned to each task in the list so that I can quickly identify the nature of the task.

**Why this priority**: Adding tags is useless if they cannot be seen.

**Independent Test**: Create tasks with different tags and verify they are visible in the main list view.

**Acceptance Scenarios**:

1. **Given** a list of tasks with tags, **When** I view the list, **Then** each task displays its assigned tags.
2. **Given** a task with multiple tags, **When** I view it, **Then** all tags are displayed clearly.

---

### User Story 3 - Remove Tags (Priority: P2)

As a user, I want to remove tags from a task so that I can correct mistakes or update the task's status.

**Why this priority**: Essential for maintaining accurate data, though strictly speaking, "add-only" could be a (poor) MVP.

**Independent Test**: Add a tag, then remove it. Verify it is gone.

**Acceptance Scenarios**:

1. **Given** a task with a tag, **When** I click the remove button on the tag, **Then** the tag is removed from the task.

### Edge Cases

- What happens when a tag name is extremely long? (Should truncate or wrap)
- What happens when a user adds special characters in a tag? (Should be allowed or sanitized)
- What happens when a task has a large number of tags? (UI should handle overflow gracefully)

## Requirements

### Functional Requirements

- **FR-001**: System MUST allow users to add a tag to a specific Todo item by selecting from a predefined list.
- **FR-002**: System MUST allow multiple tags to be associated with a single Todo item.
- **FR-003**: System MUST display associated tags on the Todo item in the list view.
- **FR-004**: System MUST allow users to remove a tag from a Todo item.
- **FR-005**: Tags MUST be persisted with the Todo item.
- **FR-006**: Tag names MUST be unique per Todo item (prevent duplicates on the same task).
- **FR-007**: System MUST support the following predefined tags: "Summary", "Research", "Split".
- **FR-008**: Users MUST NOT be able to create custom free-text tags in this version.
- **FR-009**: System MUST provide a `POST /todos/{id}/tags` endpoint to add a tag.
- **FR-010**: System MUST provide a `DELETE /todos/{id}/tags/{tagName}` endpoint to remove a tag.
- **FR-011**: System MUST provide a `GET /tags` endpoint that returns the list of available/allowed tags.
- **FR-012**: The frontend MUST fetch the list of available tags from `GET /tags` on initialization.
- **FR-013**: The `POST /todos/{id}/tags` endpoint MUST validate that the provided tag exists in the allowed list.
- **FR-014**: If an invalid tag is submitted, the API MUST return a 400 Bad Request response.

### Key Entities

- **Tag**: Represents a label attached to a task. Implemented as a simple string.
- **Todo**: Updated to include a `tags` attribute (Array of Strings).

### Assumptions & Dependencies

- **Assumptions**:
  - Tag matching is case-insensitive (e.g., "Research" and "research" are treated as the same tag).
  - There is no hard limit on the number of tags per task, but UI may optimize for 3-5 tags.
  - Tags are created implicitly when added to a task; no separate "Tag Management" screen is required for this version.
- **Dependencies**:
  - Requires existing Todo creation and list functionality.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Users can add a tag to a task in under 3 clicks/interactions.
- **SC-002**: Task list loads with tags without noticeable performance degradation (< 200ms increase).
- **SC-003**: Users can successfully identify tasks by their tags in the list view.
