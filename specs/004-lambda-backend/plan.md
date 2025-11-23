# Implementation Plan: Lambda-Powered Todo Backend

**Branch**: `004-lambda-backend` | **Date**: 2025-11-23 | **Spec**: [004-lambda-backend/spec.md](/workspaces/todo-copilot/specs/004-lambda-backend/spec.md)
**Input**: Feature specification from `/specs/004-lambda-backend/spec.md`

**Note**: Complete feature specification with 7 user stories. Previous work: AWS infrastructure deployed (Lambda, API Gateway, DynamoDB ACTIVE). REMAINING: Frontend integration, end-to-end implementation, comprehensive testing.

## Summary

**Feature Goal**: Implement AWS Lambda-powered backend for Todo application with full React frontend integration, comprehensive test coverage (80%+ coverage), and multi-environment deployment (dev/staging/prod).

**Primary Requirement**: Replace localStorage with Lambda API backend while maintaining existing DDD/CQRS architecture patterns and domain entities.

**Technical Approach**: 
- Implement Lambda handler using existing TodoRepository interface
- Deploy API Gateway HTTP API with CORS support
- Use DynamoDB on-demand billing for flexible scaling
- Maintain immutability and value objects from domain layer
- Achieve 80%+ test coverage with unit/integration/E2E tests
- Deploy to dev (GitHub Actions auto) → staging (1-approval) → prod (2-approvals)

## Technical Context

**Language/Version**: TypeScript 5.2, Node.js 18.x  
**Primary Dependencies**: AWS Lambda, API Gateway V2, DynamoDB, React 18.2.0, Jest, Playwright  
**Storage**: DynamoDB (todo-copilot-dev/staging/prod tables, on-demand billing)  
**Testing**: Jest (unit/integration), Playwright (E2E), 582 tests baseline (338 existing)  
**Target Platform**: AWS Lambda (ap-northeast-1), Browser (React 18.2.0)  
**Project Type**: Web application (React frontend + Lambda backend, monorepo)  
**Performance Goals**: P95 latency < 500ms per todo operation, support 10 concurrent requests  
**Constraints**: Lambda 256MB memory, 30-second timeout, DynamoDB on-demand (no provisioning)  
**Scale/Scope**: 10k users, 100k todos, 5 core API endpoints (create, read, list, toggle, delete)

**Key Implementation Details**:
- Frontend: React components call Lambda API endpoints instead of localStorage
- Backend: Lambda handler implements TodoRepository interface from domain layer
- Database: DynamoDB with todo id as partition key, createdAt as sort key
- API Contract: REST endpoints (POST/GET/PUT/DELETE) returning standardized JSON responses
- Architecture: Maintain DDD (domain entities) + CQRS (command/query separation) patterns
- Deployment: GitHub Actions triggers Terraform to deploy to dev auto, staging/prod with approvals

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Against todo-copilot constitution.md (7 principles)**:

| Principle | Status | Verification |
|-----------|--------|--------------|
| I. TDD | ✅ PASS | 582 tests existing, 80%+ coverage required for new Lambda code |
| II. DDD | ✅ PASS | Maintain domain entities (Todo), aggregates, value objects (TodoTitle) |
| III. Functional Domain Modeling | ✅ PASS | Use immutability in value objects, pure functions in handlers |
| IV. Clean Architecture | ✅ PASS | Handler → Application → Domain separation, repository pattern |
| V. CQRS | ✅ PASS | Command handlers (create/update/delete), Query handlers (read/list) |
| VI. IaC (Terraform) | ✅ PASS | Already deployed: Lambda, API Gateway, DynamoDB via Terraform |
| VII. Serverless AWS | ✅ PASS | Lambda 18.x, API Gateway V2, DynamoDB on-demand |

**Gate Result**: ✅ **PASS - No violations. All principles applicable and maintained.**

## Project Structure

### Documentation (this feature)

