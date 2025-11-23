import { TodoApplicationService } from "../../src/application/services/TodoApplicationService";
import { LocalStorageTodoRepository } from "../../src/infrastructure/persistence/LocalStorageTodoRepository";
import { NotFoundError } from "../../src/shared/types";

describe("TodoApplicationService - Integration Tests", () => {
  let service: TodoApplicationService;
  let repository: LocalStorageTodoRepository;
  let mockStorage: Storage;

  beforeEach(() => {
    // Create a clean mock storage for each test
    const storage: { [key: string]: string } = {};

    mockStorage = {
      getItem: (key: string) => storage[key] || null,
      setItem: (key: string, value: string) => {
        storage[key] = value;
      },
      removeItem: (key: string) => {
        delete storage[key];
      },
      clear: () => {
        for (const key in storage) {
          delete storage[key];
        }
      },
      length: Object.keys(storage).length,
      key: (index: number) => Object.keys(storage)[index] || null,
    };

    repository = new LocalStorageTodoRepository(mockStorage);
    service = new TodoApplicationService(repository);
  });

  describe("createTodo", () => {
    it("should create a new todo", async () => {
      const todo = await service.createTodo({ title: "New task" });

      expect(todo.title.value).toBe("New task");
      expect(todo.completed).toBe(false);
      expect(todo.id).toBeDefined();
    });

    it("should persist created todo to repository", async () => {
      const todo = await service.createTodo({ title: "Persisted task" });

      const retrieved = await repository.findById(todo.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.title.value).toBe("Persisted task");
    });

    it("should publish TodoCreated event", async () => {
      await service.createTodo({ title: "Event test" });

      const events = service.getDomainEvents();

      expect(events).toHaveLength(1);
      expect(events[0]?.eventType).toBe("TodoCreated");
      const eventData = events[0]?.data as Record<string, unknown>;
      expect((eventData as any)?.title).toBe("Event test");
    });

    it("should throw error for invalid title", async () => {
      await expect(service.createTodo({ title: "" })).rejects.toThrow();
      await expect(service.createTodo({ title: "a".repeat(501) })).rejects.toThrow();
    });

    it("should clear events after retrieval", async () => {
      await service.createTodo({ title: "Test" });

      const events1 = service.getDomainEvents();
      expect(events1).toHaveLength(1);

      const events2 = service.getDomainEvents();
      expect(events2).toHaveLength(0);
    });
  });

  describe("getAllTodos", () => {
    it("should return empty list when no todos exist", async () => {
      const response = await service.getAllTodos({});

      expect(response.todos).toEqual([]);
      expect(response.count).toBe(0);
    });

    it("should return all created todos", async () => {
      await service.createTodo({ title: "Todo 1" });
      await new Promise(resolve => setTimeout(resolve, 10));
      await service.createTodo({ title: "Todo 2" });
      await new Promise(resolve => setTimeout(resolve, 10));
      await service.createTodo({ title: "Todo 3" });

      const response = await service.getAllTodos({});

      expect(response.count).toBe(3);
      expect(response.todos).toHaveLength(3);
      expect(response.todos.map((t) => t.title.value)).toEqual(["Todo 3", "Todo 2", "Todo 1"]);
    });

    it("should return todos with correct state", async () => {
      await service.createTodo({ title: "Pending" });
      await new Promise(resolve => setTimeout(resolve, 10));
      const todo2 = await service.createTodo({ title: "Complete" });

      await service.toggleTodoCompletion({ id: todo2.id });

      const response = await service.getAllTodos({});

      // Newest first (Complete, then Pending)
      expect(response.todos[0]?.completed).toBe(true);
      expect(response.todos[1]?.completed).toBe(false);
    });
  });

  describe("getTodoById", () => {
    it("should retrieve a specific todo", async () => {
      const created = await service.createTodo({ title: "Specific todo" });

      const retrieved = await service.getTodoById({ id: created.id });

      expect(retrieved).not.toBeNull();
      expect(retrieved?.title.value).toBe("Specific todo");
    });

    it("should throw error for non-existent ID", async () => {
      await expect(service.getTodoById({ id: "non-existent" as any })).rejects.toThrow(NotFoundError);
    });
  });

  describe("toggleTodoCompletion", () => {
    it("should toggle todo from pending to completed", async () => {
      const todo = await service.createTodo({ title: "Toggle test" });

      const toggled = await service.toggleTodoCompletion({ id: todo.id });

      expect(toggled.completed).toBe(true);
      expect(toggled.status).toBe("Completed");
    });

    it("should toggle todo from completed to pending", async () => {
      const todo = await service.createTodo({ title: "Toggle back" });
      await service.toggleTodoCompletion({ id: todo.id });

      const toggled = await service.toggleTodoCompletion({ id: todo.id });

      expect(toggled.completed).toBe(false);
      expect(toggled.status).toBe("Pending");
    });

    it("should persist toggled state", async () => {
      const todo = await service.createTodo({ title: "Persistent toggle" });
      await service.toggleTodoCompletion({ id: todo.id });

      const retrieved = await repository.findById(todo.id);

      expect(retrieved?.completed).toBe(true);
    });

    it("should publish completion event", async () => {
      const todo = await service.createTodo({ title: "Event test" });
      service.getDomainEvents(); // Clear creation event

      await service.toggleTodoCompletion({ id: todo.id });

      const events = service.getDomainEvents();

      expect(events).toHaveLength(1);
      expect(events[0]?.eventType).toBe("TodoCompleted");
      const eventData = events[0]?.data as Record<string, unknown>;
      expect((eventData as any)?.status).toBe("Completed");
    });

    it("should throw NotFoundError for non-existent todo", async () => {
      await expect(service.toggleTodoCompletion({ id: "non-existent" as any })).rejects.toThrow(NotFoundError);
    });

    it("should update timestamp on toggle", async () => {
      const todo = await service.createTodo({ title: "Timestamp test" });
      const originalUpdatedAt = todo.updatedAt;

      const toggled = await service.toggleTodoCompletion({ id: todo.id });

      expect(toggled.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
    });
  });

  describe("deleteTodo", () => {
    it("should delete a todo", async () => {
      const todo = await service.createTodo({ title: "To delete" });

      expect(await repository.findById(todo.id)).not.toBeNull();

      await service.deleteTodo({ id: todo.id });

      expect(await repository.findById(todo.id)).toBeNull();
    });

    it("should publish deletion event", async () => {
      const todo = await service.createTodo({ title: "Event delete" });
      service.getDomainEvents(); // Clear creation event

      await service.deleteTodo({ id: todo.id });

      const events = service.getDomainEvents();

      expect(events).toHaveLength(1);
      expect(events[0]?.eventType).toBe("TodoDeleted");
    });

    it("should throw NotFoundError for non-existent todo", async () => {
      await expect(service.deleteTodo({ id: "non-existent" as any })).rejects.toThrow(NotFoundError);
    });

    it("should not affect other todos", async () => {
      await service.createTodo({ title: "Keep" });
      await new Promise(resolve => setTimeout(resolve, 10));
      const todo2 = await service.createTodo({ title: "Delete" });
      await new Promise(resolve => setTimeout(resolve, 10));
      await service.createTodo({ title: "Keep too" });

      await service.deleteTodo({ id: todo2.id });

      const response = await service.getAllTodos({});

      expect(response.count).toBe(2);
      // Newest first
      expect(response.todos.map((t) => t.title.value)).toEqual(["Keep too", "Keep"]);
    });
  });

  describe("CQRS separation", () => {
    it("should separate commands and queries", async () => {
      // Commands should modify state
      const created = await service.createTodo({ title: "Command test" });
      await service.toggleTodoCompletion({ id: created.id });
      await service.deleteTodo({ id: created.id });

      // Queries should not modify state
      const response1 = await service.getAllTodos({});
      const response2 = await service.getAllTodos({});

      expect(response1.count).toBe(response2.count);
    });

    it("should track domain events separately", async () => {
      await service.createTodo({ title: "Event test" });
      await service.createTodo({ title: "Event test 2" });

      const events1 = service.getDomainEvents();
      expect(events1).toHaveLength(2);

      const events2 = service.getDomainEvents();
      expect(events2).toHaveLength(0);
    });
  });

  describe("deleteTodo (Additional Tests)", () => {
    it("should delete an existing todo", async () => {
      const created = await service.createTodo({ title: "Delete me" });
      const retrieved = await repository.findById(created.id);
      expect(retrieved).not.toBeNull();

      await service.deleteTodo({ id: created.id });

      const deleted = await repository.findById(created.id);
      expect(deleted).toBeNull();
    });

    it("should throw NotFoundError when deleting non-existent todo", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";

      await expect(service.deleteTodo({ id: fakeId as any })).rejects.toThrow(NotFoundError);
    });

    it("should remove todo from findAll results after deletion", async () => {
      const todo1 = await service.createTodo({ title: "Keep this" });
      const todo2 = await service.createTodo({ title: "Delete this" });

      const before = await repository.findAll();
      expect(before).toHaveLength(2);

      await service.deleteTodo({ id: todo2.id });

      const after = await repository.findAll();
      expect(after).toHaveLength(1);
      if (after[0]) {
        expect(after[0].id).toEqual(todo1.id);
      }
    });

    it("should persist deletion to storage", async () => {
      const created = await service.createTodo({ title: "Persist deletion" });
      await service.deleteTodo({ id: created.id });

      // Verify by checking storage directly
      const stored = mockStorage.getItem("todos");
      const todos = JSON.parse(stored || "[]");

      expect(todos).toHaveLength(0);
    });

    it("should delete correct todo when multiple exist", async () => {
      const todo1 = await service.createTodo({ title: "First" });
      const todo2 = await service.createTodo({ title: "Second" });
      const todo3 = await service.createTodo({ title: "Third" });

      await service.deleteTodo({ id: todo2.id });

      const remaining = await repository.findAll();
      const ids = remaining.map((t: any) => t.id.valueOf());

      expect(remaining).toHaveLength(2);
      expect(ids).toContain(todo1.id.valueOf());
      expect(ids).toContain(todo3.id.valueOf());
      expect(ids).not.toContain(todo2.id.valueOf());
    });

    it("should not affect other todos when deleting one", async () => {
      const todo1 = await service.createTodo({ title: "Todo 1" });
      const todo2 = await service.createTodo({ title: "Todo 2" });

      const beforeDelete = await repository.findById(todo1.id);
      expect(beforeDelete?.title.value).toBe("Todo 1");

      await service.deleteTodo({ id: todo2.id });

      const afterDelete = await repository.findById(todo1.id);
      expect(afterDelete?.title.value).toBe("Todo 1");
      expect(afterDelete?.completed).toBe(false);
    });
  });
});
