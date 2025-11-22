import { v4 as uuidv4 } from "uuid";

/**
 * Branded type for unique Todo identifiers
 * Ensures type safety at compile time while maintaining string at runtime
 */
export type TodoId = string & { readonly __brand: "TodoId" };

const brandTodoId = (id: string): TodoId => id as TodoId;

/**
 * Value object for Todo title
 * Enforces invariants: 1-500 characters, non-empty
 */
export class TodoTitle {
  private constructor(private readonly _value: string) {
    if (!_value || _value.trim().length === 0) {
      throw new Error("Todo title cannot be empty");
    }
    if (_value.length > 500) {
      throw new Error("Todo title cannot exceed 500 characters");
    }
  }

  static create(value: string): TodoTitle {
    return new TodoTitle(value.trim());
  }

  get value(): string {
    return this._value;
  }

  equals(other: TodoTitle): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}

/**
 * Value object for Todo status
 * Represents the completion state of a todo
 */
export type TodoStatus = "Pending" | "Completed";

/**
 * Todo aggregate root
 * Core entity representing a todo item with immutable state
 */
export class Todo {
  private constructor(
    private readonly _id: TodoId,
    private readonly _title: TodoTitle,
    private readonly _completed: boolean,
    private readonly _createdAt: Date,
    private readonly _updatedAt: Date
  ) {}

  /**
   * Factory method to create a new Todo
   * Generates a new UUID and sets creation timestamp
   */
  static create(title: string): Todo {
    const id = brandTodoId(uuidv4());
    const todoTitle = TodoTitle.create(title);
    const now = new Date();

    return new Todo(id, todoTitle, false, now, now);
  }

  /**
   * Recreate Todo from persistence layer
   * Used when loading from localStorage
   */
  static fromPersistence(
    id: string,
    title: string,
    completed: boolean,
    createdAt: string,
    updatedAt: string
  ): Todo {
    const todoId = brandTodoId(id);
    const todoTitle = TodoTitle.create(title);
    return new Todo(todoId, todoTitle, completed, new Date(createdAt), new Date(updatedAt));
  }

  /**
   * Create a new Todo with toggled completion status
   * Maintains immutability by returning a new instance
   */
  toggleCompletion(): Todo {
    return new Todo(
      this._id,
      this._title,
      !this._completed,
      this._createdAt,
      new Date() // Update timestamp
    );
  }

  // Getters (read-only access to private fields)

  get id(): TodoId {
    return this._id;
  }

  get title(): TodoTitle {
    return this._title;
  }

  get completed(): boolean {
    return this._completed;
  }

  get status(): TodoStatus {
    return this._completed ? "Completed" : "Pending";
  }

  get createdAt(): Date {
    return new Date(this._createdAt); // Return copy to prevent external mutation
  }

  get updatedAt(): Date {
    return new Date(this._updatedAt); // Return copy to prevent external mutation
  }

  /**
   * Convert to plain object for serialization (e.g., to localStorage)
   */
  toJSON() {
    return {
      id: this._id,
      title: this._title.value,
      completed: this._completed,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
    };
  }

  /**
   * Compare two Todo instances
   */
  equals(other: Todo): boolean {
    return this._id === other._id && this._completed === other._completed;
  }
}
