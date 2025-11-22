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
    it("should toggle todo completion status", () => {
      const todo = service.createTodo({ title: "Toggle Test" });
      expect(todo.completed).toBe(false);

      const toggled = service.toggleTodoCompletion({ id: todo.id });

      expect(toggled.completed).toBe(true);
      expect(toggled.id).toBe(todo.id);
      expect(toggled.title.value).toBe("Toggle Test");
    });

    it("should persist toggled status to repository", () => {
      const todo = service.createTodo({ title: "Persist Toggle" });

      service.toggleTodoCompletion({ id: todo.id });

      const retrieved = repository.findById(todo.id);
      expect(retrieved?.completed).toBe(true);
    });

    it("should reflect toggled status in getAllTodos", () => {
      const todo1 = service.createTodo({ title: "Todo 1" });
      const todo2 = service.createTodo({ title: "Todo 2" });
      const todo3 = service.createTodo({ title: "Todo 3" });

      service.toggleTodoCompletion({ id: todo1.id });
      service.toggleTodoCompletion({ id: todo3.id });

      const response = service.getAllTodos({});

      const retrieved1 = response.todos.find((t) => t.id === todo1.id);
      const retrieved2 = response.todos.find((t) => t.id === todo2.id);
      const retrieved3 = response.todos.find((t) => t.id === todo3.id);

      expect(retrieved1?.completed).toBe(true);
      expect(retrieved2?.completed).toBe(false);
      expect(retrieved3?.completed).toBe(true);
    });

    it("should allow multiple consecutive toggles", () => {
      const todo = service.createTodo({ title: "Multiple Toggle" });

      let toggled = service.toggleTodoCompletion({ id: todo.id });
      expect(toggled.completed).toBe(true);

      toggled = service.toggleTodoCompletion({ id: toggled.id });
      expect(toggled.completed).toBe(false);

      toggled = service.toggleTodoCompletion({ id: toggled.id });
      expect(toggled.completed).toBe(true);
    });

    it("should publish domain event on completion", () => {
      const todo = service.createTodo({ title: "Event Test" });
      // Clear events from creation
      service.getDomainEvents();

      service.toggleTodoCompletion({ id: todo.id });

      const events = service.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]?.eventType).toBe("TodoCompleted");
    });

    it("should throw error for non-existent todo", () => {
      expect(() => service.toggleTodoCompletion({ id: "non-existent-id" })).toThrow();
    });

    it("should maintain todo integrity after toggle", () => {
      const todo = service.createTodo({ title: "Integrity Test" });
      const originalId = todo.id;
      const originalTitle = todo.title.value;

      const toggled = service.toggleTodoCompletion({ id: todo.id });

      expect(toggled.id).toBe(originalId);
      expect(toggled.title.value).toBe(originalTitle);
    });
  });

  describe("Persistence of toggled status", () => {
    it("should maintain toggled status after service restart", () => {
      const todo = service.createTodo({ title: "Persistent Toggle" });
      service.toggleTodoCompletion({ id: todo.id });

      // Simulate service restart
      const newService = new TodoApplicationService(new LocalStorageTodoRepository());

      const retrieved = newService.getAllTodos({}).todos[0];
      expect(retrieved?.completed).toBe(true);
    });

    it("should handle mixed toggle states after restart", () => {
      const todo1 = service.createTodo({ title: "Toggle 1" });
      const todo2 = service.createTodo({ title: "Toggle 2" });
      const todo3 = service.createTodo({ title: "Toggle 3" });

      service.toggleTodoCompletion({ id: todo1.id });
      // Leave todo2 uncompleted
      service.toggleTodoCompletion({ id: todo3.id });

      const newService = new TodoApplicationService(new LocalStorageTodoRepository());

      const todos = newService.getAllTodos({}).todos;

      const restored1 = todos.find((t) => t.id === todo1.id);
      const restored2 = todos.find((t) => t.id === todo2.id);
      const restored3 = todos.find((t) => t.id === todo3.id);

      expect(restored1?.completed).toBe(true);
      expect(restored2?.completed).toBe(false);
      expect(restored3?.completed).toBe(true);
    });
  });

  describe("Toggle with concurrent operations", () => {
    it("should handle toggle + create + delete sequence", () => {
      const todo1 = service.createTodo({ title: "Sequential 1" });
      const todo2 = service.createTodo({ title: "Sequential 2" });

      service.toggleTodoCompletion({ id: todo1.id });
      const todo3 = service.createTodo({ title: "Sequential 3" });
      service.deleteTodo({ id: todo2.id });

      const response = service.getAllTodos({});

      expect(response.count).toBe(2);
      const completed = response.todos.find((t) => t.id === todo1.id);
      expect(completed?.completed).toBe(true);
    });

    it("should maintain consistency with rapid toggles", () => {
      const todo = service.createTodo({ title: "Rapid Toggle" });

      // Rapid toggles
      for (let i = 0; i < 10; i++) {
        service.toggleTodoCompletion({ id: todo.id });
      }

      const final = repository.findById(todo.id);
      // 10 toggles = even number = should be false (original state)
      expect(final?.completed).toBe(false);
    });
  });
});
