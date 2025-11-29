# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]
**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement subtasks functionality allowing users to add, view, complete, and delete subtasks within a main task. Subtasks will be nested under the parent task in the UI (tree view) and persisted as part of the Todo aggregate in DynamoDB.

## Technical Context

**Language/Version**: TypeScript 5.x
**Primary Dependencies**: React 18, AWS SDK v3
**Storage**: DynamoDB (Single Table Design or Simple Table)
**Testing**: Jest (Unit/Integration), Playwright (E2E)
**Target Platform**: AWS Lambda (Node.js 20.x), SPA (S3/CloudFront)
**Project Type**: Fullstack (Frontend + Backend)
**Performance Goals**: <200ms latency for subtask operations
**Constraints**: DynamoDB item size limit (400KB) - unlikely to be hit with subtasks
**Scale/Scope**: 1 level of nesting (Task -> Subtask)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **TDD**: Will write unit tests for Todo aggregate and subtask logic before implementation.
- [x] **DDD**: Subtasks will be modeled as entities within the Todo aggregate root.
- [x] **Functional Domain Modeling**: Todo and Subtask entities will be immutable.
- [x] **Clean Architecture**: New UseCases for subtask operations (AddSubtask, ToggleSubtask, DeleteSubtask).
- [x] **CQRS**: Command handlers for subtask mutations; Queries will return Todo with subtasks.
- [x] **IaC**: No new infrastructure needed (using existing DynamoDB table), but Terraform will be checked.
- [x] **Serverless**: Logic implemented in Lambda.
- [x] **Google ToDo**: N/A for this feature.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── application/
│   ├── commands/        # AddSubtask, ToggleSubtask, DeleteSubtask
│   └── queries/         # (Existing queries updated)
├── domain/
│   ├── entities/        # Todo.ts (update), Subtask.ts (new)
│   └── repositories/    # ITodoRepository.ts (update if needed)
├── infrastructure/
│   ├── repositories/    # DynamoDBTodoRepository.ts (update)
│   └── api/             # Routes for subtasks
└── presentation/
    ├── components/      # TodoItem.tsx (update), SubtaskList.tsx (new)
    └── hooks/           # useTodos.ts (update)
```

**Structure Decision**: Using existing Clean Architecture structure. Subtasks will be part of the Todo aggregate, so changes will be distributed across layers but centered around the Todo entity.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
