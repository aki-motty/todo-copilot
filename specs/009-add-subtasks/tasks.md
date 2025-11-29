# Implementation Tasks: Add Subtasks to ToDo List

**Feature Branch**: `009-add-subtasks`
**Spec**: [spec.md](./spec.md)
**Plan**: [plan.md](./plan.md)

## Phase 1: Setup & Foundational (Blocking)

**Goal**: Establish the domain model and persistence layer to support subtasks.

- [x] T001 Create `Subtask` entity in `src/domain/entities/Subtask.ts`
- [x] T002 Update `Todo` entity in `src/domain/entities/Todo.ts` to include `Subtask[]` and domain methods (`addSubtask`, `removeSubtask`, `toggleSubtask`, `toggleCompletion` with cascade logic)
- [x] T003 Update `TodoDTO` in `src/application/dto/TodoDTO.ts` to include subtasks field
- [x] T004 Update `DynamoDBTodoRepository` in `src/infrastructure/repositories/DynamoDBTodoRepository.ts` to persist and hydrate subtasks

## Phase 2: User Story 1 - Create Subtask (P1)

**Goal**: Allow users to add subtasks to a main task.
**Independent Test**: Call `POST /todos/{id}/subtasks` and verify subtask is created.

- [x] T005 [US1] Implement `AddSubtaskHandler` in `src/application/handlers/AddSubtaskHandler.ts`
- [x] T006 [US1] Add `POST /todos/{id}/subtasks` route in `src/infrastructure/lambda/handlers/index.ts`
- [x] T007 [US1] Update `HttpClient` in `src/infrastructure/api/HttpClient.ts` with `addSubtask` method
- [x] T008 [US1] Update `useTodos` hook in `src/presentation/hooks/useTodos.ts` to expose `addSubtask` function
- [x] T009 [US1] Update `TodoItem` component in `src/presentation/components/TodoItem.tsx` to include "Add Subtask" UI

## Phase 3: User Story 2 - View Subtask Hierarchy (P1)

**Goal**: Display subtasks nested under their parent task.
**Independent Test**: View a task with subtasks and verify they are rendered correctly.

- [x] T010 [US2] Update `TodoItem` component in `src/presentation/components/TodoItem.tsx` to render list of subtasks
- [x] T011 [US2] Add styles for nested subtasks in `src/index.css` (indentation, tree view look)

## Phase 4: User Story 3 - Complete Subtask (P2)

**Goal**: Allow users to mark subtasks as complete/incomplete.
**Independent Test**: Call `PATCH /todos/{id}/subtasks/{subtaskId}` and verify status change.

- [x] T012 [US3] Implement `ToggleSubtaskHandler` in `src/application/handlers/ToggleSubtaskHandler.ts`
- [x] T013 [US3] Add `PATCH /todos/{id}/subtasks/{subtaskId}` route in `src/infrastructure/lambda/handlers/index.ts`
- [x] T014 [US3] Update `HttpClient` in `src/infrastructure/api/HttpClient.ts` with `toggleSubtask` method
- [x] T015 [US3] Update `useTodos` hook in `src/presentation/hooks/useTodos.ts` to expose `toggleSubtask` function
- [x] T016 [US3] Update `TodoItem` component in `src/presentation/components/TodoItem.tsx` to allow toggling subtasks

## Phase 5: User Story 4 - Delete Subtask (P2)

**Goal**: Allow users to delete subtasks.
**Independent Test**: Call `DELETE /todos/{id}/subtasks/{subtaskId}` and verify subtask is removed.

- [x] T017 [US4] Implement `DeleteSubtaskHandler` in `src/application/handlers/DeleteSubtaskHandler.ts`
- [x] T018 [US4] Add `DELETE /todos/{id}/subtasks/{subtaskId}` route in `src/infrastructure/lambda/handlers/index.ts`
- [x] T019 [US4] Update `HttpClient` in `src/infrastructure/api/HttpClient.ts` with `deleteSubtask` method
- [x] T020 [US4] Update `useTodos` hook in `src/presentation/hooks/useTodos.ts` to expose `deleteSubtask` function
- [x] T021 [US4] Update `TodoItem` component in `src/presentation/components/TodoItem.tsx` to allow deleting subtasks

## Phase 6: Polish & Cross-Cutting

**Goal**: Ensure all requirements and edge cases are handled.

- [x] T022 Verify FR-005 (Cascade Delete) works as expected (implicit in aggregate design)
- [x] T023 Verify FR-006 (Auto-complete subtasks) works as expected (implemented in T002)
- [x] T024 Create E2E test for subtask lifecycle in `e2e/subtasks.spec.ts`

## Dependencies

1. **Foundational** (T001-T004) must be completed first.
2. **US1** (Create) is prerequisite for US2, US3, US4 testing (need data to view/act on).
3. **US2** (View) is needed to verify US1, US3, US4 in the UI.

## Parallel Execution

- **Backend vs Frontend**: Once Phase 1 is done, Backend (Handlers/Routes) and Frontend (Components/Hooks) tasks within each User Story can be done in parallel.
- **User Stories**: US3 and US4 can be implemented in parallel after US1 and US2.

## Implementation Strategy

1. **MVP**: Complete Phases 1, 2, and 3. This gives the ability to add and view subtasks.
2. **Full Feature**: Complete Phases 4 and 5 to add interactivity.
3. **Polish**: Final verification and E2E tests.
