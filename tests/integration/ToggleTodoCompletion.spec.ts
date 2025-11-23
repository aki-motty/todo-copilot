import { TodoApplicationService } from "../../src/application/services/TodoApplicationService";
import { LocalStorageTodoRepository } from "../../src/infrastructure/persistence/LocalStorageTodoRepository";

describe("ToggleTodoCompletion - Integration Tests", () => {
  let service: TodoApplicationService;
  let repository: LocalStorageTodoRepository;

  beforeEach(() => {
    localStorage.clear();
    repository = new LocalStorageTodoRepository();
    service = new TodoApplicationService(repository);
  });

  describe("Toggle completion through service", () => {
    it("should toggle todo completion status", async () => {
      const todo = await service.createTodo({ title: "Toggle Test" });
      expect(todo.completed).toBe(false);

      const toggled = await service.toggleTodoCompletion({ id: todo.id });

      expect(toggled.completed).toBe(true);
      expect(toggled.id).toBe(todo.id);
      expect(toggled.title.value).toBe("Toggle Test");
    });

    it("should persist toggled status to repository", async () => {
      const todo = await service.createTodo({ title: "Persist Toggle" });

      await service.toggleTodoCompletion({ id: todo.id });

      const retrieved = await repository.findById(todo.id);
      expect(retrieved?.completed).toBe(true);
    });

    it("should reflect toggled status in getAllTodos", async () => {
      const todo1 = await service.createTodo({ title: "Todo 1" });
      const todo2 = await service.createTodo({ title: "Todo 2" });
      const todo3 = await service.createTodo({ title: "Todo 3" });

      await service.toggleTodoCompletion({ id: todo1.id });
      await service.toggleTodoCompletion({ id: todo3.id });

      const response = await service.getAllTodos({});

      const retrieved1 = response.todos.find((t) => t.id === todo1.id);
      const retrieved2 = response.todos.find((t) => t.id === todo2.id);
      const retrieved3 = response.todos.find((t) => t.id === todo3.id);

      expect(retrieved1?.completed).toBe(true);
      expect(retrieved2?.completed).toBe(false);
      expect(retrieved3?.completed).toBe(true);
    });

    it("should allow multiple consecutive toggles", async () => {
      const todo = await service.createTodo({ title: "Multiple Toggle" });

      let toggled = await service.toggleTodoCompletion({ id: todo.id });
      expect(toggled.completed).toBe(true);

      toggled = await service.toggleTodoCompletion({ id: toggled.id });
      expect(toggled.completed).toBe(false);

      toggled = await service.toggleTodoCompletion({ id: toggled.id });
      expect(toggled.completed).toBe(true);
    });

    it("should publish domain event on completion", async () => {
      const todo = await service.createTodo({ title: "Event Test" });
      // Clear events from creation
      service.getDomainEvents();

      await service.toggleTodoCompletion({ id: todo.id });

      const events = service.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]?.eventType).toBe("TodoCompleted");
    });

    it("should throw error for non-existent todo", async () => {
      await expect(
        service.toggleTodoCompletion({ id: "non-existent-id" as any })
      ).rejects.toThrow();
    });

    it("should maintain todo integrity after toggle", async () => {
      const todo = await service.createTodo({ title: "Integrity Test" });
      const originalId = todo.id;
      const originalTitle = todo.title.value;

      const toggled = await service.toggleTodoCompletion({ id: todo.id });

      expect(toggled.id).toBe(originalId);
      expect(toggled.title.value).toBe(originalTitle);
    });
  });

  describe("Persistence of toggled status", () => {
    it("should maintain toggled status after service restart", async () => {
      const todo = await service.createTodo({ title: "Persistent Toggle" });
      await service.toggleTodoCompletion({ id: todo.id });

      // Simulate service restart
      const newService = new TodoApplicationService(new LocalStorageTodoRepository());

      const response = await newService.getAllTodos({});
      const retrieved = response.todos[0];
      expect(retrieved?.completed).toBe(true);
    });

    it("should handle mixed toggle states after restart", async () => {
      const todo1 = await service.createTodo({ title: "Toggle 1" });
      const todo2 = await service.createTodo({ title: "Toggle 2" });
      const todo3 = await service.createTodo({ title: "Toggle 3" });

      await service.toggleTodoCompletion({ id: todo1.id });
      // Leave todo2 uncompleted
      await service.toggleTodoCompletion({ id: todo3.id });

      const newService = new TodoApplicationService(new LocalStorageTodoRepository());

      const response = await newService.getAllTodos({});
      const todos = response.todos;

      const restored1 = todos.find((t) => t.id === todo1.id);
      const restored2 = todos.find((t) => t.id === todo2.id);
      const restored3 = todos.find((t) => t.id === todo3.id);

      expect(restored1?.completed).toBe(true);
      expect(restored2?.completed).toBe(false);
      expect(restored3?.completed).toBe(true);
    });
  });

  describe("Toggle with concurrent operations", () => {
    it("should handle toggle + create + delete sequence", async () => {
      const todo1 = await service.createTodo({ title: "Sequential 1" });
      const todo2 = await service.createTodo({ title: "Sequential 2" });

      await service.toggleTodoCompletion({ id: todo1.id });
      await service.createTodo({ title: "Sequential 3" });
      await service.deleteTodo({ id: todo2.id });

      const response = await service.getAllTodos({});

      expect(response.count).toBe(2);
      const completed = response.todos.find((t) => t.id === todo1.id);
      expect(completed?.completed).toBe(true);
    });

    it("should maintain consistency with rapid toggles", async () => {
      const todo = await service.createTodo({ title: "Rapid Toggle" });

      // Rapid toggles
      for (let i = 0; i < 10; i++) {
        await service.toggleTodoCompletion({ id: todo.id });
      }

      const final = await repository.findById(todo.id);
      // 10 toggles = even number = should be false (original state)
      expect(final?.completed).toBe(false);
    });
  });
});
