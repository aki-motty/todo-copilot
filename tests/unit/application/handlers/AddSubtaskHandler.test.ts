import { AddSubtaskHandler } from "../../../../src/application/handlers/AddSubtaskHandler";
import { CreateTodoHandler } from "../../../../src/application/handlers/CreateTodoHandler";
import { LocalStorageTodoRepository } from "../../../../src/infrastructure/persistence/LocalStorageTodoRepository";

describe("AddSubtaskHandler", () => {
  let handler: AddSubtaskHandler;
  let createHandler: CreateTodoHandler;
  let repository: LocalStorageTodoRepository;

  beforeEach(() => {
    localStorage.clear();
    repository = new LocalStorageTodoRepository();
    handler = new AddSubtaskHandler(repository);
    createHandler = new CreateTodoHandler(repository);
  });

  describe("execute", () => {
    it("should add a subtask to an existing todo", async () => {
      const todo = await createHandler.execute("Parent Todo");

      const subtask = await handler.execute(todo.id, "New Subtask");

      expect(subtask.title).toBe("New Subtask");
      expect(subtask.completed).toBe(false);
      expect(subtask.id).toBeDefined();
    });

    it("should return the newly added subtask", async () => {
      const todo = await createHandler.execute("Parent Todo");

      const subtask = await handler.execute(todo.id, "Subtask 1");

      expect(subtask).toHaveProperty("id");
      expect(subtask).toHaveProperty("title");
      expect(subtask).toHaveProperty("completed");
    });

    it("should persist the subtask to the repository", async () => {
      const todo = await createHandler.execute("Parent Todo");
      await handler.execute(todo.id, "Persisted Subtask");

      const savedTodo = await repository.findById(todo.id as any);
      expect(savedTodo?.subtasks).toHaveLength(1);
      expect(savedTodo?.subtasks[0]!.title.value).toBe("Persisted Subtask");
    });

    it("should add multiple subtasks", async () => {
      const todo = await createHandler.execute("Parent Todo");

      await handler.execute(todo.id, "Subtask 1");
      await handler.execute(todo.id, "Subtask 2");
      await handler.execute(todo.id, "Subtask 3");

      const savedTodo = await repository.findById(todo.id as any);
      expect(savedTodo?.subtasks).toHaveLength(3);
    });

    it("should throw ValidationError for empty title", async () => {
      const todo = await createHandler.execute("Parent Todo");

      await expect(handler.execute(todo.id, "")).rejects.toThrow("Subtask title cannot be empty");
    });

    it("should throw ValidationError for whitespace-only title", async () => {
      const todo = await createHandler.execute("Parent Todo");

      await expect(handler.execute(todo.id, "   ")).rejects.toThrow("Subtask title cannot be empty");
    });

    it("should throw ValidationError for title exceeding 500 characters", async () => {
      const todo = await createHandler.execute("Parent Todo");
      const longTitle = "a".repeat(501);

      await expect(handler.execute(todo.id, longTitle)).rejects.toThrow("Subtask title cannot exceed 500 characters");
    });

    it("should accept title with exactly 500 characters", async () => {
      const todo = await createHandler.execute("Parent Todo");
      const maxTitle = "a".repeat(500);

      const subtask = await handler.execute(todo.id, maxTitle);

      expect(subtask.title).toBe(maxTitle);
    });

    it("should throw NotFoundError for non-existent todo", async () => {
      await expect(handler.execute("non-existent-id", "Subtask")).rejects.toThrow("Todo with ID non-existent-id not found");
    });

    it("should generate unique IDs for subtasks", async () => {
      const todo = await createHandler.execute("Parent Todo");

      const subtask1 = await handler.execute(todo.id, "Subtask 1");
      const subtask2 = await handler.execute(todo.id, "Subtask 2");

      expect(subtask1.id).not.toBe(subtask2.id);
    });
  });
});
