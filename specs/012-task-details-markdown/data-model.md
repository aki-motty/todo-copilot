# Data Model: タスク詳細のマークダウン編集機能

**Feature**: 012-task-details-markdown  
**Date**: 2025-11-30  
**Status**: Complete

## Overview

この機能では、既存の `Todo` エンティティに `description` フィールドを追加し、新たに `TodoDescription` 値オブジェクトを導入します。

---

## Domain Model

### Value Objects

#### TodoDescription

タスクの詳細説明を表す値オブジェクト。マークダウン形式のテキストを保持。

```typescript
/**
 * Value object for Todo description
 * Holds markdown-formatted text with a maximum of 10,000 characters
 * 
 * Invariants:
 * - Length must be <= 10,000 characters
 * - Can be empty (unlike TodoTitle)
 */
export class TodoDescription {
  private static readonly MAX_LENGTH = 10000;

  private constructor(private readonly _value: string) {}

  /**
   * Factory method to create a TodoDescription
   * @throws Error if value exceeds MAX_LENGTH
   */
  static create(value: string): TodoDescription {
    if (value.length > TodoDescription.MAX_LENGTH) {
      throw new Error(
        `Description cannot exceed ${TodoDescription.MAX_LENGTH} characters`
      );
    }
    return new TodoDescription(value);
  }

  /**
   * Factory method for empty description
   */
  static empty(): TodoDescription {
    return new TodoDescription('');
  }

  get value(): string {
    return this._value;
  }

  get isEmpty(): boolean {
    return this._value.length === 0;
  }

  get length(): number {
    return this._value.length;
  }

  equals(other: TodoDescription): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
```

**Key Design Decisions**:
- 空の詳細を許容（`empty()` ファクトリメソッド）
- 最大10,000文字の制限
- イミュータブル設計

---

### Entities

#### Todo (拡張)

既存の `Todo` エンティティに `_description` フィールドを追加。

```typescript
export class Todo {
  private constructor(
    private readonly _id: TodoId,
    private readonly _title: TodoTitle,
    private readonly _description: TodoDescription,  // 新規追加
    private readonly _completed: boolean,
    private readonly _createdAt: Date,
    private readonly _updatedAt: Date,
    private readonly _subtasks: Subtask[],
    private readonly _tags: Tag[]
  ) {}

  /**
   * Factory method to create a new Todo
   */
  static create(title: string): Todo {
    const id = brandTodoId(uuidv4());
    const todoTitle = TodoTitle.create(title);
    const now = new Date();

    return new Todo(
      id, 
      todoTitle, 
      TodoDescription.empty(),  // デフォルトは空
      false, 
      now, 
      now, 
      [], 
      []
    );
  }

  /**
   * Recreate Todo from persistence layer
   */
  static fromPersistence(
    id: string,
    title: string,
    completed: boolean,
    createdAt: string,
    updatedAt: string,
    subtasks: { id: string; title: string; completed: boolean }[] = [],
    tags: string[] = [],
    description: string = ''  // 後方互換性のためデフォルト値
  ): Todo {
    return new Todo(
      brandTodoId(id),
      TodoTitle.create(title),
      TodoDescription.create(description),
      completed,
      new Date(createdAt),
      new Date(updatedAt),
      subtasks.map((s) => Subtask.fromPersistence(s.id, s.title, s.completed, id)),
      tags.map((t) => Tag.create(t))
    );
  }

  /**
   * Update todo description
   * Returns a new Todo instance (immutability)
   */
  updateDescription(description: string): Todo {
    return new Todo(
      this._id,
      this._title,
      TodoDescription.create(description),
      this._completed,
      this._createdAt,
      new Date(),  // updatedAt を更新
      this._subtasks,
      this._tags
    );
  }

  // Getter
  get description(): TodoDescription {
    return this._description;
  }

  // 既存のgetterは省略...

  /**
   * Convert to plain object for serialization
   */
  toJSON() {
    return {
      id: this._id,
      title: this._title.value,
      description: this._description.value,  // 新規追加
      completed: this._completed,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
      subtasks: this._subtasks.map((s) => s.toJSON()),
      tags: this._tags.map((t) => t.name),
    };
  }
}
```

