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
