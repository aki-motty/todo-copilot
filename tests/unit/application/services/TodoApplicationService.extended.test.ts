import { TodoApplicationService } from "../../../../src/application/services/TodoApplicationService";
import { LocalStorageTodoRepository } from "../../../../src/infrastructure/persistence/LocalStorageTodoRepository";
import { mockLogger } from "../../../mocks/mockLogger";

describe("TodoApplicationService - Extended Coverage", () => {
  let service: TodoApplicationService;
  let repository: LocalStorageTodoRepository;

  beforeEach(() => {
    localStorage.clear();
    repository = new LocalStorageTodoRepository();
    service = new TodoApplicationService(repository, mockLogger);
  });

  describe("toggleSubtask", () => {
    it("should toggle subtask completion", async () => {
      const todo = await service.createTodo({ title: "Parent Todo" });
      const updatedTodo = await service.addSubtask(todo.id, "Subtask");
      const subtaskId = updatedTodo.subtasks[0]!.id;

      const result = await service.toggleSubtask(todo.id, subtaskId);

      expect(result.subtasks[0]!.completed).toBe(true);
    });

    it("should throw NotFoundError for non-existent todo", async () => {
      await expect(service.toggleSubtask("non-existent", "sub-id")).rejects.toThrow(
        "Todo with id non-existent not found"
      );
    });
  });

  describe("addSubtask", () => {
    it("should add subtask to todo", async () => {
      const todo = await service.createTodo({ title: "Parent Todo" });

      const result = await service.addSubtask(todo.id, "New Subtask");

      expect(result.subtasks).toHaveLength(1);
      expect(result.subtasks[0]!.title.value).toBe("New Subtask");
    });

    it("should throw NotFoundError for non-existent todo", async () => {
      await expect(service.addSubtask("non-existent", "Subtask")).rejects.toThrow(
        "Todo with id non-existent not found"
      );
    });

    it("should add multiple subtasks", async () => {
      const todo = await service.createTodo({ title: "Parent Todo" });

      await service.addSubtask(todo.id, "Subtask 1");
      await service.addSubtask(todo.id, "Subtask 2");
      const result = await service.addSubtask(todo.id, "Subtask 3");

      expect(result.subtasks).toHaveLength(3);
    });
  });

  describe("deleteSubtask", () => {
    it("should delete subtask from todo", async () => {
      const todo = await service.createTodo({ title: "Parent Todo" });
      const withSubtask = await service.addSubtask(todo.id, "Subtask to Delete");
      const subtaskId = withSubtask.subtasks[0]!.id;

      const result = await service.deleteSubtask(todo.id, subtaskId);

      expect(result.subtasks).toHaveLength(0);
    });

    it("should throw NotFoundError for non-existent todo", async () => {
      await expect(service.deleteSubtask("non-existent", "sub-id")).rejects.toThrow(
        "Todo with id non-existent not found"
      );
    });
  });

  describe("addTag", () => {
    it("should add tag to todo", async () => {
      const todo = await service.createTodo({ title: "Tagged Todo" });

      const result = await service.addTag(todo.id, "Summary");

      expect(result.tags.map((t) => t.name)).toContain("Summary");
    });

    it("should throw NotFoundError for non-existent todo", async () => {
      await expect(service.addTag("non-existent", "Summary")).rejects.toThrow(
        "Todo with id non-existent not found"
      );
    });

    it("should add multiple tags", async () => {
      const todo = await service.createTodo({ title: "Multi-tagged Todo" });

      await service.addTag(todo.id, "Summary");
      await service.addTag(todo.id, "Research");
      const result = await service.addTag(todo.id, "Split");

      expect(result.tags).toHaveLength(3);
    });
  });

  describe("removeTag", () => {
    it("should remove tag from todo", async () => {
      const todo = await service.createTodo({ title: "Tagged Todo" });
      await service.addTag(todo.id, "Summary");

      const result = await service.removeTag(todo.id, "Summary");

      expect(result.tags).toHaveLength(0);
    });

    it("should throw NotFoundError for non-existent todo", async () => {
      await expect(service.removeTag("non-existent", "Summary")).rejects.toThrow(
        "Todo with id non-existent not found"
      );
    });
  });

  describe("deleteTodo", () => {
    it("should delete todo", async () => {
      const todo = await service.createTodo({ title: "Todo to Delete" });

      await service.deleteTodo({ id: todo.id });

      const deleted = await repository.findById(todo.id);
      expect(deleted).toBeNull();
    });

    it("should throw NotFoundError for non-existent todo", async () => {
      await expect(service.deleteTodo({ id: "non-existent" as any })).rejects.toThrow(
        "Todo with id non-existent not found"
      );
    });

    it("should publish TodoDeleted event", async () => {
      const todo = await service.createTodo({ title: "Event Test" });
      service.getDomainEvents(); // Clear create event

      await service.deleteTodo({ id: todo.id });

      const events = service.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]!.eventType).toBe("TodoDeleted");
    });
  });

  describe("getAllTodos", () => {
    it("should return empty list when no todos", async () => {
      const result = await service.getAllTodos({});

      expect(result.todos).toHaveLength(0);
      expect(result.count).toBe(0);
    });

    it("should return all todos", async () => {
      await service.createTodo({ title: "Todo 1" });
      await service.createTodo({ title: "Todo 2" });
      await service.createTodo({ title: "Todo 3" });

      const result = await service.getAllTodos({});

      expect(result.todos).toHaveLength(3);
      expect(result.count).toBe(3);
    });

    it("should return todos sorted by createdAt DESC", async () => {
      await service.createTodo({ title: "First" });
      await new Promise((resolve) => setTimeout(resolve, 10));
      await service.createTodo({ title: "Second" });
      await new Promise((resolve) => setTimeout(resolve, 10));
      await service.createTodo({ title: "Third" });

      const result = await service.getAllTodos({});

      expect(result.todos[0]!.title.value).toBe("Third");
      expect(result.todos[1]!.title.value).toBe("Second");
      expect(result.todos[2]!.title.value).toBe("First");
    });
  });

  describe("getTodoById", () => {
    it("should return todo by ID", async () => {
      const created = await service.createTodo({ title: "Find Me" });

      const result = await service.getTodoById({ id: created.id });

      expect(result.title.value).toBe("Find Me");
    });

    it("should throw NotFoundError for non-existent todo", async () => {
      await expect(service.getTodoById({ id: "non-existent" as any })).rejects.toThrow(
        "Todo with id non-existent not found"
      );
    });
  });

  describe("getDomainEvents", () => {
    it("should return and clear domain events", async () => {
      await service.createTodo({ title: "Event Test" });

      const firstCall = service.getDomainEvents();
      expect(firstCall).toHaveLength(1);

      const secondCall = service.getDomainEvents();
      expect(secondCall).toHaveLength(0);
    });

    it("should collect multiple events", async () => {
      const todo = await service.createTodo({ title: "Multi-event Test" });
      await service.toggleTodoCompletion({ id: todo.id });

      const events = service.getDomainEvents();

      expect(events).toHaveLength(2);
      expect(events[0]!.eventType).toBe("TodoCreated");
      expect(events[1]!.eventType).toBe("TodoCompleted");
    });
  });
});
