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
   * @param value - The description text (can be empty)
   * @throws Error if value exceeds MAX_LENGTH
   */
  static create(value: string): TodoDescription {
    if (value.length > TodoDescription.MAX_LENGTH) {
      throw new Error(`Description cannot exceed ${TodoDescription.MAX_LENGTH} characters`);
    }
    return new TodoDescription(value);
  }

  /**
   * Factory method for empty description
   */
  static empty(): TodoDescription {
    return new TodoDescription("");
  }

  /**
   * Maximum allowed length for description
   */
  static get maxLength(): number {
    return TodoDescription.MAX_LENGTH;
  }

  /**
   * Get the description value
   */
  get value(): string {
    return this._value;
  }

  /**
   * Check if description is empty
   */
  get isEmpty(): boolean {
    return this._value.length === 0;
  }

  /**
   * Get the length of the description
   */
  get length(): number {
    return this._value.length;
  }

  /**
   * Check if this description has content (non-empty after trimming)
   */
  get hasContent(): boolean {
    return this._value.trim().length > 0;
  }

  /**
   * Compare two TodoDescription instances for equality
   */
  equals(other: TodoDescription): boolean {
    return this._value === other._value;
  }

  /**
   * Convert to string representation
   */
  toString(): string {
    return this._value;
  }
}
