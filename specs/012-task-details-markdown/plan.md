# Implementation Plan: タスク詳細のマークダウン編集機能

**Branch**: `012-task-details-markdown` | **Date**: 2025-11-30 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/012-task-details-markdown/spec.md`

## Summary

タスクにマークダウン形式の詳細テキストを追加・編集できる機能を実装する。詳細パネル（サイドバー）で編集し、明示的な保存ボタンで保存。マークダウンをHTMLにレンダリングしてプレビュー表示。既存のDDDアーキテクチャに沿い、TodoエンティティにTodoDescription値オブジェクトを追加する。

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)  
**Primary Dependencies**: React 18, Vite, marked（マークダウンパーサー）, DOMPurify（XSSサニタイズ）  
**Storage**: localStorage（既存）、DynamoDB（Lambda backend）  
**Testing**: Jest（unit/integration）、Playwright（E2E）  
**Target Platform**: Web（React SPA）、AWS Lambda  
**Project Type**: Web application（フロントエンド + バックエンド）  
**Performance Goals**: 詳細表示 < 1秒、マークダウンレンダリング < 100ms  
**Constraints**: 詳細は最大10,000文字、XSS攻撃防止必須  
**Scale/Scope**: 既存Todo機能の拡張（100+タスク対応）

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Compliance Notes |
|-----------|--------|------------------|
| I. TDD | ✅ PASS | 失敗テスト先行、Red-Green-Refactorサイクル実施 |
| II. DDD | ✅ PASS | TodoDescription値オブジェクト、Todoアグリゲート拡張 |
| III. 関数型モデリング | ✅ PASS | 不変値オブジェクト、Todoのイミュータブル更新 |
| IV. クリーンアーキテクチャ | ✅ PASS | ドメイン→アプリケーション→プレゼンテーション層の依存 |
| V. CQRS | ✅ PASS | UpdateTodoDescriptionCommand、GetTodoQuery拡張 |
| VI. IaC (Terraform) | ✅ PASS | DynamoDB属性追加（既存スキーマ拡張） |
| VII. サーバーレスAWS | ✅ PASS | Lambda handler拡張 |
| VIII. Google ToDo連携 | N/A | この機能では対象外 |

**Gate Result**: ✅ ALL PASS - Phase 0 research に進む

### Phase 1 後の再評価

| Principle | Status | 設計検証 |
|-----------|--------|----------|
| I. TDD | ✅ PASS | テストファイル構成定義済み (data-model.md参照) |
| II. DDD | ✅ PASS | TodoDescription値オブジェクト設計完了、バリデーションルール定義済み |
| III. 関数型モデリング | ✅ PASS | 不変更新パターン（withDescription）設計済み |
| IV. クリーンアーキテクチャ | ✅ PASS | 層間依存方向検証済み、contracts/にAPI定義 |
| V. CQRS | ✅ PASS | UpdateTodoDescriptionCommand設計完了 |
| VI. IaC (Terraform) | ✅ PASS | DynamoDB description属性追加予定 |
| VII. サーバーレスAWS | ✅ PASS | PUT /todos/{id}/description エンドポイント定義済み |

**Post-Design Gate**: ✅ ALL PASS - Phase 2 タスク生成に進行可能

## Project Structure

### Documentation (this feature)

```text
specs/012-task-details-markdown/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── api-contract.yaml
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── domain/
│   ├── entities/
│   │   └── Todo.ts              # 拡張：description フィールド追加
│   └── value-objects/
│       └── TodoDescription.ts   # 新規：詳細値オブジェクト
├── application/
│   ├── commands/
│   │   └── UpdateTodoDescriptionCommand.ts  # 新規
│   ├── handlers/
│   │   └── UpdateTodoDescriptionHandler.ts  # 新規
│   └── services/
│       └── TodoApplicationService.ts        # 拡張
├── infrastructure/
│   └── repositories/
│       └── LocalStorageTodoRepository.ts    # 拡張：description永続化
├── presentation/
│   ├── components/
│   │   ├── TodoDetailPanel.tsx      # 新規：詳細パネル
│   │   ├── MarkdownEditor.tsx       # 新規：エディタ
│   │   ├── MarkdownPreview.tsx      # 新規：プレビュー
│   │   └── TodoItem.tsx             # 拡張：詳細アイコン
│   └── hooks/
│       └── useTodoDetail.ts         # 新規：詳細編集フック

tests/
├── unit/
│   ├── domain/
│   │   └── TodoDescription.test.ts  # 新規
│   └── application/
│       └── UpdateTodoDescriptionHandler.test.ts  # 新規
├── integration/
│   └── TodoDescriptionFlow.test.ts  # 新規
└── e2e/
    └── todo-detail.spec.ts          # 新規
```

**Structure Decision**: 既存のDDDクリーンアーキテクチャ構造を維持し、各層に新規ファイルを追加。

## Complexity Tracking

> 違反なし - 既存アーキテクチャに沿った標準的な機能追加

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| なし | - | - |
