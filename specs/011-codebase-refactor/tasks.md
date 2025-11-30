# Tasks: Codebase Refactoring & Quality Improvement

**Input**: Design documents from `/specs/011-codebase-refactor/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, quickstart.md ✅

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1=Tests, US2=Architecture, US3=Docs, US4=Scripts)
- Include exact file paths in descriptions

## Path Conventions

- **Source**: `src/` (domain/, application/, infrastructure/, presentation/, shared/)
- **Tests**: `tests/` (unit/, integration/, e2e/)
- **Docs**: `docs/`, `README.md`

---

## Phase 1: Setup

**Purpose**: ブランチ確認と現状把握

- [X] T001 Verify branch is `011-codebase-refactor` and up to date with main
- [X] T002 Run `npm test -- --coverage` to establish baseline coverage metrics
- [X] T003 Run `grep -r "from.*infrastructure" src/domain/ src/application/` to confirm architecture violations

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: アーキテクチャ違反の修正（全User Storyに影響するため先行実施）

**⚠️ CRITICAL**: US1のテスト追加前にアーキテクチャを修正する必要あり（テスト対象のコードが変わるため）

- [X] T004 [P] Create ILogger interface in src/application/ports/ILogger.ts
- [X] T005 [P] Create ConsoleLogger implementation in src/infrastructure/config/ConsoleLogger.ts
- [X] T006 Update src/infrastructure/config/logger.ts to export ConsoleLogger as ILogger implementation
- [X] T007 Refactor src/application/services/TodoApplicationService.ts to use ILogger via dependency injection
- [X] T008 Refactor src/application/handlers/DeleteTodoCommandHandler.ts to use ILogger via dependency injection
- [X] T009 Update all consumers of TodoApplicationService and DeleteTodoCommandHandler to inject logger
- [X] T010 Run `grep -r "from.*infrastructure" src/application/` to verify no architecture violations remain

**Checkpoint**: アーキテクチャ違反ゼロ、全テストパス確認 ✅

---

## Phase 3: User Story 1 - テストカバレッジ拡充 (Priority: P1) 🎯 MVP

**Goal**: Domain層とApplication層のテストカバレッジを80%以上に引き上げる

**Independent Test**: `npm test -- --coverage --collectCoverageFrom='src/domain/**/*.ts' --collectCoverageFrom='src/application/**/*.ts'` で80%以上達成を確認

### Domain層テスト拡充 (目標: 90%)

- [X] T011 [P] [US1] Add branch coverage tests for Todo.ts in tests/unit/domain/entities/Todo.test.ts (目標: 77% → 90%)
- [X] T012 [P] [US1] Add function coverage tests for Tag.ts in tests/unit/domain/value-objects/Tag.test.ts (目標: 75% → 90%)

### Application層ハンドラーテスト追加 (目標: 80%)

- [X] T013 [P] [US1] Create CreateTodoHandler test in tests/unit/application/handlers/CreateTodoHandler.test.ts
- [X] T014 [P] [US1] Create GetTodoHandler test in tests/unit/application/handlers/GetTodoHandler.test.ts
- [X] T015 [P] [US1] Create ListTodosHandler test in tests/unit/application/handlers/ListTodosHandler.test.ts
- [X] T016 [P] [US1] Create SaveTodoHandler test in tests/unit/application/handlers/SaveTodoHandler.test.ts
- [X] T017 [P] [US1] Create ToggleTodoHandler test in tests/unit/application/handlers/ToggleTodoHandler.test.ts

### Application層サービステスト拡充

- [X] T018 [US1] Expand TodoApplicationService tests in tests/unit/application/services/TodoApplicationService.test.ts (目標: 71% → 80%)

### カバレッジ検証

- [X] T019 [US1] Run coverage report and verify Domain layer >= 90%, Application layer >= 80%
- [X] T020 [US1] Run `npm test` to confirm all tests pass (目標: 450件以上のテスト)

**Checkpoint**: カバレッジ目標達成、全テストパス ✅ (Domain 100%, Application 93%)

---

## Phase 4: User Story 2 - DDD/クリーンアーキテクチャ準拠性確認 (Priority: P2)

**Goal**: 依存関係が正しいことを最終確認し、必要に応じて追加修正

**Independent Test**: `grep -r "from.*infrastructure\|from.*presentation" src/domain/ src/application/` の結果が空

### 依存関係検証

- [X] T021 [US2] Verify Domain layer has no external dependencies: `grep -r "from.*application\|from.*infrastructure\|from.*presentation" src/domain/`
- [X] T022 [US2] Verify Application layer only depends on Domain and ports: review all imports in src/application/
- [X] T023 [US2] Document architecture compliance in a brief comment in plan.md

**Checkpoint**: 依存関係が内向きのみ確認完了 ✅

---

## Phase 5: User Story 3 - ドキュメント最新化 (Priority: P3)

**Goal**: ドキュメントが現在の実装と一致

**Independent Test**: README.mdの手順に従って開発環境が起動できる

### ドキュメント更新

- [X] T024 [P] [US3] Update docs/DEVELOPMENT.md with new NPM script names and current development workflow
- [X] T025 [P] [US3] Update README.md with new NPM script names and current project structure
- [X] T026 [US3] Review and update docs/API.md if any changes needed (確認のみの可能性あり)
- [X] T027 [US3] Validate quickstart.md steps work correctly by following them

**Checkpoint**: ドキュメントが最新化、手順が動作確認済み ✅ (スクリプト名変更は Phase 6 で実施)

---

## Phase 6: User Story 4 - NPMスクリプト名整理 (Priority: P4)

**Goal**: NPMスクリプト名が `環境:アクション` 形式で統一

**Independent Test**: `npm run` で表示されるスクリプト名が一貫した命名規則に従っている

### スクリプト名変更

- [X] T028 [US4] Update package.json scripts section with new naming convention:
  - `dev:sam` → `local:dev`
  - `dev:aws` → `aws:dev`
  - `dev:local` → `local:start`
  - `db:start` → `local:db:start`
  - `db:seed` → `local:db:seed`
  - `db:up` → `local:db:up`
  - `start:sam` → `local:sam:start`
  - `watch` → `local:watch`
  - `debug:local` → `local:debug`
  - `test:local:invoke` → `local:invoke`
  - Remove `dev:api` (duplicate of dev:sam)
- [X] T029 [US4] Update local-setup/scripts/ if any scripts reference old names
- [X] T030 [US4] Verify CI/CD workflows don't use renamed scripts (check .github/workflows/*.yml)

**Checkpoint**: スクリプト名統一完了、CI/CD動作確認

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: 最終確認とデグレ検証

- [X] T031 [P] Run `npm run lint` and fix any errors
- [X] T032 [P] Run `npm run type-check` and fix any errors
- [X] T033 Run E2E tests `npm run e2e` to verify no regression
- [X] T034 Update spec.md status from "Draft" to "Complete"
- [X] T035 Final review of all changes and commit

## Phase 8: E2E Test Expansion

**Purpose**: E2Eテストの拡充

- [X] T036 Add edge cases E2E tests (empty input, special chars, long titles)
- [X] T037 Add empty state E2E tests
- [X] T038 Add persistence E2E tests (reload, multiple todos)
- [X] T039 Add multiple operations E2E tests
- [X] T040 Add user journey E2E tests
- [X] T041 Add accessibility E2E tests

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1: Setup
    ↓
Phase 2: Foundational (Architecture fix - BLOCKS US1)
    ↓
Phase 3: US1 Tests ─┬─→ Phase 4: US2 Architecture Verification
                    │
                    └─→ Phase 5: US3 Docs ─→ Phase 6: US4 Scripts
                                                    ↓
                                              Phase 7: Polish
```

