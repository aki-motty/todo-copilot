import { CreateTodoHandler } from "../../../../src/application/handlers/CreateTodoHandler";
import {
  SaveTodoHandler,
  type SaveTodoRequest,
} from "../../../../src/application/handlers/SaveTodoHandler";
import { LocalStorageTodoRepository } from "../../../../src/infrastructure/persistence/LocalStorageTodoRepository";

describe("SaveTodoHandler", () => {
  let handler: SaveTodoHandler;
  let createHandler: CreateTodoHandler;
  let repository: LocalStorageTodoRepository;

  beforeEach(() => {
    localStorage.clear();
    repository = new LocalStorageTodoRepository();
    handler = new SaveTodoHandler(repository);
    createHandler = new CreateTodoHandler(repository);
  });

  describe("execute", () => {
    it("should save a valid todo", async () => {
      const now = new Date().toISOString();
      const request: SaveTodoRequest = {
        id: "test-id-123",
        title: "Test Todo",
        completed: false,
        createdAt: now,
        updatedAt: now,
      };

      const result = await handler.execute(request);

      expect(result).toBeDefined();
      expect(result.id).toBe("test-id-123");
      expect(result.title).toBe("Test Todo");
      expect(result.completed).toBe(false);
    });

    it("should persist todo to repository", async () => {
      const now = new Date().toISOString();
      const request: SaveTodoRequest = {
        id: "persist-test-id",
        title: "Persist Test",
        completed: false,
        createdAt: now,
        updatedAt: now,
      };

      await handler.execute(request);
      const saved = await repository.findById("persist-test-id" as any);

      expect(saved).toBeDefined();
      expect(saved?.title.value).toBe("Persist Test");
    });

    it("should update existing todo", async () => {
      const created = await createHandler.execute("Original Title");
      const request: SaveTodoRequest = {
        id: created.id,
        title: "Updated Title",
        completed: true,
        createdAt: created.createdAt,
        updatedAt: new Date().toISOString(),
      };

      const result = await handler.execute(request);

      expect(result.title).toBe("Updated Title");
      expect(result.completed).toBe(true);
    });

    it("should throw ValidationError for missing ID", async () => {
      const request = {
        id: "",
        title: "Test",
        completed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await expect(handler.execute(request)).rejects.toThrow("Todo ID is required");
    });

    it("should throw ValidationError for empty title", async () => {
      const request: SaveTodoRequest = {
        id: "test-id",
        title: "",
        completed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await expect(handler.execute(request)).rejects.toThrow("Todo title cannot be empty");
    });

    it("should throw ValidationError for whitespace-only title", async () => {
      const request: SaveTodoRequest = {
        id: "test-id",
        title: "   ",
        completed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await expect(handler.execute(request)).rejects.toThrow("Todo title cannot be empty");
    });

    it("should save todo with subtasks", async () => {
      const now = new Date().toISOString();
      const request: SaveTodoRequest = {
        id: "subtask-test-id",
        title: "Todo with Subtasks",
        completed: false,
        createdAt: now,
        updatedAt: now,
        subtasks: [
          { id: "sub-1", title: "Subtask 1", completed: false, parentId: "subtask-test-id" },
          { id: "sub-2", title: "Subtask 2", completed: true, parentId: "subtask-test-id" },
        ],
      };

      const result = await handler.execute(request);

      expect(result.subtasks).toHaveLength(2);
      expect(result.subtasks[0]!.title).toBe("Subtask 1");
      expect(result.subtasks[1]!.completed).toBe(true);
    });

    it("should save todo with tags", async () => {
      const now = new Date().toISOString();
      const request: SaveTodoRequest = {
        id: "tag-test-id",
        title: "Todo with Tags",
        completed: false,
        createdAt: now,
        updatedAt: now,
        tags: ["Summary", "Research"],
      };

      const result = await handler.execute(request);

      expect(result.tags).toContain("Summary");
      expect(result.tags).toContain("Research");
    });

    it("should handle empty subtasks array", async () => {
      const now = new Date().toISOString();
      const request: SaveTodoRequest = {
        id: "empty-subtask-id",
        title: "No Subtasks",
        completed: false,
        createdAt: now,
        updatedAt: now,
        subtasks: [],
      };

      const result = await handler.execute(request);

      expect(result.subtasks).toEqual([]);
    });

    it("should handle empty tags array", async () => {
      const now = new Date().toISOString();
      const request: SaveTodoRequest = {
        id: "empty-tag-id",
        title: "No Tags",
        completed: false,
        createdAt: now,
        updatedAt: now,
        tags: [],
      };

      const result = await handler.execute(request);

      expect(result.tags).toEqual([]);
    });

    it("should preserve original createdAt when updating", async () => {
      const originalCreatedAt = new Date("2023-01-01").toISOString();
      const newUpdatedAt = new Date().toISOString();

      const request: SaveTodoRequest = {
        id: "preserve-created-id",
        title: "Preserve Created",
        completed: false,
        createdAt: originalCreatedAt,
        updatedAt: newUpdatedAt,
      };

      const result = await handler.execute(request);

      expect(result.createdAt).toBe(originalCreatedAt);
    });
  });
});
