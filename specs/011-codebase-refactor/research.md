# Research: Codebase Refactoring & Quality Improvement

**Feature**: 011-codebase-refactor  
**Date**: 2025-11-30

## 1. テストカバレッジ拡充戦略

### Decision: 振る舞い駆動テスト（BDD）アプローチを採用

**Rationale**:
- 実装詳細ではなくビジネス振る舞いをテストすることで、リファクタリング耐性が高まる
- Given-When-Thenパターンでテストの意図が明確になる
- 仕様書のAcceptance Scenariosと直接対応させやすい

**Alternatives considered**:
1. ホワイトボックステスト - 実装に依存しすぎ、リファクタリング時に壊れやすい
2. スナップショットテスト - UIには有効だがロジックテストには不向き

### テスト追加対象の優先順位

1. **Domain層** (最優先 - 90%目標)
   - `Todo.ts` のブランチカバレッジ向上（77% → 90%）
   - `Tag.ts` の関数カバレッジ向上（75% → 90%）

2. **Application層** (高優先 - 80%目標)
   - `CreateTodoHandler.ts` - 新規テスト追加
   - `GetTodoHandler.ts` - 新規テスト追加
   - `ListTodosHandler.ts` - 新規テスト追加
   - `SaveTodoHandler.ts` - 新規テスト追加
   - `ToggleTodoHandler.ts` - 新規テスト追加
   - `TodoApplicationService.ts` - カバレッジ拡充

## 2. アーキテクチャ違反の修正方針

### Decision: ロガーインターフェースの抽出とDI（依存性注入）

**発見された違反**:
```typescript
// src/application/services/TodoApplicationService.ts
import { createLogger } from "../../infrastructure/config/logger";

// src/application/handlers/DeleteTodoCommandHandler.ts
import { createLogger } from "../../infrastructure/config/logger";
```

**修正方針**:
1. `src/application/ports/ILogger.ts` にロガーインターフェースを定義
2. `src/infrastructure/config/logger.ts` で実装
3. Application層はインターフェース経由でロガーを使用
4. DIコンテナまたはファクトリパターンで注入

**Rationale**:
- 依存性逆転の原則（DIP）に準拠
- テスト時にモックロガーを注入可能
- Infrastructure層の変更がApplication層に影響しない

**Alternatives considered**:
1. ロガーをDomain層に移動 - Domain層は純粋なビジネスロジックのみであるべき
2. グローバルロガー使用 - テスト困難、依存が暗黙的

### 修正後の依存関係

```
Domain層 ← Application層 ← Infrastructure層
    ↑           ↑
    └───────────┴── Presentation層
```

Application層は `ILogger` インターフェースに依存し、Infrastructure層が実装を提供。

## 3. NPMスクリプト命名規則

### Decision: `環境:アクション` 形式を採用

**命名規則**:
- `local:*` - ローカル開発環境関連
- `aws:*` - AWS環境関連
- `build:*` - ビルド関連
- `test:*` - テスト関連
- `e2e:*` - E2Eテスト関連

**Rationale**:
- 環境を先に置くことで、どの環境向けのコマンドか一目でわかる
- タブ補完時に環境でグループ化される
- CI/CDパイプラインでの使用時に環境別の分岐が容易

**Alternatives considered**:
1. `アクション:環境` 形式 - アクションが先だと環境の区別がしにくい
2. フラットな命名 - グループ化の恩恵が得られない

## 4. ドキュメント更新方針

### Decision: 段階的更新アプローチ

**更新順序**:
1. README.md - 新しいNPMスクリプト名を反映
2. DEVELOPMENT.md - 開発手順を最新化
3. API.md - 必要に応じて更新（今回は変更なし想定）

**Rationale**:
- スクリプト名変更と同時にドキュメントを更新することで不整合を防ぐ
- 新規参加者がすぐに開発を始められる状態を維持

## 5. CI/CDへの影響分析

### Decision: GitHub Actionsワークフローの同時更新

**確認対象**:
- `.github/workflows/app-ci.yml`
- `.github/workflows/terraform-ci.yml`

**NPMスクリプト参照箇所**:
- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run e2e`

**結論**: 上記のスクリプト名は変更しないため、CI/CDへの影響なし。
ローカル開発用スクリプト（`local:*`）のみ変更するため、ワークフローの修正は不要。