---

## Application Layer

### Commands

#### UpdateTodoDescriptionCommand

```typescript
/**
 * Command to update a todo's description
 */
export interface UpdateTodoDescriptionCommand {
  readonly type: 'UpdateTodoDescription';
  readonly todoId: string;
  readonly description: string;
}

export const createUpdateTodoDescriptionCommand = (
  todoId: string,
  description: string
): UpdateTodoDescriptionCommand => ({
  type: 'UpdateTodoDescription',
  todoId,
  description,
});
```

### DTOs

#### TodoDTO (拡張)

```typescript
export interface TodoDTO {
  id: string;
  title: string;
  description: string;  // 新規追加
  completed: boolean;
  status: 'Pending' | 'Completed';
  createdAt: string;
  updatedAt: string;
  subtasks: SubtaskDTO[];
  tags: string[];
  hasDescription: boolean;  // 新規追加: UIでアイコン表示に使用
}
```

---

## Persistence Schema

### localStorage

```json
{
  "todos": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Buy groceries",
      "description": "## Shopping List\n- Milk\n- Eggs\n- Bread",
      "completed": false,
      "createdAt": "2025-11-30T10:00:00.000Z",
      "updatedAt": "2025-11-30T10:30:00.000Z",
      "subtasks": [],
      "tags": []
    }
  ]
}
```

### DynamoDB (Lambda backend)

```yaml
TableName: TodosTable
KeySchema:
  - AttributeName: id
    KeyType: HASH

AttributeDefinitions:
  - AttributeName: id
    AttributeType: S

# Item structure
Item:
  id: { S: "550e8400-e29b-41d4-a716-446655440000" }
  title: { S: "Buy groceries" }
  description: { S: "## Shopping List\n- Milk\n- Eggs" }  # 新規属性
  completed: { BOOL: false }
  createdAt: { S: "2025-11-30T10:00:00.000Z" }
  updatedAt: { S: "2025-11-30T10:30:00.000Z" }
  subtasks: { L: [...] }
  tags: { L: [...] }
```

---

## Entity Relationships

```
┌─────────────────────────────────────────┐
│                 Todo                     │
│  (Aggregate Root)                        │
├─────────────────────────────────────────┤
│  - id: TodoId                            │
│  - title: TodoTitle                      │
│  - description: TodoDescription  [NEW]   │
│  - completed: boolean                    │
│  - createdAt: Date                       │
│  - updatedAt: Date                       │
│  - subtasks: Subtask[]                   │
│  - tags: Tag[]                           │
├─────────────────────────────────────────┤
│  + create(title): Todo                   │
│  + updateDescription(desc): Todo  [NEW]  │
│  + toggleCompletion(): Todo              │
│  + updateTitle(title): Todo              │
│  + addSubtask(title): Todo               │
│  + removeSubtask(id): Todo               │
│  + toggleSubtask(id): Todo               │
│  + addTag(name): Todo                    │
│  + removeTag(name): Todo                 │
└─────────────────────────────────────────┘
           │
           │ contains
           ▼
┌─────────────────────────────────────────┐
│           TodoDescription [NEW]          │
│  (Value Object)                          │
├─────────────────────────────────────────┤
│  - value: string                         │
│  - MAX_LENGTH: 10000                     │
├─────────────────────────────────────────┤
│  + create(value): TodoDescription        │
│  + empty(): TodoDescription              │
│  + isEmpty: boolean                      │
│  + length: number                        │
│  + equals(other): boolean                │
└─────────────────────────────────────────┘
```

---

## Migration Strategy

### 後方互換性

既存のTodoデータに `description` フィールドが存在しない場合、空文字列として扱います。

```typescript
// fromPersistence での処理
static fromPersistence(
  // ... other params
  description: string = ''  // デフォルト値で後方互換性を確保
): Todo {
  return new Todo(
    // ...
    TodoDescription.create(description),
    // ...
  );
}
```

### データマイグレーション不要

- 新規フィールドは任意（空で可）
- 既存データはそのまま読み込み可能
- 保存時に自動的に `description` フィールドが追加される
