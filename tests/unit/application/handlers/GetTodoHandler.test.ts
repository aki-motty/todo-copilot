import { CreateTodoHandler } from "../../../../src/application/handlers/CreateTodoHandler";
import { GetTodoHandler } from "../../../../src/application/handlers/GetTodoHandler";
import { LocalStorageTodoRepository } from "../../../../src/infrastructure/persistence/LocalStorageTodoRepository";

describe("GetTodoHandler", () => {
  let handler: GetTodoHandler;
  let createHandler: CreateTodoHandler;
  let repository: LocalStorageTodoRepository;

  beforeEach(() => {
    localStorage.clear();
    repository = new LocalStorageTodoRepository();
    handler = new GetTodoHandler(repository);
    createHandler = new CreateTodoHandler(repository);
  });

  describe("execute", () => {
    it("should return todo by valid ID", async () => {
      const created = await createHandler.execute("Test Todo");
      const result = await handler.execute(created.id);

      expect(result).toBeDefined();
      expect(result.id).toBe(created.id);
      expect(result.title).toBe("Test Todo");
      expect(result.completed).toBe(false);
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

    it("should return todo with subtasks", async () => {
      const created = await createHandler.execute("Todo with Subtasks");
      // Add subtask using domain methods
      const todo = await repository.findById(created.id as any);
      if (todo) {
        const updated = todo.addSubtask("Subtask 1");
        await repository.save(updated);
      }

      const result = await handler.execute(created.id);

      expect(result.subtasks).toHaveLength(1);
      expect(result.subtasks[0]!.title).toBe("Subtask 1");
    });

    it("should return todo with tags", async () => {
      const created = await createHandler.execute("Todo with Tags");
      // Add tag using domain methods
      const todo = await repository.findById(created.id as any);
      if (todo) {
        const updated = todo.addTag("Summary");
        await repository.save(updated);
      }

      const result = await handler.execute(created.id);

      expect(result.tags).toContain("Summary");
    });

    it("should return consistent DTO structure", async () => {
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
  });
});
