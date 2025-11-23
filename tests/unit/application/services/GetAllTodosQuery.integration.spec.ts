import type { GetAllTodosQuery } from "../../../../src/application/queries";
import { TodoApplicationService } from "../../../../src/application/services/TodoApplicationService";
import { LocalStorageTodoRepository } from "../../../../src/infrastructure/persistence/LocalStorageTodoRepository";

describe("GetAllTodosQuery - Integration Tests", () => {
  let service: TodoApplicationService;
  let repository: LocalStorageTodoRepository;

  beforeEach(() => {
    localStorage.clear();
    repository = new LocalStorageTodoRepository();
    service = new TodoApplicationService(repository);
  });

  describe("Query execution with service", () => {
    it("should retrieve zero todos from empty repository", async () => {
      const query: GetAllTodosQuery = {};
      const response = await service.getAllTodos(query);

      expect(response.count).toBe(0);
      expect(response.todos).toHaveLength(0);
    });

    it("should retrieve todos created through service", async () => {
      await service.createTodo({ title: "Service Todo 1" });
      await new Promise(resolve => setTimeout(resolve, 10));
      await service.createTodo({ title: "Service Todo 2" });
      await new Promise(resolve => setTimeout(resolve, 10));
      await service.createTodo({ title: "Service Todo 3" });

      const query: GetAllTodosQuery = {};
      const response = await service.getAllTodos(query);

      expect(response.count).toBe(3);
      expect(response.todos).toHaveLength(3);
      expect(response.todos[0]?.title.value).toBe("Service Todo 3");
      expect(response.todos[1]?.title.value).toBe("Service Todo 2");
      expect(response.todos[2]?.title.value).toBe("Service Todo 1");
    });

    it("should include toggled todos in query results", async () => {
      await service.createTodo({ title: "Toggle Test 1" });
      const created2 = await service.createTodo({ title: "Toggle Test 2" });

      // Toggle second todo
      await service.toggleTodoCompletion({ id: created2.id });

      const query: GetAllTodosQuery = {};
      const response = await service.getAllTodos(query);

      expect(response.todos).toHaveLength(2);
      const toggled = response.todos.find((t) => t.title.value === "Toggle Test 2");
      expect(toggled?.completed).toBe(true);
    });

    it("should reflect deleted todos in query results", async () => {
      const created1 = await service.createTodo({ title: "Delete Test 1" });
      await service.createTodo({ title: "Delete Test 2" });
      await service.createTodo({ title: "Delete Test 3" });

      await service.deleteTodo({ id: created1.id });

      const query: GetAllTodosQuery = {};
      const response = await service.getAllTodos(query);

      expect(response.count).toBe(2);
      expect(response.todos).toHaveLength(2);
      expect(response.todos.find((t) => t.id === created1.id)).toBeUndefined();
      expect(response.todos.find((t) => t.title.value === "Delete Test 2")).toBeDefined();
    });

    it("should maintain todo order after multiple operations", async () => {
      const created1 = await service.createTodo({ title: "Order 1" });
      await new Promise(resolve => setTimeout(resolve, 10));
      const created2 = await service.createTodo({ title: "Order 2" });
      await new Promise(resolve => setTimeout(resolve, 10));
      await service.createTodo({ title: "Order 3" });
      await new Promise(resolve => setTimeout(resolve, 10));

      // Perform various operations
      await service.toggleTodoCompletion({ id: created2.id });
      await service.createTodo({ title: "Order 4" });
      await service.toggleTodoCompletion({ id: created1.id });

      const query: GetAllTodosQuery = {};
      const response = await service.getAllTodos(query);

      expect(response.todos).toHaveLength(4);
      expect(response.todos[0]?.title.value).toBe("Order 4");
      expect(response.todos[1]?.title.value).toBe("Order 3");
      expect(response.todos[2]?.title.value).toBe("Order 2");
      expect(response.todos[3]?.title.value).toBe("Order 1");
    });

    it("should handle concurrent queries correctly", async () => {
      await service.createTodo({ title: "Concurrent 1" });
      await service.createTodo({ title: "Concurrent 2" });

      const query1: GetAllTodosQuery = {};
      const query2: GetAllTodosQuery = {};

      const response1 = await service.getAllTodos(query1);
      const response2 = await service.getAllTodos(query2);

      expect(response1.count).toBe(2);
      expect(response2.count).toBe(2);
      expect(response1).toEqual(response2);
    });

    it("should handle mixed CRUD operations sequence", async () => {
      // Create
      const todo1 = await service.createTodo({ title: "CRUD Test 1" });
      await new Promise(resolve => setTimeout(resolve, 10));
      const todo2 = await service.createTodo({ title: "CRUD Test 2" });
      await new Promise(resolve => setTimeout(resolve, 10));
      const todo3 = await service.createTodo({ title: "CRUD Test 3" });

      // Read
      let response = await service.getAllTodos({});
      expect(response.count).toBe(3);

      // Update (toggle)
      await service.toggleTodoCompletion({ id: todo1.id });
      response = await service.getAllTodos({});
      expect(response.todos.find((t) => t.id === todo1.id)?.completed).toBe(true);

      // Delete
      await service.deleteTodo({ id: todo2.id });
      response = await service.getAllTodos({});
      expect(response.count).toBe(2);
      expect(response.todos.find((t) => t.id === todo2.id)).toBeUndefined();

      // Final state check
      // Newest first: todo3, todo1
      expect(response.todos[0]?.id).toBe(todo3.id);
      expect(response.todos[1]?.id).toBe(todo1.id);
    });
  });

  describe("Persistence with getAllTodos", () => {
    it("should retrieve persisted todos after service restart", async () => {
      // First service session
      await service.createTodo({ title: "Persisted 1" });
      await new Promise(resolve => setTimeout(resolve, 10));
      await service.createTodo({ title: "Persisted 2" });

      const response1 = await service.getAllTodos({});
      expect(response1.count).toBe(2);

      // Simulate service restart with new service instance
      const newService = new TodoApplicationService(new LocalStorageTodoRepository());

      const response2 = await newService.getAllTodos({});
      expect(response2.count).toBe(2);
      // Newest first
      expect(response2.todos[0]?.title.value).toBe("Persisted 2");
      expect(response2.todos[1]?.title.value).toBe("Persisted 1");
    });

    it("should maintain state consistency between queries", async () => {
      await service.createTodo({ title: "State Test 1" });
      await service.createTodo({ title: "State Test 2" });

      const response1 = await service.getAllTodos({});
      const response2 = await service.getAllTodos({});

      // Responses should be equivalent but different instances
      expect(response1).toEqual(response2);
      expect(response1.todos).not.toBe(response2.todos);
    });
  });
});
