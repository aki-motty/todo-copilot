# Data Model: 基本ToDoリスト機能

**Feature**: Basic Todo List  
**Date**: 2025-11-22  
**Architecture**: DDD（ドメイン駆動設計）+ CQRS分離

---

## Domain Model Overview

```
集約ルート: ToDo
  ├─ 値オブジェクト: TodoId (UUID)
  ├─ 値オブジェクト: TodoTitle (string, 非空, ≤500文字)
  ├─ 値オブジェクト: TodoStatus (Completed | Pending)
  ├─ 値オブジェクト: Timestamp (ISO 8601)
  └─ ドメインイベント: TodoCreated, TodoCompleted, TodoDeleted
```

---

## Core Entities

### Entity: ToDo （集約ルート）

**責務**: タスクのライフサイクル管理、状態遷移ロジック  
**不変性**: 不変値オブジェクトとして設計

```typescript
// TypeScript型定義（実装ガイド）

/**
 * ToDoエンティティ - 集約ルート
 * 不変値オブジェクト：作成後は変更不可、新しいインスタンスで状態遷移を表現
 */
interface ToDo {
  // アイデンティティ
  readonly id: TodoId;              // UUID: 一意の識別子
  
  // ビジネス属性
  readonly title: TodoTitle;        // 値オブジェクト: タスク名（1-500文字）
  readonly completed: TodoStatus;   // 値オブジェクト: 完了状態（Completed | Pending）
  
  // メタデータ
  readonly createdAt: Timestamp;    // 作成時刻（ISO 8601）
  readonly updatedAt: Timestamp;    // 最終更新時刻（ISO 8601）
}

/**
 * TodoId - 値オブジェクト
 * UUIDによる一意識別子
 */
type TodoId = Branded<string, 'TodoId'>;

/**
 * TodoTitle - 値オブジェクト
 * ビジネスルール: 非空、1-500文字
 */
type TodoTitle = Branded<string, 'TodoTitle'>;

/**
 * TodoStatus - 値オブジェクト
 * ビジネスルール: 完了 | 未完了の2状態のみ
 */
type TodoStatus = 'Completed' | 'Pending';

/**
 * Timestamp - 値オブジェクト
 * ISO 8601形式
 */
type Timestamp = Branded<string, 'Timestamp'>;
```

### Value Object: TodoStatus

**責務**: ToDoの完了状態を表現  
**可能な値**:
- `Pending`: 未完了（初期状態）
- `Completed`: 完了

**状態遷移図**:
```
    Pending
      ↕
   Completed
```

### Value Object: TodoTitle

**検証ルール**:
- 必須：空文字列は不可
- 長さ制限：1-500文字
- エスケープ: XSS対策済み

---

## Domain Events

### Event: TodoCreated

```typescript
interface TodoCreated {
  readonly type: 'TodoCreated';
  readonly aggregateId: TodoId;
  readonly title: TodoTitle;
  readonly timestamp: Timestamp;
}
```

**発生タイミング**: 新しいToDoが作成された直後  
**消費者**: リスト表示画面、監査ログ

### Event: TodoCompleted

```typescript
interface TodoCompleted {
  readonly type: 'TodoCompleted';
  readonly aggregateId: TodoId;
  readonly timestamp: Timestamp;
}
```

**発生タイミング**: ToDoが未完了→完了に状態遷移した直後  
**消費者**: UI更新、分析ログ

### Event: TodoDeleted

```typescript
interface TodoDeleted {
  readonly type: 'TodoDeleted';
  readonly aggregateId: TodoId;
  readonly timestamp: Timestamp;
}
```

**発生タイミング**: ToDoが削除された直後  
**消費者**: リスト更新、監査ログ

---

## Repository Pattern

### TodoRepository （インターフェース）

**責務**: ToDoの永続化と取得を抽象化  
**実装**: LocalStorageTodoRepository（初版）

```typescript
interface TodoRepository {
  /**
   * 新しいToDoを保存
   * @param todo - 保存対象のToDoエンティティ
   * @throws - ストレージ満杯時にエラーをスロー
   */
  save(todo: ToDo): Promise<void>;
  
  /**
   * 指定IDのToDoを取得
   * @param id - ToDoID
   * @returns - ToDoエンティティ、存在しない場合はnull
   */
  findById(id: TodoId): Promise<ToDo | null>;
  
  /**
   * すべてのToDoを取得
   * @returns - ToDoエンティティの配列（作成順）
   */
  findAll(): Promise<ToDo[]>;
  
  /**
   * 指定IDのToDoを削除
   * @param id - ToDoID
   */
  remove(id: TodoId): Promise<void>;
  
  /**
   * ストレージをクリア（テスト用）
   */
  clear(): Promise<void>;
}
```

### Implementation: LocalStorageTodoRepository

**永続化戦略**: ブラウザのlocalStorage API  
**ストレージキー**: `todo_app:todos` (JSON配列)  
**容量制限**: 典型5-50MB（ブラウザ依存）

**エラーハンドリング**:
- `QuotaExceededError`: ストレージ満杯 → ユーザーへ警告表示
- JSON parse errors: 破損データ → 初期化時にクリア

---

