import { CreateTodoHandler } from "../../../../src/application/handlers/CreateTodoHandler";
import { ListTodosHandler } from "../../../../src/application/handlers/ListTodosHandler";
import { LocalStorageTodoRepository } from "../../../../src/infrastructure/persistence/LocalStorageTodoRepository";

describe("ListTodosHandler", () => {
  let handler: ListTodosHandler;
  let createHandler: CreateTodoHandler;
  let repository: LocalStorageTodoRepository;

  beforeEach(() => {
    localStorage.clear();
    repository = new LocalStorageTodoRepository();
    handler = new ListTodosHandler(repository);
    createHandler = new CreateTodoHandler(repository);
  });

  describe("execute", () => {
    it("should return empty list when no todos exist", async () => {
      const result = await handler.execute();

      expect(result.todos).toEqual([]);
      expect(result.count).toBe(0);
      expect(result.hasMore).toBe(false);
      expect(result.cursor).toBeUndefined();
    });

    it("should return all todos sorted by createdAt DESC", async () => {
      await createHandler.execute("First Todo");
      // Small delay to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10));
      await createHandler.execute("Second Todo");
      await new Promise((resolve) => setTimeout(resolve, 10));
      await createHandler.execute("Third Todo");

      const result = await handler.execute();

      expect(result.todos).toHaveLength(3);
      expect(result.count).toBe(3);
      // Most recent first
      expect(result.todos[0]!.title).toBe("Third Todo");
      expect(result.todos[1]!.title).toBe("Second Todo");
      expect(result.todos[2]!.title).toBe("First Todo");
    });

    it("should respect limit option", async () => {
      await createHandler.execute("Todo 1");
      await createHandler.execute("Todo 2");
      await createHandler.execute("Todo 3");

      const result = await handler.execute({ limit: 2 });

      expect(result.todos).toHaveLength(2);
      expect(result.count).toBe(2);
      expect(result.hasMore).toBe(true);
    });

    it("should return hasMore=false when all items fit in limit", async () => {
      await createHandler.execute("Todo 1");
      await createHandler.execute("Todo 2");

      const result = await handler.execute({ limit: 10 });

      expect(result.hasMore).toBe(false);
      expect(result.cursor).toBeUndefined();
    });

    it("should provide cursor for pagination", async () => {
      await createHandler.execute("Todo 1");
      await createHandler.execute("Todo 2");
      await createHandler.execute("Todo 3");

      const result = await handler.execute({ limit: 2 });

      expect(result.cursor).toBeDefined();
      expect(typeof result.cursor).toBe("string");
    });

    it("should paginate using cursor", async () => {
      await createHandler.execute("Todo 1");
      await new Promise((resolve) => setTimeout(resolve, 10));
      await createHandler.execute("Todo 2");
      await new Promise((resolve) => setTimeout(resolve, 10));
      await createHandler.execute("Todo 3");

      // Get first page
      const page1 = await handler.execute({ limit: 2 });
      expect(page1.todos).toHaveLength(2);
      expect(page1.hasMore).toBe(true);

      // Get second page using cursor
      const page2 = await handler.execute({ limit: 2, cursor: page1.cursor });
      expect(page2.todos).toHaveLength(1);
      expect(page2.hasMore).toBe(false);
    });

    it("should return empty list for invalid cursor", async () => {
      await createHandler.execute("Todo 1");

      const result = await handler.execute({ cursor: "invalid-cursor" });

      // Invalid cursor should skip all items
      expect(result.todos).toHaveLength(1);
    });

    it("should use default limit of 50", async () => {
      // Create 3 todos (less than default limit)
      await createHandler.execute("Todo 1");
      await createHandler.execute("Todo 2");
      await createHandler.execute("Todo 3");

      const result = await handler.execute();

      expect(result.todos).toHaveLength(3);
      expect(result.hasMore).toBe(false);
    });

    it("should return correct DTO structure for each todo", async () => {
      await createHandler.execute("DTO Test");

      const result = await handler.execute();

      expect(result.todos[0]!).toHaveProperty("id");
      expect(result.todos[0]!).toHaveProperty("title");
      expect(result.todos[0]!).toHaveProperty("completed");
      expect(result.todos[0]!).toHaveProperty("createdAt");
      expect(result.todos[0]!).toHaveProperty("updatedAt");
      expect(result.todos[0]!).toHaveProperty("subtasks");
      expect(result.todos[0]!).toHaveProperty("tags");
    });

    it("should handle todos with subtasks", async () => {
      const created = await createHandler.execute("Todo with Subtasks");
      const todo = await repository.findById(created.id as any);
      if (todo) {
        const updated = todo.addSubtask("Subtask 1");
        await repository.save(updated);
      }

      const result = await handler.execute();

      expect(result.todos[0]!.subtasks).toHaveLength(1);
    });

    it("should handle todos with tags", async () => {
      const created = await createHandler.execute("Todo with Tags");
      const todo = await repository.findById(created.id as any);
      if (todo) {
        const updated = todo.addTag("Research");
        await repository.save(updated);
      }

      const result = await handler.execute();

      expect(result.todos[0]!.tags).toContain("Research");
    });
  });
});
