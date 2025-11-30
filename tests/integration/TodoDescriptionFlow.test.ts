/**
 * Integration tests for Todo description save flow
 * Tests the complete flow from UI to storage
 */

import { beforeEach, describe, expect, it } from "@jest/globals";
import type { UpdateTodoDescriptionCommand } from "../../src/application/commands/UpdateTodoDescriptionCommand";
import { TodoApplicationService } from "../../src/application/services/TodoApplicationService";
import type { TodoId } from "../../src/domain/entities/Todo";
import { Todo } from "../../src/domain/entities/Todo";
import { LocalStorageTodoRepository } from "../../src/infrastructure/persistence/LocalStorageTodoRepository";
import { mockLogger } from "../mocks/mockLogger";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

describe("Todo Description Flow Integration Tests", () => {
  let repository: LocalStorageTodoRepository;
  let applicationService: TodoApplicationService;

  beforeEach(() => {
    localStorageMock.clear();
    repository = new LocalStorageTodoRepository();
    applicationService = new TodoApplicationService(repository, mockLogger);
  });

  describe("Complete description save flow", () => {
    it("should create a todo, add description, and persist to localStorage", async () => {
      // Step 1: Create a new todo
      const todo = await applicationService.createTodo({ title: "Test todo with description" });
      expect(todo).toBeDefined();
      expect(todo.description.isEmpty).toBe(true);

      // Step 2: Update description
      const command: UpdateTodoDescriptionCommand = {
        todoId: todo.id as TodoId,
        description: "# My Description\n\nThis is a **test** description.",
      };
      const updatedTodo = await applicationService.updateTodoDescription(command);

      // Step 3: Verify in-memory update
      expect(updatedTodo.description.value).toBe(
        "# My Description\n\nThis is a **test** description."
      );
      expect(updatedTodo.description.hasContent).toBe(true);

      // Step 4: Verify persistence (create new repository instance to simulate reload)
      const freshRepository = new LocalStorageTodoRepository();
      const loadedTodo = await freshRepository.findById(todo.id as TodoId);

      expect(loadedTodo).not.toBeNull();
      expect(loadedTodo!.description.value).toBe(
        "# My Description\n\nThis is a **test** description."
      );
    });

    it("should preserve description when toggling completion", async () => {
      // Create todo with description
      const todo = await applicationService.createTodo({ title: "Test todo" });
      const command: UpdateTodoDescriptionCommand = {
        todoId: todo.id as TodoId,
        description: "Important notes",
      };
      await applicationService.updateTodoDescription(command);

      // Toggle completion
      const toggled = await applicationService.toggleTodoCompletion({ id: todo.id });

      // Verify description is preserved
      expect(toggled.completed).toBe(true);
      expect(toggled.description.value).toBe("Important notes");
    });

    it("should preserve description when adding subtasks", async () => {
      // Create todo with description
      const todo = await applicationService.createTodo({ title: "Test todo" });
      const command: UpdateTodoDescriptionCommand = {
        todoId: todo.id as TodoId,
        description: "Parent task description",
      };
      await applicationService.updateTodoDescription(command);

      // Add subtask
      const updated = await applicationService.addSubtask(todo.id, "Subtask 1");

      // Verify description is preserved
      expect(updated.subtasks).toHaveLength(1);
      expect(updated.description.value).toBe("Parent task description");
    });

    it("should preserve description when managing tags", async () => {
      // Create todo with description
      const todo = await applicationService.createTodo({ title: "Test todo" });
      const command: UpdateTodoDescriptionCommand = {
        todoId: todo.id as TodoId,
        description: "Tagged task description",
      };
      await applicationService.updateTodoDescription(command);

      // Add tag
      const updated = await applicationService.addTag(todo.id, "Summary");

      // Verify description is preserved - tags are TagName objects with name property
      const tagNames = updated.tags.map((t: any) => (typeof t === "string" ? t : t.name));
      expect(tagNames).toContain("Summary");
      expect(updated.description.value).toBe("Tagged task description");
    });

    it("should handle description update for existing todo without description", async () => {
      // Simulate existing todo without description (legacy data)
      const legacyTodo = Todo.create("Legacy todo");
      await repository.save(legacyTodo);

      // Add description to legacy todo
      const command: UpdateTodoDescriptionCommand = {
        todoId: legacyTodo.id as TodoId,
        description: "New description for legacy todo",
      };
      const updated = await applicationService.updateTodoDescription(command);

      expect(updated.description.value).toBe("New description for legacy todo");
    });

    it("should allow clearing description", async () => {
      // Create todo with description
      const todo = await applicationService.createTodo({ title: "Test todo" });
      const command: UpdateTodoDescriptionCommand = {
        todoId: todo.id as TodoId,
        description: "Temporary description",
      };
      await applicationService.updateTodoDescription(command);

      // Clear description
      const clearCommand: UpdateTodoDescriptionCommand = {
        todoId: todo.id as TodoId,
        description: "",
      };
      const cleared = await applicationService.updateTodoDescription(clearCommand);

      expect(cleared.description.isEmpty).toBe(true);
      expect(cleared.description.value).toBe("");
    });
  });

  describe("Description character limit", () => {
    it("should accept description at exactly 10,000 characters", async () => {
      const todo = await applicationService.createTodo({ title: "Test todo" });
      const maxDescription = "a".repeat(10000);

      const command: UpdateTodoDescriptionCommand = {
        todoId: todo.id as TodoId,
        description: maxDescription,
      };
      const updated = await applicationService.updateTodoDescription(command);

      expect(updated.description.value.length).toBe(10000);
    });

    it("should reject description exceeding 10,000 characters", async () => {
      const todo = await applicationService.createTodo({ title: "Test todo" });
      const tooLongDescription = "a".repeat(10001);

      const command: UpdateTodoDescriptionCommand = {
        todoId: todo.id as TodoId,
        description: tooLongDescription,
      };

      await expect(applicationService.updateTodoDescription(command)).rejects.toThrow();
    });
  });

  describe("Concurrent operations", () => {
    it("should handle multiple description updates", async () => {
      const todo = await applicationService.createTodo({ title: "Test todo" });

      // First update
      const command1: UpdateTodoDescriptionCommand = {
        todoId: todo.id as TodoId,
        description: "First description",
      };
      await applicationService.updateTodoDescription(command1);

      // Second update
      const command2: UpdateTodoDescriptionCommand = {
        todoId: todo.id as TodoId,
        description: "Second description",
      };
      const final = await applicationService.updateTodoDescription(command2);

      expect(final.description.value).toBe("Second description");
    });
  });

  describe("Data integrity", () => {
    it("should maintain all todo fields when updating description", async () => {
      // Create a todo with various fields set
      const todo = await applicationService.createTodo({ title: "Full featured todo" });

      // Add subtask
      await applicationService.addSubtask(todo.id, "Subtask");

      // Add tag
      await applicationService.addTag(todo.id, "Summary");

      // Toggle completion
      await applicationService.toggleTodoCompletion({ id: todo.id });

      // Now add description
      const command: UpdateTodoDescriptionCommand = {
        todoId: todo.id as TodoId,
        description: "Final description",
      };
      const final = await applicationService.updateTodoDescription(command);

      // Verify all fields are intact - title is a value object
      const titleValue =
        typeof final.title === "string"
          ? final.title
          : (final.title as any)._value || (final.title as any).value;
      expect(titleValue).toBe("Full featured todo");
      expect(final.completed).toBe(true);
      expect(final.subtasks).toHaveLength(1);
      // Tags are TagName objects
      const tagNames = final.tags.map((t: any) => (typeof t === "string" ? t : t.name));
      expect(tagNames).toContain("Summary");
      expect(final.description.value).toBe("Final description");
      expect(final.createdAt).toBeDefined();
      expect(final.updatedAt).toBeDefined();
    });
  });
});
