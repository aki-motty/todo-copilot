# Tasks: タスク詳細のマークダウン編集機能

**Input**: Design documents from `/specs/012-task-details-markdown/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: TDDアプローチに従い、各ユーザーストーリーでテストを先行して作成します。

**Organization**: タスクはユーザーストーリーごとに整理され、各ストーリーの独立した実装とテストを可能にします。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 並列実行可能（異なるファイル、依存関係なし）
- **[Story]**: このタスクが属するユーザーストーリー（US1, US2, US3）
- 説明には正確なファイルパスを含める

## Path Conventions

- **Source**: `src/` at repository root
- **Tests**: `tests/` at repository root
- Domain: `src/domain/`
- Application: `src/application/`
- Infrastructure: `src/infrastructure/`
- Presentation: `src/presentation/`

---

## Phase 1: Setup (共有インフラストラクチャ)

**Purpose**: 新機能に必要な依存関係のインストールとプロジェクト準備

- [X] T001 Install marked and DOMPurify dependencies with `npm install marked dompurify && npm install --save-dev @types/dompurify`
- [X] T002 [P] Create markdown utility module structure at src/shared/utils/markdown.ts
- [X] T003 [P] Add TypeScript types for marked library configuration

---

## Phase 2: Foundational (ブロッキング前提条件)

**Purpose**: 全ユーザーストーリーに必要なコアドメインコンポーネント

**⚠️ CRITICAL**: このフェーズが完了するまでユーザーストーリーの作業を開始できません

### Domain Layer - Value Objects

- [X] T004 Create TodoDescription value object in src/domain/value-objects/TodoDescription.ts
- [X] T005 [P] Add TodoDescription unit tests in tests/unit/domain/value-objects/TodoDescription.test.ts
- [X] T006 Export TodoDescription from src/domain/value-objects/index.ts

### Domain Layer - Entity Extension

- [X] T007 Extend Todo entity with description field in src/domain/entities/Todo.ts
- [X] T008 [P] Add updateDescription method to Todo entity in src/domain/entities/Todo.ts
- [X] T009 Update Todo.toJSON() to include description in src/domain/entities/Todo.ts
- [X] T010 [P] Update Todo unit tests for description field in tests/unit/domain/entities/Todo.description.test.ts

### Domain Layer - Events

- [X] T011 Create TodoDescriptionUpdatedEvent in src/domain/events/TodoEvents.ts
- [X] T012 Export TodoDescriptionUpdatedEvent from src/domain/events/index.ts

### Infrastructure Layer - Repository

- [X] T013 Update LocalStorageTodoRepository to persist description in src/infrastructure/persistence/LocalStorageTodoRepository.ts
- [X] T014 [P] Add migration logic for existing todos without description (default to empty string)
- [X] T015 [P] Update repository tests for description persistence in tests/unit/infrastructure/LocalStorageTodoRepository.test.ts

### Shared Utilities

- [X] T016 Implement renderMarkdown utility with XSS sanitization in src/shared/utils/markdown.ts
- [X] T017 [P] Add markdown utility unit tests in tests/unit/shared/markdown.test.ts

**Checkpoint**: ドメイン層とインフラ層の基盤が完成。ユーザーストーリー実装を開始可能

---

## Phase 3: User Story 1 - タスク詳細の追加・編集 (Priority: P1) 🎯 MVP

**Goal**: タスクに詳細な説明を追加・編集・保存できる

**Independent Test**: タスクを選択し、詳細を入力・保存。ページリロード後も詳細が保持されていることを確認

### Application Layer for User Story 1

- [X] T018 [US1] Create UpdateTodoDescriptionCommand in src/application/commands/UpdateTodoDescriptionCommand.ts
- [X] T019 [US1] Create UpdateTodoDescriptionCommandHandler in src/application/handlers/UpdateTodoDescriptionCommandHandler.ts
- [X] T020 [P] [US1] Add handler unit tests in tests/unit/application/UpdateTodoDescriptionCommandHandler.test.ts
- [X] T021 [US1] Register handler in TodoApplicationService at src/application/services/TodoApplicationService.ts
- [X] T022 [US1] Export command from src/application/commands/index.ts

### Presentation Layer for User Story 1

- [X] T023 [US1] Create useTodoDetail hook in src/presentation/hooks/useTodoDetail.ts
- [X] T024 [P] [US1] Create TodoDetailPanel component in src/presentation/components/TodoDetailPanel.tsx
- [X] T025 [US1] Create MarkdownEditor component in src/presentation/components/MarkdownEditor.tsx
- [X] T026 [US1] Add unsaved changes warning logic to TodoDetailPanel
- [X] T027 [US1] Update TodoItem component with detail icon indicator in src/presentation/components/TodoItem.tsx
- [X] T028 [US1] Integrate TodoDetailPanel into main App layout at src/presentation/App.tsx
- [X] T029 [P] [US1] Add CSS styles for TodoDetailPanel in src/presentation/components/TodoDetailPanel.css

### Integration Tests for User Story 1

- [X] T030 [US1] Create integration test for description save flow in tests/integration/TodoDescriptionFlow.test.ts
- [X] T031 [P] [US1] Create E2E test for add/edit description in tests/e2e/todo-detail.spec.ts

**Checkpoint**: ユーザーストーリー1が完全に機能し、独立してテスト可能

---

## Phase 4: User Story 2 - マークダウンプレビュー (Priority: P2)

**Goal**: 入力したマークダウンの表示を事前にプレビューで確認できる

**Independent Test**: 編集モードでマークダウン記法を入力し、プレビュー表示に切り替えたときに正しくレンダリングされることを確認

### Presentation Layer for User Story 2

- [X] T032 [US2] Create MarkdownPreview component in src/presentation/components/MarkdownPreview.tsx
- [X] T033 [P] [US2] Add MarkdownPreview unit tests in tests/unit/presentation/MarkdownPreview.test.ts
- [X] T034 [US2] Add edit/preview toggle to TodoDetailPanel in src/presentation/components/TodoDetailPanel.tsx
- [X] T035 [US2] Integrate MarkdownPreview into TodoDetailPanel
- [X] T036 [P] [US2] Add CSS styles for MarkdownPreview in src/presentation/components/MarkdownPreview.css

### Integration Tests for User Story 2

- [X] T037 [US2] Add E2E test for preview toggle in tests/e2e/todo-detail.spec.ts

**Checkpoint**: ユーザーストーリー1と2が両方とも独立して機能

---

## Phase 5: User Story 3 - マークダウン書式のサポート (Priority: P3)

**Goal**: 一般的なマークダウン書式（見出し、リスト、リンク、太字、斜体、コードブロック）を正しくレンダリング

**Independent Test**: 各マークダウン記法を入力し、プレビューで正しく表示されることを確認

### Markdown Support for User Story 3

- [X] T038 [US3] Configure marked options for full markdown support in src/shared/utils/markdown.ts
- [X] T039 [P] [US3] Add comprehensive markdown rendering tests in tests/unit/shared/markdown.test.ts
- [X] T040 [US3] Add CSS styling for rendered markdown elements in src/presentation/components/MarkdownPreview.css
- [X] T041 [P] [US3] Style headings (h1-h6) in markdown output
- [X] T042 [P] [US3] Style lists (ordered and unordered) in markdown output
- [X] T043 [P] [US3] Style code blocks and inline code in markdown output
- [X] T044 [US3] Ensure links open in new tab with noopener noreferrer

### Integration Tests for User Story 3

- [X] T045 [US3] Add E2E tests for each markdown format type in tests/e2e/todo-detail.spec.ts

**Checkpoint**: 全ユーザーストーリーが独立して機能

---

## Phase 6: Lambda Backend Extension

**Purpose**: Lambda バックエンドでの description フィールドサポート

- [X] T046 Update Lambda handler to support description field in src/index.lambda.ts
- [X] T047 [P] Update DynamoDB schema documentation for description attribute
- [X] T048 Add Lambda integration tests for description endpoint in tests/integration/lambda-description.test.ts

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: 複数のユーザーストーリーに影響する改善

- [X] T049 [P] Update API.md documentation in docs/API.md
- [X] T050 [P] Update E2E_TEST_PLAN.md with description feature tests in docs/E2E_TEST_PLAN.md
- [X] T051 Code cleanup and refactoring across all new components
- [X] T052 [P] Performance optimization for large markdown content
- [X] T053 Security audit for XSS prevention
- [X] T054 Run quickstart.md validation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 依存関係なし - すぐに開始可能
- **Foundational (Phase 2)**: Setup完了に依存 - 全ユーザーストーリーをブロック
- **User Stories (Phase 3-5)**: Foundationalフェーズの完了に依存
  - ユーザーストーリーは並列で進行可能（リソースがあれば）
  - または優先順位順に順次進行（P1 → P2 → P3）
- **Lambda Backend (Phase 6)**: User Story 1完了後に開始可能
- **Polish (Phase 7)**: 全ユーザーストーリー完了後

### User Story Dependencies

- **User Story 1 (P1)**: Foundational (Phase 2) 完了後に開始可能 - 他のストーリーに依存しない
- **User Story 2 (P2)**: US1のTodoDetailPanel (T024) に依存（プレビュー切り替えを追加するため）
- **User Story 3 (P3)**: US2のMarkdownPreview (T032) に依存（スタイリングを追加するため）

### Within Each User Story

- テストを先に作成し、実装前に失敗することを確認（TDD）
- モデル → サービス → エンドポイント の順序
- コア実装 → 統合の順序
- 次の優先度に移る前にストーリーを完了

### Parallel Opportunities

- Setup Phase: T002, T003 は並列実行可能
- Foundational Phase: T005, T010, T015, T017 は並列実行可能
- User Story 1: T020, T024, T029, T031 は並列実行可能
- User Story 2: T033, T036 は並列実行可能
- User Story 3: T039, T041, T042, T043 は並列実行可能

---

## Parallel Example: User Story 1

```bash
# 並列実行可能なテストタスク:
Task T020: "Add handler unit tests in tests/unit/application/UpdateTodoDescriptionCommandHandler.test.ts"
Task T031: "Create E2E test for add/edit description in tests/e2e/todo-detail.spec.ts"

