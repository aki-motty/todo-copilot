# Implementation Plan: 基本ToDoリスト機能

**Branch**: `001-basic-todo-list` | **Date**: 2025-11-22 | **Spec**: [specs/001-basic-todo-list/spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-basic-todo-list/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

シンプルなToDoリスト管理Webアプリケーション。ユーザーが日次タスクを作成、表示、完了状態の切り替え、削除できる。第1版はブラウザのローカルストレージを使用したシングルユーザー対応。Sprint 1でP1ユーザーストーリー3つ（新規作成、表示、完了状態切り替え）を実装し、最小限のMVPで価値を迅速に提供。

## Technical Context

**Language/Version**: TypeScript 5.x、Node.js 18+  
**Primary Dependencies**: 
- Frontend: React 18+ または Vanilla JS（Vite でバンドル）
- Testing: Jest（ユニット・統合）、Playwright（E2E）
- Code Quality: Biome（リント・フォーマット・型チェック）

**Storage**: ブラウザのローカルストレージAPI（`localStorage`）  
**Testing**: Jest + Playwright（構成化テスト）  
**Target Platform**: モダンブラウザ（Chrome 90+、Firefox 88+、Safari 14+）  
**Project Type**: フロントエンド単体（初版）  
**Performance Goals**: 
- ToDoリスト表示：1秒以内
- UI インタラクション反応：100ms以内
- 最大1000個のToDoを効率的に管理

**Constraints**: 
- ブラウザストレージ容量（典型5-50MB）
- JavaScriptが無効な場合は基本メッセージ表示
- ローカルストレージが満杯の場合はユーザーへ警告

**Scale/Scope**: 
- 単一ユーザー、複数デバイス非対応
- 初版スコープ：P1ユーザーストーリー3つ
- 拡張フェーズ：P2削除機能、Google ToDo連携

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### 原則適合性評価

| 原則 | 適合 | 実装戦略 |
|------|------|---------|
| **I. テスト駆動開発（TDD）** | ✓ | すべてのユースケースについてJest テストを先行記述。Red-Green-Refactor 厳密実行 |
| **II. ドメイン駆動設計（DDD）** | ✓ | ToDo 集約、値オブジェクト（Status など）、リポジトリパターン（localStorage 抽象化） |
| **III. 関数型ドメインモデリング** | ✓ | ToDoエンティティを不変値オブジェクトとして設計。状態遷移は純粋関数 |
| **IV. クリーンアーキテクチャ** | ✓ | 4層分離：Entity（ToDo）→ UseCase（AddToDo等）→ Interface（Controller）→ Framework（React/localStorage） |
| **V. CQRS アーキテクチャ** | ✓ | Command（CreateToDo, ToggleComplete）と Query（ListToDos）を分離。イベントソーシング基盤 |
| **VI. IaC（Terraform）** | N/A | 初版はブラウザストレージのみ。インフラ不要。後続フェーズで DynamoDB に移行時に Terraform 適用 |
| **VII. サーバーレス AWS** | N/A | 初版はクライアント側のみ。後続フェーズ（Google ToDo連携）で Lambda/DynamoDB/API Gateway 導入 |
| **VIII. Google ToDo連携** | Out of Scope | 後続フェーズ。初版は双方向同期なし |

**GATE STATUS**: ✓ **PASS** - すべての該当原則に準拠。Out of Scope 項目は明記済み

### 技術スタック準拠性

- **TypeScript strict モード**: ✓ 有効化予定
- **JSDoc コメント**: ✓ すべての公開API に記述
- **テストカバレッジ**: ✓ ビジネスロジック ≥80%、UI層 ≥70%
- **Biome**: ✓ リント・フォーマット・型チェック統合
- **Jest + Playwright**: ✓ ユニット・統合・E2E テスト実装

## Project Structure

### Documentation (this feature)

```text
specs/001-basic-todo-list/
├── plan.md              # This file (implementation plan)
├── spec.md              # Feature specification
├── data-model.md        # Phase 1: Data model & domain logic
├── quickstart.md        # Phase 1: Developer quickstart
├── contracts/           # Phase 1: API contracts (OpenAPI/GraphQL)
│   └── openapi.yaml     # REST API specification
├── checklists/
│   └── requirements.md  # Quality checklist
└── tasks.md             # Phase 2: Detailed development tasks
```

### Source Code (repository root)

```text
# Frontend-only structure (Initial Version)
src/
├── domain/                      # DDD: Entity layer (最も変わらない)
│   ├── entities/
│   │   └── Todo.ts              # ToDo集約ルート（不変値オブジェクト）
│   ├── value-objects/
│   │   └── TodoStatus.ts        # Status値オブジェクト（Completed | Pending）
│   ├── repositories/
│   │   ├── TodoRepository.ts    # リポジトリインターフェース（抽象化）
│   │   └── index.ts
│   └── events/
│       ├── TodoCreated.ts
│       ├── TodoCompleted.ts
│       └── TodoDeleted.ts
│
├── application/                 # DDD: UseCase層
│   ├── commands/
│   │   ├── CreateTodoCommand.ts
│   │   ├── ToggleTodoCompletionCommand.ts
│   │   └── DeleteTodoCommand.ts
│   ├── queries/
│   │   └── GetAllTodosQuery.ts
│   ├── handlers/
│   │   ├── CommandHandler.ts    # コマンドハンドラー基底
│   │   └── QueryHandler.ts      # クエリハンドラー基底
│   └── services/
│       └── TodoApplicationService.ts
│
├── infrastructure/              # DDD: Framework層（最も変わりやすい）
│   ├── persistence/
│   │   ├── LocalStorageTodoRepository.ts  # localStorage実装
│   │   └── index.ts
│   └── config/
│       └── logger.ts            # Pino構造化ログ
│
├── presentation/                # インターフェース層
│   ├── components/              # React コンポーネント（UI層）
│   │   ├── TodoList.tsx
│   │   ├── TodoItem.tsx
│   │   ├── CreateTodoInput.tsx
│   │   └── index.ts
│   ├── hooks/                   # React カスタムフック
│   │   ├── useTodoList.ts
│   │   └── useTodo.ts
│   ├── controllers/
│   │   └── TodoController.ts    # UseCase⇔ UI 連携
│   ├── App.tsx
│   └── index.tsx
│
├── shared/
│   ├── types.ts                 # 共通型定義
│   ├── constants.ts
│   └── utils.ts
│
└── index.html

tests/
├── unit/                        # ユニットテスト
│   ├── domain/
│   │   ├── entities/
│   │   │   └── Todo.spec.ts
│   │   ├── value-objects/
│   │   │   └── TodoStatus.spec.ts
│   │   └── repositories/
│   │       └── TodoRepository.spec.ts
│   ├── application/
│   │   ├── commands/
│   │   │   ├── CreateTodoCommand.spec.ts
│   │   │   └── ToggleTodoCompletionCommand.spec.ts
│   │   └── queries/
│   │       └── GetAllTodosQuery.spec.ts
│   └── infrastructure/
│       └── persistence/
│           └── LocalStorageTodoRepository.spec.ts
│
├── integration/                 # 統合テスト
│   ├── TodoApplicationService.spec.ts
│   └── E2E flows
│
└── e2e/                         # E2E テスト（Playwright）
    ├── create-todo.spec.ts
    ├── display-todos.spec.ts
    ├── toggle-completion.spec.ts
    └── fixtures/
        └── test-data.ts

vite.config.ts                   # Vite ビルド設定
tsconfig.json                    # TypeScript 設定（strict mode）
jest.config.js                   # Jest 設定
playwright.config.ts             # Playwright E2E 設定
biome.json                        # Biome リント・フォーマット設定
package.json                      # npm 依存管理
.env.example                      # 環境変数例
README.md                         # プロジェクト概要
```

**Structure Decision**: 
- **フロントエンドのみ構成**: React/Vanilla JS + Vite（初版スコープ）
- **レイヤー分離**: DDD に基づいた4層構造で依存関係逆転を実現
- **テスト戦略**: ユニット（ドメイン・アプリケーション層）→ 統合（UseCase）→ E2E（UI フロー）
- **拡張戦略**: 後続フェーズで backend/ ディレクトリを追加し、API Gateway/Lambda/DynamoDB を統合

## Complexity Tracking

> **No violations of Constitution principles. All design decisions are fully justified and aligned with project principles.**

| 項目 | 判定 | 説明 |
|------|------|------|
| TDD適用 | ✓ Green | すべてのユースケースについてテストを先行記述 |
| DDD適用 | ✓ Green | 集約、値オブジェクト、リポジトリパターンを完全実装 |
| クリーンアーキテクチャ | ✓ Green | 4層分離で依存関係逆転を実現 |
| 関数型パターン | ✓ Green | ToDoエンティティは不変値オブジェクト、状態遷移は純粋関数 |
| テストカバレッジ | ✓ Target ≥80% | ビジネスロジック・UI層ともに80%以上を目指す |
| 複雑度（Cyclomatic） | ✓ Target ≤10 | すべての関数で循環的複雑度10以下に制限 |

---

## Development Phases (Sprint Planning)

### Phase 1: Sprint 1 - MVP Code Foundation

**Duration**: Week 1-2  
**Scope**: P1 ユーザーストーリー×3（新規作成、表示、完了状態切り替え）  
**Deliverables**: 
- ドメインロジック完成（ToDo集約、値オブジェクト、リポジトリ）
- フロントエンドUI完成（React/Vanilla JS）
- ユニット・統合テスト（≥80% カバレッジ）
- E2E テスト（主要フロー3つ）

**Key Outcomes**:
- 最小MVPで動作確認可能
- アーキテクチャ評価実施
- TDD / DDD / クリーンアーキテクチャ の実装パターン確立

### Phase 2: Sprint 2 - Enhancement

**Scope**: P2 ユーザーストーリー×1（削除機能）  
**Key**: 削除機能はSprint 1 アーキテクチャの同じパターンで実装

### Phase 3+: Future Phases

**Google ToDo連携**: 後続フェーズで以下を追加
- Backend: Lambda/API Gateway/DynamoDB/EventBridge（Terraform IaC）
- OAuth 2.0 認証フロー
- 双方向同期ロジック
- 監査ログ
