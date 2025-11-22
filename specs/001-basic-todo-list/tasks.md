# Tasks: 基本ToDoリスト機能

**Input**: Design documents from `specs/001-basic-todo-list/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md (N/A), data-model.md (TBD), contracts/ (TBD)

**Tests**: TDD原則に基づいてテスト先行実装。すべてのテストは実装前にFAILさせる。

**Organization**: Sprint 1（P1×3 ユーザーストーリー）を優先実装。タスクは各ユーザーストーリーごとにグループ化。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 並列実行可能（異なるファイル、依存性なし）
- **[Story]**: ユーザーストーリー（US1=新規作成、US2=表示、US3=完了状態切り替え、US4=削除）
- **ファイルパス**: plan.md で定義された構造に基づく

---

## Phase 1: Setup（共有インフラストラクチャ）✅ COMPLETED

**目的**: プロジェクト初期化と基本構造構築

- [x] T001 [P] プロジェクト構造を plan.md に基づいて作成（src/、tests/、vite.config.ts など）
- [x] T002 [P] npm dependencies インストール（React/Vite、Jest、Playwright、Biome）
- [x] T003 [P] TypeScript 設定（strict モード有効化）
- [x] T004 [P] Jest 設定（coverage thresholds ≥80% ビジネスロジック）
- [x] T005 [P] Playwright 設定（E2E テスト基盤）
- [x] T006 [P] Biome 設定（リント・フォーマット・型チェック）
- [x] T007 [P] Git hooks 設定（pre-commit）
- [x] T008 [P] 開発スクリプト設定（npm run dev、test、lint など）

**Checkpoint**: ✅ 開発環境完全セットアップ完了 → Phase 2 Foundation 開始可能

---

## Phase 2: Foundational（ブロッキング前提条件）✅ COMPLETED

**目的**: すべてのユーザーストーリーの実装前に完成させるべき基盤

**⚠️ CRITICAL**: このフェーズ完了まで、ユーザーストーリー作業は開始できません

### ドメイン層基盤

- [x] T009 [P] `src/domain/entities/Todo.ts` 作成：不変値オブジェクト（id, title, completed, createdAt, updatedAt）
- [x] T010 [P] `src/domain/value-objects/TodoStatus.ts` 作成：Status型（Completed | Pending）
- [x] T011 [P] `src/domain/repositories/TodoRepository.ts` 作成：リポジトリインターフェース（抽象化）
- [x] T012 [P] `src/domain/events/` 作成：ドメインイベント（TodoCreated, TodoCompleted, TodoDeleted）

### アプリケーション層基盤

- [x] T013 [P] `src/application/handlers/CommandHandler.ts` 作成：コマンドハンドラー基底クラス
- [x] T014 [P] `src/application/handlers/QueryHandler.ts` 作成：クエリハンドラー基底クラス
- [x] T015 `src/application/services/TodoApplicationService.ts` 作成：アプリケーションサービス（T009-T014に依存）

### インフラストラクチャ層基盤

- [x] T016 [P] `src/infrastructure/persistence/LocalStorageTodoRepository.ts` 作成：localStorage実装
- [x] T017 [P] `src/infrastructure/config/logger.ts` 作成：Pino構造化ログ設定

### プレゼンテーション層基盤

- [x] T018 [P] `src/presentation/controllers/TodoController.ts` 作成：UseCase⇔UI連携層
- [x] T019 [P] `src/presentation/App.tsx` 作成：ルートコンポーネント
- [x] T020 [P] `src/shared/types.ts` 作成：共通型定義
- [x] T021 [P] `src/index.html` 作成：HTML エントリポイント

**Checkpoint**: ✅ 基盤レイヤー完成 → Phase 3 User Story 1 実装開始可能

---

## Phase 3: User Story 1 - ToDoの新規作成 (Priority: P1) 🎯 MVP ✅ COMPLETED

**Goal**: ユーザーが新しいToDoを素早く作成し、リストに表示されることを確認

**Independent Test**: ToDoを1つ作成し、作成されたToDoがメモリに保存されて、リストに表示される

### テスト（TDD: テスト先行）

- [x] T022 [P] [US1] `tests/unit/domain/entities/Todo.spec.ts`: 新規ToDo作成の単体テスト（FAIL状態から開始）
- [x] T023 [P] [US1] `tests/unit/application/commands/CreateTodoCommand.spec.ts`: CreateTodoCommand テスト
- [x] T024 [P] [US1] `tests/integration/TodoApplicationService.spec.ts`: 新規作成の統合テスト
- [x] T025 [US1] `tests/e2e/create-todo.spec.ts`: E2E テスト「新しいToDoを作成してリストに表示」（Playwright）

### 実装

- [x] T026 [P] [US1] `src/application/commands/CreateTodoCommand.ts` 実装：コマンド定義
- [x] T027 [P] [US1] `src/application/handlers/CreateTodoCommandHandler.ts` 実装：コマンドハンドラー
- [x] T028 [P] [US1] `src/presentation/components/CreateTodoInput.tsx` 実装：入力フォームコンポーネント
- [x] T029 [US1] `src/presentation/hooks/useTodoList.ts` 実装：ToDoリスト管理フック（T026-T028に依存）
- [x] T030 [US1] 検証ロジック追加：空タイトル判定、500文字制限（src/domain/entities/Todo.ts）
- [x] T031 [US1] エラーハンドリング追加：検証失敗時のユーザーメッセージ
- [x] T032 [US1] ログ追加：新規作成操作のstructured ログ

**Checkpoint**: ✅ User Story 1 完全実装・テスト・ドキュメント完成 → 単独でE2E確認可能

---

## Phase 4: User Story 2 - ToDoリストの表示 (Priority: P1) 🎯 MVP

**Goal**: 作成されたすべてのToDoを一覧で確認し、ページリロード後も永続化されている

**Independent Test**: 複数のToDoを作成し、すべてリストに表示され、ブラウザリロード後も保持される

### テスト（TDD: テスト先行）

- [ ] T033 [P] [US2] `tests/unit/application/queries/GetAllTodosQuery.spec.ts`: GetAllTodosQuery テスト
- [ ] T034 [P] [US2] `tests/unit/infrastructure/persistence/LocalStorageTodoRepository.spec.ts`: localStorage永続化テスト
- [ ] T035 [P] [US2] `tests/integration/TodoApplicationService.spec.ts`: リスト取得・永続化の統合テスト
- [ ] T036 [US2] `tests/e2e/display-todos.spec.ts`: E2E テスト「ToDoリスト表示・ページリロード後の永続化」（Playwright）

### 実装

- [ ] T037 [P] [US2] `src/application/queries/GetAllTodosQuery.ts` 実装：クエリ定義
- [ ] T038 [P] [US2] `src/application/handlers/GetAllTodosQueryHandler.ts` 実装：クエリハンドラー
- [ ] T039 [P] [US2] `src/presentation/components/TodoList.tsx` 実装：リスト表示コンポーネント
- [ ] T040 [P] [US2] `src/presentation/components/TodoItem.tsx` 実装：ToDoアイテムコンポーネント
- [ ] T041 [US2] `src/presentation/hooks/useTodoList.ts` 更新：初期化時にlocalStorage から読み込み（T033-T040に依存）
- [ ] T042 [US2] localStorage永続化ロジック実装（src/infrastructure/persistence/LocalStorageTodoRepository.ts）
- [ ] T043 [US2] 空リスト表示メッセージ実装：「ToDoがまだありません」
- [ ] T044 [US2] ログ追加：リスト表示・永続化操作のstructured ログ

**Checkpoint**: User Story 2 完全実装・テスト完成 → US1+US2 でE2E確認可能

---

## Phase 5: User Story 3 - ToDoの完了状態の切り替え (Priority: P1) 🎯 MVP

**Goal**: ユーザーがToDoを完了したとマークでき、状態がページリロード後も保持される

**Independent Test**: ToDoの状態を切り替え、完了状態が即座に反映され、ページリロード後も保持される

### テスト（TDD: テスト先行）

- [ ] T045 [P] [US3] `tests/unit/domain/entities/Todo.spec.ts`: ToDo状態遷移テスト（完了↔未完了）
- [ ] T046 [P] [US3] `tests/unit/application/commands/ToggleTodoCompletionCommand.spec.ts`: ToggleCommand テスト
- [ ] T047 [P] [US3] `tests/integration/TodoApplicationService.spec.ts`: 状態遷移の統合テスト
- [ ] T048 [US3] `tests/e2e/toggle-completion.spec.ts`: E2E テスト「チェックボッククリック→状態変更→永続化」（Playwright）

### 実装

- [ ] T049 [P] [US3] `src/application/commands/ToggleTodoCompletionCommand.ts` 実装：コマンド定義
- [ ] T050 [P] [US3] `src/application/handlers/ToggleTodoCompletionCommandHandler.ts` 実装：コマンドハンドラー
- [ ] T051 [P] [US3] `src/presentation/components/TodoItem.tsx` 更新：チェックボックス実装
- [ ] T052 [US3] ToDo.ts に状態遷移ロジック追加（完了状態トグル、updatedAt 更新）（T049-T051に依存）
- [ ] T053 [US3] UI フィードバック実装：取り消し線表示（完了時）、100ms 以内の視覚的反応
- [ ] T054 [US3] ログ追加：状態遷移操作のstructured ログ

**Checkpoint**: User Story 3 完全実装 → Sprint 1 MVP 完成（US1+US2+US3 全E2E確認）

---

## Phase 6: Testing & QA（Sprint 1 検証）

**目的**: Sprint 1 完成度確認、テストカバレッジ達成

- [ ] T055 テストカバレッジ確認：ビジネスロジック ≥80%、インフラストラクチャ ≥70%
- [ ] T056 E2E テスト実行：3つのUS E2Eフロー全パス確認
- [ ] T057 Biome リント・フォーマット実行：すべてのエラー解決
- [ ] T058 TypeScript strict モード：型チェック完全パス
- [ ] T059 手動テスト：ブラウザで動作確認（Chrome、Firefox、Safari）
- [ ] T060 パフォーマンステスト：リストロード < 1秒、UI反応 < 100ms

**Checkpoint**: Sprint 1 完成・リリース可能

---

## Phase 7: Documentation（Sprint 1 ドキュメント）

- [ ] T061 [P] README.md 作成：プロジェクト概要、セットアップ手順、開発ワークフロー
- [ ] T062 [P] `docs/adr/` ADR作成：重要な設計判断（DDD活用、CQRS分離、localStorage選択理由 など）
- [ ] T063 [P] `docs/DEVELOPMENT.md` 作成：開発環境セットアップ、テスト実行、ビルド手順
- [ ] T064 [P] 各ファイルに JSDoc コメント追加：すべての公開API にドキュメント
- [ ] T065 E2E テスト計画書作成：テスト用例データ、実行手順、トラブルシューティング

**Checkpoint**: ドキュメント完成・チーム内共有準備完了

---

## Phase 8: User Story 4 - ToDoの削除 (Priority: P2)

**開始時期**: Sprint 2（Sprint 1完了後）

**Goal**: ユーザーが不要なToDoを削除できる

**Independent Test**: ToDoを削除し、リストから消え、ページリロード後も削除状態が保持される

### テスト（TDD: テスト先行）

- [ ] T066 [US4] `tests/unit/application/commands/DeleteTodoCommand.spec.ts`: DeleteCommand テスト
- [ ] T067 [US4] `tests/integration/TodoApplicationService.spec.ts`: 削除の統合テスト
- [ ] T068 [US4] `tests/e2e/delete-todo.spec.ts`: E2E テスト「削除ボタンクリック→確認ダイアログ→削除→永続化」

### 実装

- [ ] T069 [US4] `src/application/commands/DeleteTodoCommand.ts` 実装
- [ ] T070 [US4] `src/application/handlers/DeleteTodoCommandHandler.ts` 実装
- [ ] T071 [US4] `src/presentation/components/TodoItem.tsx` 更新：削除ボタン・確認ダイアログ追加
- [ ] T072 [US4] 削除ロジック実装：リポジトリから削除、localStorage 更新
- [ ] T073 [US4] ログ追加：削除操作のstructured ログ

**Checkpoint**: Sprint 2 完成

---

## Legend & Notes

- **[P]**: Parallel - これらのタスクは依存関係がないため、同時実行可能
- **[Story]**: ユーザーストーリー識別子（US1=新規作成、US2=表示、US3=完了状態切り替え、US4=削除）
- **Checkpoint**: フェーズ完了確認ポイント
- **TDD原則**: テストは実装前に作成し、FAIL状態で開始、実装後にPASS

## Success Metrics（Sprint 1）

- ✓ テストカバレッジ ≥80%（ビジネスロジック）
- ✓ すべてのE2E テスト合格
- ✓ TypeScript strict モード 型チェック合格
- ✓ Biome リント・フォーマット合格
- ✓ UI反応時間 < 100ms
- ✓ ドキュメント完成
