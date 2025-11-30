# Implementation Plan: Codebase Refactoring & Quality Improvement

**Branch**: `011-codebase-refactor` | **Date**: 2025-11-30 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/011-codebase-refactor/spec.md`

## Summary

コードベースの品質向上を目的とし、以下を実施：
1. Domain層・Application層のテストカバレッジを80%以上に引き上げ
2. DDD/クリーンアーキテクチャ違反の修正
3. ドキュメント最新化
4. NPMスクリプト名の `環境:アクション` 形式への統一

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 18+  
**Primary Dependencies**: React 18, Vite, Jest, Playwright, Biome  
**Storage**: DynamoDB (AWS), localStorage (ブラウザ)  
**Testing**: Jest (unit/integration), Playwright (E2E)  
**Target Platform**: Web (SPA) + AWS Lambda  
**Project Type**: Web application (frontend + serverless backend)  
**Performance Goals**: P99 < 500ms API latency  
**Constraints**: 既存機能のデグレなし、API互換性維持  
**Scale/Scope**: Domain層5ファイル、Application層15ファイル

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Design Check (Phase 0)

| 原則 | ステータス | 詳細 |
|------|-----------|------|
| I. TDD | ✅ Pass | テスト拡充が本フィーチャーの主目的 |
| II. DDD | ⚠️ 違反あり | Application層がInfrastructure層のロガーを直接参照 |
| III. 関数型ドメインモデリング | ✅ Pass | エンティティは不変、純粋関数で構成 |
| IV. クリーンアーキテクチャ | ⚠️ 違反あり | 依存方向の違反（logger import） |
| V. CQRS | ✅ Pass | Command/Query分離済み |
| VI. IaC (Terraform) | ✅ Pass | 変更なし |
| VII. サーバーレスAWS | ✅ Pass | 変更なし |

### Post-Design Check (Phase 1)

| 原則 | ステータス | 詳細 |
|------|-----------|------|
| I. TDD | ✅ Pass | テスト追加計画策定済み |
| II. DDD | ✅ 修正計画あり | ILoggerインターフェース導入で依存逆転 |
| III. 関数型ドメインモデリング | ✅ Pass | 変更なし |
| IV. クリーンアーキテクチャ | ✅ 修正計画あり | Application層はポート（インターフェース）に依存 |
| V. CQRS | ✅ Pass | 変更なし |
| VI. IaC (Terraform) | ✅ Pass | 変更なし |
| VII. サーバーレスAWS | ✅ Pass | 変更なし |

**発見された違反（修正対象）**:
1. `src/application/services/TodoApplicationService.ts` → `infrastructure/config/logger` を直接import
2. `src/application/handlers/DeleteTodoCommandHandler.ts` → `infrastructure/config/logger` を直接import

## Architecture Compliance (Post-Implementation)

**実施日**: 2025-11-30

### 修正完了

以下のアーキテクチャ違反を修正完了：

1. **ILogger インターフェース導入** (`src/application/ports/ILogger.ts`)
   - Application層のポートとしてロガーインターフェースを定義
   - `debug`, `info`, `warn`, `error` メソッドを標準化

2. **依存性注入の適用**
   - `TodoApplicationService`: コンストラクタでILoggerを受け取る
   - `DeleteTodoCommandHandler`: コンストラクタでILoggerを受け取る

3. **Infrastructure層の実装**
   - `ConsoleLogger` (`src/infrastructure/config/logger.ts`) がILoggerを実装

### 検証結果

```bash
# Domain層の外部依存チェック
grep -r "from.*application|from.*infrastructure|from.*presentation" src/domain/
# 結果: 該当なし ✅

# Application層の依存チェック
grep -r "from.*infrastructure|from.*presentation" src/application/
# 結果: 該当なし ✅
```

**結論**: クリーンアーキテクチャの依存方向（内向きのみ）が遵守されています。

## Project Structure

### Documentation (this feature)

```text
specs/011-codebase-refactor/
├── plan.md              # This file ✅
├── research.md          # Phase 0 output ✅
├── data-model.md        # Phase 1 output ✅
├── quickstart.md        # Phase 1 output ✅
├── contracts/           # Phase 1 output ✅
└── tasks.md             # Phase 2 output ✅
```

## Phase Completion Status

| Phase | Status | Output |
|-------|--------|--------|
| Phase 0: Research | ✅ Complete | `research.md` |
| Phase 1: Design | ✅ Complete | `data-model.md`, `contracts/`, `quickstart.md` |
| Phase 2: Tasks | ✅ Complete | `tasks.md` (35 tasks, 13 parallel) |

### Source Code (repository root)

```text
src/
├── domain/              # ビジネスロジック（テストカバレッジ目標: 90%）
│   ├── entities/        # Todo, Subtask
│   ├── value-objects/   # Tag, TodoId, TodoTitle
│   ├── events/          # TodoEvents
│   └── repositories/    # ITodoRepository interface
├── application/         # ユースケース（テストカバレッジ目標: 80%）
│   ├── commands/        # Command definitions
│   ├── queries/         # Query definitions
│   ├── handlers/        # Command/Query handlers
│   ├── services/        # TodoApplicationService
│   ├── dto/             # Data Transfer Objects
│   └── errors/          # Application errors
├── infrastructure/      # 外部依存（カバレッジ対象外）
│   ├── api/             # ApiTodoRepository, HttpClient
│   ├── persistence/     # LocalStorageTodoRepository
│   ├── repositories/    # DynamoDBTodoRepository
│   ├── lambda/          # Lambda handlers
│   ├── config/          # logger, apiConfig
│   └── services/        # todoApiClient, dataMigration
├── presentation/        # UI層（カバレッジ対象外）
│   ├── components/      # React components
│   ├── hooks/           # Custom hooks
│   ├── controllers/     # UI controllers
│   └── providers/       # Context providers
└── shared/              # 共有ユーティリティ
    ├── types.ts
    └── api/types.ts

