import { NotFoundError } from "../errors/AppError";
/**
 * Handler for getting a single todo by ID
 * Query: GET /todos/{id}
 */
export class GetTodoHandler {
  constructor(todoRepository) {
    this.todoRepository = todoRepository;
  }
  async execute(id) {
    // Validate ID format
    if (!id || id.trim().length === 0) {
      throw new NotFoundError("Todo ID cannot be empty");
    }
    // Fetch from repository
    const todo = await this.todoRepository.findById(id);
    if (!todo) {
      throw new NotFoundError(`Todo with ID "${id}" not found`);
    }
    return this.toDTO(todo);
  }
  toDTO(todo) {
    const json = todo.toJSON();
    return {
      id: json.id,
      title: json.title,
      completed: json.completed,
      createdAt: json.createdAt,
      updatedAt: json.updatedAt,
      subtasks: json.subtasks.map((s) => ({
        id: s.id,
        title: s.title,
        completed: s.completed,
      })),
    };
  }
}
