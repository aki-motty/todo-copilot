# Data Model: Codebase Refactoring

**Feature**: 011-codebase-refactor  
**Date**: 2025-11-30

## 1. 新規追加エンティティ

### ILogger インターフェース

Application層で使用するロガーの抽象化。

```typescript
// src/application/ports/ILogger.ts

export interface ILogger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}
```

**用途**:
- Application層からInfrastructure層への依存を解消
- テスト時にモックロガーを注入可能に

## 2. 既存エンティティの変更

### TodoApplicationService

**変更点**: ロガー依存をインターフェース経由に変更

```typescript
// Before
import { createLogger } from "../../infrastructure/config/logger";

// After
import type { ILogger } from "../ports/ILogger";

class TodoApplicationService {
  constructor(
    private readonly todoRepository: ITodoRepository,
    private readonly tagRepository: ITagRepository,
    private readonly logger: ILogger  // 追加
  ) {}
}
```

### DeleteTodoCommandHandler

**変更点**: ロガー依存をインターフェース経由に変更

```typescript
// Before
import { createLogger } from "../../infrastructure/config/logger";

// After
import type { ILogger } from "../ports/ILogger";

class DeleteTodoCommandHandler {
  constructor(
    private readonly todoRepository: ITodoRepository,
    private readonly logger: ILogger  // 追加
  ) {}
}
```

## 3. 状態遷移

本リファクタリングでは状態遷移の変更なし。
既存のTodoの状態（未完了↔完了）は維持。

## 4. バリデーションルール

変更なし。既存のバリデーションルールを維持。

## 5. テストカバレッジ目標

| レイヤー | 対象 | 現状 | 目標 |
|---------|------|------|------|
| Domain | Todo.ts | 94% | 95%+ |
| Domain | Tag.ts | 75% | 90%+ |
| Application | TodoApplicationService | 71% | 80%+ |
| Application | Handlers | 0% | 80%+ |
