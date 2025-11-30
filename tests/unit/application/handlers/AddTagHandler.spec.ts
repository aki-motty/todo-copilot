import { AddTagHandler } from "../../../../src/application/handlers/AddTagHandler";
import { TodoApplicationService } from "../../../../src/application/services/TodoApplicationService";
import { Todo } from "../../../../src/domain/entities/Todo";
import { LocalStorageTodoRepository } from "../../../../src/infrastructure/persistence/LocalStorageTodoRepository";
import { mockLogger } from "../../../mocks/mockLogger";

describe("AddTagHandler", () => {
  let handler: AddTagHandler;
  let service: TodoApplicationService;
  let repository: LocalStorageTodoRepository;

  beforeEach(() => {
    repository = new LocalStorageTodoRepository();
    service = new TodoApplicationService(repository, mockLogger);
    handler = new AddTagHandler(service);
  });

  it("should add tag to todo", async () => {
    // Setup
    const todo = Todo.create("Test Todo");
    await repository.save(todo);

    // Execute
    const result = await handler.handle({ id: todo.id, tagName: "Summary" });

    // Verify
    expect(result.tags).toContain("Summary");

    // Verify persistence
    const saved = await repository.findById(todo.id);
    expect(saved?.tags.map((t) => t.name)).toContain("Summary");
  });

  it("should throw error if todo not found", async () => {
    await expect(handler.handle({ id: "non-existent", tagName: "Summary" })).rejects.toThrow();
  });

  it("should throw error if tag is invalid", async () => {
    const todo = Todo.create("Test Todo");
    await repository.save(todo);

    await expect(handler.handle({ id: todo.id, tagName: "InvalidTag" })).rejects.toThrow();
  });
});
