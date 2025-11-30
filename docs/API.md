# 📖 API Documentation

> TypeScript JSDoc API reference for todo-copilot

## REST API Reference

The application communicates with a Serverless Backend via REST API.

**Base URL**: `https://{api-id}.execute-api.{region}.amazonaws.com/{stage}`

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/todos` | List all todos (supports pagination) |
| `POST` | `/todos` | Create a new todo |
| `GET` | `/todos/{id}` | Get a single todo by ID |
| `PUT` | `/todos/{id}` | Update a todo |
| `PUT` | `/todos/{id}/toggle` | Toggle todo completion status |
| `PUT` | `/todos/{id}/description` | Update todo description (markdown) |
| `DELETE` | `/todos/{id}` | Delete a todo |
| `GET` | `/tags` | Get list of available tags |
| `POST` | `/todos/{id}/tags` | Add a tag to a todo |
| `DELETE` | `/todos/{id}/tags/{tagName}` | Remove a tag from a todo |

### PUT /todos/{id}/description

Update the description (markdown content) for a specific todo.

**Request Body:**
```json
{
  "description": "# Task Details\n\n- Step 1\n- Step 2\n\n**Important note**"
}
```

**Response (200 OK):**
```json
{
  "status": 200,
  "data": {
    "id": "uuid-string",
    "title": "Todo title",
    "completed": false,
    "description": "# Task Details\n\n- Step 1\n- Step 2\n\n**Important note**",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "meta": {
    "timestamp": "2024-01-01T00:00:00.000Z",
    "requestId": "request-uuid"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Description exceeds maximum length (10,000 characters)
- `404 Not Found` - Todo with specified ID does not exist

**Supported Markdown:**
- Headings (`#`, `##`, `###`, etc.)
- Bold (`**text**`) and Italic (`*text*`)
- Unordered lists (`-` or `*`)
- Ordered lists (`1.`, `2.`, etc.)
- Code blocks (fenced with triple backticks)
- Inline code (single backticks)
- Links (`[text](url)`)
- Blockquotes (`>`)

---

## Table of Contents
1. [Domain Layer](#domain-layer)
2. [Application Layer](#application-layer)
3. [Infrastructure Layer](#infrastructure-layer)
4. [Presentation Layer](#presentation-layer)
5. [Shared Types](#shared-types)

---

## Domain Layer

### Todo (Entity)

```typescript
/**
 * Todo aggregate root representing a single todo item.
 * 
 * Immutable entity with:
 * - UUID identifier
 * - Validated title (1-500 characters)
 * - Completion status (PENDING | COMPLETED)
 * - Timestamps for audit trail
 * 
 * @example
 * const todo = Todo.create('Buy milk');
 * const updated = todo.toggleCompletion();
 * 
 * @class Todo
 */
export class Todo {
  /**
   * Create a new todo with initial PENDING status.
   * 
   * Business rules enforced:
   * - Title must be 1-500 characters
   * - Initial status always PENDING
   * - ID auto-generated (UUID v4)
   * - Timestamps set to current time
   * 
   * @param title - Todo description (validated)
   * @returns New Todo instance (immutable)
   * @throws Error if title validation fails
   * 
   * @example
   * const todo = Todo.create('Complete project');
   * console.log(todo.status); // 'PENDING'
   */
  static create(title: string): Todo;

  /**
   * Deserialize todo from JSON (used by repository).
   * 
   * @param data - Serialized todo object
   * @returns Reconstructed Todo instance
   * 
   * @internal Used by LocalStorageTodoRepository
   */
  static fromJSON(data: any): Todo;

  /**
   * Toggle todo completion status.
   * 
   * Returns new instance with:
   * - Opposite status (PENDING ↔ COMPLETED)
   * - Updated timestamp
   * - All other properties preserved
   * 
   * @returns New Todo instance (original unchanged)
   * 
   * @example
   * const todo = Todo.create('Test');
   * const updated = todo.toggleCompletion();
   * console.log(todo.status);      // 'PENDING' (original)
   * console.log(updated.status);   // 'COMPLETED' (new)
   */
  toggleCompletion(): Todo;

  /**
   * Serialize todo to JSON (for storage).
   * 
   * @returns Plain object with all properties
   * 
   * @internal Used by LocalStorageTodoRepository
   */
  toJSON(): TodoJSON;

  /**
   * Unique identifier for this todo.
   * 
   * @readonly
   * @type {TodoId}
   */
  readonly id: TodoId;

  /**
   * Todo description/title.
   * 
   * @readonly
   * @type {TodoTitle}
   */
  readonly title: TodoTitle;

  /**
   * Current completion status.
   * 
   * @readonly
   * @type {TodoStatus}
   */
  readonly status: TodoStatus;

  /**
   * Timestamp when todo was created.
   * 
   * @readonly
   * @type {Date}
   */
  readonly createdAt: Date;

  /**
   * Timestamp when todo was last modified.
   * 
   * @readonly
   * @type {Date}
   */
  readonly updatedAt: Date;
}
```

### TodoId (Value Object)

```typescript
/**
 * Value object representing a unique todo identifier.
 * 
 * Guarantees:
 * - Immutable
 * - UUID v4 format
 * - Value equality semantics
 * 
 * @class TodoId
 */
export class TodoId {
  /**
   * Generate new unique todo ID.
   * 
   * @returns TodoId with generated UUID
   * 
   * @example
   * const id = TodoId.generate();
   */
  static generate(): TodoId;

  /**
   * Create TodoId from existing UUID string.
   * 
   * @param value - UUID string
   * @returns TodoId instance
   * @throws Error if not valid UUID format
   */
  static create(value: string): TodoId;

  /**
   * Get string representation of ID.
   * 
   * @type {string}
   */
  readonly value: string;

  /**
   * Check equality with another TodoId.
   * 
   * @param other - TodoId to compare
   * @returns true if both have same UUID value
   */
  equals(other: TodoId): boolean;
}
```

### TodoTitle (Value Object)

```typescript
/**
 * Value object representing a todo title/description.
 * 
 * Business rules:
 * - Non-empty (trimmed length ≥ 1)
 * - Maximum 500 characters
 * - Immutable
 * - Automatically trimmed
 * 
 * @class TodoTitle
 */
export class TodoTitle {
  /**
   * Create validated todo title.
   * 
   * @param value - Title string
   * @returns TodoTitle instance
   * @throws Error if empty or > 500 characters
   * 
   * @example
   * const title = TodoTitle.create('Buy groceries');
   * 
   * // Validation examples:
   * TodoTitle.create('');           // ❌ throws (empty)
   * TodoTitle.create('a'.repeat(501)); // ❌ throws (too long)
   * TodoTitle.create('  Valid  ');  // ✅ returns (auto-trimmed)
   */
  static create(value: string): TodoTitle;

  /**
   * Get title string value.
   * 
   * @type {string}
   */
  readonly value: string;

  /**
   * Check equality with another TodoTitle.
   * 
   * @param other - TodoTitle to compare
   * @returns true if both have same value
   */
  equals(other: TodoTitle): boolean;
}
```

### TodoDescription (Value Object)

```typescript
/**
 * Value object representing a todo's detailed description.
 * 
 * Business rules:
 * - Maximum 10,000 characters
 * - Can be empty (optional field)
 * - Supports markdown formatting
 * - Immutable
 * - Automatically trimmed
 * 
 * Supported markdown features:
 * - Headings (h1-h6)
 * - Bold and italic text
 * - Lists (ordered and unordered)
 * - Code blocks and inline code
 * - Links
 * - Blockquotes
 * 
 * @class TodoDescription
 */
export class TodoDescription {
  /**
   * Maximum allowed length for description content.
   * @constant {number}
   */
  static readonly MAX_LENGTH: number = 10000;

  /**
   * Create validated todo description.
   * 
   * @param value - Description string (markdown supported)
   * @returns TodoDescription instance
   * @throws Error if > 10,000 characters
   * 
   * @example
   * const desc = TodoDescription.create('# Project Details\n\n- Task 1\n- Task 2');
   * 
   * // Validation examples:
   * TodoDescription.create('');           // ✅ returns (empty allowed)
   * TodoDescription.create('a'.repeat(10001)); // ❌ throws (too long)
   * TodoDescription.create('  Trimmed  ');  // ✅ returns (auto-trimmed)
   */
  static create(value: string): TodoDescription;

  /**
   * Create an empty description (factory method).
   * 
   * @returns TodoDescription with empty value
   * 
   * @example
   * const emptyDesc = TodoDescription.empty();
   * console.log(emptyDesc.isEmpty()); // true
   */
  static empty(): TodoDescription;

  /**
   * Get description string value.
   * 
   * @type {string}
   */
  readonly value: string;

  /**
   * Get the length of the description content.
   * 
   * @type {number}
   */
  readonly length: number;

  /**
   * Check if description is empty.
   * 
   * @returns true if description has no content
   */
  isEmpty(): boolean;

  /**
   * Check equality with another TodoDescription.
   * 
   * @param other - TodoDescription to compare
   * @returns true if both have same value
   */
  equals(other: TodoDescription): boolean;
}
```

### TodoStatus (Enum)

```typescript
/**
 * Enumeration of possible todo completion states.
 * 
 * @enum {string}
 * 
 * @property {string} PENDING - Todo not yet completed
 * @property {string} COMPLETED - Todo marked as done
 */
export enum TodoStatus {
  /** Todo is not yet completed */
  PENDING = 'PENDING',
  
  /** Todo is completed */
  COMPLETED = 'COMPLETED'
}
```

### ITodoRepository (Interface)

```typescript
/**
 * Repository interface for todo persistence operations.
 * 
 * Abstracts storage layer, allowing multiple implementations:
 * - LocalStorageTodoRepository (current)
 * - IndexedDBTodoRepository (future)
 * - RestApiTodoRepository (future)
 * 
 * All methods are async to support future async storage.
 * 
 * @interface ITodoRepository
 */
export interface ITodoRepository {
  /**
   * Fetch all todos from repository.
   * 
   * @returns Promise resolving to array of all todos
   * @throws StorageError on persistence layer failure
   * 
   * @example
   * const todos = await repository.findAll();
   * console.log(todos.length); // Number of todos
   */
  findAll(): Promise<Todo[]>;

  /**
   * Fetch single todo by ID.
   * 
   * @param id - TodoId to search for
   * @returns Promise resolving to Todo or null if not found
   * @throws StorageError on persistence layer failure
   * 
   * @example
   * const todo = await repository.findById(todoId);
   * if (todo) {
   *   console.log(todo.title.value);
   * }
   */
  findById(id: TodoId): Promise<Todo | null>;

  /**
   * Persist todo to repository.
   * 
   * Creates if new (no existing ID), updates if exists.
   * 
   * @param todo - Todo to persist
   * @throws StorageError if persistence fails
   * @throws QuotaExceededError if storage quota exceeded
   * 
   * @example
   * const newTodo = Todo.create('Test');
   * await repository.save(newTodo);
   */
  save(todo: Todo): Promise<void>;

  /**
   * Remove todo from repository by ID.
   * 
   * @param id - TodoId to delete
   * @throws StorageError if deletion fails
   * 
   * @example
   * await repository.delete(todoId);
   */
  delete(id: TodoId): Promise<void>;
}
```

### Domain Events

```typescript
/**
 * Published when a new todo is created.
 * 
 * @property {TodoId} todoId - ID of created todo
 * @property {string} title - Title of created todo
 * @property {Date} timestamp - When event occurred
 * 
 * @example
 * eventPublisher.on(TodoCreatedEvent, (event) => {
 *   console.log(`Todo created: ${event.title}`);
 * });
 */
export interface TodoCreatedEvent {
  readonly todoId: TodoId;
  readonly title: string;
  readonly timestamp: Date;
}

/**
 * Published when todo completion status changes.
 * 
 * @property {TodoId} todoId - ID of modified todo
 * @property {TodoStatus} newStatus - Updated status
 * @property {Date} timestamp - When event occurred
 */
export interface TodoCompletionToggledEvent {
  readonly todoId: TodoId;
  readonly newStatus: TodoStatus;
  readonly timestamp: Date;
}
```

---

## Application Layer

### Commands

```typescript
/**
 * Command to create a new todo item.
 * 
 * @interface CreateTodoCommand
 * @property {string} title - Todo description (will be validated)
 * 
 * @example
 * const command: CreateTodoCommand = { title: 'Buy milk' };
 * const todo = await todoService.createTodo(command);
 */
export interface CreateTodoCommand {
  readonly title: string;
}

/**
 * Command to toggle a todo's completion status.
 * 
 * @interface ToggleTodoCompletionCommand
 * @property {TodoId} todoId - ID of todo to toggle
 * 
 * @example
 * const command: ToggleTodoCompletionCommand = { todoId: todo.id };
 * const updated = await todoService.toggleTodoCompletion(command);
 */
export interface ToggleTodoCompletionCommand {
  readonly todoId: TodoId;
}

/**
 * Command to delete a todo item.
 * 
 * @interface DeleteTodoCommand
 * @property {TodoId} todoId - ID of todo to delete
 */
export interface DeleteTodoCommand {
  readonly todoId: TodoId;
}
```

### Queries

```typescript
/**
 * Query to retrieve all todos.
 * 
 * No parameters - returns full list.
 * 
 * @interface GetAllTodosQuery
 * 
 * @example
 * const todos = await todoService.getAllTodos({});
 */
export interface GetAllTodosQuery {}

/**
 * Query to retrieve single todo by ID.
 * 
 * @interface GetTodoByIdQuery
 * @property {TodoId} todoId - ID of todo to retrieve
 * 
 * @example
 * const todo = await todoService.getTodoById({ todoId });
 */
export interface GetTodoByIdQuery {
  readonly todoId: TodoId;
}
```

### TodoApplicationService (CQRS Orchestrator)

```typescript
/**
 * Application service orchestrating CQRS commands and queries.
 * 
 * Handles:
 * - Command routing to handlers
 * - Query routing to handlers
 * - Cross-cutting concerns (logging, error handling)
 * - Transaction boundaries
 * 
 * @class TodoApplicationService
 * 
 * @example
 * const service = new TodoApplicationService(repository, eventPublisher);
 * const todo = await service.createTodo({ title: 'Test' });
 * const todos = await service.getAllTodos({});
 * const updated = await service.toggleTodoCompletion({ todoId: todo.id });
 */
export class TodoApplicationService {
  /**
   * Initialize service with repository and event publisher.
   * 
   * @param todoRepository - Repository for persistence
   * @param eventPublisher - Publisher for domain events
   */
  constructor(
    private todoRepository: ITodoRepository,
    private eventPublisher: IEventPublisher
  );

  /**
   * Execute command to create new todo.
   * 
   * @param command - CreateTodoCommand with title
   * @returns Promise resolving to created Todo
   * @throws Error if title validation fails
   * @throws StorageError if persistence fails
   * 
   * @example
   * const todo = await service.createTodo({ title: 'New task' });
   */
  async createTodo(command: CreateTodoCommand): Promise<Todo>;

  /**
   * Execute query to get all todos.
   * 
   * @param query - GetAllTodosQuery (empty parameter object)
   * @returns Promise resolving to array of all todos
   * @throws StorageError if retrieval fails
   * 
   * @example
   * const todos = await service.getAllTodos({});
   * console.log(`Found ${todos.length} todos`);
   */
  async getAllTodos(query: GetAllTodosQuery): Promise<Todo[]>;

  /**
   * Execute command to toggle todo completion.
   * 
   * @param command - ToggleTodoCompletionCommand with todoId
   * @returns Promise resolving to updated Todo
   * @throws Error if todo not found
   * @throws StorageError if persistence fails
   * 
   * @example
   * const updated = await service.toggleTodoCompletion({ todoId });
   * console.log(updated.status);
   */
  async toggleTodoCompletion(
    command: ToggleTodoCompletionCommand
  ): Promise<Todo>;

  /**
   * Execute query to get single todo by ID.
   * 
   * @param query - GetTodoByIdQuery with todoId
   * @returns Promise resolving to Todo or null
   * @throws StorageError if retrieval fails
   * 
   * @example
   * const todo = await service.getTodoById({ todoId });
   */
  async getTodoById(query: GetTodoByIdQuery): Promise<Todo | null>;

  /**
   * Execute command to delete a todo.
   * 
   * @param command - DeleteTodoCommand with todoId
   * @throws Error if todo not found
   * @throws StorageError if deletion fails
   * 
   * @example
   * await service.deleteTodo({ todoId });
   */
  async deleteTodo(command: DeleteTodoCommand): Promise<void>;
}
```

### Command Handlers

```typescript
/**
 * Handler for CreateTodoCommand.
 * 
 * Responsibilities:
 * - Receive command
 * - Create domain entity (with validation)
 * - Persist to repository
 * - Log operation
 * - Return created entity
 * 
 * @class CreateTodoCommandHandler
 */
export class CreateTodoCommandHandler {
  /**
   * Initialize handler with repository.
   * 
   * @param todoRepository - Repository for saving todos
   */
  constructor(private todoRepository: ITodoRepository);

  /**
   * Handle command to create new todo.
   * 
   * @param command - CreateTodoCommand with title
   * @returns Promise resolving to created Todo
   * @throws Error if title validation fails
   * @throws StorageError if save fails
   * 
   * @example
   * const handler = new CreateTodoCommandHandler(repository);
   * const todo = await handler.handle({ title: 'Test' });
   */
  async handle(command: CreateTodoCommand): Promise<Todo>;
}

/**
 * Handler for ToggleTodoCompletionCommand.
 * 
 * Responsibilities:
 * - Fetch todo from repository
 * - Toggle completion status
 * - Persist updated todo
 * - Log operation
   * - Return updated entity
 * 
 * @class ToggleTodoCompletionCommandHandler
 */
export class ToggleTodoCompletionCommandHandler {
  /**
   * Initialize handler with repository.
   * 
   * @param todoRepository - Repository for persistence
   */
  constructor(private todoRepository: ITodoRepository);

  /**
   * Handle command to toggle todo completion.
   * 
   * @param command - ToggleTodoCompletionCommand with todoId
   * @returns Promise resolving to updated Todo
   * @throws Error if todo not found
   * @throws StorageError if save fails
   * 
   * @example
   * const handler = new ToggleTodoCompletionCommandHandler(repository);
   * const updated = await handler.handle({ todoId });
   */
  async handle(
    command: ToggleTodoCompletionCommand
  ): Promise<Todo>;
}
```

---

## Infrastructure Layer

### LocalStorageTodoRepository

```typescript
/**
 * Repository implementation using browser localStorage.
 * 
 * Characteristics:
 * - Synchronous API wrapped in async promises
 * - ~5-10MB storage capacity
 * - Per-origin (domain-specific)
 * - Survives page reloads
 * - Not encrypted
 * 
 * @implements {ITodoRepository}
 * 
 * @example
 * const repository = new LocalStorageTodoRepository();
 * const todos = await repository.findAll();
 */
export class LocalStorageTodoRepository implements ITodoRepository {
  /**
   * Fetch all todos from localStorage.
   * 
   * @returns Promise<Todo[]>
   * @throws StorageError if JSON invalid
   * @throws StorageCorruptionError if data corrupted
   * 
   * @example
   * const todos = await repository.findAll();
   * console.log(`Loaded ${todos.length} todos`);
   */
  async findAll(): Promise<Todo[]>;

  /**
   * Fetch single todo by ID from localStorage.
   * 
   * @param id - TodoId to search for
   * @returns Promise resolving to Todo or null if not found
   * 
   * @example
   * const todo = await repository.findById(todoId);
   */
  async findById(id: TodoId): Promise<Todo | null>;

  /**
   * Save (create or update) todo to localStorage.
   * 
   * @param todo - Todo to persist
   * @throws QuotaExceededError if storage quota exceeded
   * @throws StorageError if save fails
   * 
   * @example
   * const newTodo = Todo.create('Test');
   * await repository.save(newTodo);
   */
  async save(todo: Todo): Promise<void>;

  /**
   * Delete todo from localStorage by ID.
   * 
   * @param id - TodoId to delete
   * @throws StorageError if deletion fails
   * 
   * @example
   * await repository.delete(todoId);
   */
  async delete(id: TodoId): Promise<void>;
}
```

### Logging

```typescript
/**
 * Structured logger using Pino.
 * 
 * Supports:
 * - Multiple log levels (debug, info, warn, error)
 * - Structured logging with context objects
 * - Performance tracking
 * - Error serialization
 * 
 * @example
 * logger.info('Todo created', { id: todo.id, title: todo.title });
 * logger.error('Failed to save', { error });
 */
export const logger: Logger;

/**
 * Log debug message (lowest level).
 * 
 * @param message - Message to log
 * @param context - Optional context object
 * 
 * @example
 * logger.debug('Processing command', { command: 'CreateTodo' });
 */
export function debug(message: string, context?: Record<string, unknown>): void;

/**
 * Log info message.
 * 
 * @param message - Message to log
 * @param context - Optional context object
 * 
 * @example
 * logger.info('Todo created', { todoId: '123', title: 'Test' });
 */
export function info(message: string, context?: Record<string, unknown>): void;

/**
 * Log warning message.
 * 
 * @param message - Message to log
 * @param context - Optional context object
 * 
 * @example
 * logger.warn('Quota approaching', { used: '80%' });
 */
export function warn(message: string, context?: Record<string, unknown>): void;

/**
 * Log error message.
 * 
 * @param message - Message to log
 * @param context - Optional context object (include error if applicable)
 * 
 * @example
 * logger.error('Failed to save', { error: e, todoId: '123' });
 */
export function error(message: string, context?: Record<string, unknown>): void;
```

---

## Presentation Layer

### Components

```typescript
/**
 * Root application component.
 * 
 * Manages:
 * - Application state (todos)
 * - Command/query execution
 * - Component composition
 * 
 * @component
 * 
 * @example
 * import { App } from './App';
 * ReactDOM.render(<App />, document.getElementById('root'));
 */
export const App: React.FC;

/**
 * Displays list of todos with create form.
 * 
 * Features:
 * - Create todo input
 * - Empty state message
 * - Todo list with count
 * - Error display
 * 
 * @component
 * 
 * @example
 * <TodoList />
 */
export const TodoList: React.FC;

/**
 * Single todo item with toggle and delete.
 * 
 * Props:
 * - todo: Todo entity to display
 * - onToggle: Callback when checkbox clicked
 * - onDelete: Callback when delete clicked
 * 
 * Features:
 * - Checkbox for completion toggle
 * - Strikethrough when completed
 * - Delete button
 * - Responsive design
 * 
 * @component
 * 
 * @example
 * <TodoItem
 *   todo={todo}
 *   onToggle={() => handleToggle(todo.id)}
 *   onDelete={() => handleDelete(todo.id)}
 * />
 */
export const TodoItem: React.FC<TodoItemProps>;

/**
 * Input form for creating new todos.
 * 
 * Props:
 * - onSubmit: Callback with title when form submitted
 * 
 * Features:
 * - Character count display
 * - Real-time validation
 * - Error message display
 * - Disabled when creating
 * 
 * @component
 * 
 * @example
 * <CreateTodoInput onSubmit={(title) => createTodo(title)} />
 */
export const CreateTodoInput: React.FC<CreateTodoInputProps>;
```

### Hooks

```typescript
/**
 * Custom hook for managing todo list state and operations.
 * 
 * Returns:
 * - todos: Current array of todos
 * - loading: Whether operation in progress
 * - error: Error message if any
 * - createTodo: Function to create new todo
 * - toggleCompletion: Function to toggle completion
 * - deleteTodo: Function to delete todo
 * 
 * @returns Todo list state and operations
 * 
 * @example
 * const { todos, createTodo, toggleCompletion } = useTodoList();
 */
export function useTodoList(): {
  todos: Todo[];
  loading: boolean;
  error: Error | null;
  createTodo: (title: string) => Promise<void>;
  toggleCompletion: (todoId: TodoId) => Promise<void>;
  deleteTodo: (todoId: TodoId) => Promise<void>;
};
```

---

## Shared Types

### Error Classes

```typescript
/**
 * Base error class for application errors.
 * 
 * @class ApplicationError
 * @extends Error
 */
export class ApplicationError extends Error {
  constructor(message: string);
}

/**
 * Thrown when requested todo not found.
 * 
 * @class NotFoundError
 * @extends ApplicationError
 * 
 * @example
 * throw new NotFoundError('Todo with id 123 not found');
 */
export class NotFoundError extends ApplicationError {}

/**
 * Thrown when storage quota exceeded.
 * 
 * @class QuotaExceededError
 * @extends ApplicationError
 * 
 * @example
 * throw new QuotaExceededError('localStorage is full');
 */
export class QuotaExceededError extends ApplicationError {}

/**
 * Thrown when storage data is corrupted.
 * 
 * @class StorageCorruptionError
 * @extends ApplicationError
 * 
 * @example
 * throw new StorageCorruptionError('Invalid JSON in localStorage');
 */
export class StorageCorruptionError extends ApplicationError {}

/**
 * Generic storage error.
 * 
 * @class StorageError
 * @extends ApplicationError
 * 
 * @example
 * throw new StorageError('Failed to persist todo');
 */
export class StorageError extends ApplicationError {}
```

### Interfaces

```typescript
/**
 * Event publisher interface for domain events.
 * 
 * @interface IEventPublisher
 */
export interface IEventPublisher {
  /**
   * Publish a domain event.
   * 
   * @param event - Event to publish
   */
  publish(event: any): void;

  /**
   * Subscribe to event type.
   * 
   * @param eventType - Constructor of event class
   * @param handler - Callback function
   */
  on(eventType: any, handler: (event: any) => void): void;
}

/**
 * Application service interface (marker).
 * 
 * @interface IApplicationService
 */
export interface IApplicationService {}
```

---

**Last Updated**: November 22, 2025  
**Version**: 1.0.0 (Sprint 1 MVP)
