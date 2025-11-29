import { RemoveTagHandler } from "../../../../src/application/handlers/RemoveTagHandler";
import { TodoApplicationService } from "../../../../src/application/services/TodoApplicationService";
import { Todo } from "../../../../src/domain/entities/Todo";
import { LocalStorageTodoRepository } from "../../../../src/infrastructure/persistence/LocalStorageTodoRepository";

describe("RemoveTagHandler", () => {
  let handler: RemoveTagHandler;
  let service: TodoApplicationService;
  let repository: LocalStorageTodoRepository;

  beforeEach(() => {
    repository = new LocalStorageTodoRepository();
    service = new TodoApplicationService(repository);
    handler = new RemoveTagHandler(service);
  });

  it("should remove tag from todo", async () => {
    // Setup
    const todo = Todo.create("Test Todo");
    const todoWithTag = todo.addTag("Summary");
    await repository.save(todoWithTag);

    // Execute
    const result = await handler.handle({ id: todo.id, tagName: "Summary" });

    // Verify
    expect(result.tags).not.toContain("Summary");
    
    // Verify persistence
    const saved = await repository.findById(todo.id);
    expect(saved?.tags.map(t => t.name)).not.toContain("Summary");
  });

  it("should throw error if todo not found", async () => {
    await expect(handler.handle({ id: "non-existent", tagName: "Summary" })).rejects.toThrow();
  });
});
