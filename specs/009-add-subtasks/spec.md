# Feature Specification: Add Subtasks to ToDo List

**Feature Branch**: `009-add-subtasks`  
**Created**: 2025-11-27  
**Status**: Draft  
**Input**: User description: "ToDoリストとしてサブタスクを持てるようにしたいです。基本的にはタスクとサブタスクの2種類用意する形で、UIでもtreeのように紐づくようにしたいです。"

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.
  
  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - Create Subtask (Priority: P1)

As a user, I want to add subtasks to a main task so that I can break down complex activities into manageable steps.

**Why this priority**: Core functionality requested. Without creating subtasks, the feature doesn't exist.

**Independent Test**: Create a task, then add a subtask. Verify the subtask is persisted and linked to the parent.

**Acceptance Scenarios**:

1. **Given** a main task "Project A" exists, **When** I add a subtask "Research" to it, **Then** "Research" is created and associated with "Project A".
2. **Given** I am on the task list, **When** I choose to add a subtask to a task, **Then** I am prompted to enter the subtask details.

---

### User Story 2 - View Subtask Hierarchy (Priority: P1)

As a user, I want to see subtasks nested under their parent task so that I can understand the relationship and structure of my work.

**Why this priority**: Essential for the "tree-like" UI requirement. Visualizing the relationship is key to the user experience.

**Independent Test**: Create tasks with and without subtasks. View the list. Verify indentation or visual hierarchy.

**Acceptance Scenarios**:

1. **Given** a task "Project A" has subtasks "Research" and "Design", **When** I view the todo list, **Then** "Research" and "Design" are displayed visually indented or nested under "Project A".
2. **Given** a task has no subtasks, **When** I view the list, **Then** it appears as a standard task without expansion options.

---

### User Story 3 - Complete Subtask (Priority: P2)

As a user, I want to mark subtasks as complete so that I can track my progress on specific parts of a larger task.

**Why this priority**: Basic task management functionality applied to subtasks.

**Independent Test**: Mark a subtask as complete. Verify its status changes.

**Acceptance Scenarios**:

1. **Given** an incomplete subtask, **When** I mark it as complete, **Then** it is visually struck through or checked off.
2. **Given** a completed subtask, **When** I mark it as incomplete, **Then** it reverts to active state.

---

### User Story 4 - Delete Subtask (Priority: P2)

As a user, I want to delete subtasks so that I can remove items that are no longer needed.

**Why this priority**: Basic CRUD operation needed for maintenance.

**Independent Test**: Delete a subtask. Verify it is removed from the list and the parent task remains.

**Acceptance Scenarios**:

1. **Given** a subtask exists, **When** I delete it, **Then** it is removed from the list.
2. **Given** a task with subtasks, **When** I delete a subtask, **Then** the parent task and other subtasks remain unaffected.

### Edge Cases

- What happens when I delete a parent task with subtasks? (See Clarification Q2)
- What happens when I complete a parent task with incomplete subtasks? (See Clarification Q1)
- Can a subtask have its own subtasks? (Assumption: No, only 2 levels)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow users to create a subtask for an existing task.
- **FR-002**: System MUST display subtasks nested under their parent task (tree view).
- **FR-003**: System MUST allow users to complete subtasks independently of the parent task.
- **FR-004**: System MUST allow users to delete subtasks.
- **FR-005**: System MUST automatically delete all associated subtasks when a parent task is deleted (Cascade Delete).
- **FR-006**: System MUST automatically mark all incomplete subtasks as completed when a parent task is marked as completed.

### Key Entities *(include if feature involves data)*

- **Task**: Existing entity.
- **Subtask**: Represents a child task. Attributes: Title, Completed, ParentID (reference to Task).
## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can create a subtask for any existing task in under 3 clicks/taps.
- **SC-002**: Subtasks are visually distinguishable from parent tasks in the list view (100% of the time).
- **SC-003**: Users can complete and delete subtasks without affecting the parent task's existence (unless specified otherwise).

## Assumptions

- Only 1 level of nesting is required (Task -> Subtask).
- Subtasks do not need to be promoted to main tasks in this iteration.
- Subtasks do not have their own due dates or reminders in this iteration (MVP).