tests/
├── unit/
│   ├── domain/          # Domain層テスト
│   ├── application/     # Application層テスト
│   ├── infrastructure/  # Infrastructure層テスト（既存のみ）
│   └── presentation/    # Presentation層テスト
├── integration/         # 統合テスト
└── e2e/                 # E2Eテスト（Playwright）
```

**Structure Decision**: 既存構造を維持。アーキテクチャ違反の修正はロガーインターフェースの抽出とDI導入で対応。

## Complexity Tracking

| 違反 | 必要な理由 | より単純な代替案を却下した理由 |
|------|-----------|------------------------------|
| ロガーの抽象化導入 | Application層からInfrastructure層への依存を解消 | 直接importは依存方向違反、テスト困難性の原因 |

## Current Test Coverage Analysis

### Domain層（目標: 90%）
| ファイル | Statements | Branches | Functions | Lines |
|---------|------------|----------|-----------|-------|
| Todo.ts | 92.3% | 77.77% ⚠️ | 86.66% ⚠️ | 93.87% |
| Subtask.ts | 100% | 100% | 100% | 100% |
| Tag.ts | 87.5% ⚠️ | 100% | 75% ⚠️ | 87.5% ⚠️ |
| TodoId.ts | 100% | 100% | 100% | 100% |
| TodoTitle.ts | 100% | 100% | 100% | 100% |
| TodoEvents.ts | 100% | 100% | 100% | 100% |

### Application層（目標: 80%）
| ファイル | Statements | Branches | Functions | Lines |
|---------|------------|----------|-----------|-------|
| TodoApplicationService.ts | 71.42% ⚠️ | 63.63% ⚠️ | 76.92% ⚠️ | 71.11% ⚠️ |
| CreateTodoHandler.ts | 0% ⚠️ | 0% ⚠️ | 0% ⚠️ | 0% ⚠️ |
| GetTodoHandler.ts | 0% ⚠️ | 0% ⚠️ | 0% ⚠️ | 0% ⚠️ |
| ListTodosHandler.ts | 0% ⚠️ | 0% ⚠️ | 0% ⚠️ | 0% ⚠️ |
| SaveTodoHandler.ts | 0% ⚠️ | 0% ⚠️ | 0% ⚠️ | 0% ⚠️ |
| ToggleTodoHandler.ts | 0% ⚠️ | 0% ⚠️ | 0% ⚠️ | 0% ⚠️ |
| AddTagHandler.ts | テスト存在 | - | - | - |
| RemoveTagHandler.ts | テスト存在 | - | - | - |

## NPM Script Naming Plan

### 現在 → 新規

| 現在 | 新規 | 説明 |
|------|------|------|
| `dev` | `dev` | ローカル開発サーバー（変更なし） |
| `dev:api` | 削除 | `dev:sam`と重複 |
| `dev:sam` | `local:dev` | SAM経由のローカル開発 |
| `dev:aws` | `aws:dev` | AWS dev環境接続 |
| `dev:local` | `local:start` | ローカル環境一括起動 |
| `db:start` | `local:db:start` | ローカルDB起動 |
| `db:seed` | `local:db:seed` | ローカルDBシード |
| `db:up` | `local:db:up` | ローカルDB起動+シード |
| `start:sam` | `local:sam:start` | SAMサーバー起動 |
| `watch` | `local:watch` | Lambda watchビルド |
| `debug:local` | `local:debug` | ローカルデバッグ |
| `test:local:invoke` | `local:invoke` | Lambda手動実行 |
| `build` | `build` | フロントエンドビルド（変更なし） |
| `build:lambda` | `build:lambda` | Lambdaビルド（変更なし） |
| `build:all` | `build:all` | 全ビルド（変更なし） |
| `test` | `test` | テスト実行（変更なし） |
| `test:watch` | `test:watch` | テストウォッチ（変更なし） |
| `test:coverage` | `test:coverage` | カバレッジ（変更なし） |
| `e2e` | `e2e` | E2Eテスト（変更なし） |
| `e2e:api` | `e2e:api` | API E2Eテスト（変更なし） |
| `e2e:ui` | `e2e:ui` | E2E UI（変更なし） |
| `lint` | `lint` | リント（変更なし） |
| `format` | `format` | フォーマット（変更なし） |
| `check` | `check` | チェック（変更なし） |
| `type-check` | `type-check` | 型チェック（変更なし） |
