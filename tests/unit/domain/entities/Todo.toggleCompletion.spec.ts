import { Todo } from "../../../../src/domain/entities/Todo";

describe("Todo - Status Toggle Tests (Unit)", () => {
  describe("toggleCompletion method", () => {
    it("should toggle completion status from false to true", () => {
      const todo = Todo.create("Toggle Test");
      expect(todo.completed).toBe(false);

      const toggled = todo.toggleCompletion();

      expect(toggled.completed).toBe(true);
      // Original should remain unchanged (immutability)
      expect(todo.completed).toBe(false);
    });

    it("should toggle completion status from true to false", () => {
      const todo = Todo.create("Toggle Test");
      const completed = todo.toggleCompletion();
      expect(completed.completed).toBe(true);

      const toggled = completed.toggleCompletion();

      expect(toggled.completed).toBe(false);
      expect(completed.completed).toBe(true);
    });

    it("should preserve todo id after toggling", () => {
      const todo = Todo.create("Preserve ID Test");
      const originalId = todo.id;

      const toggled = todo.toggleCompletion();

      expect(toggled.id).toBe(originalId);
    });

    it("should preserve todo title after toggling", () => {
      const todo = Todo.create("Preserve Title Test");
      const originalTitle = todo.title.value;

      const toggled = todo.toggleCompletion();

      expect(toggled.title.value).toBe(originalTitle);
    });

    it("should update timestamp when toggling", () => {
      const todo = Todo.create("Timestamp Test");
      const originalUpdatedAt = todo.updatedAt;

      const toggled = todo.toggleCompletion();

      // Timestamps might be the same due to fast execution, so check >= instead of >
      expect(toggled.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
      // Ensure it's not the exact same instance
      expect(toggled.updatedAt).not.toBe(originalUpdatedAt);
    });

    it("should maintain createdAt during toggle", () => {
      const todo = Todo.create("Created At Test");
      const originalCreatedAt = todo.createdAt;

      const toggled = todo.toggleCompletion();

      expect(toggled.createdAt.getTime()).toBe(originalCreatedAt.getTime());
    });

    it("should allow multiple consecutive toggles", () => {
      let todo = Todo.create("Multiple Toggle Test");
      expect(todo.completed).toBe(false);

      todo = todo.toggleCompletion();
      expect(todo.completed).toBe(true);

      todo = todo.toggleCompletion();
      expect(todo.completed).toBe(false);

      todo = todo.toggleCompletion();
      expect(todo.completed).toBe(true);
    });

    it("should maintain immutability through toggle chain", () => {
      const original = Todo.create("Immutability Chain Test");
      const toggled1 = original.toggleCompletion();
      const toggled2 = toggled1.toggleCompletion();

      // All should have different references
      expect(original).not.toBe(toggled1);
      expect(toggled1).not.toBe(toggled2);
      expect(original).not.toBe(toggled2);

      // But status chain should be correct
      expect(original.completed).toBe(false);
      expect(toggled1.completed).toBe(true);
      expect(toggled2.completed).toBe(false);
    });
  });

  describe("Status serialization", () => {
    it("should serialize completed status to JSON", () => {
      const todo = Todo.create("Serialize Completed");
      const toggled = todo.toggleCompletion();
      const json = toggled.toJSON();

      expect(json.completed).toBe(true);
    });

    it("should serialize pending status to JSON", () => {
      const todo = Todo.create("Serialize Pending");
      const json = todo.toJSON();

      expect(json.completed).toBe(false);
    });

    it("should restore todo from persistence with correct status", () => {
      const original = Todo.create("Persistence Status Test");
      const toggled = original.toggleCompletion();
      const json = toggled.toJSON();

      const restored = Todo.fromPersistence(
        json.id,
        json.title,
        json.completed,
        json.createdAt,
        json.updatedAt
      );

      expect(restored.completed).toBe(true);
      expect(restored.id).toBe(toggled.id);
      expect(restored.title.value).toBe(toggled.title.value);
    });
  });
});
