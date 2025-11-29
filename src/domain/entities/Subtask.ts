import { v4 as uuidv4 } from "uuid";
import type { TodoId } from "../value-objects/TodoId";
import { TodoTitle } from "../value-objects/TodoTitle";

/**
 * Branded type for unique Subtask identifiers
 */
export type SubtaskId = string & { readonly __brand: "SubtaskId" };

const brandSubtaskId = (id: string): SubtaskId => id as SubtaskId;

/**
 * Subtask entity
 * Represents a child task within a Todo
 */
export class Subtask {
  private constructor(
    private readonly _id: SubtaskId,
    private readonly _title: TodoTitle,
    private readonly _completed: boolean,
    private readonly _parentId: TodoId
  ) {}

  static create(title: string, parentId: TodoId): Subtask {
    const id = brandSubtaskId(uuidv4());
    const subtaskTitle = TodoTitle.create(title);
    return new Subtask(id, subtaskTitle, false, parentId);
  }

  static fromPersistence(id: string, title: string, completed: boolean, parentId: string): Subtask {
    return new Subtask(
      brandSubtaskId(id),
      TodoTitle.create(title),
      completed,
      parentId as TodoId // Assuming parentId is already a valid TodoId string from persistence
    );
  }

  get id(): SubtaskId {
    return this._id;
  }

  get title(): TodoTitle {
    return this._title;
  }

  get completed(): boolean {
    return this._completed;
  }

  get parentId(): TodoId {
    return this._parentId;
  }

  toggleCompletion(): Subtask {
    return new Subtask(this._id, this._title, !this._completed, this._parentId);
  }

  markCompleted(): Subtask {
    return new Subtask(this._id, this._title, true, this._parentId);
  }

  toJSON() {
    return {
      id: this._id,
      title: this._title.value,
      completed: this._completed,
      parentId: this._parentId,
    };
  }
}
