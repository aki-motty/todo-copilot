import { Todo } from "../../../../src/domain/entities/Todo";
import { LocalStorageTodoRepository } from "../../../../src/infrastructure/persistence/LocalStorageTodoRepository";

describe("LocalStorageTodoRepository - getAllTodos", () => {
  let repository: LocalStorageTodoRepository;

  beforeEach(() => {
    localStorage.clear();
    repository = new LocalStorageTodoRepository();
  });

  describe("findAll operation", () => {
    it("should return empty array when no todos are stored", async () => {
      const todos = await repository.findAll();
      expect(todos).toHaveLength(0);
      expect(Array.isArray(todos)).toBe(true);
    });

    it("should return all stored todos in creation order", async () => {
      const todo1 = Todo.create("First");
      const todo2 = Todo.create("Second");
      const todo3 = Todo.create("Third");

      await repository.save(todo1);
      await repository.save(todo2);
      await repository.save(todo3);

      const todos = await repository.findAll();
      expect(todos).toHaveLength(3);
      // Repository returns in insertion order (Oldest first)
      expect(todos[0]?.title.value).toBe("First");
      expect(todos[1]?.title.value).toBe("Second");
      expect(todos[2]?.title.value).toBe("Third");
    });

    it("should persist todos across repository instances", async () => {
      const todo = Todo.create("Persistent");
      await repository.save(todo);

      // Create new repository instance
      const newRepository = new LocalStorageTodoRepository();
      const todos = await newRepository.findAll();

      expect(todos).toHaveLength(1);
      expect(todos[0]?.title.value).toBe("Persistent");
      expect(todos[0]?.id).toBe(todo.id);
    });

    it("should return immutable todos array", async () => {
      const todo = Todo.create("Immutable Test");
      await repository.save(todo);

      const todos1 = await repository.findAll();
      const todos2 = await repository.findAll();

      // Should get different array instances (not same reference)
      expect(todos1).not.toBe(todos2);
      // But contents should be identical
      expect(todos1).toEqual(todos2);
    });

    it("should handle large number of todos efficiently", async () => {
      const todoCount = 100;
      for (let i = 0; i < todoCount; i++) {
        const todo = Todo.create(`Todo ${i}`);
        await repository.save(todo);
      }

      const todos = await repository.findAll();
      expect(todos).toHaveLength(todoCount);
      // Oldest first
      expect(todos[0]?.title.value).toBe("Todo 0");
      expect(todos[todoCount - 1]?.title.value).toBe(`Todo ${todoCount - 1}`);
    });

    it("should include all todo properties in retrieved todos", async () => {
      const todo = Todo.create("Full Properties");
      const toggledTodo = todo.toggleCompletion();
      await repository.save(toggledTodo);

      const todos = await repository.findAll();
      const retrieved = todos[0];

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(toggledTodo.id);
      expect(retrieved?.title.value).toBe("Full Properties");
      expect(retrieved?.completed).toBe(true);
      expect(retrieved?.createdAt).toBeDefined();
    });
  });
});
