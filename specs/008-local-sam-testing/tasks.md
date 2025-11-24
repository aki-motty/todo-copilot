# Tasks: Local SAM Testing

**Input**: Design documents from `/specs/008-local-sam-testing/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are OPTIONAL - only include them if explicitly requested in the feature specification.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create `local-setup/` directory structure
- [x] T002 Create `local-setup/env.json` with local environment variables (e.g., `TABLE_NAME=todo-copilot-local`)
- [x] T003 Create `local-setup/seeds.json` following the schema defined in `data-model.md`
- [x] T004 Create `local-setup/docker-compose.yml` for DynamoDB Local

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 [P] Implement Mock Authentication Middleware in `src/shared/middleware/mock-auth.ts`
- [x] T006 [P] Create Database Seeding Script in `local-setup/scripts/seed-db.sh`
- [x] T007 Update `package.json` with `db:start` and `db:seed` scripts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Invoke Lambda Function Locally (Priority: P1) 🎯 MVP

**Goal**: Enable developers to invoke Lambda functions locally to verify logic changes.

**Independent Test**: Run `sam local invoke` for a function and verify success.

### Implementation for User Story 1

- [x] T008 [US1] Create `local-setup/template.yaml` defining the Lambda functions (mirroring Terraform)
- [x] T009 [US1] Update Lambda entry points (e.g., `src/index.lambda.ts`) to wrap handlers with `withMockAuth`
- [x] T010 [US1] Create sample event JSON files in `local-setup/events/` (e.g., `get-todos.json`)
- [x] T011 [US1] Add `build:lambda` script to `package.json` (using `esbuild` or `tsc` to prepare code for SAM)
- [x] T012 [US1] Add `test:local:invoke` script to `package.json`

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Run Local API Gateway (Priority: P2)

**Goal**: Enable developers to start a local API Gateway to test endpoints via HTTP.

**Independent Test**: Start local API and hit `http://localhost:3000/todos` with curl.

### Implementation for User Story 2

- [x] T013 [US2] Update `local-setup/template.yaml` to include API Gateway events for all functions
- [x] T014 [US2] Add `start:sam` script to `package.json` (using `sam local start-api`)
- [x] T015 [US2] Add `watch` script to `package.json` (using `tsc -w` or similar)
- [x] T016 [US2] Add `dev:local` script to `package.json` (using `concurrently` to run DB, watch, and SAM)
- [x] T017 [US2] Create `.env.local.example` for frontend configuration

**Checkpoint**: At this point, User Story 2 should be fully functional and testable independently

---

## Phase 5: User Story 3 - Debug Lambda Locally (Priority: P3)

**Goal**: Enable developers to attach a debugger to the local Lambda execution.

**Independent Test**: Configure IDE to attach to debug port and hit a breakpoint.

### Implementation for User Story 3

- [x] T018 [US3] Add `debug:local` script to `package.json` (passing debug ports to SAM)
- [x] T019 [US3] Create/Update `.vscode/launch.json` with configuration to attach to SAM debug port

**Checkpoint**: At this point, User Story 3 should be fully functional and testable independently

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final cleanup, documentation, and edge case handling

- [x] T020 Update `README.md` with "Local Development" section referencing `specs/008-local-sam-testing/quickstart.md`
- [x] T021 Verify all scripts work on a fresh clone (using `check-prerequisites.sh` or manual test)
- [x] T022 Ensure `template.yaml` has comments warning about manual sync with Terraform

## Dependencies

- **User Story 1** depends on **Phase 2 (Foundational)**
- **User Story 2** depends on **User Story 1** (needs template and build)
- **User Story 3** depends on **User Story 1** (needs invoke capability)

## Parallel Execution Opportunities

- **T005 (Mock Auth)** and **T006 (Seed Script)** can be done in parallel.
- **T010 (Events)** and **T011 (Build Script)** can be done in parallel.
