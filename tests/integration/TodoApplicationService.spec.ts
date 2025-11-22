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
    it("should create a new todo", () => {
      const todo = service.createTodo({ title: "New task" });

      expect(todo.title.value).toBe("New task");
      expect(todo.completed).toBe(false);
      expect(todo.id).toBeDefined();
    });

    it("should persist created todo to repository", () => {
      const todo = service.createTodo({ title: "Persisted task" });

      const retrieved = repository.findById(todo.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.title.value).toBe("Persisted task");
    });

    it("should publish TodoCreated event", () => {
      service.createTodo({ title: "Event test" });

      const events = service.getDomainEvents();

      expect(events).toHaveLength(1);
      expect(events[0]?.eventType).toBe("TodoCreated");
      const eventData = events[0]?.data as Record<string, unknown>;
      expect((eventData as any)?.title).toBe("Event test");
    });

    it("should throw error for invalid title", () => {
      expect(() => service.createTodo({ title: "" })).toThrow();
      expect(() => service.createTodo({ title: "a".repeat(501) })).toThrow();
    });

    it("should clear events after retrieval", () => {
      service.createTodo({ title: "Test" });

      const events1 = service.getDomainEvents();
      expect(events1).toHaveLength(1);

      const events2 = service.getDomainEvents();
      expect(events2).toHaveLength(0);
    });
  });

  describe("getAllTodos", () => {
    it("should return empty list when no todos exist", () => {
      const response = service.getAllTodos({});

      expect(response.todos).toEqual([]);
      expect(response.count).toBe(0);
    });

    it("should return all created todos", () => {
      service.createTodo({ title: "Todo 1" });
      service.createTodo({ title: "Todo 2" });
      service.createTodo({ title: "Todo 3" });

      const response = service.getAllTodos({});

      expect(response.count).toBe(3);
      expect(response.todos).toHaveLength(3);
      expect(response.todos.map((t) => t.title.value)).toEqual(["Todo 1", "Todo 2", "Todo 3"]);
    });

    it("should return todos with correct state", () => {
      const todo1 = service.createTodo({ title: "Pending" });
      const todo2 = service.createTodo({ title: "Complete" });

      service.toggleTodoCompletion({ id: todo2.id });

      const response = service.getAllTodos({});

      expect(response.todos[0]?.completed).toBe(false);
      expect(response.todos[1]?.completed).toBe(true);
    });
  });

  describe("getTodoById", () => {
    it("should retrieve a specific todo", () => {
      const created = service.createTodo({ title: "Specific todo" });

      const retrieved = service.getTodoById({ id: created.id });

      expect(retrieved).not.toBeNull();
      expect(retrieved?.title.value).toBe("Specific todo");
    });

    it("should return null for non-existent todo", () => {
      const result = service.getTodoById({ id: "non-existent" });

      expect(result).toBeNull();
    });
  });

  describe("toggleTodoCompletion", () => {
    it("should toggle todo from pending to completed", () => {
      const todo = service.createTodo({ title: "Toggle test" });

      const toggled = service.toggleTodoCompletion({ id: todo.id });

      expect(toggled.completed).toBe(true);
      expect(toggled.status).toBe("Completed");
    });

    it("should toggle todo from completed to pending", () => {
      const todo = service.createTodo({ title: "Toggle back" });
      service.toggleTodoCompletion({ id: todo.id });

      const toggled = service.toggleTodoCompletion({ id: todo.id });

      expect(toggled.completed).toBe(false);
      expect(toggled.status).toBe("Pending");
    });

    it("should persist toggled state", () => {
      const todo = service.createTodo({ title: "Persistent toggle" });
      service.toggleTodoCompletion({ id: todo.id });

      const retrieved = repository.findById(todo.id);

      expect(retrieved?.completed).toBe(true);
    });

    it("should publish completion event", () => {
      const todo = service.createTodo({ title: "Event test" });
      service.getDomainEvents(); // Clear creation event

      service.toggleTodoCompletion({ id: todo.id });

      const events = service.getDomainEvents();

      expect(events).toHaveLength(1);
      expect(events[0]?.eventType).toBe("TodoCompleted");
      const eventData = events[0]?.data as Record<string, unknown>;
      expect((eventData as any)?.status).toBe("Completed");
    });

    it("should throw NotFoundError for non-existent todo", () => {
      expect(() => service.toggleTodoCompletion({ id: "non-existent" })).toThrow(NotFoundError);
    });

    it("should update timestamp on toggle", () => {
      const todo = service.createTodo({ title: "Timestamp test" });
      const originalUpdatedAt = todo.updatedAt;

      const toggled = service.toggleTodoCompletion({ id: todo.id });

      expect(toggled.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
    });
  });

  describe("deleteTodo", () => {
    it("should delete a todo", () => {
      const todo = service.createTodo({ title: "To delete" });

      expect(repository.findById(todo.id)).not.toBeNull();

      service.deleteTodo({ id: todo.id });

      expect(repository.findById(todo.id)).toBeNull();
    });

    it("should publish deletion event", () => {
      const todo = service.createTodo({ title: "Event delete" });
      service.getDomainEvents(); // Clear creation event

      service.deleteTodo({ id: todo.id });

      const events = service.getDomainEvents();

      expect(events).toHaveLength(1);
      expect(events[0]?.eventType).toBe("TodoDeleted");
    });

    it("should throw NotFoundError for non-existent todo", () => {
      expect(() => service.deleteTodo({ id: "non-existent" })).toThrow(NotFoundError);
    });

    it("should not affect other todos", () => {
      const todo1 = service.createTodo({ title: "Keep" });
      const todo2 = service.createTodo({ title: "Delete" });
      const todo3 = service.createTodo({ title: "Keep too" });

      service.deleteTodo({ id: todo2.id });

      const response = service.getAllTodos({});

      expect(response.count).toBe(2);
      expect(response.todos.map((t) => t.title.value)).toEqual(["Keep", "Keep too"]);
    });
  });

  describe("CQRS separation", () => {
    it("should separate commands and queries", () => {
      // Commands should modify state
      const created = service.createTodo({ title: "Command test" });
      service.toggleTodoCompletion({ id: created.id });
      service.deleteTodo({ id: created.id });

      // Queries should not modify state
      const response1 = service.getAllTodos({});
      const response2 = service.getAllTodos({});

      expect(response1.count).toBe(response2.count);
    });

    it("should track domain events separately", () => {
      service.createTodo({ title: "Event test" });
      service.createTodo({ title: "Event test 2" });

      const events1 = service.getDomainEvents();
      expect(events1).toHaveLength(2);

      const events2 = service.getDomainEvents();
      expect(events2).toHaveLength(0);
    });
  });

  describe("deleteTodo", () => {
    it("should delete an existing todo", () => {
      const created = service.createTodo({ title: "Delete me" });
      const retrieved = repository.findById(created.id);
      expect(retrieved).not.toBeNull();

      service.deleteTodo({ id: created.id });

      const deleted = repository.findById(created.id);
      expect(deleted).toBeNull();
    });

    it("should throw NotFoundError when deleting non-existent todo", () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";

      expect(() => {
        service.deleteTodo({ id: fakeId });
      }).toThrow(NotFoundError);
    });

    it("should remove todo from findAll results after deletion", () => {
      const todo1 = service.createTodo({ title: "Keep this" });
      const todo2 = service.createTodo({ title: "Delete this" });

      const before = repository.findAll();
      expect(before).toHaveLength(2);

      service.deleteTodo({ id: todo2.id });

      const after = repository.findAll();
      expect(after).toHaveLength(1);
      if (after[0]) {
        expect(after[0].id).toEqual(todo1.id);
      }
    });

    it("should persist deletion to storage", () => {
      const created = service.createTodo({ title: "Persist deletion" });
      service.deleteTodo({ id: created.id });

      // Verify by checking storage directly
      const stored = mockStorage.getItem("todos");
      const todos = JSON.parse(stored || "[]");

      expect(todos).toHaveLength(0);
    });

    it("should delete correct todo when multiple exist", () => {
      const todo1 = service.createTodo({ title: "First" });
      const todo2 = service.createTodo({ title: "Second" });
      const todo3 = service.createTodo({ title: "Third" });

      service.deleteTodo({ id: todo2.id });

      const remaining = repository.findAll();
      const ids = remaining.map((t: any) => t.id.valueOf());

      expect(remaining).toHaveLength(2);
      expect(ids).toContain(todo1.id.valueOf());
      expect(ids).toContain(todo3.id.valueOf());
      expect(ids).not.toContain(todo2.id.valueOf());
    });

    it("should not affect other todos when deleting one", () => {
      const todo1 = service.createTodo({ title: "Todo 1" });
      const todo2 = service.createTodo({ title: "Todo 2" });

      const beforeDelete = repository.findById(todo1.id);
      expect(beforeDelete?.title.value).toBe("Todo 1");

      service.deleteTodo({ id: todo2.id });

      const afterDelete = repository.findById(todo1.id);
      expect(afterDelete?.title.value).toBe("Todo 1");
      expect(afterDelete?.completed).toBe(false);
    });
  });
});
