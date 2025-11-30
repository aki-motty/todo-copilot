import type { TodoId } from "../../../../src/domain/value-objects/TodoId";
import { AsyncApiTodoRepository } from "../../../../src/infrastructure/api/ApiTodoRepository";
import { HttpClient } from "../../../../src/infrastructure/api/HttpClient";

// Mock HttpClient
jest.mock("../../../../src/infrastructure/api/HttpClient");

describe("AsyncApiTodoRepository", () => {
  let repository: AsyncApiTodoRepository;
  let mockHttpClient: jest.Mocked<HttpClient>;

  beforeEach(() => {
    mockHttpClient = new HttpClient("http://test.com") as jest.Mocked<HttpClient>;
    (HttpClient as jest.Mock).mockImplementation(() => mockHttpClient);
    repository = new AsyncApiTodoRepository("http://test.com");
  });

  describe("subtask mapping", () => {
    it("should map subtasks correctly from DTO", async () => {
      const todoId = "todo-1" as TodoId;
      const subtaskId = "sub-1";
      const mockDto = {
        id: todoId,
        title: "Test Todo",
        completed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        subtasks: [
          {
            id: subtaskId,
            title: "Subtask 1",
            completed: true,
          },
        ],
      };

      mockHttpClient.get.mockResolvedValue(mockDto);

      const todo = await repository.findById(todoId);

      expect(todo).toBeDefined();
      expect(todo?.subtasks).toHaveLength(1);
      expect(todo?.subtasks[0]?.id).toBe(subtaskId);
      expect(todo?.subtasks[0]?.title.value).toBe("Subtask 1");
      expect(todo?.subtasks[0]?.completed).toBe(true);
    });

    it("should handle missing subtasks in DTO (backward compatibility)", async () => {
      const todoId = "todo-1" as TodoId;
      const mockDto = {
        id: todoId,
        title: "Test Todo",
        completed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        // subtasks missing
      };

      mockHttpClient.get.mockResolvedValue(mockDto);

      const todo = await repository.findById(todoId);

      expect(todo).toBeDefined();
      expect(todo?.subtasks).toHaveLength(0);
    });
  });

  describe("description mapping", () => {
    it("should map description correctly from DTO", async () => {
      const todoId = "todo-1" as TodoId;
      const mockDto = {
        id: todoId,
        title: "Test Todo",
        completed: false,
        description: "# Task Details\n\nThis is a markdown description.",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        subtasks: [],
        tags: [],
      };

      mockHttpClient.get.mockResolvedValue(mockDto);

      const todo = await repository.findById(todoId);

      expect(todo).toBeDefined();
      expect(todo?.description.value).toBe("# Task Details\n\nThis is a markdown description.");
    });

    it("should handle empty description in DTO", async () => {
      const todoId = "todo-1" as TodoId;
      const mockDto = {
        id: todoId,
        title: "Test Todo",
        completed: false,
        description: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        subtasks: [],
        tags: [],
      };

      mockHttpClient.get.mockResolvedValue(mockDto);

      const todo = await repository.findById(todoId);

      expect(todo).toBeDefined();
      expect(todo?.description.value).toBe("");
    });

    it("should handle missing description in DTO (backward compatibility)", async () => {
      const todoId = "todo-1" as TodoId;
      const mockDto = {
        id: todoId,
        title: "Test Todo",
        completed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        subtasks: [],
        // description field missing - should default to empty string
      };

      mockHttpClient.get.mockResolvedValue(mockDto);

      const todo = await repository.findById(todoId);

      expect(todo).toBeDefined();
      expect(todo?.description.value).toBe("");
    });

    it("should preserve description when fetching all todos", async () => {
      const mockResponse = {
        todos: [
          {
            id: "todo-1",
            title: "Todo with description",
            completed: false,
            description: "Important notes here",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            subtasks: [],
            tags: [],
          },
          {
            id: "todo-2",
            title: "Todo without description",
            completed: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            subtasks: [],
            tags: [],
          },
        ],
        count: 2,
        hasMore: false,
      };

      mockHttpClient.get.mockResolvedValue(mockResponse);

      const todos = await repository.findAll();

      expect(todos).toHaveLength(2);
      expect(todos[0]?.description.value).toBe("Important notes here");
      expect(todos[1]?.description.value).toBe("");
    });

    it("should preserve description with special characters", async () => {
      const todoId = "todo-1" as TodoId;
      const specialDescription =
        "Code: `const x = 1;`\n\n- Item 1\n- Item 2\n\n> Quote\n\n**Bold** and *italic*";
      const mockDto = {
        id: todoId,
        title: "Test Todo",
        completed: false,
        description: specialDescription,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        subtasks: [],
        tags: [],
      };

      mockHttpClient.get.mockResolvedValue(mockDto);

      const todo = await repository.findById(todoId);

      expect(todo).toBeDefined();
      expect(todo?.description.value).toBe(specialDescription);
    });
  });
});
