import { LocalStorageTodoRepository } from "../../../../src/infrastructure/persistence/LocalStorageTodoRepository";
import { Todo } from "../../../../src/domain/entities/Todo";
import { NotFoundError } from "../../../../src/shared/types";

describe("LocalStorageTodoRepository - Integration Tests", () => {
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
  });

  describe("save and findById", () => {
    it("should save and retrieve a todo", () => {
      const todo = Todo.create("Test todo");
      repository.save(todo);

      const retrieved = repository.findById(todo.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(todo.id);
      expect(retrieved?.title.value).toBe("Test todo");
      expect(retrieved?.completed).toBe(false);
    });

    it("should update an existing todo", () => {
      const todo = Todo.create("Original");
      repository.save(todo);

      const toggled = todo.toggleCompletion();
      repository.save(toggled);

      const retrieved = repository.findById(todo.id);

      expect(retrieved?.completed).toBe(true);
    });

    it("should return null for non-existent todo", () => {
      const result = repository.findById("non-existent-id" as any);

      expect(result).toBeNull();
    });
  });

  describe("findAll", () => {
    it("should return empty array when no todos exist", () => {
      const todos = repository.findAll();

      expect(todos).toEqual([]);
    });

    it("should return all saved todos", () => {
      const todo1 = Todo.create("Todo 1");
      const todo2 = Todo.create("Todo 2");
      const todo3 = Todo.create("Todo 3");

      repository.save(todo1);
      repository.save(todo2);
      repository.save(todo3);

      const todos = repository.findAll();

      expect(todos).toHaveLength(3);
      expect(todos.map((t) => t.title.value)).toEqual(["Todo 1", "Todo 2", "Todo 3"]);
    });

    it("should retrieve todos with correct state", () => {
      const todo1 = Todo.create("Pending");
      const todo2 = Todo.create("Completed");
      const completed = todo2.toggleCompletion();

      repository.save(todo1);
      repository.save(completed);

      const todos = repository.findAll();

      expect(todos.length).toBeGreaterThanOrEqual(2);
      expect(todos[0]?.completed).toBe(false);
      expect(todos[1]?.completed).toBe(true);
    });
  });

  describe("remove", () => {
    it("should remove an existing todo", () => {
      const todo = Todo.create("To be removed");
      repository.save(todo);

      expect(repository.findById(todo.id)).not.toBeNull();

      repository.remove(todo.id);

      expect(repository.findById(todo.id)).toBeNull();
    });

    it("should throw NotFoundError when removing non-existent todo", () => {
      expect(() => {
        repository.remove("non-existent-id" as any);
      }).toThrow(NotFoundError);
    });

    it("should not affect other todos when removing one", () => {
      const todo1 = Todo.create("Keep me");
      const todo2 = Todo.create("Remove me");
      const todo3 = Todo.create("Keep me too");

      repository.save(todo1);
      repository.save(todo2);
      repository.save(todo3);

      repository.remove(todo2.id);

      const todos = repository.findAll();

      expect(todos).toHaveLength(2);
      expect(todos.map((t) => t.title.value)).toEqual(["Keep me", "Keep me too"]);
    });
  });

  describe("clear", () => {
    it("should remove all todos", () => {
      repository.save(Todo.create("Todo 1"));
      repository.save(Todo.create("Todo 2"));
      repository.save(Todo.create("Todo 3"));

      expect(repository.findAll()).toHaveLength(3);

      repository.clear();

      expect(repository.findAll()).toHaveLength(0);
    });
  });

  describe("count", () => {
    it("should return 0 for empty repository", () => {
      expect(repository.count()).toBe(0);
    });

    it("should return correct count of todos", () => {
      repository.save(Todo.create("Todo 1"));
      expect(repository.count()).toBe(1);

      repository.save(Todo.create("Todo 2"));
      expect(repository.count()).toBe(2);

      repository.save(Todo.create("Todo 3"));
      expect(repository.count()).toBe(3);
    });

    it("should update count after removal", () => {
      const todo1 = Todo.create("Todo 1");
      const todo2 = Todo.create("Todo 2");

      repository.save(todo1);
      repository.save(todo2);

      expect(repository.count()).toBe(2);

      repository.remove(todo1.id);

      expect(repository.count()).toBe(1);
    });
  });

  describe("persistence", () => {
    it("should persist todos to storage format", () => {
      const todo = Todo.create("Persisted todo");
      repository.save(todo);

      const stored = mockStorage.getItem("todo_app:todos");
      expect(stored).toBeDefined();

      const parsed = JSON.parse(stored!);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed[0].title).toBe("Persisted todo");
    });

    it("should recreate todos from stored format", () => {
      // Manually store a todo
      const storedData = JSON.stringify([
        {
          id: "test-id-123",
          title: "Stored todo",
          completed: true,
          createdAt: "2025-01-01T00:00:00.000Z",
          updatedAt: "2025-01-02T00:00:00.000Z",
        },
      ]);

      mockStorage.setItem("todo_app:todos", storedData);

      // Create new repository instance to test loading
      const newRepository = new LocalStorageTodoRepository(mockStorage);
      const todos = newRepository.findAll();

      expect(todos).toHaveLength(1);
      expect(todos[0]?.title.value).toBe("Stored todo");
      expect(todos[0]?.completed).toBe(true);
    });
  });
});
