# Implementation Plan: Add Task Tags

**Branch**: `010-add-task-tags` | **Date**: 2025-11-29 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/010-add-task-tags/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Add support for tagging Todo items with predefined tags ("Summary", "Research", "Split").
- **Storage**: Embedded strings in DynamoDB Todo items.
- **API**: New endpoints `POST /todos/{id}/tags`, `DELETE /todos/{id}/tags/{tagName}`, `GET /tags`.
- **UI**: Selection-only interface for adding tags.
- **Validation**: Strict validation against a hardcoded list of allowed tags in the backend.

## Technical Context

**Language/Version**: TypeScript 5.x (Node.js 20.x for Lambda, React 18.x for Frontend)
**Primary Dependencies**: AWS SDK v3, React, Vite
**Storage**: DynamoDB (Single Table Design)
**Testing**: Jest (Unit/Integration), Playwright (E2E)
**Target Platform**: AWS Lambda (Backend), SPA on S3/CloudFront (Frontend)
**Project Type**: Fullstack (Web + Serverless Backend)
**Performance Goals**: < 200ms latency for tag operations
**Constraints**: Strict TDD, DDD, Clean Architecture compliance
**Scale/Scope**: Small feature addition to existing Todo app

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **I. TDD**: Will implement unit tests for new Handlers and Entities before implementation.
- [x] **II. DDD**: `Tag` will be a Value Object (or simple string) within the `Todo` Aggregate.
- [x] **III. Functional**: Immutable data structures for Todo updates.
- [x] **IV. Clean Architecture**:
    - **Entity**: Update `Todo` entity.
    - **UseCase**: `AddTagHandler`, `RemoveTagHandler`, `GetTagsHandler`.
    - **Interface**: New Lambda handlers.
    - **Framework**: DynamoDB repository update.
- [x] **V. CQRS**: Command (Add/Remove) and Query (List) separation maintained.
- [x] **VI. IaC**: No infrastructure changes required (using existing DynamoDB table).
- [x] **VII. Serverless**: Stateless Lambda functions.

## Project Structure

### Documentation (this feature)

```text
specs/010-add-task-tags/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
src/
├── application/
│   ├── dto/               # Update TodoDTO with tags
│   └── handlers/          # AddTagHandler, RemoveTagHandler, GetTagsHandler
├── domain/
│   └── entities/          # Update Todo.ts
├── infrastructure/
│   ├── lambda/handlers/   # Update index.ts routing
│   └── repositories/      # Update DynamoDBTodoRepository (if needed for mapping)
└── presentation/
    ├── components/        # TodoItem (display tags), TagSelector (new)
    └── hooks/             # useTodoAPI (add tag methods)

tests/
├── unit/
│   ├── domain/            # Todo entity tests
│   ├── application/       # Handler tests
│   └── presentation/      # Component tests
└── e2e/                   # Tagging flow tests
```

**Structure Decision**: Standard Clean Architecture structure as defined in the project.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

N/A - No violations.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
