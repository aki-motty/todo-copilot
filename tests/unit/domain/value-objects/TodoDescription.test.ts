import { TodoDescription } from "../../../../src/domain/value-objects/TodoDescription";

describe("TodoDescription Value Object", () => {
  describe("create factory method", () => {
    it("should create a valid description", () => {
      const description = TodoDescription.create("This is a test description");
      expect(description.value).toBe("This is a test description");
    });

    it("should allow empty string", () => {
      const description = TodoDescription.create("");
      expect(description.value).toBe("");
      expect(description.isEmpty).toBe(true);
    });

    it("should allow whitespace-only string", () => {
      const description = TodoDescription.create("   ");
      expect(description.value).toBe("   ");
      expect(description.isEmpty).toBe(false);
      expect(description.hasContent).toBe(false);
    });

    it("should allow markdown content", () => {
      const markdown = "## Heading\n\n- Item 1\n- Item 2\n\n**Bold** and *italic*";
      const description = TodoDescription.create(markdown);
      expect(description.value).toBe(markdown);
    });

    it("should allow exactly 10000 characters", () => {
      const maxContent = "a".repeat(10000);
      const description = TodoDescription.create(maxContent);
      expect(description.value).toBe(maxContent);
      expect(description.length).toBe(10000);
    });

    it("should throw for content exceeding 10000 characters", () => {
      const tooLong = "a".repeat(10001);
      expect(() => TodoDescription.create(tooLong)).toThrow(
        "Description cannot exceed 10000 characters"
      );
    });

    it("should preserve special characters", () => {
      const special = "Hello <script>alert('xss')</script> World";
      const description = TodoDescription.create(special);
      expect(description.value).toBe(special);
    });

    it("should preserve newlines and formatting", () => {
      const formatted = "Line 1\nLine 2\n\nLine 4";
      const description = TodoDescription.create(formatted);
      expect(description.value).toBe(formatted);
    });
  });

  describe("empty factory method", () => {
    it("should create an empty description", () => {
      const description = TodoDescription.empty();
      expect(description.value).toBe("");
      expect(description.isEmpty).toBe(true);
    });

    it("should have length 0", () => {
      const description = TodoDescription.empty();
      expect(description.length).toBe(0);
    });

    it("should have no content", () => {
      const description = TodoDescription.empty();
      expect(description.hasContent).toBe(false);
    });
  });

  describe("maxLength static property", () => {
    it("should return 10000", () => {
      expect(TodoDescription.maxLength).toBe(10000);
    });
  });

  describe("value getter", () => {
    it("should return the description value", () => {
      const content = "Test content";
      const description = TodoDescription.create(content);
      expect(description.value).toBe(content);
    });
  });

  describe("isEmpty getter", () => {
    it("should return true for empty string", () => {
      const description = TodoDescription.create("");
      expect(description.isEmpty).toBe(true);
    });

    it("should return false for non-empty string", () => {
      const description = TodoDescription.create("content");
      expect(description.isEmpty).toBe(false);
    });

    it("should return false for whitespace-only string", () => {
      const description = TodoDescription.create("  ");
      expect(description.isEmpty).toBe(false);
    });
  });

  describe("length getter", () => {
    it("should return correct length", () => {
      const content = "Hello World";
      const description = TodoDescription.create(content);
      expect(description.length).toBe(11);
    });

    it("should return 0 for empty description", () => {
      const description = TodoDescription.empty();
      expect(description.length).toBe(0);
    });

    it("should count unicode characters correctly", () => {
      const unicode = "こんにちは"; // 5 characters
      const description = TodoDescription.create(unicode);
      expect(description.length).toBe(5);
    });
  });

  describe("hasContent getter", () => {
    it("should return true for non-whitespace content", () => {
      const description = TodoDescription.create("content");
      expect(description.hasContent).toBe(true);
    });

    it("should return false for empty string", () => {
      const description = TodoDescription.create("");
      expect(description.hasContent).toBe(false);
    });

    it("should return false for whitespace-only string", () => {
      const description = TodoDescription.create("   \n\t  ");
      expect(description.hasContent).toBe(false);
    });

    it("should return true for string with content and whitespace", () => {
      const description = TodoDescription.create("  content  ");
      expect(description.hasContent).toBe(true);
    });
  });

  describe("equals method", () => {
    it("should return true for same content", () => {
      const desc1 = TodoDescription.create("Same content");
      const desc2 = TodoDescription.create("Same content");
      expect(desc1.equals(desc2)).toBe(true);
    });

    it("should return false for different content", () => {
      const desc1 = TodoDescription.create("Content 1");
      const desc2 = TodoDescription.create("Content 2");
      expect(desc1.equals(desc2)).toBe(false);
    });

    it("should return true for two empty descriptions", () => {
      const desc1 = TodoDescription.empty();
      const desc2 = TodoDescription.create("");
      expect(desc1.equals(desc2)).toBe(true);
    });

    it("should be case-sensitive", () => {
      const desc1 = TodoDescription.create("Content");
      const desc2 = TodoDescription.create("content");
      expect(desc1.equals(desc2)).toBe(false);
    });

    it("should be reflexive (a.equals(a) is true)", () => {
      const description = TodoDescription.create("Test");
      expect(description.equals(description)).toBe(true);
    });

    it("should be symmetric (a.equals(b) === b.equals(a))", () => {
      const desc1 = TodoDescription.create("Test");
      const desc2 = TodoDescription.create("Test");
      expect(desc1.equals(desc2)).toBe(desc2.equals(desc1));
    });
  });

  describe("toString method", () => {
    it("should return the value", () => {
      const content = "Test description";
      const description = TodoDescription.create(content);
      expect(description.toString()).toBe(content);
    });

    it("should return empty string for empty description", () => {
      const description = TodoDescription.empty();
      expect(description.toString()).toBe("");
    });
  });

  describe("immutability", () => {
    it("should be a readonly value object", () => {
      const description = TodoDescription.create("Original");
      // Value object is immutable - there's no setter method
      // The value getter always returns the same value
      expect(description.value).toBe("Original");
      expect(description.value).toBe("Original");
    });
  });

  describe("edge cases", () => {
    it("should handle very long markdown content", () => {
      const longMarkdown = `# ${"a".repeat(9997)}`; // 2 + 9997 + 1 newline potential = close to limit
      const description = TodoDescription.create(longMarkdown);
      expect(description.hasContent).toBe(true);
    });

    it("should handle emoji content", () => {
      const emoji = "😀🎉✨";
      const description = TodoDescription.create(emoji);
      expect(description.value).toBe(emoji);
    });

    it("should handle multiline content", () => {
      const multiline = "Line 1\nLine 2\nLine 3";
      const description = TodoDescription.create(multiline);
      expect(description.value.split("\n").length).toBe(3);
    });
  });
});
