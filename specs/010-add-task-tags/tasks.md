# Tasks: Add Task Tags

**Input**: Design documents from `/specs/010-add-task-tags/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/openapi.yaml, research.md

**Tests**: Tests are included as requested by the project constitution (TDD).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create feature directory structure (already done)

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T002 [P] Update `Todo` entity in `src/domain/entities/Todo.ts` to include `tags` array and `addTag`/`removeTag` methods.
- [x] T003 [P] Update `TodoDTO` in `src/application/dto/TodoDTO.ts` to include `tags` field.
- [x] T004 Update `DynamoDBTodoRepository` in `src/infrastructure/repositories/DynamoDBTodoRepository.ts` to map `tags` field to/from DynamoDB.
- [x] T005 [P] Create `Tag` value object or type definition in `src/domain/value-objects/Tag.ts` (or `types.ts`) with allowed values.

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Add Tags to Task (Priority: P1) 🎯 MVP

**Goal**: Users can add descriptive tags to their tasks from a predefined list.

**Independent Test**: Verify `POST /todos/{id}/tags` persists a tag and `GET /tags` returns the allowed list.

### Tests for User Story 1

- [x] T006 [P] [US1] Create unit tests for `AddTagHandler` in `tests/unit/application/handlers/AddTagHandler.spec.ts`.
- [x] T007 [P] [US1] Create unit tests for `GetTagsHandler` in `tests/unit/application/handlers/GetTagsHandler.spec.ts`.

### Implementation for User Story 1

- [x] T008 [P] [US1] Create `GetTagsHandler` in `src/application/handlers/GetTagsHandler.ts` (returns hardcoded list).
- [x] T009 [P] [US1] Create `AddTagHandler` in `src/application/handlers/AddTagHandler.ts`.
- [x] T010 [US1] Update `src/infrastructure/lambda/handlers/index.ts` to route `POST /todos/{id}/tags` and `GET /tags`.
- [x] T011 [P] [US1] Update `useTodoAPI` hook in `src/presentation/hooks/useTodoAPI.ts` to add `addTag` and `getTags` functions.
- [x] T012 [US1] Create `TagSelector` component in `src/presentation/components/TagSelector.tsx` (dropdown/select).
- [x] T013 [US1] Update `TodoItem` in `src/presentation/components/TodoItem.tsx` to integrate `TagSelector` and "Add Tag" button.

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - View Tags on Task (Priority: P1)

**Goal**: Users can see the tags assigned to each task in the list.

**Independent Test**: Verify tags are displayed on Todo items in the list view.

### Tests for User Story 2

- [x] T014 [P] [US2] Update `TodoItem` tests in `tests/unit/presentation/components/TodoItem.spec.tsx` to verify tag rendering.

### Implementation for User Story 2

- [x] T015 [US2] Update `TodoItem` in `src/presentation/components/TodoItem.tsx` to display tags (e.g., as chips/badges).
- [x] T016 [P] [US2] Add styles for tags in `src/presentation/components/TodoItem.css`.

**Checkpoint**: Tags should be visible on tasks.

---

## Phase 5: User Story 3 - Remove Tags (Priority: P2)

**Goal**: Users can remove tags from a task.

**Independent Test**: Verify `DELETE /todos/{id}/tags/{tagName}` removes the tag.

### Tests for User Story 3

- [x] T017 [P] [US3] Create unit tests for `RemoveTagHandler` in `tests/unit/application/handlers/RemoveTagHandler.spec.ts`.

### Implementation for User Story 3

- [x] T018 [P] [US3] Create `RemoveTagHandler` in `src/application/handlers/RemoveTagHandler.ts`.
- [x] T019 [US3] Update `src/infrastructure/lambda/handlers/index.ts` to route `DELETE /todos/{id}/tags/{tagName}`.
- [x] T020 [P] [US3] Update `useTodoAPI` hook in `src/presentation/hooks/useTodoAPI.ts` to add `removeTag` function.
- [x] T021 [US3] Update `TodoItem` in `src/presentation/components/TodoItem.tsx` to allow tag removal (e.g., 'x' button on tag).

**Checkpoint**: Tags can be removed.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final integration testing and cleanup.

- [x] T022 Create E2E test `e2e/tags.spec.ts` covering add/view/remove flows.
- [x] T023 Verify all new endpoints in `src/infrastructure/lambda/handlers/index.ts` have proper error handling and logging.

## Dependencies

1. **US1 (Add)** depends on **Foundational** (Entity updates).
2. **US2 (View)** depends on **US1** (Need tags to view them).
3. **US3 (Remove)** depends on **US2** (Need to see tags to remove them).

## Parallel Execution Examples

- **Backend vs Frontend**: T009 (AddTagHandler) and T012 (TagSelector) can be built in parallel.
- **Handlers**: T009 (AddTag) and T018 (RemoveTag) are independent once Entity is updated.
- **Tests**: Unit tests (T006, T014, T017) can be written before implementation.
