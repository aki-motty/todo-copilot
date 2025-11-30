import { Todo } from "../../../../src/domain/entities/Todo";

describe("Todo Entity - Description Tests", () => {
  describe("TodoDescription Value Object integration", () => {
    it("should create a todo with empty description by default", () => {
      const todo = Todo.create("Test todo");

      expect(todo.description.isEmpty).toBe(true);
      expect(todo.description.value).toBe("");
      expect(todo.hasDescription).toBe(false);
    });

    it("should update description", () => {
      const todo = Todo.create("Test todo");
      const updatedTodo = todo.updateDescription("This is a description");

      expect(updatedTodo.description.value).toBe("This is a description");
      expect(updatedTodo.hasDescription).toBe(true);
    });

    it("should preserve original todo when updating description (immutability)", () => {
      const original = Todo.create("Original");
      const updated = original.updateDescription("New description");

      expect(original.description.isEmpty).toBe(true);
      expect(updated.description.value).toBe("New description");
    });

    it("should update updatedAt when description changes", async () => {
      const todo = Todo.create("Test todo");
      const originalUpdatedAt = todo.updatedAt;

      // Small delay to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      const updated = todo.updateDescription("New description");

      expect(updated.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });

    it("should allow markdown content in description", () => {
      const markdown = "## Heading\n\n- Item 1\n- Item 2\n\n**Bold text**";
      const todo = Todo.create("Test todo");
      const updated = todo.updateDescription(markdown);

      expect(updated.description.value).toBe(markdown);
    });

    it("should allow clearing description", () => {
      const todo = Todo.create("Test todo");
      const withDescription = todo.updateDescription("Some content");
      const cleared = withDescription.updateDescription("");

      expect(cleared.description.isEmpty).toBe(true);
      expect(cleared.hasDescription).toBe(false);
    });

    it("should throw for description exceeding max length", () => {
      const todo = Todo.create("Test todo");
      const tooLong = "a".repeat(10001);

      expect(() => todo.updateDescription(tooLong)).toThrow(
        "Description cannot exceed 10000 characters"
      );
    });

    it("should allow description at max length", () => {
      const todo = Todo.create("Test todo");
      const maxLength = "a".repeat(10000);
      const updated = todo.updateDescription(maxLength);

      expect(updated.description.length).toBe(10000);
    });
  });

  describe("fromPersistence with description", () => {
    it("should restore todo with description from persistence", () => {
      const todo = Todo.fromPersistence(
        "test-id",
        "Test todo",
        false,
        "2025-11-30T10:00:00.000Z",
        "2025-11-30T10:30:00.000Z",
        [],
        [],
        "Persisted description"
      );

      expect(todo.description.value).toBe("Persisted description");
      expect(todo.hasDescription).toBe(true);
    });

    it("should handle missing description (backward compatibility)", () => {
      const todo = Todo.fromPersistence(
        "test-id",
        "Test todo",
        false,
        "2025-11-30T10:00:00.000Z",
        "2025-11-30T10:30:00.000Z"
        // No subtasks, tags, or description - all optional
      );

      expect(todo.description.isEmpty).toBe(true);
      expect(todo.hasDescription).toBe(false);
    });

    it("should handle empty description from persistence", () => {
      const todo = Todo.fromPersistence(
        "test-id",
        "Test todo",
        false,
        "2025-11-30T10:00:00.000Z",
        "2025-11-30T10:30:00.000Z",
        [],
        [],
        ""
      );

      expect(todo.description.isEmpty).toBe(true);
    });
  });

  describe("toJSON with description", () => {
    it("should include description in JSON output", () => {
      const todo = Todo.create("Test todo");
      const updated = todo.updateDescription("Test description");
      const json = updated.toJSON();

      expect(json.description).toBe("Test description");
    });

    it("should include empty description in JSON output", () => {
      const todo = Todo.create("Test todo");
      const json = todo.toJSON();

      expect(json.description).toBe("");
    });

    it("should serialize and deserialize description correctly", () => {
      const original = Todo.create("Test");
      const withDescription = original.updateDescription("## Markdown content");
      const json = withDescription.toJSON();

      const restored = Todo.fromPersistence(
        json.id,
        json.title,
        json.completed,
        json.createdAt,
        json.updatedAt,
        json.subtasks,
        json.tags,
        json.description
      );

      expect(restored.description.value).toBe("## Markdown content");
    });
  });

  describe("description preservation in other operations", () => {
    it("should preserve description when toggling completion", () => {
      const todo = Todo.create("Test").updateDescription("Keep me");
      const toggled = todo.toggleCompletion();

      expect(toggled.description.value).toBe("Keep me");
    });

    it("should preserve description when updating title", () => {
      const todo = Todo.create("Original").updateDescription("Keep me");
      const renamed = todo.updateTitle("New title");

      expect(renamed.description.value).toBe("Keep me");
    });

    it("should preserve description when adding subtask", () => {
      const todo = Todo.create("Test").updateDescription("Keep me");
      const withSubtask = todo.addSubtask("Subtask");

      expect(withSubtask.description.value).toBe("Keep me");
    });

    it("should preserve description when removing subtask", () => {
      const todo = Todo.create("Test").updateDescription("Keep me").addSubtask("Subtask");
      const subtask = todo.subtasks[0];
      if (!subtask) {
        throw new Error("Subtask should exist");
      }
      const withoutSubtask = todo.removeSubtask(subtask.id);

      expect(withoutSubtask.description.value).toBe("Keep me");
    });

    it("should preserve description when toggling subtask", () => {
      const todo = Todo.create("Test").updateDescription("Keep me").addSubtask("Subtask");
      const subtask = todo.subtasks[0];
      if (!subtask) {
        throw new Error("Subtask should exist");
      }
      const toggled = todo.toggleSubtask(subtask.id);

      expect(toggled.description.value).toBe("Keep me");
    });

    it("should preserve description when adding tag", () => {
      const todo = Todo.create("Test").updateDescription("Keep me");
      const withTag = todo.addTag("Summary");

      expect(withTag.description.value).toBe("Keep me");
    });

    it("should preserve description when removing tag", () => {
      const todo = Todo.create("Test").updateDescription("Keep me").addTag("Summary");
      const withoutTag = todo.removeTag("Summary");

      expect(withoutTag.description.value).toBe("Keep me");
    });
  });

  describe("hasDescription getter", () => {
    it("should return false for empty description", () => {
      const todo = Todo.create("Test");
      expect(todo.hasDescription).toBe(false);
    });

    it("should return false for whitespace-only description", () => {
      const todo = Todo.create("Test").updateDescription("   ");
      expect(todo.hasDescription).toBe(false);
    });

    it("should return true for description with content", () => {
      const todo = Todo.create("Test").updateDescription("Content");
      expect(todo.hasDescription).toBe(true);
    });

    it("should return true for description with leading/trailing whitespace", () => {
      const todo = Todo.create("Test").updateDescription("  Content  ");
      expect(todo.hasDescription).toBe(true);
    });
  });
});