# 並列実行可能なコンポーネントタスク:
Task T024: "Create TodoDetailPanel component in src/presentation/components/TodoDetailPanel.tsx"
Task T029: "Add CSS styles for TodoDetailPanel in src/presentation/components/TodoDetailPanel.css"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup 完了
2. Phase 2: Foundational 完了 (CRITICAL - 全ストーリーをブロック)
3. Phase 3: User Story 1 完了
4. **STOP and VALIDATE**: User Story 1 を独立してテスト
5. 準備ができたらデプロイ/デモ

### Incremental Delivery

1. Setup + Foundational 完了 → 基盤準備完了
2. User Story 1 追加 → 独立テスト → デプロイ/デモ (MVP!)
3. User Story 2 追加 → 独立テスト → デプロイ/デモ
4. User Story 3 追加 → 独立テスト → デプロイ/デモ
5. Lambda Backend 追加 → 統合テスト → デプロイ
6. 各ストーリーが前のストーリーを壊さずに価値を追加

### Estimated Effort

| Phase | Tasks | Estimated Time |
|-------|-------|----------------|
| Phase 1: Setup | 3 | 0.5 hours |
| Phase 2: Foundational | 14 | 3 hours |
| Phase 3: User Story 1 | 14 | 4 hours |
| Phase 4: User Story 2 | 6 | 2 hours |
| Phase 5: User Story 3 | 8 | 2 hours |
| Phase 6: Lambda Backend | 3 | 1.5 hours |
| Phase 7: Polish | 6 | 2 hours |
| **Total** | **54** | **15 hours** |

---

## Notes

- [P] タスク = 異なるファイル、依存関係なし
- [Story] ラベルはタスクを特定のユーザーストーリーにマッピング
- 各ユーザーストーリーは独立して完了・テスト可能
- 実装前にテストが失敗することを確認
- 各タスクまたは論理グループの後にコミット
- 任意のチェックポイントで停止してストーリーを独立して検証可能
- 避けるべき: 曖昧なタスク、同一ファイルの競合、独立性を壊すクロスストーリー依存
