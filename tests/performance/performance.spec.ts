import { performance } from "node:perf_hooks";
import { TodoApplicationService } from "../../src/application/services/TodoApplicationService";
import { LocalStorageTodoRepository } from "../../src/infrastructure/persistence/LocalStorageTodoRepository";

describe("Performance Tests (T060)", () => {
  let service: TodoApplicationService;
  let repository: LocalStorageTodoRepository;

  beforeEach(() => {
    localStorage.clear();
    repository = new LocalStorageTodoRepository();
    service = new TodoApplicationService(repository);
  });

  describe("List loading performance", () => {
    it("should load 100 todos in < 1 second", async () => {
      // Setup: Create 100 todos
      for (let i = 0; i < 100; i++) {
        await service.createTodo({ title: `Performance Test Todo ${i}` });
      }

      // Measure: Get all todos
      const start = performance.now();
      const response = await service.getAllTodos({});
      const end = performance.now();

      const duration = end - start;

      expect(response.count).toBe(100);
      expect(duration).toBeLessThan(1000); // < 1 second
    });

    it("should handle large payload efficiently", async () => {
      // Create todos with long titles
      for (let i = 0; i < 50; i++) {
        const longTitle = `${"A".repeat(300)} - Todo ${i}`;
        await service.createTodo({ title: longTitle });
      }

      const start = performance.now();
      const response = await service.getAllTodos({});
      const end = performance.now();

      expect(response.count).toBe(50);
      expect(end - start).toBeLessThan(500); // < 500ms
    });
  });

  describe("UI response performance", () => {
    it("should toggle completion in < 100ms", async () => {
      const todo = await service.createTodo({ title: "Performance Toggle" });

      const start = performance.now();
      await service.toggleTodoCompletion({ id: todo.id });
      const end = performance.now();

      expect(end - start).toBeLessThan(100);
    });

    it("should create todo in < 100ms", async () => {
      const start = performance.now();
      await service.createTodo({ title: "Performance Create" });
      const end = performance.now();

      expect(end - start).toBeLessThan(100);
    });

    it("should delete todo in < 100ms", async () => {
      const todo = await service.createTodo({ title: "Performance Delete" });

      const start = performance.now();
      await service.deleteTodo({ id: todo.id });
      const end = performance.now();

      expect(end - start).toBeLessThan(100);
    });
  });

  describe("Bulk operations", () => {
    it("should create 1000 todos efficiently", async () => {
      const start = performance.now();

      for (let i = 0; i < 1000; i++) {
        await service.createTodo({ title: `Bulk Todo ${i}` });
      }

      const end = performance.now();
      const duration = end - start;

      expect(duration).toBeLessThan(5000); // < 5 seconds for 1000
    });

    it("should query 1000 todos in < 500ms", async () => {
      // Setup: Create 1000 todos
      for (let i = 0; i < 1000; i++) {
        await service.createTodo({ title: `Query Test ${i}` });
      }

      const start = performance.now();
      const response = await service.getAllTodos({});
      const end = performance.now();

      expect(response.count).toBe(1000);
      expect(end - start).toBeLessThan(500);
    });
  });

  describe("Memory efficiency", () => {
    it("should not create duplicate arrays on repeated queries", async () => {
      await service.createTodo({ title: "Memory Test" });

      const response1 = await service.getAllTodos({});
      const response2 = await service.getAllTodos({});

      // Arrays should be different instances (new each time)
      expect(response1.todos).not.toBe(response2.todos);

      // But should have same content
      expect(response1).toEqual(response2);
    });

    it("should handle rapid consecutive operations", async () => {
      const start = performance.now();

      const todo1 = await service.createTodo({ title: "Rapid 1" });
      await service.toggleTodoCompletion({ id: todo1.id });

      const todo2 = await service.createTodo({ title: "Rapid 2" });
      await service.toggleTodoCompletion({ id: todo2.id });

      const todo3 = await service.createTodo({ title: "Rapid 3" });
      await service.deleteTodo({ id: todo3.id });

      const response = await service.getAllTodos({});

      const end = performance.now();

      expect(response.count).toBe(2);
      expect(end - start).toBeLessThan(300); // < 300ms for 6 operations
    });
  });
});
