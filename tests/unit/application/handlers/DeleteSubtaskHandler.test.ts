import { CreateTodoHandler } from "../../../../src/application/handlers/CreateTodoHandler";
import { DeleteSubtaskHandler } from "../../../../src/application/handlers/DeleteSubtaskHandler";
import { LocalStorageTodoRepository } from "../../../../src/infrastructure/persistence/LocalStorageTodoRepository";

describe("DeleteSubtaskHandler", () => {
  let handler: DeleteSubtaskHandler;
  let createHandler: CreateTodoHandler;
  let repository: LocalStorageTodoRepository;

  beforeEach(() => {
    localStorage.clear();
    repository = new LocalStorageTodoRepository();
    handler = new DeleteSubtaskHandler(repository);
    createHandler = new CreateTodoHandler(repository);
  });

  describe("execute", () => {
    it("should delete an existing subtask", async () => {
      const todo = await createHandler.execute("Parent Todo");
      // Add subtask using domain methods
      const savedTodo = await repository.findById(todo.id as any);
      const withSubtask = savedTodo!.addSubtask("Subtask to Delete");
      await repository.save(withSubtask);

      const subtaskId = withSubtask.subtasks[0]!.id;
      const result = await handler.execute(todo.id, subtaskId);

      expect(result.success).toBe(true);
      expect(result.id).toBe(subtaskId);
    });

    it("should remove subtask from repository", async () => {
      const todo = await createHandler.execute("Parent Todo");
      const savedTodo = await repository.findById(todo.id as any);
      const withSubtask = savedTodo!.addSubtask("Subtask");
      await repository.save(withSubtask);

      const subtaskId = withSubtask.subtasks[0]!.id;
      await handler.execute(todo.id, subtaskId);

      const updatedTodo = await repository.findById(todo.id as any);
      expect(updatedTodo?.subtasks).toHaveLength(0);
    });

    it("should throw NotFoundError for non-existent todo", async () => {
      await expect(handler.execute("non-existent-id", "subtask-id")).rejects.toThrow(
        "Todo with ID non-existent-id not found"
      );
    });

    it("should throw NotFoundError for non-existent subtask", async () => {
      const todo = await createHandler.execute("Parent Todo");

      await expect(handler.execute(todo.id, "non-existent-subtask")).rejects.toThrow(
        "Subtask with ID non-existent-subtask not found"
      );
    });

    it("should only delete the specified subtask", async () => {
      const todo = await createHandler.execute("Parent Todo");
      const savedTodo = await repository.findById(todo.id as any);
      const withSubtasks = savedTodo!
        .addSubtask("Keep 1")
        .addSubtask("Delete Me")
        .addSubtask("Keep 2");
      await repository.save(withSubtasks);

      const subtaskToDelete = withSubtasks.subtasks[1]!;
      await handler.execute(todo.id, subtaskToDelete.id);

      const updatedTodo = await repository.findById(todo.id as any);
      expect(updatedTodo?.subtasks).toHaveLength(2);
      expect(updatedTodo?.subtasks.map((s) => s.title.value)).toContain("Keep 1");
      expect(updatedTodo?.subtasks.map((s) => s.title.value)).toContain("Keep 2");
      expect(updatedTodo?.subtasks.map((s) => s.title.value)).not.toContain("Delete Me");
    });

    it("should return correct response structure", async () => {
      const todo = await createHandler.execute("Parent Todo");
      const savedTodo = await repository.findById(todo.id as any);
      const withSubtask = savedTodo!.addSubtask("Subtask");
      await repository.save(withSubtask);

      const subtaskId = withSubtask.subtasks[0]!.id;
      const result = await handler.execute(todo.id, subtaskId);

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("id");
      expect(typeof result.success).toBe("boolean");
      expect(typeof result.id).toBe("string");
    });
  });
});
