import { v4 as uuidv4 } from "uuid";
import { TodoTitle } from "../value-objects/TodoTitle";
const brandSubtaskId = (id) => id;
/**
 * Subtask entity
 * Represents a child task within a Todo
 */
export class Subtask {
    constructor(_id, _title, _completed, _parentId) {
        this._id = _id;
        this._title = _title;
        this._completed = _completed;
        this._parentId = _parentId;
    }
    static create(title, parentId) {
        const id = brandSubtaskId(uuidv4());
        const subtaskTitle = TodoTitle.create(title);
        return new Subtask(id, subtaskTitle, false, parentId);
    }
    static fromPersistence(id, title, completed, parentId) {
        return new Subtask(brandSubtaskId(id), TodoTitle.create(title), completed, parentId // Assuming parentId is already a valid TodoId string from persistence
        );
    }
    get id() {
        return this._id;
    }
    get title() {
        return this._title;
    }
    get completed() {
        return this._completed;
    }
    get parentId() {
        return this._parentId;
    }
    toggleCompletion() {
        return new Subtask(this._id, this._title, !this._completed, this._parentId);
    }
    markCompleted() {
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
