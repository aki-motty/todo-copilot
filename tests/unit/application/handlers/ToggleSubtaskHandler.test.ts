import { CreateTodoHandler } from "../../../../src/application/handlers/CreateTodoHandler";
import { ToggleSubtaskHandler } from "../../../../src/application/handlers/ToggleSubtaskHandler";
import { LocalStorageTodoRepository } from "../../../../src/infrastructure/persistence/LocalStorageTodoRepository";

describe("ToggleSubtaskHandler", () => {
  let handler: ToggleSubtaskHandler;
  let createHandler: CreateTodoHandler;
  let repository: LocalStorageTodoRepository;

  beforeEach(() => {
    localStorage.clear();
    repository = new LocalStorageTodoRepository();
    handler = new ToggleSubtaskHandler(repository);
    createHandler = new CreateTodoHandler(repository);
  });

  describe("execute", () => {
    it("should toggle subtask from incomplete to complete", async () => {
      const todo = await createHandler.execute("Parent Todo");
      const savedTodo = await repository.findById(todo.id as any);
      const withSubtask = savedTodo!.addSubtask("Toggle Me");
      await repository.save(withSubtask);

      const subtaskId = withSubtask.subtasks[0]!.id;
      const result = await handler.execute(todo.id, subtaskId);

      expect(result.completed).toBe(true);
    });

    it("should toggle subtask from complete to incomplete", async () => {
      const todo = await createHandler.execute("Parent Todo");
      const savedTodo = await repository.findById(todo.id as any);
      const withSubtask = savedTodo!.addSubtask("Toggle Me");
      await repository.save(withSubtask);

      const subtaskId = withSubtask.subtasks[0]!.id;
      // First toggle to complete
      await handler.execute(todo.id, subtaskId);
      // Then toggle back to incomplete
      const result = await handler.execute(todo.id, subtaskId);

      expect(result.completed).toBe(false);
    });

    it("should return updated subtask DTO", async () => {
      const todo = await createHandler.execute("Parent Todo");
      const savedTodo = await repository.findById(todo.id as any);
      const withSubtask = savedTodo!.addSubtask("DTO Test");
      await repository.save(withSubtask);

      const subtaskId = withSubtask.subtasks[0]!.id;
      const result = await handler.execute(todo.id, subtaskId);

      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("title");
      expect(result).toHaveProperty("completed");
      expect(result.id).toBe(subtaskId);
      expect(result.title).toBe("DTO Test");
    });

    it("should persist toggled state to repository", async () => {
      const todo = await createHandler.execute("Parent Todo");
      const savedTodo = await repository.findById(todo.id as any);
      const withSubtask = savedTodo!.addSubtask("Persist Test");
      await repository.save(withSubtask);

      const subtaskId = withSubtask.subtasks[0]!.id;
      await handler.execute(todo.id, subtaskId);

      const updatedTodo = await repository.findById(todo.id as any);
      expect(updatedTodo?.subtasks[0]!.completed).toBe(true);
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

    it("should only toggle the specified subtask", async () => {
      const todo = await createHandler.execute("Parent Todo");
      const savedTodo = await repository.findById(todo.id as any);
      const withSubtasks = savedTodo!
        .addSubtask("Sub 1")
        .addSubtask("Toggle This")
        .addSubtask("Sub 3");
      await repository.save(withSubtasks);

      const subtaskToToggle = withSubtasks.subtasks[1]!;
      await handler.execute(todo.id, subtaskToToggle.id);

      const updatedTodo = await repository.findById(todo.id as any);
      expect(updatedTodo?.subtasks[0]!.completed).toBe(false);
      expect(updatedTodo?.subtasks[1]!.completed).toBe(true);
      expect(updatedTodo?.subtasks[2]!.completed).toBe(false);
    });

    it("should be idempotent when toggled twice", async () => {
      const todo = await createHandler.execute("Parent Todo");
      const savedTodo = await repository.findById(todo.id as any);
      const withSubtask = savedTodo!.addSubtask("Idempotent");
      await repository.save(withSubtask);

      const subtaskId = withSubtask.subtasks[0]!.id;
      // Toggle twice
      await handler.execute(todo.id, subtaskId);
      const result = await handler.execute(todo.id, subtaskId);

      // Should be back to original state (incomplete)
      expect(result.completed).toBe(false);
    });
  });
});
