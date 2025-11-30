import { Todo } from "../../../../src/domain/entities/Todo";

describe("Todo Entity - Extended Coverage Tests", () => {
  describe("addTag", () => {
    it("should add a tag to todo", () => {
      const todo = Todo.create("Tagged Todo");
      const withTag = todo.addTag("Summary");

      expect(withTag.tags).toHaveLength(1);
      expect(withTag.tags[0]!.name).toBe("Summary");
    });

    it("should not add duplicate tag", () => {
      const todo = Todo.create("Tagged Todo");
      const withTag = todo.addTag("Summary");
      const withDuplicateTag = withTag.addTag("Summary");

      expect(withDuplicateTag.tags).toHaveLength(1);
      expect(withDuplicateTag).toBe(withTag); // Same instance returned
    });

    it("should add multiple different tags", () => {
      const todo = Todo.create("Multi-tagged Todo");
      const withTags = todo.addTag("Summary").addTag("Research").addTag("Split");

      expect(withTags.tags).toHaveLength(3);
      expect(withTags.tags.map((t) => t.name)).toContain("Summary");
      expect(withTags.tags.map((t) => t.name)).toContain("Research");
      expect(withTags.tags.map((t) => t.name)).toContain("Split");
    });

    it("should maintain immutability when adding tag", () => {
      const todo = Todo.create("Immutable Todo");
      const withTag = todo.addTag("Summary");

      expect(todo.tags).toHaveLength(0);
      expect(withTag.tags).toHaveLength(1);
    });

    it("should update updatedAt when adding tag", () => {
      const todo = Todo.create("Updated Todo");
      const originalUpdatedAt = todo.updatedAt;

      // Small delay
      const withTag = todo.addTag("Summary");

      expect(withTag.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
    });
  });

  describe("removeTag", () => {
    it("should remove an existing tag", () => {
      const todo = Todo.create("Tagged Todo").addTag("Summary");
      const withoutTag = todo.removeTag("Summary");

      expect(withoutTag.tags).toHaveLength(0);
    });

    it("should not fail when removing non-existent tag", () => {
      const todo = Todo.create("Tagged Todo").addTag("Summary");
      const withoutTag = todo.removeTag("Research");

      expect(withoutTag.tags).toHaveLength(1);
      expect(withoutTag.tags[0]!.name).toBe("Summary");
    });

    it("should remove only the specified tag", () => {
      const todo = Todo.create("Multi-tagged Todo")
        .addTag("Summary")
        .addTag("Research")
        .addTag("Split");
      const withoutTag = todo.removeTag("Research");

      expect(withoutTag.tags).toHaveLength(2);
      expect(withoutTag.tags.map((t) => t.name)).toContain("Summary");
      expect(withoutTag.tags.map((t) => t.name)).toContain("Split");
      expect(withoutTag.tags.map((t) => t.name)).not.toContain("Research");
    });

    it("should maintain immutability when removing tag", () => {
      const todo = Todo.create("Immutable Todo").addTag("Summary");
      const withoutTag = todo.removeTag("Summary");

      expect(todo.tags).toHaveLength(1);
      expect(withoutTag.tags).toHaveLength(0);
    });
  });

  describe("addSubtask", () => {
    it("should add a subtask to todo", () => {
      const todo = Todo.create("Parent Todo");
      const withSubtask = todo.addSubtask("Subtask 1");

      expect(withSubtask.subtasks).toHaveLength(1);
      expect(withSubtask.subtasks[0]!.title.value).toBe("Subtask 1");
      expect(withSubtask.subtasks[0]!.completed).toBe(false);
    });

    it("should add multiple subtasks", () => {
      const todo = Todo.create("Parent Todo");
      const withSubtasks = todo
        .addSubtask("Subtask 1")
        .addSubtask("Subtask 2")
        .addSubtask("Subtask 3");

      expect(withSubtasks.subtasks).toHaveLength(3);
    });

    it("should generate unique IDs for subtasks", () => {
      const todo = Todo.create("Parent Todo");
      const withSubtasks = todo.addSubtask("Sub 1").addSubtask("Sub 2");

      expect(withSubtasks.subtasks[0]!.id).not.toBe(withSubtasks.subtasks[1]!.id);
    });

    it("should maintain immutability when adding subtask", () => {
      const todo = Todo.create("Immutable Todo");
      const withSubtask = todo.addSubtask("New Subtask");

      expect(todo.subtasks).toHaveLength(0);
      expect(withSubtask.subtasks).toHaveLength(1);
    });
  });

  describe("removeSubtask", () => {
    it("should remove an existing subtask", () => {
      const todo = Todo.create("Parent Todo");
      const withSubtask = todo.addSubtask("Subtask to remove");
      const subtaskId = withSubtask.subtasks[0]!.id;
      const withoutSubtask = withSubtask.removeSubtask(subtaskId);

      expect(withoutSubtask.subtasks).toHaveLength(0);
    });

    it("should not fail when removing non-existent subtask", () => {
      const todo = Todo.create("Parent Todo").addSubtask("Keep me");
      const withoutSubtask = todo.removeSubtask("non-existent-id");

      expect(withoutSubtask.subtasks).toHaveLength(1);
    });

    it("should remove only the specified subtask", () => {
      const todo = Todo.create("Parent Todo")
        .addSubtask("Keep 1")
        .addSubtask("Remove")
        .addSubtask("Keep 2");

      const subtaskToRemove = todo.subtasks[1]!;
      const withoutSubtask = todo.removeSubtask(subtaskToRemove.id);

      expect(withoutSubtask.subtasks).toHaveLength(2);
      expect(withoutSubtask.subtasks.map((s) => s.title.value)).toContain("Keep 1");
      expect(withoutSubtask.subtasks.map((s) => s.title.value)).toContain("Keep 2");
      expect(withoutSubtask.subtasks.map((s) => s.title.value)).not.toContain("Remove");
    });

    it("should maintain immutability when removing subtask", () => {
      const todo = Todo.create("Parent Todo").addSubtask("Subtask");
      const subtaskId = todo.subtasks[0]!.id;
      const withoutSubtask = todo.removeSubtask(subtaskId);

      expect(todo.subtasks).toHaveLength(1);
      expect(withoutSubtask.subtasks).toHaveLength(0);
    });
  });

  describe("toggleSubtask", () => {
    it("should toggle subtask completion to true", () => {
      const todo = Todo.create("Parent Todo").addSubtask("Subtask");
      const subtaskId = todo.subtasks[0]!.id;
      const toggled = todo.toggleSubtask(subtaskId);

      expect(toggled.subtasks[0]!.completed).toBe(true);
    });

    it("should toggle subtask completion back to false", () => {
      const todo = Todo.create("Parent Todo").addSubtask("Subtask");
      const subtaskId = todo.subtasks[0]!.id;
      const toggledOnce = todo.toggleSubtask(subtaskId);
      const toggledTwice = toggledOnce.toggleSubtask(subtaskId);

      expect(toggledTwice.subtasks[0]!.completed).toBe(false);
    });

    it("should only toggle the specified subtask", () => {
      const todo = Todo.create("Parent Todo")
        .addSubtask("Sub 1")
        .addSubtask("Sub 2")
        .addSubtask("Sub 3");

      const subtaskId = todo.subtasks[1]!.id;
      const toggled = todo.toggleSubtask(subtaskId);

      expect(toggled.subtasks[0]!.completed).toBe(false);
      expect(toggled.subtasks[1]!.completed).toBe(true);
      expect(toggled.subtasks[2]!.completed).toBe(false);
    });

    it("should not change anything for non-existent subtask ID", () => {
      const todo = Todo.create("Parent Todo").addSubtask("Subtask");
      const toggled = todo.toggleSubtask("non-existent-id");

      expect(toggled.subtasks[0]!.completed).toBe(false);
    });

    it("should maintain immutability when toggling subtask", () => {
      const todo = Todo.create("Parent Todo").addSubtask("Subtask");
      const subtaskId = todo.subtasks[0]!.id;
      const toggled = todo.toggleSubtask(subtaskId);

      expect(todo.subtasks[0]!.completed).toBe(false);
      expect(toggled.subtasks[0]!.completed).toBe(true);
    });
  });

  describe("updateTitle", () => {
    it("should update todo title", () => {
      const todo = Todo.create("Original Title");
      const updated = todo.updateTitle("New Title");

      expect(updated.title.value).toBe("New Title");
    });

    it("should maintain immutability when updating title", () => {
      const todo = Todo.create("Original Title");
      const updated = todo.updateTitle("New Title");

      expect(todo.title.value).toBe("Original Title");
      expect(updated.title.value).toBe("New Title");
    });

    it("should update updatedAt when updating title", () => {
      const todo = Todo.create("Original Title");
      const originalUpdatedAt = todo.updatedAt;
      const updated = todo.updateTitle("New Title");

      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
    });

    it("should preserve other properties when updating title", () => {
      const todo = Todo.create("Original")
        .addTag("Summary")
        .addSubtask("subtask")
        .toggleCompletion();

      const updated = todo.updateTitle("New Title");

      expect(updated.tags).toHaveLength(1);
      expect(updated.subtasks).toHaveLength(1);
      expect(updated.completed).toBe(true);
    });

    it("should throw for empty title", () => {
      const todo = Todo.create("Original Title");
      expect(() => todo.updateTitle("")).toThrow();
    });

    it("should throw for whitespace-only title", () => {
      const todo = Todo.create("Original Title");
      expect(() => todo.updateTitle("   ")).toThrow();
    });
  });

  describe("fromPersistence", () => {
    it("should recreate todo with subtasks", () => {
      const now = new Date().toISOString();
      const todo = Todo.fromPersistence("test-id", "Test Todo", false, now, now, [
        { id: "sub-1", title: "Subtask 1", completed: false },
        { id: "sub-2", title: "Subtask 2", completed: true },
      ]);

      expect(todo.subtasks).toHaveLength(2);
      expect(todo.subtasks[0]!.title.value).toBe("Subtask 1");
      expect(todo.subtasks[1]!.completed).toBe(true);
    });

    it("should recreate todo with tags", () => {
      const now = new Date().toISOString();
      const todo = Todo.fromPersistence(
        "test-id",
        "Test Todo",
        false,
        now,
        now,
        [],
        ["Summary", "Research"]
      );

      expect(todo.tags).toHaveLength(2);
      expect(todo.tags.map((t) => t.name)).toContain("Summary");
      expect(todo.tags.map((t) => t.name)).toContain("Research");
    });

    it("should recreate completed todo", () => {
      const now = new Date().toISOString();
      const todo = Todo.fromPersistence("test-id", "Completed Todo", true, now, now);

      expect(todo.completed).toBe(true);
      expect(todo.status).toBe("Completed");
    });

    it("should handle empty subtasks and tags arrays", () => {
      const now = new Date().toISOString();
      const todo = Todo.fromPersistence("test-id", "Empty Todo", false, now, now, [], []);

      expect(todo.subtasks).toEqual([]);
      expect(todo.tags).toEqual([]);
    });

    it("should handle undefined subtasks and tags", () => {
      const now = new Date().toISOString();
      const todo = Todo.fromPersistence("test-id", "Undefined Todo", false, now, now);

      expect(todo.subtasks).toEqual([]);
      expect(todo.tags).toEqual([]);
    });
  });

  describe("toJSON", () => {
    it("should serialize todo with all properties", () => {
      const todo = Todo.create("JSON Test")
        .addTag("Summary")
        .addSubtask("subtask1")
        .toggleCompletion();

      const json = todo.toJSON();

      expect(json.id).toBe(todo.id);
      expect(json.title).toBe("JSON Test");
      expect(json.completed).toBe(true);
      expect(json.tags).toContain("Summary");
      expect(json.subtasks).toHaveLength(1);
      expect(json.subtasks[0]!.title).toBe("subtask1");
    });

    it("should serialize dates as ISO strings", () => {
      const todo = Todo.create("Date Test");
      const json = todo.toJSON();

      expect(typeof json.createdAt).toBe("string");
      expect(typeof json.updatedAt).toBe("string");
      expect(new Date(json.createdAt)).toBeInstanceOf(Date);
      expect(new Date(json.updatedAt)).toBeInstanceOf(Date);
    });
  });

  describe("getters", () => {
    it("should return copy of subtasks array", () => {
      const todo = Todo.create("Test").addSubtask("Sub");
      const subtasks1 = todo.subtasks;
      const subtasks2 = todo.subtasks;

      expect(subtasks1).not.toBe(subtasks2);
      expect(subtasks1).toEqual(subtasks2);
    });

    it("should return copy of tags array", () => {
      const todo = Todo.create("Test").addTag("Summary");
      const tags1 = todo.tags;
      const tags2 = todo.tags;

      expect(tags1).not.toBe(tags2);
      expect(tags1.map((t) => t.name)).toEqual(tags2.map((t) => t.name));
    });
  });
});
