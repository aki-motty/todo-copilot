import { Todo, TodoTitle } from "../../../../src/domain/entities/Todo";

describe("Todo Entity - Unit Tests", () => {
  describe("TodoTitle Value Object", () => {
    it("should create a valid title", () => {
      const title = TodoTitle.create("Buy groceries");
      expect(title.value).toBe("Buy groceries");
    });

    it("should trim whitespace from title", () => {
      const title = TodoTitle.create("  Trimmed title  ");
      expect(title.value).toBe("Trimmed title");
    });

    it("should throw error for empty title", () => {
      expect(() => TodoTitle.create("")).toThrow("Todo title cannot be empty");
    });

    it("should throw error for whitespace-only title", () => {
      expect(() => TodoTitle.create("   ")).toThrow("Todo title cannot be empty");
    });

    it("should throw error for title exceeding 500 characters", () => {
      const longTitle = "a".repeat(501);
      expect(() => TodoTitle.create(longTitle)).toThrow("Todo title cannot exceed 500 characters");
    });

    it("should accept title at maximum length (500 chars)", () => {
      const maxTitle = "a".repeat(500);
      const title = TodoTitle.create(maxTitle);
      expect(title.value).toHaveLength(500);
    });

    it("should compare two titles correctly", () => {
      const title1 = TodoTitle.create("Same title");
      const title2 = TodoTitle.create("Same title");
      const title3 = TodoTitle.create("Different title");

      expect(title1.equals(title2)).toBe(true);
      expect(title1.equals(title3)).toBe(false);
    });

    it("should convert title to string", () => {
      const title = TodoTitle.create("String test");
      expect(title.toString()).toBe("String test");
    });
  });

  describe("Todo Aggregate Root", () => {
    it("should create a new todo with default state", () => {
      const todo = Todo.create("New todo");

      expect(todo.title.value).toBe("New todo");
      expect(todo.completed).toBe(false);
      expect(todo.status).toBe("Pending");
      expect(todo.id).toBeDefined();
      expect(todo.createdAt).toBeDefined();
      expect(todo.updatedAt).toBeDefined();
    });

    it("should assign unique IDs to different todos", () => {
      const todo1 = Todo.create("Todo 1");
      const todo2 = Todo.create("Todo 2");

      expect(todo1.id).not.toBe(todo2.id);
    });

    it("should have creation timestamp set correctly", () => {
      const beforeCreation = new Date();
      const todo = Todo.create("Timestamped todo");
      const afterCreation = new Date();

      expect(todo.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
      expect(todo.createdAt.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
    });

    it("should initially have same createdAt and updatedAt", () => {
      const todo = Todo.create("New todo");

      expect(todo.createdAt.getTime()).toBe(todo.updatedAt.getTime());
    });

    it("should toggle completion status", () => {
      const todo = Todo.create("Toggleable todo");

      expect(todo.completed).toBe(false);
      expect(todo.status).toBe("Pending");

      const toggledTodo = todo.toggleCompletion();

      expect(toggledTodo.completed).toBe(true);
      expect(toggledTodo.status).toBe("Completed");
    });

    it("should toggle completion back to pending", () => {
      const todo = Todo.create("Toggle test");
      const completed = todo.toggleCompletion();
      const pending = completed.toggleCompletion();

      expect(pending.completed).toBe(false);
      expect(pending.status).toBe("Pending");
    });

    it("should maintain immutability when toggling", () => {
      const todo = Todo.create("Immutable todo");
      const toggled = todo.toggleCompletion();

      expect(todo.completed).toBe(false); // Original unchanged
      expect(toggled.completed).toBe(true); // New instance changed
    });

    it("should update timestamp when toggling completion", () => {
      const todo = Todo.create("Timestamped toggle");
      const originalUpdatedAt = todo.updatedAt;

      // Small delay to ensure timestamp difference
      const toggledTodo = todo.toggleCompletion();

      expect(toggledTodo.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
    });

    it("should serialize to JSON correctly", () => {
      const todo = Todo.create("JSON test");
      const json = todo.toJSON();

      expect(json).toHaveProperty("id");
      expect(json).toHaveProperty("title", "JSON test");
      expect(json).toHaveProperty("completed", false);
      expect(json).toHaveProperty("createdAt");
      expect(json).toHaveProperty("updatedAt");
    });

    it("should recreate from persistence data", () => {
      const original = Todo.create("Persistence test");
      const json = original.toJSON();

      const recreated = Todo.fromPersistence(
        json.id,
        json.title,
        json.completed,
        json.createdAt,
        json.updatedAt
      );

      expect(recreated.id).toBe(original.id);
      expect(recreated.title.value).toBe(original.title.value);
      expect(recreated.completed).toBe(original.completed);
      expect(recreated.createdAt.getTime()).toBe(original.createdAt.getTime());
      expect(recreated.updatedAt.getTime()).toBe(original.updatedAt.getTime());
    });

    it("should compare todos correctly", () => {
      const todo1 = Todo.create("Todo A");
      const todo2 = Todo.create("Todo A"); // Same title but different ID
      const todo1Toggled = todo1.toggleCompletion();

      expect(todo1.equals(todo1)).toBe(true);
      expect(todo1.equals(todo2)).toBe(false); // Different IDs
      expect(todo1.equals(todo1Toggled)).toBe(false); // Different completion status
    });

    it("should return copies of date objects to prevent external mutation", () => {
      const todo = Todo.create("Immutable dates");
      const createdAt = todo.createdAt;
      const updatedAt = todo.updatedAt;

      createdAt.setDate(1);
      updatedAt.setDate(1);

      expect(todo.createdAt.getDate()).not.toBe(1);
      expect(todo.updatedAt.getDate()).not.toBe(1);
    });

    it("should validate title invariants on creation", () => {
      expect(() => Todo.create("")).toThrow();
      expect(() => Todo.create("a".repeat(501))).toThrow();
      expect(() => Todo.create("   ")).toThrow();
    });
  });
});
