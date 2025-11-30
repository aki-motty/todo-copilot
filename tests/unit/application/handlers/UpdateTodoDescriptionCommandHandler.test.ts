import { UpdateTodoDescriptionCommandHandler } from "../../../../src/application/handlers/UpdateTodoDescriptionCommandHandler";
import { TodoApplicationService } from "../../../../src/application/services/TodoApplicationService";
import type { TodoId } from "../../../../src/domain/entities/Todo";
import { LocalStorageTodoRepository } from "../../../../src/infrastructure/persistence/LocalStorageTodoRepository";
import { mockLogger } from "../../../mocks/mockLogger";

describe("UpdateTodoDescriptionCommandHandler", () => {
  let handler: UpdateTodoDescriptionCommandHandler;
  let service: TodoApplicationService;

  beforeEach(() => {
    localStorage.clear();
    service = new TodoApplicationService(new LocalStorageTodoRepository(), mockLogger);
    handler = new UpdateTodoDescriptionCommandHandler(service);
  });

  describe("handle", () => {
    it("should update description through handler", async () => {
      const todo = await service.createTodo({ title: "Test Todo" });
      expect(todo.description.isEmpty).toBe(true);

      const result = await handler.handle({
        todoId: todo.id,
        description: "New description",
      });

      expect(result.description.value).toBe("New description");
      expect(result.hasDescription).toBe(true);
      expect(result.id).toBe(todo.id);
    });

    it("should delegate to application service", async () => {
      const todo = await service.createTodo({ title: "Service Test" });
      const spy = jest.spyOn(service, "updateTodoDescription");

      await handler.handle({
        todoId: todo.id,
        description: "Test",
      });

      expect(spy).toHaveBeenCalledWith({
        todoId: todo.id,
        description: "Test",
      });
    });

    it("should throw on non-existent todo", async () => {
      await expect(
        handler.handle({
          todoId: "non-existent-id" as TodoId,
          description: "Test",
        })
      ).rejects.toThrow("Todo with id non-existent-id not found");
    });

    it("should allow updating to empty description", async () => {
      const todo = await service.createTodo({ title: "Test Todo" });
      await handler.handle({
        todoId: todo.id,
        description: "Some content",
      });

      const cleared = await handler.handle({
        todoId: todo.id,
        description: "",
      });

      expect(cleared.description.isEmpty).toBe(true);
      expect(cleared.hasDescription).toBe(false);
    });

    it("should allow markdown content in description", async () => {
      const todo = await service.createTodo({ title: "Test Todo" });
      const markdown = "## Heading\n\n- Item 1\n- Item 2\n\n**Bold**";

      const result = await handler.handle({
        todoId: todo.id,
        description: markdown,
      });

      expect(result.description.value).toBe(markdown);
    });

    it("should throw if description exceeds max length", async () => {
      const todo = await service.createTodo({ title: "Test Todo" });
      const tooLong = "a".repeat(10001);

      await expect(
        handler.handle({
          todoId: todo.id,
          description: tooLong,
        })
      ).rejects.toThrow("Description cannot exceed 10000 characters");
    });

    it("should persist description across handler calls", async () => {
      const todo = await service.createTodo({ title: "Test Todo" });

      await handler.handle({
        todoId: todo.id,
        description: "First update",
      });

      // Get the todo via the service to verify persistence
      const retrieved = await service.getTodoById({ id: todo.id });
      expect(retrieved.description.value).toBe("First update");
    });

    it("should update updatedAt timestamp", async () => {
      const todo = await service.createTodo({ title: "Test Todo" });
      const originalUpdatedAt = todo.updatedAt.getTime();

      // Small delay to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      const result = await handler.handle({
        todoId: todo.id,
        description: "New description",
      });

      expect(result.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt);
    });
  });
});
