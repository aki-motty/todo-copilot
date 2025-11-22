import { TodoApplicationService } from "../../../../src/application/services/TodoApplicationService";
import { LocalStorageTodoRepository } from "../../../../src/infrastructure/persistence/LocalStorageTodoRepository";
import type { GetAllTodosQuery } from "../../../../src/application/queries";

describe("GetAllTodosQuery - Integration Tests", () => {
  let service: TodoApplicationService;
  let repository: LocalStorageTodoRepository;

  beforeEach(() => {
    localStorage.clear();
    repository = new LocalStorageTodoRepository();
    service = new TodoApplicationService(repository);
  });

  describe("Query execution with service", () => {
    it("should retrieve zero todos from empty repository", () => {
      const query: GetAllTodosQuery = {};
      const response = service.getAllTodos(query);

      expect(response.count).toBe(0);
      expect(response.todos).toHaveLength(0);
    });

    it("should retrieve todos created through service", () => {
      service.createTodo({ title: "Service Todo 1" });
      service.createTodo({ title: "Service Todo 2" });
      service.createTodo({ title: "Service Todo 3" });

      const query: GetAllTodosQuery = {};
      const response = service.getAllTodos(query);

      expect(response.count).toBe(3);
      expect(response.todos).toHaveLength(3);
      expect(response.todos[0]?.title.value).toBe("Service Todo 1");
      expect(response.todos[1]?.title.value).toBe("Service Todo 2");
      expect(response.todos[2]?.title.value).toBe("Service Todo 3");
    });

    it("should include toggled todos in query results", () => {
      const created1 = service.createTodo({ title: "Toggle Test 1" });
      const created2 = service.createTodo({ title: "Toggle Test 2" });

      // Toggle second todo
      service.toggleTodoCompletion({ id: created2.id });

      const query: GetAllTodosQuery = {};
      const response = service.getAllTodos(query);

      expect(response.todos).toHaveLength(2);
      const toggled = response.todos.find((t) => t.title.value === "Toggle Test 2");
      expect(toggled?.completed).toBe(true);
    });

    it("should reflect deleted todos in query results", () => {
      const created1 = service.createTodo({ title: "Delete Test 1" });
      const created2 = service.createTodo({ title: "Delete Test 2" });
      service.createTodo({ title: "Delete Test 3" });

      service.deleteTodo({ id: created1.id });

      const query: GetAllTodosQuery = {};
      const response = service.getAllTodos(query);

      expect(response.count).toBe(2);
      expect(response.todos).toHaveLength(2);
      expect(response.todos.find((t) => t.id === created1.id)).toBeUndefined();
      expect(response.todos.find((t) => t.title.value === "Delete Test 2")).toBeDefined();
    });

    it("should maintain todo order after multiple operations", () => {
      const created1 = service.createTodo({ title: "Order 1" });
      const created2 = service.createTodo({ title: "Order 2" });
      const created3 = service.createTodo({ title: "Order 3" });

      // Perform various operations
      service.toggleTodoCompletion({ id: created2.id });
      service.createTodo({ title: "Order 4" });
      service.toggleTodoCompletion({ id: created1.id });

      const query: GetAllTodosQuery = {};
      const response = service.getAllTodos(query);

      expect(response.todos).toHaveLength(4);
      expect(response.todos[0]?.title.value).toBe("Order 1");
      expect(response.todos[1]?.title.value).toBe("Order 2");
      expect(response.todos[2]?.title.value).toBe("Order 3");
      expect(response.todos[3]?.title.value).toBe("Order 4");
    });

    it("should handle concurrent queries correctly", () => {
      service.createTodo({ title: "Concurrent 1" });
      service.createTodo({ title: "Concurrent 2" });

      const query1: GetAllTodosQuery = {};
      const query2: GetAllTodosQuery = {};

      const response1 = service.getAllTodos(query1);
      const response2 = service.getAllTodos(query2);

      expect(response1.count).toBe(2);
      expect(response2.count).toBe(2);
      expect(response1).toEqual(response2);
    });

    it("should handle mixed CRUD operations sequence", () => {
      // Create
      const todo1 = service.createTodo({ title: "CRUD Test 1" });
      const todo2 = service.createTodo({ title: "CRUD Test 2" });
      const todo3 = service.createTodo({ title: "CRUD Test 3" });

      // Read
      let response = service.getAllTodos({});
      expect(response.count).toBe(3);

      // Update (toggle)
      service.toggleTodoCompletion({ id: todo1.id });
      response = service.getAllTodos({});
      expect(response.todos.find((t) => t.id === todo1.id)?.completed).toBe(true);

      // Delete
      service.deleteTodo({ id: todo2.id });
      response = service.getAllTodos({});
      expect(response.count).toBe(2);
      expect(response.todos.find((t) => t.id === todo2.id)).toBeUndefined();

      // Final state check
      expect(response.todos[0]?.id).toBe(todo1.id);
      expect(response.todos[1]?.id).toBe(todo3.id);
    });
  });

  describe("Persistence with getAllTodos", () => {
    it("should retrieve persisted todos after service restart", () => {
      // First service session
      service.createTodo({ title: "Persisted 1" });
      service.createTodo({ title: "Persisted 2" });

      const response1 = service.getAllTodos({});
      expect(response1.count).toBe(2);

      // Simulate service restart with new service instance
      const newService = new TodoApplicationService(new LocalStorageTodoRepository());

      const response2 = newService.getAllTodos({});
      expect(response2.count).toBe(2);
      expect(response2.todos[0]?.title.value).toBe("Persisted 1");
      expect(response2.todos[1]?.title.value).toBe("Persisted 2");
    });

    it("should maintain state consistency between queries", () => {
      service.createTodo({ title: "State Test 1" });
      service.createTodo({ title: "State Test 2" });

      const response1 = service.getAllTodos({});
      const response2 = service.getAllTodos({});

      // Responses should be equivalent but different instances
      expect(response1).toEqual(response2);
      expect(response1.todos).not.toBe(response2.todos);
    });
  });
});
