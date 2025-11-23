import type { GetAllTodosQuery, GetAllTodosResponse } from "../../../../src/application/queries";
import { TodoApplicationService } from "../../../../src/application/services/TodoApplicationService";
import { LocalStorageTodoRepository } from "../../../../src/infrastructure/persistence/LocalStorageTodoRepository";

describe("GetAllTodosQuery - Unit Tests", () => {
  let service: TodoApplicationService;
  let repository: LocalStorageTodoRepository;

  beforeEach(() => {
    localStorage.clear();
    repository = new LocalStorageTodoRepository();
    service = new TodoApplicationService(repository);
  });

  describe("Query definition", () => {
    it("should define GetAllTodosQuery as empty parameter object", () => {
      const query: GetAllTodosQuery = {};
      expect(query).toEqual({});
    });

    it("should define GetAllTodosResponse with todos array and count", () => {
      const response: GetAllTodosResponse = {
        todos: [],
        count: 0,
      };
      expect(response.todos).toEqual([]);
      expect(response.count).toBe(0);
    });
  });

  describe("Query execution", () => {
    it("should return empty list when no todos exist", async () => {
      const query: GetAllTodosQuery = {};
      const response = await service.getAllTodos(query);
      expect(response.todos).toEqual([]);
      expect(response.count).toBe(0);
    });

    it("should return all created todos", async () => {
      await service.createTodo({ title: "Todo 1" });
      await new Promise(resolve => setTimeout(resolve, 10));
      await service.createTodo({ title: "Todo 2" });
      await new Promise(resolve => setTimeout(resolve, 10));
      await service.createTodo({ title: "Todo 3" });

      const query: GetAllTodosQuery = {};
      const response = await service.getAllTodos(query);

      expect(response.todos).toHaveLength(3);
      expect(response.count).toBe(3);
      expect(response.todos[0]?.title.value).toBe("Todo 3");
      expect(response.todos[1]?.title.value).toBe("Todo 2");
      expect(response.todos[2]?.title.value).toBe("Todo 1");
    });

    it("should return todos in creation order", async () => {
      const todo1 = await service.createTodo({ title: "Todo 1" });
      await new Promise(resolve => setTimeout(resolve, 10));
      const todo2 = await service.createTodo({ title: "Todo 2" });
      await new Promise(resolve => setTimeout(resolve, 10));
      const todo3 = await service.createTodo({ title: "Todo 3" });

      const query: GetAllTodosQuery = {};
      const response = await service.getAllTodos(query);

      expect(response.todos[0]?.id).toBe(todo3.id);
      expect(response.todos[1]?.id).toBe(todo2.id);
      expect(response.todos[2]?.id).toBe(todo1.id);
    });

    it("should not modify original todos when querying", async () => {
      await service.createTodo({ title: "Original" });
      const query: GetAllTodosQuery = {};
      const response1 = await service.getAllTodos(query);

      // Create another todo
      await service.createTodo({ title: "New Todo" });
      const response2 = await service.getAllTodos(query);

      // First response should not change
      expect(response1.count).toBe(1);
      expect(response2.count).toBe(2);
    });
  });
});
