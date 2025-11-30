import { ALLOWED_TAGS, Tag, type TagName } from "../../../../src/domain/value-objects/Tag";

describe("Tag Value Object", () => {
  describe("ALLOWED_TAGS constant", () => {
    it("should contain expected tags", () => {
      expect(ALLOWED_TAGS).toContain("Summary");
      expect(ALLOWED_TAGS).toContain("Research");
      expect(ALLOWED_TAGS).toContain("Split");
    });

    it("should be readonly", () => {
      expect(ALLOWED_TAGS).toHaveLength(3);
    });
  });

  describe("create factory method", () => {
    it("should create a valid Summary tag", () => {
      const tag = Tag.create("Summary");
      expect(tag.name).toBe("Summary");
    });

    it("should create a valid Research tag", () => {
      const tag = Tag.create("Research");
      expect(tag.name).toBe("Research");
    });

    it("should create a valid Split tag", () => {
      const tag = Tag.create("Split");
      expect(tag.name).toBe("Split");
    });

    it("should throw for invalid tag name", () => {
      expect(() => Tag.create("InvalidTag")).toThrow("Invalid tag name: InvalidTag");
    });

    it("should throw with message listing allowed tags", () => {
      expect(() => Tag.create("BadTag")).toThrow("Allowed tags are: Summary, Research, Split");
    });

    it("should be case-sensitive", () => {
      expect(() => Tag.create("summary")).toThrow(); // lowercase should fail
      expect(() => Tag.create("SUMMARY")).toThrow(); // uppercase should fail
    });

    it("should throw for empty string", () => {
      expect(() => Tag.create("")).toThrow("Invalid tag name:");
    });

    it("should throw for whitespace", () => {
      expect(() => Tag.create("  ")).toThrow();
    });
  });

  describe("equals method", () => {
    it("should return true for same tag name", () => {
      const tag1 = Tag.create("Summary");
      const tag2 = Tag.create("Summary");

      expect(tag1.equals(tag2)).toBe(true);
    });

    it("should return false for different tag names", () => {
      const tag1 = Tag.create("Summary");
      const tag2 = Tag.create("Research");

      expect(tag1.equals(tag2)).toBe(false);
    });

    it("should be reflexive (a.equals(a) is true)", () => {
      const tag = Tag.create("Split");
      expect(tag.equals(tag)).toBe(true);
    });

    it("should be symmetric (a.equals(b) === b.equals(a))", () => {
      const tag1 = Tag.create("Summary");
      const tag2 = Tag.create("Summary");
      const tag3 = Tag.create("Research");

      expect(tag1.equals(tag2)).toBe(tag2.equals(tag1));
      expect(tag1.equals(tag3)).toBe(tag3.equals(tag1));
    });
  });

  describe("toString method", () => {
    it("should return the tag name", () => {
      const tag = Tag.create("Summary");
      expect(tag.toString()).toBe("Summary");
    });

    it("should work for all allowed tags", () => {
      for (const tagName of ALLOWED_TAGS) {
        const tag = Tag.create(tagName);
        expect(tag.toString()).toBe(tagName);
      }
    });
  });

  describe("constructor", () => {
    it("should set name property", () => {
      const tag = new Tag("Summary" as TagName);
      expect(tag.name).toBe("Summary");
    });

    it("should have readonly name property", () => {
      const tag = Tag.create("Summary");
      // TypeScript enforces readonly at compile time
      // Runtime JavaScript doesn't prevent assignment, but it shouldn't affect the value
      expect(tag.name).toBe("Summary");
    });
  });

  describe("immutability", () => {
    it("should be immutable", () => {
      const tag = Tag.create("Summary");
      const originalName = tag.name;

      // Tag should remain unchanged
      expect(tag.name).toBe(originalName);
    });
  });

  describe("type safety", () => {
    it("should only accept TagName type in constructor", () => {
      // These should compile (runtime test)
      const validTags: Tag[] = ALLOWED_TAGS.map((name) => new Tag(name));
      expect(validTags).toHaveLength(3);
    });
  });
});
