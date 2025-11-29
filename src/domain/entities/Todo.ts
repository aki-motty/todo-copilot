import { v4 as uuidv4 } from "uuid";
import { Tag } from "../value-objects/Tag";
import { type TodoId, brandTodoId } from "../value-objects/TodoId";
import { TodoTitle } from "../value-objects/TodoTitle";
import { Subtask } from "./Subtask";

export { Tag } from "../value-objects/Tag";
export type { TodoId } from "../value-objects/TodoId";
export { TodoTitle } from "../value-objects/TodoTitle";

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
    private readonly _updatedAt: Date,
    private readonly _subtasks: Subtask[],
    private readonly _tags: Tag[]
  ) {}

  /**
   * Factory method to create a new Todo
   * Generates a new UUID and sets creation timestamp
   */
  static create(title: string): Todo {
    const id = brandTodoId(uuidv4());
    const todoTitle = TodoTitle.create(title);
    const now = new Date();

    return new Todo(id, todoTitle, false, now, now, [], []);
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
    updatedAt: string,
    subtasks: { id: string; title: string; completed: boolean }[] = [],
    tags: string[] = []
  ): Todo {
    return new Todo(
      brandTodoId(id),
      TodoTitle.create(title),
      completed,
      new Date(createdAt),
      new Date(updatedAt),
      subtasks.map((s) => Subtask.fromPersistence(s.id, s.title, s.completed, id)),
      tags.map((t) => Tag.create(t))
    );
  }

  /**
   * Toggle completion status
   * Returns a new Todo instance (immutability)
   */
  toggleCompletion(): Todo {
    return new Todo(
      this._id,
      this._title,
      !this._completed,
      this._createdAt,
      new Date(),
      this._subtasks,
      this._tags
    );
  }

  /**
   * Update todo title
   */
  updateTitle(title: string): Todo {
    return new Todo(
      this._id,
      TodoTitle.create(title),
      this._completed,
      this._createdAt,
      new Date(),
      this._subtasks,
      this._tags
    );
  }

  /**
   * Add a subtask to the todo
   */
  addSubtask(title: string): Todo {
    const subtask = Subtask.create(title, this._id);
    return new Todo(
      this._id,
      this._title,
      this._completed,
      this._createdAt,
      new Date(),
      [...this._subtasks, subtask],
      this._tags
    );
  }

  /**
   * Remove a subtask from the todo
   */
  removeSubtask(subtaskId: string): Todo {
    return new Todo(
      this._id,
      this._title,
      this._completed,
      this._createdAt,
      new Date(),
      this._subtasks.filter((s) => s.id !== subtaskId),
      this._tags
    );
  }

  /**
   * Toggle a subtask's completion status
   */
  toggleSubtask(subtaskId: string): Todo {
    return new Todo(
      this._id,
      this._title,
      this._completed,
      this._createdAt,
      new Date(),
      this._subtasks.map((s) => (s.id === subtaskId ? s.toggleCompletion() : s)),
      this._tags
    );
  }

  /**
   * Add a tag to the todo
   */
  addTag(tagName: string): Todo {
    const tag = Tag.create(tagName);
    if (this._tags.some((t) => t.equals(tag))) {
      return this;
    }
    return new Todo(
      this._id,
      this._title,
      this._completed,
      this._createdAt,
      new Date(),
      this._subtasks,
      [...this._tags, tag]
    );
  }

  /**
   * Remove a tag from the todo
   */
  removeTag(tagName: string): Todo {
    const tag = Tag.create(tagName);
    return new Todo(
      this._id,
      this._title,
      this._completed,
      this._createdAt,
      new Date(),
      this._subtasks,
      this._tags.filter((t) => !t.equals(tag))
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

  get subtasks(): Subtask[] {
    return [...this._subtasks];
  }

  get tags(): Tag[] {
    return [...this._tags];
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
      subtasks: this._subtasks.map((s) => s.toJSON()),
      tags: this._tags.map((t) => t.name),
    };
  }

  /**
   * Compare two Todo instances
   */
  equals(other: Todo): boolean {
    return this._id === other._id && this._completed === other._completed;
  }
}
