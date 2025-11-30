import type { DeleteTodoCommand } from "../../../../src/application/commands/DeleteTodoCommand";
import { CreateTodoHandler } from "../../../../src/application/handlers/CreateTodoHandler";
import { DeleteTodoCommandHandler } from "../../../../src/application/handlers/DeleteTodoCommandHandler";
import { brandTodoId } from "../../../../src/domain/value-objects/TodoId";
import { LocalStorageTodoRepository } from "../../../../src/infrastructure/persistence/LocalStorageTodoRepository";
import { mockLogger } from "../../../mocks/mockLogger";

describe("DeleteTodoCommandHandler", () => {
  let handler: DeleteTodoCommandHandler;
  let createHandler: CreateTodoHandler;
  let repository: LocalStorageTodoRepository;

  beforeEach(() => {
    localStorage.clear();
    repository = new LocalStorageTodoRepository();
    handler = new DeleteTodoCommandHandler(repository, mockLogger);
    createHandler = new CreateTodoHandler(repository);
  });

  describe("handle", () => {
    it("should delete an existing todo", async () => {
      const created = await createHandler.execute("Todo to Delete");
      const command: DeleteTodoCommand = { id: brandTodoId(created.id) };

      await handler.handle(command);

      const deleted = await repository.findById(command.id);
      expect(deleted).toBeNull();
    });

    it("should remove todo from repository", async () => {
      const created = await createHandler.execute("Todo to Remove");
      const command: DeleteTodoCommand = { id: brandTodoId(created.id) };

      const beforeDelete = await repository.findAll();
      expect(beforeDelete).toHaveLength(1);

      await handler.handle(command);

      const afterDelete = await repository.findAll();
      expect(afterDelete).toHaveLength(0);
    });

    it("should throw NotFoundError for non-existent todo", async () => {
      const command: DeleteTodoCommand = { id: brandTodoId("non-existent-id") };

      await expect(handler.handle(command)).rejects.toThrow("Todo with id non-existent-id not found");
    });

    it("should not affect other todos when deleting one", async () => {
      await createHandler.execute("Keep Me 1");
      const todo2 = await createHandler.execute("Delete Me");
      await createHandler.execute("Keep Me 2");

      const command: DeleteTodoCommand = { id: brandTodoId(todo2.id) };
      await handler.handle(command);

      const remaining = await repository.findAll();
      expect(remaining).toHaveLength(2);
      expect(remaining.map((t) => t.title.value)).toContain("Keep Me 1");
      expect(remaining.map((t) => t.title.value)).toContain("Keep Me 2");
      expect(remaining.map((t) => t.title.value)).not.toContain("Delete Me");
    });

    it("should handle todo with subtasks", async () => {
      const created = await createHandler.execute("Parent Todo");
      const todo = await repository.findById(brandTodoId(created.id));
      const withSubtask = todo!.addSubtask("Child Subtask");
      await repository.save(withSubtask);

      const command: DeleteTodoCommand = { id: brandTodoId(created.id) };
      await handler.handle(command);

      const deleted = await repository.findById(command.id);
      expect(deleted).toBeNull();
    });

    it("should handle todo with tags", async () => {
      const created = await createHandler.execute("Tagged Todo");
      const todo = await repository.findById(brandTodoId(created.id));
      const withTag = todo!.addTag("Summary");
      await repository.save(withTag);

      const command: DeleteTodoCommand = { id: brandTodoId(created.id) };
      await handler.handle(command);

      const deleted = await repository.findById(command.id);
      expect(deleted).toBeNull();
    });

    it("should work with completed todo", async () => {
      const created = await createHandler.execute("Completed Todo");
      const todo = await repository.findById(brandTodoId(created.id));
      const completed = todo!.toggleCompletion();
      await repository.save(completed);

      const command: DeleteTodoCommand = { id: brandTodoId(created.id) };
      await handler.handle(command);

      const deleted = await repository.findById(command.id);
      expect(deleted).toBeNull();
    });
  });
});
