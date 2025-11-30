# 📚 クイックスタートガイド - タスク詳細機能

## 概要

この機能は、タスクにマークダウン形式の詳細説明を追加できるようにします。

## 前提条件

- Node.js 18.x 以上
- npm または yarn
- プロジェクトの依存関係がインストール済み

## セットアップ

### 1. 依存関係の追加

```bash
npm install marked dompurify
npm install --save-dev @types/dompurify
```

### 2. 開発サーバーの起動

```bash
npm run dev
```

## 実装ステップ

### Phase 2: ドメイン層

1. **TodoDescription バリューオブジェクト作成**
   - `src/domain/value-objects/TodoDescription.ts`
   - 空文字許可、最大10,000文字

2. **Todo エンティティ拡張**
   - `description` フィールド追加
   - `updateDescription()` メソッド追加

3. **ドメインイベント追加**
   - `TodoDescriptionUpdatedEvent`

### Phase 3: アプリケーション層

1. **コマンド作成**
   - `UpdateTodoDescriptionCommand`

2. **ハンドラ作成**
   - `UpdateTodoDescriptionCommandHandler`

3. **クエリ拡張**
   - `GetTodosQuery` に description 含める

### Phase 4: インフラストラクチャ層

1. **リポジトリ更新**
   - LocalStorage: description フィールド追加
   - Lambda: DynamoDB スキーマ更新

2. **マイグレーション**
   - 既存データに `description: ""` 追加

### Phase 5: プレゼンテーション層

1. **コンポーネント作成**
   - `TodoDetailPanel.tsx` - サイドバーパネル
   - `MarkdownEditor.tsx` - 編集エリア
   - `MarkdownPreview.tsx` - プレビュー表示

2. **アイコンインジケータ**
   - 詳細ありタスクにアイコン表示

## テスト実行

```bash
# ユニットテスト
npm test

# E2Eテスト
npm run test:e2e
```

## 関連ドキュメント

- [仕様書](./spec.md)
- [データモデル](./data-model.md)
- [APIコントラクト](./contracts/api-contract.yaml)
- [リサーチ](./research.md)