## Invariants & Business Rules

### ToDo エンティティの不変条件

1. **ID一意性**: 作成時に割り当てられたIDは変更不可
2. **タイトル非空**: タイトルは1文字以上500文字以下
3. **状態のみ可変**: 状態遷移は Pending ↔ Completed のみ
4. **タイムスタンプ**: createdAtは作成時の値を保持、updatedAtは各状態変更時に更新
5. **イミュータビリティ**: エンティティ作成後は直接変更不可、新しいインスタンスで表現

### ビジネスルール

1. **一意識別**: 各ToDoはUUIDで一意に識別
2. **完了状態追跡**: 完了状態の変更履歴（イベント）を監査ログで追跡可能
3. **永続化**: すべての状態変更はストレージに即座に反映
4. **削除の永続化**: 削除されたToDoはストレージから完全に削除

---

## Aggregate Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│                    ToDo Aggregate Lifecycle                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. CREATE: new ToDo(id, title, Pending, now)              │
│     └─> Event: TodoCreated                                 │
│     └─> Repository.save(todo)                              │
│     └─> Query: ListTodos が新ToDoを表示                    │
│                                                              │
│  2. STATE TRANSITION (Pending → Completed):                 │
│     └─> todo.toggleCompletion() → new ToDo(...Completed)  │
│     └─> Event: TodoCompleted                               │
│     └─> Repository.save(updated_todo)                      │
│     └─> Query: ListTodos が状態更新を反映                 │
│                                                              │
│  3. STATE TRANSITION (Completed → Pending):                 │
│     └─> todo.toggleCompletion() → new ToDo(...Pending)    │
│     └─> Event: TodoUncompleted                             │
│     └─> Repository.save(updated_todo)                      │
│                                                              │
│  4. DELETE: Repository.remove(todo.id)                      │
│     └─> Event: TodoDeleted                                 │
│     └─> Query: ListTodos が削除を反映                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## CQRS Separation

### Command Side（書き込み）

**責務**: 状態変更を処理し、ドメインイベントを生成

```
User Action (CreateTodo / ToggleCompletion / DeleteTodo)
    ↓
  Command Handler
    ↓
  Domain Logic (ToDo aggregate)
    ↓
  Domain Event Emission
    ↓
  Repository.save()
    ↓
  localStorage Updated
```

### Query Side（読み取り）

**責務**: 最適化された読み取りモデルから高速に取得

```
User Action (ListTodos)
    ↓
  Query Handler
    ↓
  Repository.findAll()
    ↓
  localStorage Read
    ↓
  DTOに変換して返却
    ↓
  UI表示
```

**最終一貫性戦略**: localStorage は即座に同期されるため、初版ではカマンドと同期的に処理

---

## Data Transfer Objects (DTO)

### CreateTodoDTO

```typescript
interface CreateTodoDTO {
  title: string;  // バリデーション: 1-500文字
}
```

### TodoResponseDTO

```typescript
interface TodoResponseDTO {
  id: string;           // UUID
  title: string;
  completed: boolean;
  createdAt: string;    // ISO 8601
  updatedAt: string;    // ISO 8601
}
```

### ListTodosResponseDTO

```typescript
interface ListTodosResponseDTO {
  todos: TodoResponseDTO[];
  count: number;
}
```

---

## Storage Schema (localStorage)

```json
{
  "todo_app:todos": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "title": "明日の会議",
      "completed": false,
      "createdAt": "2025-11-22T10:30:00Z",
      "updatedAt": "2025-11-22T10:30:00Z"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "title": "レポート作成",
      "completed": true,
      "createdAt": "2025-11-22T09:15:00Z",
      "updatedAt": "2025-11-22T14:00:00Z"
    }
  ]
}
```

---

## Validation Rules

| エンティティ | フィールド | ルール | エラーメッセージ |
|------------|----------|-------|-----------------|
| ToDo | title | 非空、1-500文字 | "タイトルは1-500文字で入力してください" |
| ToDo | completed | true \| false | 自動（値オブジェクト） |
| ToDo | id | UUID v4 | 自動生成 |
| ToDo | createdAt | ISO 8601 | 自動生成（現在時刻） |
| ToDo | updatedAt | ISO 8601 | 自動更新（状態変更時） |

---

## Error Handling

| エラー | 原因 | 対応 |
|--------|------|------|
| ValidationError | タイトル が空または長すぎる | ユーザーへ入力エラーメッセージ表示 |
| QuotaExceededError | localStorage 満杯 | ユーザーへ警告「ストレージ容量を解放してください」 |
| StorageCorruptionError | JSON parse失敗 | ストレージをクリア・ユーザーへ通知「データを初期化しました」 |

---

## Testing Strategy

### ユニットテスト（Jest）

- ToDo エンティティ生成・状態遷移
- TodoTitle、TodoStatus 値オブジェクト検証
- ドメインイベント発行

### 統合テスト（Jest）

- TodoRepository CRUD操作
- localStorage 永続化・復元
- コマンド・クエリハンドラー統合

### E2E テスト（Playwright）

- UI から ToDo作成→表示→状態切り替え→削除の完全フロー
- ページリロード後の永続化確認
