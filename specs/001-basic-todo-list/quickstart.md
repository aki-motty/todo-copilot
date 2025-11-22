# Quickstart Guide: Basic Todo List Development

**Date**: 2025-11-22  
**Target**: Sprint 1 開発環境セットアップと初期実装

---

## Table of Contents

1. [開発環境セットアップ](#開発環境セットアップ)
2. [プロジェクト構造](#プロジェクト構造)
3. [開発ワークフロー](#開発ワークフロー)
4. [テスト実行](#テスト実行)
5. [ローカルデバッグ](#ローカルデバッグ)
6. [よくある問題](#よくある問題)

---

## 開発環境セットアップ

### 前提条件

- **Node.js**: 18.x 以上
- **npm**: 9.x 以上
- **Git**: 2.x 以上
- **ブラウザ**: Chrome 90+、Firefox 88+、Safari 14+

### ステップ1: リポジトリクローン＆ブランチ切り替え

```bash
cd /workspaces/todo-copilot
git checkout 001-basic-todo-list
```

### ステップ2: 依存パッケージインストール

```bash
npm install
```

**インストールされるパッケージ**:
- React 18.x（UI フレームワーク）
- Vite（ビルドツール）
- Jest（ユニット・統合テスト）
- Playwright（E2E テスト）
- Biome（リント・フォーマット・型チェック）
- TypeScript（型安全性）

### ステップ3: 環境変数設定

```bash
cp .env.example .env.local
```

内容確認（特に設定不要）:

```
VITE_API_BASE_URL=http://localhost:3000/api
NODE_ENV=development
```

### ステップ4: プロジェクト構造確認

```bash
npm run structure
```

以下のディレクトリが生成されたことを確認:

```
src/
  ├── domain/           # ドメインロジック
  ├── application/      # アプリケーションロジック
  ├── infrastructure/   # データ永続化
  ├── presentation/     # UI / React コンポーネント
  └── shared/           # 共有ユーティリティ

tests/
  ├── unit/            # ユニットテスト
  ├── integration/     # 統合テスト
  └── e2e/             # E2E テスト

vite.config.ts
tsconfig.json
jest.config.js
playwright.config.ts
biome.json
package.json
```

---

## プロジェクト構造

### Domain Layer（`src/domain/`）

**責務**: ビジネスロジック、ドメインモデル定義

```
domain/
├── entities/
│   └── Todo.ts              # ToDo集約ルート（不変値オブジェクト）
├── value-objects/
│   └── TodoStatus.ts        # Status値オブジェクト
├── repositories/
│   ├── TodoRepository.ts    # リポジトリインターフェース
│   └── index.ts
├── events/
│   ├── TodoCreated.ts
│   ├── TodoCompleted.ts
│   └── TodoDeleted.ts
└── index.ts                 # エクスポート集約
```

**キー概念**:
- 不変値オブジェクト: `readonly` で読み取り専用
- 集約ルート: `Todo` で状態管理
- 純粋関数: 副作用なし

### Application Layer（`src/application/`）

**責務**: ユースケース、コマンド・クエリ分離（CQRS）

```
application/
├── commands/
│   ├── CreateTodoCommand.ts
│   ├── ToggleTodoCompletionCommand.ts
│   └── DeleteTodoCommand.ts
├── queries/
│   └── GetAllTodosQuery.ts
├── handlers/
│   ├── CommandHandler.ts    # 基底クラス
│   └── QueryHandler.ts      # 基底クラス
└── services/
    └── TodoApplicationService.ts  # コーディネーター
```

### Infrastructure Layer（`src/infrastructure/`）

**責務**: 外部ライブラリ、永続化層、ログ

```
infrastructure/
├── persistence/
│   ├── LocalStorageTodoRepository.ts  # localStorage実装
│   └── index.ts
└── config/
    └── logger.ts            # Pino構造化ログ
```

### Presentation Layer（`src/presentation/`）

**責務**: UI / React コンポーネント、イベントハンドリング

```
presentation/
├── components/
│   ├── TodoList.tsx         # リスト表示
│   ├── TodoItem.tsx         # アイテム表示
│   ├── CreateTodoInput.tsx  # 作成入力
│   └── index.ts
├── hooks/
│   ├── useTodoList.ts       # リスト状態管理
│   └── useTodo.ts           # 単一Todo管理
├── controllers/
│   └── TodoController.ts    # UseCase ↔ UI 連携
├── App.tsx
└── index.tsx
```

---

## 開発ワークフロー

### TDD (Test-Driven Development) サイクル

```
1. RED:   テストを書く（失敗させる）
   └─ 要件を読む → テストで表現 → 実行（FAIL）

2. GREEN: 実装コードを書く（成功させる）
   └─ テストを通すための最小実装 → 実行（PASS）

3. REFACTOR: コードをリファクタリング
   └─ テストを保ちながらコード品質改善
```

### ワークフロー例：ToDoの新規作成（User Story 1）

#### ステップ1: テストファイル作成

```bash
# Domain Entity テスト
touch tests/unit/domain/entities/Todo.spec.ts

# Application UseCase テスト
touch tests/unit/application/commands/CreateTodoCommand.spec.ts

# Integration テスト
touch tests/integration/TodoApplicationService.spec.ts

# E2E テスト
touch tests/e2e/create-todo.spec.ts
```

#### ステップ2: テストコード記述（RED）

```typescript
// tests/unit/domain/entities/Todo.spec.ts
describe('Todo Entity', () => {
  it('should create a new todo with valid title', () => {
    const title = 'Learn DDD';
    const todo = Todo.create(title);
    
    expect(todo.id).toBeDefined();
    expect(todo.title).toBe(title);
    expect(todo.completed).toBe(false);
    expect(todo.createdAt).toBeDefined();
  });

  it('should reject empty title', () => {
    expect(() => Todo.create('')).toThrow('Title cannot be empty');
  });

  it('should reject title exceeding 500 characters', () => {
    const longTitle = 'a'.repeat(501);
    expect(() => Todo.create(longTitle)).toThrow('Title must be <= 500 characters');
  });
});
```

```bash
npm test tests/unit/domain/entities/Todo.spec.ts
# => FAIL (実装まだなし)
```

#### ステップ3: 実装コード記述（GREEN）

```typescript
// src/domain/entities/Todo.ts
import { v4 as uuidv4 } from 'uuid';

export class Todo {
  readonly id: string;
  readonly title: string;
  readonly completed: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(
    id: string,
    title: string,
    completed: boolean,
    createdAt: Date,
    updatedAt: Date
  ) {
    this.id = id;
    this.title = title;
    this.completed = completed;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  static create(title: string): Todo {
    if (!title || title.trim().length === 0) {
      throw new Error('Title cannot be empty');
    }
    if (title.length > 500) {
      throw new Error('Title must be <= 500 characters');
    }

    const now = new Date();
    return new Todo(uuidv4(), title, false, now, now);
  }

  toggleCompletion(): Todo {
    return new Todo(
      this.id,
      this.title,
      !this.completed,
      this.createdAt,
      new Date() // updatedAt は現在時刻に更新
    );
  }
}
```

```bash
npm test tests/unit/domain/entities/Todo.spec.ts
# => PASS ✓
```

#### ステップ4: リファクタリング（REFACTOR）

```typescript
// より厳密な型定義に改善
type TodoId = Branded<string, 'TodoId'>;
type TodoTitle = Branded<string, 'TodoTitle'>;

// エラーを専用クラスに
class InvalidTodoTitleError extends Error {
  constructor(reason: string) {
    super(`Invalid todo title: ${reason}`);
  }
}
```

### コマンドハンドラー実装例

```typescript
// src/application/commands/CreateTodoCommand.ts
export interface CreateTodoCommand {
  title: string;
}

// src/application/handlers/CreateTodoCommandHandler.ts
export class CreateTodoCommandHandler extends CommandHandler<CreateTodoCommand, Todo> {
  constructor(private todoRepository: TodoRepository) {
    super();
  }

  async handle(command: CreateTodoCommand): Promise<Todo> {
    // 1. ドメインロジック実行
    const todo = Todo.create(command.title);

    // 2. リポジトリに保存
    await this.todoRepository.save(todo);

    // 3. ドメインイベント発行（イベントソーシング）
    this.publishEvent(new TodoCreated(todo.id, todo.title, new Date()));

    return todo;
  }
}
```

---

## テスト実行

### ユニットテスト実行

```bash
# すべてのユニットテスト実行
npm run test:unit

# 特定ファイルのテスト実行
npm run test:unit -- tests/unit/domain/entities/Todo.spec.ts

# ウォッチモード（ファイル変更で自動再実行）
npm run test:unit -- --watch

# カバレッジ確認
npm run test:coverage
# => ビジネスロジック ≥80% を確認
```

### 統合テスト実行

```bash
# 統合テスト実行
npm run test:integration

# E2E テスト実行
npm run test:e2e

# 特定のシナリオのみ
npm run test:e2e -- --grep "create-todo"
```

### すべてのテスト実行

```bash
npm test
# => ユニット + 統合 + E2E
```

### テストカバレッジ目標

```
Statements   : 80%+
Branches     : 75%+
Functions    : 80%+
Lines        : 80%+
```

確認方法:

```bash
npm run test:coverage
# => coverage/ フォルダに HTML レポート生成
open coverage/index.html
```

---

## ローカルデバッグ

### 開発サーバー起動

```bash
npm run dev

# または

npm run dev -- --open  # ブラウザ自動起動
```

**出力例**:

```
  VITE v5.0.0  ready in 123 ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

### ブラウザで確認

```
http://localhost:5173
```

新規Todo作成、リスト表示、完了状態の切り替えが動作することを確認。

### デバッグツール

#### Chrome DevTools

```
F12キー → Sources → ブレークポイント設定 → コード実行確認
```

#### localStorage 確認

```javascript
// ブラウザコンソール
localStorage.getItem('todo_app:todos')
// => JSON配列表示
```

#### ログ確認

```javascript
// src/infrastructure/config/logger.ts で構造化ログを有効化
logger.info('Creating todo', { title: 'Learn DDD' });
// => JSON形式で出力
```

---

## Code Quality Checks

### Biome リント・フォーマット

```bash
# リント実行
npm run lint

# フォーマット実行
npm run format

# 自動修正
npm run lint:fix
```

### TypeScript 型チェック

```bash
npm run type-check
# => strict モード で完全型チェック
```

### Pre-commit フック設定

```bash
# 初回セットアップ
npm run prepare

# commit 時に自動実行
# - Biome リント・フォーマット
# - TypeScript 型チェック
# - Jest ユニットテスト
```

---

## よくある問題

### Q1: localStorage がリセットされた

**原因**: ブラウザストレージがクリアされた

**対応**:

```javascript
// localStorage 内容確認
console.log(localStorage.getItem('todo_app:todos'));

// 手動で復元
localStorage.setItem('todo_app:todos', JSON.stringify([...]));

// テストデータを使用（tests/fixtures/test-data.ts）
import { seedTestData } from '../fixtures/test-data';
seedTestData();
```

### Q2: テストが「timeout」で失敗する

**原因**: 非同期処理がタイムアウト

**対応**:

```typescript
describe('Async Operation', () => {
  it('should complete within timeout', async () => {
    const result = await someAsyncFunction();
    expect(result).toBe(expected);
  }, 5000); // タイムアウト5秒に拡大
});
```

### Q3: E2E テスト がブラウザを起動できない

**原因**: Playwright ブラウザバイナリが未インストール

**対応**:

```bash
npx playwright install
npx playwright install-deps
npm run test:e2e
```

### Q4: `npm install` でエラーが出る

**原因**: Node.js バージョンが古い

**対応**:

```bash
node --version          # 18.x 以上か確認
npm --version           # 9.x 以上か確認

# バージョンアップが必要な場合
# https://nodejs.org/ja/ から LTS 版をダウンロード
```

---

## Key Commands Reference

| コマンド | 説明 |
|---------|------|
| `npm run dev` | 開発サーバー起動 |
| `npm test` | すべてのテスト実行 |
| `npm run test:unit` | ユニットテストのみ |
| `npm run test:e2e` | E2E テストのみ |
| `npm run lint` | Biome リント実行 |
| `npm run format` | Biome フォーマット実行 |
| `npm run type-check` | TypeScript 型チェック |
| `npm run build` | 本番ビルド |
| `npm run preview` | 本番ビルドをローカル確認 |

---

## Sprint 1 Checklist

開発を開始する前に、以下をチェック:

- [ ] Node.js 18+ インストール完了
- [ ] `npm install` 完了
- [ ] `npm run dev` で開発サーバー起動確認
- [ ] ブラウザで http://localhost:5173 にアクセス可能
- [ ] localStorage 動作確認：DevTools で確認
- [ ] `npm test` で基本テスト実行確認
- [ ] VSCode 拡張：Biome、TypeScript拡張インストール
- [ ] `npm run lint` でエラーなし確認

準備完了！User Story 1 の実装を開始してください。

---

## Links & Resources

- [DDD in TypeScript](https://github.com/stemmlerjs/ddd-forum)
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [CQRS Pattern](https://www.martinfowler.com/bliki/CQRS.html)
- [React 18 Documentation](https://react.dev)
- [Jest Testing](https://jestjs.io)
- [Playwright E2E](https://playwright.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

**Next Step**: `tasks.md` の T001-T008 を実行してプロジェクト構造を構築してください。
