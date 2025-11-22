import { CreateTodoCommandHandler } from "../../../../src/application/handlers/CreateTodoCommandHandler";
import { TodoApplicationService } from "../../../../src/application/services/TodoApplicationService";
import { LocalStorageTodoRepository } from "../../../../src/infrastructure/persistence/LocalStorageTodoRepository";

describe("CreateTodoCommandHandler", () => {
  let handler: CreateTodoCommandHandler;
  let service: TodoApplicationService;

  beforeEach(() => {
    localStorage.clear();
    service = new TodoApplicationService(new LocalStorageTodoRepository());
    handler = new CreateTodoCommandHandler(service);
  });

  it("should create todo through handler", () => {
    const result = handler.handle({ title: "Test Todo" });

    expect(result).toBeDefined();
    expect(result.title.value).toBe("Test Todo");
    expect(result.completed).toBe(false);
  });

  it("should delegate to application service", () => {
    const spy = jest.spyOn(service, "createTodo");

    handler.handle({ title: "Handler Test" });

    expect(spy).toHaveBeenCalledWith({ title: "Handler Test" });
  });

  it("should throw on validation error", () => {
    expect(() => handler.handle({ title: "" })).toThrow();
  });
});
