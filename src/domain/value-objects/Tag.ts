export const ALLOWED_TAGS = ["Summary", "Research", "Split"] as const;
export type TagName = (typeof ALLOWED_TAGS)[number];

export class Tag {
  constructor(public readonly name: TagName) {}

  static create(name: string): Tag {
    if (!ALLOWED_TAGS.includes(name as TagName)) {
      throw new Error(`Invalid tag name: ${name}. Allowed tags are: ${ALLOWED_TAGS.join(", ")}`);
    }
    return new Tag(name as TagName);
  }

  equals(other: Tag): boolean {
    return this.name === other.name;
  }

  toString(): string {
    return this.name;
  }
}
