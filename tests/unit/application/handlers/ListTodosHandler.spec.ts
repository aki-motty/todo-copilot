import { ListTodosHandler } from "../../../../src/application/handlers/ListTodosHandler";
import { CreateTodoCommandHandler } from "../../../../src/application/handlers/CreateTodoCommandHandler";
import { TodoApplicationService } from "../../../../src/application/services/TodoApplicationService";
import { LocalStorageTodoRepository } from "../../../../src/infrastructure/persistence/LocalStorageTodoRepository";

describe("ListTodosHandler", () => {
  let handler: ListTodosHandler;
  let createHandler: CreateTodoCommandHandler;
  let service: TodoApplicationService;
  let repository: LocalStorageTodoRepository;

  beforeEach(() => {
    localStorage.clear();
    repository = new LocalStorageTodoRepository();
    service = new TodoApplicationService(repository);
    handler = new ListTodosHandler(repository);
    createHandler = new CreateTodoCommandHandler(service);
  });

  it("should list all todos", async () => {
    // Create some todos
    createHandler.handle({ title: "First Todo" });
    createHandler.handle({ title: "Second Todo" });
    createHandler.handle({ title: "Third Todo" });

    const result = await handler.execute({});

    expect(result.todos).toHaveLength(3);
    expect(result.todos?.[0]?.title).toBe("Third Todo"); // Most recent first
    expect(result.todos?.[1]?.title).toBe("Second Todo");
    expect(result.todos?.[2]?.title).toBe("First Todo");
  });

  it("should return empty list when no todos exist", async () => {
    const result = await handler.execute({});

    expect(result.todos).toHaveLength(0);
  });

  it("should support limit parameter", async () => {
    for (let i = 1; i <= 10; i++) {
      createHandler.handle({ title: `Todo ${i}` });
    }

    const result = await handler.execute({ limit: 5 });

    expect(result.todos.length).toBeLessThanOrEqual(5);
  });

  it("should include all todo properties", async () => {
    createHandler.handle({ title: "Complete Todo" });

    const result = await handler.execute({});
    const todo = result.todos?.[0];

    expect(todo).toBeDefined();
    expect(todo?.id).toBeDefined();
    expect(todo?.title).toBeDefined();
    expect(todo?.completed).toBeDefined();
    expect(todo?.createdAt).toBeDefined();
    expect(todo?.updatedAt).toBeDefined();
  });
});
