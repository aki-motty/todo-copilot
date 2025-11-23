import { ToggleTodoCompletionCommandHandler } from "../../../../src/application/handlers/ToggleTodoCompletionCommandHandler";
import { TodoApplicationService } from "../../../../src/application/services/TodoApplicationService";
import { LocalStorageTodoRepository } from "../../../../src/infrastructure/persistence/LocalStorageTodoRepository";

describe("ToggleTodoCompletionCommandHandler", () => {
  let handler: ToggleTodoCompletionCommandHandler;
  let service: TodoApplicationService;

  beforeEach(() => {
    localStorage.clear();
    service = new TodoApplicationService(new LocalStorageTodoRepository());
    handler = new ToggleTodoCompletionCommandHandler(service);
  });

  it("should toggle todo through handler", async () => {
    const todo = await service.createTodo({ title: "Toggle Test" });
    expect(todo.completed).toBe(false);

    const result = await handler.handle({ id: todo.id });

    expect(result.completed).toBe(true);
    expect(result.id).toBe(todo.id);
  });

  it("should delegate to application service", async () => {
    const todo = await service.createTodo({ title: "Service Test" });
    const spy = jest.spyOn(service, "toggleTodoCompletion");

    await handler.handle({ id: todo.id });

    expect(spy).toHaveBeenCalledWith({ id: todo.id });
  });

  it("should throw on non-existent todo", async () => {
    await expect(handler.handle({ id: "non-existent" })).rejects.toThrow();
  });
});
