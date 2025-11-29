import { v4 as uuidv4 } from "uuid";
import { brandTodoId, type TodoId } from "../value-objects/TodoId";
import { TodoTitle } from "../value-objects/TodoTitle";
import { Subtask } from "./Subtask";

export { type TodoId } from "../value-objects/TodoId";
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
    private readonly _subtasks: Subtask[]
  ) {}

  /**
   * Factory method to create a new Todo
   * Generates a new UUID and sets creation timestamp
   */
  static create(title: string): Todo {
    const id = brandTodoId(uuidv4());
    const todoTitle = TodoTitle.create(title);
    const now = new Date();

    return new Todo(id, todoTitle, false, now, now, []);
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
    subtasks: Subtask[] = []
  ): Todo {
    const todoId = brandTodoId(id);
    const todoTitle = TodoTitle.create(title);
    return new Todo(
      todoId,
      todoTitle,
      completed,
      new Date(createdAt),
      new Date(updatedAt),
      subtasks
    );
  }

  /**
   * Create a new Todo with toggled completion status
   * Maintains immutability by returning a new instance
   */
  toggleCompletion(): Todo {
    const newCompleted = !this._completed;
    let newSubtasks = this._subtasks;

    // FR-006: System MUST automatically mark all incomplete subtasks as completed when a parent task is marked as completed.
    if (newCompleted) {
      newSubtasks = this._subtasks.map((s) => s.markCompleted());
    }

    return new Todo(
      this._id,
      this._title,
      newCompleted,
      this._createdAt,
      new Date(), // Update timestamp
      newSubtasks
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
      [...this._subtasks, subtask]
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
      this._subtasks.filter((s) => s.id !== subtaskId)
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
      this._subtasks.map((s) => (s.id === subtaskId ? s.toggleCompletion() : s))
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
    };
  }

  /**
   * Compare two Todo instances
   */
  equals(other: Todo): boolean {
    return this._id === other._id && this._completed === other._completed;
  }
}
