import { CreateTodoHandler } from "../../../../src/application/handlers/CreateTodoHandler";
import { ToggleTodoHandler } from "../../../../src/application/handlers/ToggleTodoHandler";
import { LocalStorageTodoRepository } from "../../../../src/infrastructure/persistence/LocalStorageTodoRepository";

describe("ToggleTodoHandler", () => {
  let handler: ToggleTodoHandler;
  let createHandler: CreateTodoHandler;
  let repository: LocalStorageTodoRepository;

  beforeEach(() => {
    localStorage.clear();
    repository = new LocalStorageTodoRepository();
    handler = new ToggleTodoHandler(repository);
    createHandler = new CreateTodoHandler(repository);
  });

  describe("execute", () => {
    it("should toggle uncompleted todo to completed", async () => {
      const created = await createHandler.execute("Toggle Test");
      expect(created.completed).toBe(false);

      const result = await handler.execute(created.id);

      expect(result.completed).toBe(true);
      expect(result.id).toBe(created.id);
      expect(result.title).toBe("Toggle Test");
    });

    it("should toggle completed todo to uncompleted", async () => {
      const created = await createHandler.execute("Toggle Back Test");
      
      // Toggle to completed
      await handler.execute(created.id);
      
      // Toggle back to uncompleted
      const result = await handler.execute(created.id);

      expect(result.completed).toBe(false);
    });

    it("should persist toggled state to repository", async () => {
      const created = await createHandler.execute("Persist Toggle");
      
      await handler.execute(created.id);
      
      const saved = await repository.findById(created.id as any);
      expect(saved?.completed).toBe(true);
    });

    it("should update updatedAt timestamp", async () => {
      const created = await createHandler.execute("Update Time Test");
      const originalUpdatedAt = created.updatedAt;

      // Small delay to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 10));

      const result = await handler.execute(created.id);

      expect(result.updatedAt).not.toBe(originalUpdatedAt);
    });

    it("should throw NotFoundError for empty ID", async () => {
      await expect(handler.execute("")).rejects.toThrow("Todo ID cannot be empty");
    });

    it("should throw NotFoundError for whitespace-only ID", async () => {
      await expect(handler.execute("   ")).rejects.toThrow("Todo ID cannot be empty");
    });

    it("should throw NotFoundError for non-existent ID", async () => {
      await expect(handler.execute("non-existent-id")).rejects.toThrow('Todo with ID "non-existent-id" not found');
    });

    it("should preserve subtasks when toggling", async () => {
      const created = await createHandler.execute("Todo with Subtasks");
      
      // Add subtask
      const todo = await repository.findById(created.id as any);
      if (todo) {
        const updated = todo.addSubtask("Subtask 1");
        await repository.save(updated);
      }

      const result = await handler.execute(created.id);

      expect(result.subtasks).toHaveLength(1);
      expect(result.subtasks[0]!.title).toBe("Subtask 1");
    });

    it("should preserve tags when toggling", async () => {
      const created = await createHandler.execute("Todo with Tags");
      
      // Add tag
      const todo = await repository.findById(created.id as any);
      if (todo) {
        const updated = todo.addTag("Summary");
        await repository.save(updated);
      }

      const result = await handler.execute(created.id);

      expect(result.tags).toContain("Summary");
    });

    it("should return correct DTO structure", async () => {
      const created = await createHandler.execute("DTO Test");
      const result = await handler.execute(created.id);

      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("title");
      expect(result).toHaveProperty("completed");
      expect(result).toHaveProperty("createdAt");
      expect(result).toHaveProperty("updatedAt");
      expect(result).toHaveProperty("subtasks");
      expect(result).toHaveProperty("tags");
    });

    it("should be idempotent when toggled twice", async () => {
      const created = await createHandler.execute("Idempotent Test");
      
      // Toggle twice
      await handler.execute(created.id);
      const result = await handler.execute(created.id);

      // Should be back to original state
      expect(result.completed).toBe(created.completed);
    });
  });
});
