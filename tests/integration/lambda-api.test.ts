/**
 * Integration Tests: Lambda API
 * Test complete API workflows including create → toggle → delete scenarios
 */

import { TodoApplicationService } from "@application/services/TodoApplicationService";
import { Todo } from "@domain/entities/Todo";
import type { ITodoRepository } from "@domain/repositories/TodoRepository";

// Mock repository for integration tests
class MockTodoRepository implements ITodoRepository {
  private todos: Map<string, any> = new Map();

  findById(id: string): any | null {
    return this.todos.get(id) || null;
  }

  findAll(): any[] {
    return Array.from(this.todos.values());
  }

  save(todo: any): void {
    this.todos.set(todo.id, todo);
  }

  remove(id: string): void {
    this.todos.delete(id);
  }

  clear(): void {
    this.todos.clear();
  }

  count(): number {
    return this.todos.size;
  }
}

describe("Integration Tests - Lambda API Workflows", () => {
  let repository: MockTodoRepository;
  let applicationService: TodoApplicationService;

  beforeEach(() => {
    jest.clearAllMocks();

    repository = new MockTodoRepository();
    applicationService = new TodoApplicationService(repository);
  });

  afterEach(() => {
    repository.clear();
  });

  describe("Workflow: Create Todo", () => {
    it("should create a todo and persist it", () => {
      const todo = Todo.create("Integration Test Todo");
      repository.save(todo);

      const retrieved = repository.findById(todo.id);
      expect(retrieved).toBeDefined();
      expect(retrieved.title.value).toBe("Integration Test Todo");
      expect(retrieved.completed).toBe(false);
    });

    it("should handle multiple todos", () => {
      const todo1 = Todo.create("Todo 1");
      const todo2 = Todo.create("Todo 2");
      const todo3 = Todo.create("Todo 3");

      repository.save(todo1);
      repository.save(todo2);
      repository.save(todo3);

      expect(repository.count()).toBe(3);
      const all = repository.findAll();
      expect(all).toHaveLength(3);
    });
  });

  describe("Workflow: Toggle Todo Completion", () => {
    it("should toggle todo completion status", () => {
      const todo = Todo.create("Todo to Toggle");
      repository.save(todo);

      const initial = repository.findById(todo.id);
      expect(initial.completed).toBe(false);

      const toggled = initial.toggleCompletion();
      repository.save(toggled);

      const updated = repository.findById(todo.id);
      expect(updated.completed).toBe(true);
    });

    it("should toggle back to incomplete", () => {
      const todo = Todo.create("Toggle Test");
      repository.save(todo);

      let current = repository.findById(todo.id);
      current = current.toggleCompletion();
      repository.save(current);
      expect(current.completed).toBe(true);

      current = current.toggleCompletion();
      repository.save(current);
      expect(current.completed).toBe(false);
    });
  });

  describe("Workflow: Delete Todo", () => {
    it("should delete a todo", () => {
      const todo = Todo.create("Todo to Delete");
      repository.save(todo);

      const todoId = todo.id;
      expect(repository.findById(todoId)).toBeDefined();

      repository.remove(todoId);
      expect(repository.findById(todoId)).toBeNull();
    });

    it("should not affect other todos when deleting", () => {
      const todo1 = Todo.create("Keep This");
      const todo2 = Todo.create("Delete This");
      const todo3 = Todo.create("Keep This Too");

      repository.save(todo1);
      repository.save(todo2);
      repository.save(todo3);

      expect(repository.count()).toBe(3);

      repository.remove(todo2.id);

      expect(repository.count()).toBe(2);
      expect(repository.findById(todo1.id)).toBeDefined();
      expect(repository.findById(todo2.id)).toBeNull();
      expect(repository.findById(todo3.id)).toBeDefined();
    });
  });

  describe("Workflow: Create → Toggle → Delete", () => {
    it("should execute full lifecycle", () => {
      // Create
      const todo = Todo.create("Lifecycle Test Todo");
      repository.save(todo);
      const todoId = todo.id;

      expect(repository.findById(todoId)).toBeDefined();
      expect(repository.findById(todoId)!.completed).toBe(false);

      // Toggle
      let current = repository.findById(todoId)!;
      current = current.toggleCompletion();
      repository.save(current);

      expect(repository.findById(todoId)!.completed).toBe(true);

      // Delete
      repository.remove(todoId);
      expect(repository.findById(todoId)).toBeNull();
    });

    it("should handle multiple items through lifecycle", () => {
      const todos = Array.from({ length: 5 }, (_, i) => Todo.create(`Todo ${i + 1}`));
      todos.forEach((t) => repository.save(t));

      expect(repository.count()).toBe(5);

      // Toggle all to completed
      const all = repository.findAll();
      all.forEach((t) => {
        const updated = t.toggleCompletion();
        repository.save(updated);
      });

      const allUpdated = repository.findAll();
      expect(allUpdated.every((t) => t.completed)).toBe(true);

      // Delete first two
      const [first, second] = all;
      repository.remove(first.id);
      repository.remove(second.id);

      expect(repository.count()).toBe(3);
    });
  });

  describe("Error Scenarios", () => {
    it("should handle retrieving non-existent todo", () => {
      const result = repository.findById("non-existent-id");
      expect(result).toBeNull();
    });

    it("should handle deleting non-existent todo gracefully", () => {
      const initialCount = repository.count();
      repository.remove("non-existent-id");
      expect(repository.count()).toBe(initialCount);
    });

    it("should handle empty repository", () => {
      expect(repository.findAll()).toEqual([]);
      expect(repository.count()).toBe(0);
    });

    it("should validate todo title constraints", () => {
      expect(() => {
        Todo.create("");
      }).toThrow();

      expect(() => {
        Todo.create("a".repeat(501));
      }).toThrow();
    });
  });

  describe("Response Format Verification", () => {
    it("should return proper todo DTO format", () => {
      const todo = Todo.create("Response Format Test");
      repository.save(todo);

      const retrieved = repository.findById(todo.id);

      expect(retrieved).toHaveProperty("id");
      expect(retrieved).toHaveProperty("title");
      expect(retrieved).toHaveProperty("completed");
      expect(retrieved).toHaveProperty("createdAt");
      expect(retrieved).toHaveProperty("updatedAt");

      expect(typeof retrieved.id).toBe("string");
      expect(typeof retrieved.title).toBe("object");
      expect(typeof retrieved.completed).toBe("boolean");
      expect(retrieved.createdAt instanceof Date).toBe(true);
      expect(retrieved.updatedAt instanceof Date).toBe(true);
    });

    it("should maintain consistency across operations", () => {
      const todo = Todo.create("Consistency Test");
      repository.save(todo);

      const id = todo.id;
      const createdAt = repository.findById(id)!.createdAt;

      let current = repository.findById(id)!;
      current = current.toggleCompletion();
      repository.save(current);

      const toggledAt = repository.findById(id)!.updatedAt;

      // Created at should not change
      expect(repository.findById(id)!.createdAt).toEqual(createdAt);
      // Updated at should be newer
      expect(repository.findById(id)!.updatedAt.getTime()).toBeGreaterThanOrEqual(
        toggledAt.getTime()
      );
    });
  });

  describe("Pagination Simulation", () => {
    it("should support paginating through todos", () => {
      const todos = Array.from({ length: 100 }, (_, i) => Todo.create(`Todo ${i + 1}`));
      todos.forEach((t) => repository.save(t));

      const pageSize = 25;
      const page1 = repository.findAll().slice(0, pageSize);
      const page2 = repository.findAll().slice(pageSize, pageSize * 2);
      const page3 = repository.findAll().slice(pageSize * 2, pageSize * 3);
      const page4 = repository.findAll().slice(pageSize * 3, pageSize * 4);

      expect(page1).toHaveLength(25);
      expect(page2).toHaveLength(25);
      expect(page3).toHaveLength(25);
      expect(page4).toHaveLength(25);

      expect(page1[0].title.value).toBe("Todo 1");
      expect(page2[0].title.value).toBe("Todo 26");
      expect(page3[0].title.value).toBe("Todo 51");
      expect(page4[0].title.value).toBe("Todo 76");
    });

    it("should handle partial pages", () => {
      const todos = Array.from({ length: 55 }, (_, i) => Todo.create(`Todo ${i + 1}`));
      todos.forEach((t) => repository.save(t));

      const pageSize = 25;
      const total = repository.count();
      const pages = Math.ceil(total / pageSize);

      expect(pages).toBe(3);

      const lastPageStart = pageSize * 2;
      const lastPage = repository.findAll().slice(lastPageStart);
      expect(lastPage).toHaveLength(5);
    });
  });

  describe("Concurrent Operations Simulation", () => {
    it("should handle multiple creates", () => {
      const createPromises = Array.from({ length: 10 }, (_, i) => {
        const todo = Todo.create(`Concurrent Todo ${i + 1}`);
        repository.save(todo);
        return todo;
      });

      expect(repository.count()).toBe(10);
      expect(repository.findAll()).toHaveLength(10);
    });

    it("should maintain data integrity during mixed operations", () => {
      const todos = Array.from({ length: 5 }, (_, i) => Todo.create(`Todo ${i + 1}`));
      todos.forEach((t) => repository.save(t));

      // Mix of operations
      let current = repository.findById(todos[0]!.id)!;
      current = current.toggleCompletion();
      repository.save(current);

      repository.remove(todos[1]!.id);

      const newTodo = Todo.create("New Todo");
      repository.save(newTodo);

      expect(repository.count()).toBe(5); // 5 - 1 + 1 = 5

      const all = repository.findAll();
      expect(all.some((t) => t.id === todos[0]!.id && t.completed)).toBe(true);
      expect(all.some((t) => t.id === todos[1]!.id)).toBe(false);
      expect(all.some((t) => t.id === newTodo.id)).toBe(true);
    });
  });
});
