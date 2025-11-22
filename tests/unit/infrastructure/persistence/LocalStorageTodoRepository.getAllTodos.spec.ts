import { LocalStorageTodoRepository } from "../../../../src/infrastructure/persistence/LocalStorageTodoRepository";
import { Todo } from "../../../../src/domain/entities/Todo";

describe("LocalStorageTodoRepository - getAllTodos", () => {
  let repository: LocalStorageTodoRepository;

  beforeEach(() => {
    localStorage.clear();
    repository = new LocalStorageTodoRepository();
  });

  describe("findAll operation", () => {
    it("should return empty array when no todos are stored", () => {
      const todos = repository.findAll();
      expect(todos).toHaveLength(0);
      expect(Array.isArray(todos)).toBe(true);
    });

    it("should return all stored todos in creation order", () => {
      const todo1 = Todo.create("First");
      const todo2 = Todo.create("Second");
      const todo3 = Todo.create("Third");

      repository.save(todo1);
      repository.save(todo2);
      repository.save(todo3);

      const todos = repository.findAll();
      expect(todos).toHaveLength(3);
      expect(todos[0]?.title.value).toBe("First");
      expect(todos[1]?.title.value).toBe("Second");
      expect(todos[2]?.title.value).toBe("Third");
    });

    it("should persist todos across repository instances", () => {
      const todo = Todo.create("Persistent");
      repository.save(todo);

      // Create new repository instance
      const newRepository = new LocalStorageTodoRepository();
      const todos = newRepository.findAll();

      expect(todos).toHaveLength(1);
      expect(todos[0]?.title.value).toBe("Persistent");
      expect(todos[0]?.id).toBe(todo.id);
    });

    it("should return immutable todos array", () => {
      const todo = Todo.create("Immutable Test");
      repository.save(todo);

      const todos1 = repository.findAll();
      const todos2 = repository.findAll();

      // Should get different array instances (not same reference)
      expect(todos1).not.toBe(todos2);
      // But contents should be identical
      expect(todos1).toEqual(todos2);
    });

    it("should handle large number of todos efficiently", () => {
      const todoCount = 100;
      for (let i = 0; i < todoCount; i++) {
        const todo = Todo.create(`Todo ${i}`);
        repository.save(todo);
      }

      const todos = repository.findAll();
      expect(todos).toHaveLength(todoCount);
      expect(todos[0]?.title.value).toBe("Todo 0");
      expect(todos[todoCount - 1]?.title.value).toBe(`Todo ${todoCount - 1}`);
    });

    it("should include all todo properties in retrieved todos", () => {
      const todo = Todo.create("Full Properties");
      const toggledTodo = todo.toggleCompletion();
      repository.save(toggledTodo);

      const todos = repository.findAll();
      const retrieved = todos[0];

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(toggledTodo.id);
      expect(retrieved?.title.value).toBe("Full Properties");
      expect(retrieved?.completed).toBe(true);
      expect(retrieved?.createdAt).toBeDefined();
    });
  });
});
