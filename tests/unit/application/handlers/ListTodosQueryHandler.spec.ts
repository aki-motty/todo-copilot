import { ListTodosQueryHandler } from "../../../../src/application/handlers/ListTodosQueryHandler";
import { TodoApplicationService } from "../../../../src/application/services/TodoApplicationService";
import { LocalStorageTodoRepository } from "../../../../src/infrastructure/persistence/LocalStorageTodoRepository";

describe("ListTodosQueryHandler", () => {
  let handler: ListTodosQueryHandler;
  let service: TodoApplicationService;

  beforeEach(() => {
    localStorage.clear();
    service = new TodoApplicationService(new LocalStorageTodoRepository());
    handler = new ListTodosQueryHandler(service);
  });

  it("should list all todos", () => {
    // Create some test todos
    service.createTodo({ title: "First Todo" });
    service.createTodo({ title: "Second Todo" });

    const result = handler.handle({ limit: 10 });

    expect(result).toBeDefined();
    expect(result.todos).toHaveLength(2);
    expect(result.todos[0].title.value).toBe("First Todo");
    expect(result.todos[1].title.value).toBe("Second Todo");
  });

  it("should return empty list when no todos exist", () => {
    const result = handler.handle({ limit: 10 });

    expect(result).toBeDefined();
    expect(result.todos).toHaveLength(0);
  });

  it("should support pagination with limit", () => {
    // Create test todos
    for (let i = 1; i <= 5; i++) {
      service.createTodo({ title: `Todo ${i}` });
    }

    const result = handler.handle({ limit: 3 });

    expect(result.todos.length).toBeLessThanOrEqual(3);
  });

  it("should delegate to application service", () => {
    const spy = jest.spyOn(service, "listTodos");

    handler.handle({ limit: 10 });

    expect(spy).toHaveBeenCalledWith({ limit: 10 });
  });
});
