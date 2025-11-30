import { CreateTodoCommandHandler } from "../../../../src/application/handlers/CreateTodoCommandHandler";
import { TodoApplicationService } from "../../../../src/application/services/TodoApplicationService";
import { LocalStorageTodoRepository } from "../../../../src/infrastructure/persistence/LocalStorageTodoRepository";
import { mockLogger } from "../../../mocks/mockLogger";

describe("CreateTodoCommandHandler", () => {
  let handler: CreateTodoCommandHandler;
  let service: TodoApplicationService;

  beforeEach(() => {
    localStorage.clear();
    service = new TodoApplicationService(new LocalStorageTodoRepository(), mockLogger);
    handler = new CreateTodoCommandHandler(service);
  });

  it("should create todo through handler", async () => {
    const result = await handler.handle({ title: "Test Todo" });

    expect(result).toBeDefined();
    expect(result.title.value).toBe("Test Todo");
    expect(result.completed).toBe(false);
  });

  it("should delegate to application service", async () => {
    const spy = jest.spyOn(service, "createTodo");

    await handler.handle({ title: "Handler Test" });

    expect(spy).toHaveBeenCalledWith({ title: "Handler Test" });
  });

  it("should throw on validation error", async () => {
    await expect(handler.handle({ title: "" })).rejects.toThrow();
  });
});