### Critical Path

1. **Setup** → **Foundational** → **US1 Tests** → **Polish**

### User Story Dependencies

- **User Story 1 (P1)**: Depends on Foundational (Phase 2) - アーキテクチャ修正後にテスト追加
- **User Story 2 (P2)**: Can start after Phase 2 - アーキテクチャ検証のみ
- **User Story 3 (P3)**: Can start after US4完了 - スクリプト名変更をドキュメントに反映
- **User Story 4 (P4)**: Can start after Phase 2 - 独立して実行可能

### Within Each User Story

- テストは実装前に書く（TDD）
- ファイル単位で並列実行可能

### Parallel Opportunities

- T004, T005 は並列実行可能（異なるファイル）
- T011, T012 は並列実行可能（異なるテストファイル）
- T013-T017 は並列実行可能（異なるテストファイル）
- T024, T025 は並列実行可能（異なるドキュメント）
- T031, T032 は並列実行可能（異なるチェック）

---

## Parallel Example: User Story 1 Handler Tests

```bash
# Launch all handler tests in parallel:
Task T013: "Create CreateTodoHandler test"
Task T014: "Create GetTodoHandler test"
Task T015: "Create ListTodosHandler test"
Task T016: "Create SaveTodoHandler test"
Task T017: "Create ToggleTodoHandler test"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (アーキテクチャ修正)
3. Complete Phase 3: User Story 1 (テストカバレッジ80%)
4. **STOP and VALIDATE**: カバレッジ目標達成確認
5. この時点で主要目的（デグレ検知可能な状態）達成

### Incremental Delivery

1. Setup + Foundational → アーキテクチャ違反修正完了
2. Add US1 → カバレッジ80%達成 → **MVP達成**
3. Add US2 → アーキテクチャ準拠確認
4. Add US4 → スクリプト名統一
5. Add US3 → ドキュメント最新化
6. Polish → E2Eテストでデグレなし確認

---

## Summary

| Phase | タスク数 | 並列可能 |
|-------|---------|---------|
| Phase 1: Setup | 3 | 0 |
| Phase 2: Foundational | 7 | 2 |
| Phase 3: US1 Tests | 10 | 7 |
| Phase 4: US2 Architecture | 3 | 0 |
| Phase 5: US3 Docs | 4 | 2 |
| Phase 6: US4 Scripts | 3 | 0 |
| Phase 7: Polish | 5 | 2 |
| **Total** | **35** | **13** |

### MVP Scope

**User Story 1のみ**でMVP達成（Phase 1-3 + Phase 7の一部）:
- タスク数: 20タスク
- 主要成果: テストカバレッジ80%達成、デグレ検知可能

### Format Validation

✅ 全タスクがチェックリスト形式: `- [ ] [TaskID] [P?] [Story?] Description with file path`