```text
specs/004-lambda-backend/
├── plan.md              # This file (implementation plan)
├── spec.md              # Feature specification (7 user stories)
├── research.md          # Phase 0 output (decisions, dependencies, unknowns resolved)
├── data-model.md        # Phase 1 output (DynamoDB schema, entity relationships)
├── quickstart.md        # Phase 1 output (developer setup guide)
├── contracts/           # Phase 1 output (API contracts)
│   ├── lambda-api.yml   # OpenAPI 3.0 spec for Lambda endpoints
│   └── events.json      # Lambda event/response examples
└── tasks.md             # Phase 2 output (implementation tasks, already exists)
```

### Source Code (repository root)

```text
# Web application (frontend + backend monorepo)
src/
├── application/         # Use case layer (command/query handlers)
│   ├── handlers/
│   │   ├── CreateTodoHandler.ts
│   │   ├── ListTodosHandler.ts
│   │   ├── ToggleTodoHandler.ts
│   │   └── DeleteTodoHandler.ts
│   └── dto/             # Data Transfer Objects
├── domain/              # Business logic (entities, aggregates, value objects)
│   ├── entities/Todo.ts
│   ├── valueObjects/TodoTitle.ts
│   ├── repositories/TodoRepository.interface.ts
│   └── events/TodoEvent.ts
├── infrastructure/      # Framework/library layer
│   ├── lambda/
│   │   ├── handlers/
│   │   │   └── index.ts          # AWS Lambda handler entry point
│   │   ├── repositories/
│   │   │   └── DynamoDBTodoRepository.ts
│   │   └── adapters/
│   │       └── APIGatewayAdapter.ts
│   └── config/
│       └── logger.ts
├── presentation/        # React UI layer
│   ├── components/
│   │   ├── TodoApp.tsx           # Main component (integrates with Lambda API)
│   │   ├── TodoForm.tsx
│   │   ├── TodoList.tsx
│   │   └── TodoItem.tsx
│   ├── hooks/
│   │   └── useTodoAPI.ts         # Hook for Lambda API calls
│   └── services/
│       └── todoApiClient.ts       # Lambda API client (replaces localStorage)

tests/
├── unit/
│   ├── application/
│   ├── domain/
│   └── infrastructure/
├── integration/
│   ├── lambda/
│   └── repositories/
├── e2e/
│   ├── create-todo.spec.ts
│   ├── toggle-todo.spec.ts
│   └── delete-todo.spec.ts

infrastructure/
├── lambda/          # Lambda-specific deployment artifacts
│   ├── build/       # Compiled JS output
│   └── dist.zip     # Packaged Lambda function
└── terraform/       # Already configured for deployment

docs/
├── ADR/
│   ├── ADR-001-Lambda-Architecture.md
│   ├── ADR-002-DynamoDB-Schema.md
│   └── ADR-003-Frontend-Integration.md
└── API.md           # Lambda API documentation
```

**Structure Decision**: Web application (Option 2) with separate frontend/backend concerns within monorepo. Frontend communicates with Lambda via REST API. Terraform already manages infrastructure. Tests organized by layer (unit → integration → E2E).

## Complexity Tracking

> **Status**: No constitution violations. Complexity is appropriate for feature scope.

| Design Decision | Justification | Simpler Alternative Rejected Because |
|-----------------|--------------|-------------------------------------|
| CQRS pattern in handlers | Separate command (create/update/delete) and query (read/list) enables independent scaling and optimization | Direct procedural handlers would mix concerns and reduce testability |
| Repository pattern (TodoRepository) | Abstracts DynamoDB details, enables mocking in tests, maintains domain independence | Direct DynamoDB calls in handlers would couple domain to infrastructure |
| Value object (TodoTitle) with validation | Ensures business rules (1-500 chars) enforced at domain level, not controller | String type without validation would allow invalid state |
| Separate API contracts document | Clear specification of Lambda event/response format enables frontend/backend async development | Informal documentation in code would cause integration delays |
| Multi-environment Terraform | dev (auto-deploy) → staging (1-approval) → prod (2-approvals) enables safety gates | Single environment insufficient for production stability and team coordination |
