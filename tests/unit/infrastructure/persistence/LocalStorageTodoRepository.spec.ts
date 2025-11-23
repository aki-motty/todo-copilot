import { Todo } from "../../../../src/domain/entities/Todo";
import { LocalStorageTodoRepository } from "../../../../src/infrastructure/persistence/LocalStorageTodoRepository";
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
    it("should save and retrieve a todo", async () => {
      const todo = Todo.create("Test todo");
      await repository.save(todo);

      const retrieved = await repository.findById(todo.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(todo.id);
      expect(retrieved?.title.value).toBe("Test todo");
      expect(retrieved?.completed).toBe(false);
    });

    it("should update an existing todo", async () => {
      const todo = Todo.create("Original");
      await repository.save(todo);

      const toggled = todo.toggleCompletion();
      await repository.save(toggled);

      const retrieved = await repository.findById(todo.id);

      expect(retrieved?.completed).toBe(true);
    });

    it("should return null for non-existent todo", async () => {
      const result = await repository.findById("non-existent-id" as any);

      expect(result).toBeNull();
    });
  });

  describe("findAll", () => {
    it("should return empty array when no todos exist", async () => {
      const todos = await repository.findAll();

      expect(todos).toEqual([]);
    });

    it("should return all saved todos", async () => {
      const todo1 = Todo.create("Todo 1");
      const todo2 = Todo.create("Todo 2");
      const todo3 = Todo.create("Todo 3");

      await repository.save(todo1);
      await repository.save(todo2);
      await repository.save(todo3);

      const todos = await repository.findAll();

      expect(todos).toHaveLength(3);
      expect(todos.map((t) => t.title.value)).toEqual(["Todo 1", "Todo 2", "Todo 3"]);
    });

    it("should retrieve todos with correct state", async () => {
      const todo1 = Todo.create("Pending");
      const todo2 = Todo.create("Completed");
      const completed = todo2.toggleCompletion();

      await repository.save(todo1);
      await repository.save(completed);

      const todos = await repository.findAll();

      expect(todos.length).toBeGreaterThanOrEqual(2);
      expect(todos[0]?.completed).toBe(false);
      expect(todos[1]?.completed).toBe(true);
    });
  });

  describe("remove", () => {
    it("should remove an existing todo", async () => {
      const todo = Todo.create("To be removed");
      await repository.save(todo);

      expect(await repository.findById(todo.id)).not.toBeNull();

      await repository.remove(todo.id);

      expect(await repository.findById(todo.id)).toBeNull();
    });

    it("should throw NotFoundError when removing non-existent todo", async () => {
      await expect(repository.remove("non-existent-id" as any)).rejects.toThrow(NotFoundError);
    });

    it("should not affect other todos when removing one", async () => {
      const todo1 = Todo.create("Keep me");
      const todo2 = Todo.create("Remove me");
      const todo3 = Todo.create("Keep me too");

      await repository.save(todo1);
      await repository.save(todo2);
      await repository.save(todo3);

      await repository.remove(todo2.id);

      const todos = await repository.findAll();

      expect(todos).toHaveLength(2);
      expect(todos.map((t) => t.title.value)).toEqual(["Keep me", "Keep me too"]);
    });
  });

  describe("clear", () => {
    it("should remove all todos", async () => {
      await repository.save(Todo.create("Todo 1"));
      await repository.save(Todo.create("Todo 2"));
      await repository.save(Todo.create("Todo 3"));

      expect(await repository.findAll()).toHaveLength(3);

      await repository.clear();

      expect(await repository.findAll()).toHaveLength(0);
    });
  });

  describe("count", () => {
    it("should return 0 for empty repository", async () => {
      expect(await repository.count()).toBe(0);
    });

    it("should return correct count of todos", async () => {
      await repository.save(Todo.create("Todo 1"));
      expect(await repository.count()).toBe(1);

      await repository.save(Todo.create("Todo 2"));
      expect(await repository.count()).toBe(2);

      await repository.save(Todo.create("Todo 3"));
      expect(await repository.count()).toBe(3);
    });

    it("should update count after removal", async () => {
      const todo1 = Todo.create("Todo 1");
      const todo2 = Todo.create("Todo 2");

      await repository.save(todo1);
      await repository.save(todo2);

      expect(await repository.count()).toBe(2);

      await repository.remove(todo1.id);

      expect(await repository.count()).toBe(1);
    });
  });

  describe("persistence", () => {
    it("should persist todos to storage format", async () => {
      const todo = Todo.create("Persisted todo");
      await repository.save(todo);

      const stored = mockStorage.getItem("todo_app:todos");
      expect(stored).toBeDefined();

      const parsed = JSON.parse(stored ?? "");
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed[0].title).toBe("Persisted todo");
    });

    it("should recreate todos from stored format", async () => {
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
      const todos = await newRepository.findAll();

      expect(todos).toHaveLength(1);
      expect(todos[0]?.title.value).toBe("Stored todo");
      expect(todos[0]?.completed).toBe(true);
    });
  });
});
