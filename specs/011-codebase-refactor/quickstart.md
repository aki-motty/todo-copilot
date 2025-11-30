# Quickstart: Codebase Refactoring

**Feature**: 011-codebase-refactor  
**Branch**: `011-codebase-refactor`

## 前提条件

- Node.js 18以上
- npm 8以上
- Docker（ローカルDynamoDB用）

## セットアップ

```bash
# ブランチに切り替え
git checkout 011-codebase-refactor

# 依存関係インストール
npm install

# テスト実行（カバレッジ確認）
npm test -- --coverage
```

## 開発ワークフロー

### 1. テスト追加

```bash
# 特定ファイルのテスト実行
npm test -- tests/unit/application/handlers/CreateTodoHandler.test.ts

# カバレッジ付きで実行（Domain+Application層のみ）
npm test -- --coverage \
  --collectCoverageFrom='src/domain/**/*.ts' \
  --collectCoverageFrom='src/application/**/*.ts'
```

### 2. アーキテクチャ違反チェック

```bash
# Domain層からInfrastructure層への依存を検出
grep -r "from.*infrastructure" src/domain/ src/application/
```

### 3. リント

```bash
npm run lint
```

### 4. ローカル動作確認

```bash
# ローカル開発サーバー起動
npm run dev

# ブラウザで http://localhost:5173 を開く
```

### 5. ローカルSAMテスト

```bash
# SAMローカル起動（新しいスクリプト名に変更後）
npm run local:dev

# または docker-compose
cd local-setup && docker compose up -d
```

## 主要ファイル

| ファイル | 説明 |
|---------|------|
| `src/application/ports/ILogger.ts` | ロガーインターフェース（新規） |
| `src/application/services/TodoApplicationService.ts` | アプリケーションサービス |
| `src/application/handlers/*.ts` | コマンド/クエリハンドラー |
| `tests/unit/application/handlers/*.test.ts` | ハンドラーテスト（新規） |

## カバレッジ目標

- Domain層: 90%以上
- Application層: 80%以上

## NPMスクリプト（新規命名）

| 旧名 | 新名 | 説明 |
|------|------|------|
| `dev:sam` | `local:dev` | SAMローカル起動 |
| `dev:docker-sam` | `local:docker` | Docker SAM起動 |
| `invoke:local` | `local:invoke` | ローカルLambda呼び出し |
| `deploy:tf` | `aws:deploy` | Terraform適用 |
| `destroy:tf` | `aws:destroy` | Terraform破棄 |

## 完了条件

1. [X] Domain層カバレッジ 90%以上 (達成: 100%)
2. [X] Application層カバレッジ 80%以上 (達成: 93%)
3. [X] アーキテクチャ違反ゼロ
4. [ ] NPMスクリプト名変更完了
5. [ ] ドキュメント更新完了
