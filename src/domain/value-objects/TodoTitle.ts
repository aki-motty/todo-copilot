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
