import { CreateTodoCommandHandler } from "../../../../src/application/handlers/CreateTodoCommandHandler";
import { GetTodoHandler } from "../../../../src/application/handlers/GetTodoHandler";
import { TodoApplicationService } from "../../../../src/application/services/TodoApplicationService";
import { LocalStorageTodoRepository } from "../../../../src/infrastructure/persistence/LocalStorageTodoRepository";

describe("GetTodoHandler", () => {
  let handler: GetTodoHandler;
  let createHandler: CreateTodoCommandHandler;
  let service: TodoApplicationService;
  let repository: LocalStorageTodoRepository;

  beforeEach(() => {
    localStorage.clear();
    repository = new LocalStorageTodoRepository();
    service = new TodoApplicationService(repository);
    handler = new GetTodoHandler(repository);
    createHandler = new CreateTodoCommandHandler(service);
  });

  it("should retrieve an existing todo by id", async () => {
    // Create a todo first
    const created = await createHandler.handle({ title: "Test Todo" });

    const result = await handler.execute(created.id);

    expect(result).toBeDefined();
    expect(result.title).toBe("Test Todo");
    expect(result.id).toBe(created.id);
  });

  it("should throw error for non-existent todo", async () => {
    await expect(handler.execute("non-existent-id")).rejects.toThrow("not found");
  });

  it("should retrieve todo with all properties", async () => {
    const created = await createHandler.handle({ title: "Complete Todo" });

    const result = await handler.execute(created.id);

    expect(result).toBeDefined();
    expect(result.completed).toBe(false);
    expect(result.createdAt).toBeDefined();
    expect(result.updatedAt).toBeDefined();
  });
});
