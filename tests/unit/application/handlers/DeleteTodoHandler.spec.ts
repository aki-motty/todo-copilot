import { CreateTodoCommandHandler } from "../../../../src/application/handlers/CreateTodoCommandHandler";
import { DeleteTodoHandler } from "../../../../src/application/handlers/DeleteTodoHandler";
import { TodoApplicationService } from "../../../../src/application/services/TodoApplicationService";
import { LocalStorageTodoRepository } from "../../../../src/infrastructure/persistence/LocalStorageTodoRepository";

describe("DeleteTodoHandler", () => {
  let handler: DeleteTodoHandler;
  let createHandler: CreateTodoCommandHandler;
  let service: TodoApplicationService;
  let repository: LocalStorageTodoRepository;

  beforeEach(() => {
    localStorage.clear();
    repository = new LocalStorageTodoRepository();
    service = new TodoApplicationService(repository);
    handler = new DeleteTodoHandler(repository);
    createHandler = new CreateTodoCommandHandler(service);
  });

  it("should delete an existing todo", async () => {
    // Create a todo first
    const created = await createHandler.handle({ title: "Todo to Delete" });
    const allBefore = await repository.findAll();
    expect(allBefore).toHaveLength(1);

    // Delete it
    const result = await handler.execute(created.id);

    expect(result.success).toBe(true);
    expect(result.id).toBe(created.id);

    // Verify it's gone
    const allAfter = await repository.findAll();
    expect(allAfter).toHaveLength(0);
  });

  it("should throw error for non-existent todo", async () => {
    await expect(handler.execute("non-existent-id")).rejects.toThrow();
  });

  it("should not affect other todos when deleting one", async () => {
    const todo1 = await createHandler.handle({ title: "Todo 1" });
    const todo2 = await createHandler.handle({ title: "Todo 2" });
    const todo3 = await createHandler.handle({ title: "Todo 3" });

    await handler.execute(todo2.id);

    const remaining = await repository.findAll();
    expect(remaining).toHaveLength(2);
    expect(remaining.map((t) => t.id)).toContain(todo1.id);
    expect(remaining.map((t) => t.id)).toContain(todo3.id);
    expect(remaining.map((t) => t.id)).not.toContain(todo2.id);
  });
});
