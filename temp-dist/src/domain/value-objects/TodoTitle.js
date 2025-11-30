/**
 * Value object for Todo title
 * Enforces invariants: 1-500 characters, non-empty
 */
export class TodoTitle {
  constructor(_value) {
    this._value = _value;
    if (!_value || _value.trim().length === 0) {
      throw new Error("Todo title cannot be empty");
    }
    if (_value.length > 500) {
      throw new Error("Todo title cannot exceed 500 characters");
    }
  }
  static create(value) {
    return new TodoTitle(value.trim());
  }
  get value() {
    return this._value;
  }
  equals(other) {
    return this._value === other._value;
  }
  toString() {
    return this._value;
  }
}
