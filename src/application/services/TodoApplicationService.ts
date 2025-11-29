import { Todo, type TodoId, type TodoStatus } from "../../domain/entities/Todo";
import {
    type DomainEvent,
    createTodoCompletedEvent,
    createTodoCreatedEvent,
    createTodoDeletedEvent,
} from "../../domain/events/TodoEvents";
import type { ITodoRepository } from "../../domain/repositories/TodoRepository";
import { brandTodoId } from "../../domain/value-objects/TodoId";
import { createLogger } from "../../infrastructure/config/logger";
import { NotFoundError } from "../../shared/types";
import type {
    CreateTodoCommand,
    DeleteTodoCommand,
    ToggleTodoCompletionCommand,
} from "../commands";
import type { GetAllTodosQuery, GetAllTodosResponse, GetTodoByIdQuery } from "../queries";

/**
 * Application service for Todo use cases
 * Orchestrates domain entities and repository interactions
 * Implements CQRS pattern with separate command and query methods
 */
export class TodoApplicationService {
  private logger = createLogger("TodoApplicationService");
  private domainEvents: DomainEvent[] = [];

  constructor(private todoRepository: ITodoRepository) {}

  /**
   * Create a new todo
   * COMMAND: Changes application state
   */
  async createTodo(command: CreateTodoCommand): Promise<Todo> {
    this.logger.debug("Creating todo", { title: command.title });

    const todo = Todo.create(command.title);
    await this.todoRepository.save(todo);

    // Publish domain event
    const event = createTodoCreatedEvent(todo.id, command.title, todo.createdAt);
    this.domainEvents.push(event);
    this.logger.info("Todo created", { id: todo.id, title: command.title });

    return todo;
  }

  /**
   * Toggle todo completion status
   * COMMAND: Changes application state
   */
  async toggleTodoCompletion(command: ToggleTodoCompletionCommand): Promise<Todo> {
    this.logger.debug("Toggling todo completion", { id: command.id });

    const todo = await this.todoRepository.findById(brandTodoId(command.id));
    if (!todo) {
      throw new NotFoundError(`Todo with id ${command.id} not found`);
    }

    const updatedTodo = todo.toggleCompletion();
    await this.todoRepository.save(updatedTodo);

    // Publish domain event
    const status: TodoStatus = updatedTodo.completed ? "Completed" : "Pending";
    const event = createTodoCompletedEvent(updatedTodo.id, status, new Date());
    this.domainEvents.push(event);
    this.logger.info("Todo toggled", {
      id: updatedTodo.id,
      completed: updatedTodo.completed,
    });

    return updatedTodo;
  }

  /**
   * Toggle a subtask's completion status
   * COMMAND: Changes application state
   */
  async toggleSubtask(todoId: string, subtaskId: string): Promise<Todo> {
    this.logger.debug("Toggling subtask", { todoId, subtaskId });

    const todo = await this.todoRepository.findById(brandTodoId(todoId));
    if (!todo) {
      throw new NotFoundError(`Todo with id ${todoId} not found`);
    }

    const updatedTodo = todo.toggleSubtask(subtaskId);
    await this.todoRepository.save(updatedTodo);

    this.logger.info("Subtask toggled", {
      todoId,
      subtaskId,
    });

    return updatedTodo;
  }

  /**
   * Add a subtask to a todo
   * COMMAND: Changes application state
   */
  async addSubtask(todoId: string, title: string): Promise<Todo> {
    this.logger.debug("Adding subtask", { todoId, title });

    const todo = await this.todoRepository.findById(brandTodoId(todoId));
    if (!todo) {
      throw new NotFoundError(`Todo with id ${todoId} not found`);
    }

    const updatedTodo = todo.addSubtask(title);
    await this.todoRepository.save(updatedTodo);

    const newSubtask = updatedTodo.subtasks[updatedTodo.subtasks.length - 1];
    if (newSubtask) {
      this.logger.info("Subtask added", {
        todoId,
        subtaskId: newSubtask.id,
      });
    }

    return updatedTodo;
  }

  /**
   * Delete a subtask
   * COMMAND: Changes application state
   */
  async deleteSubtask(todoId: string, subtaskId: string): Promise<Todo> {
    this.logger.debug("Deleting subtask", { todoId, subtaskId });

    const todo = await this.todoRepository.findById(brandTodoId(todoId));
    if (!todo) {
      throw new NotFoundError(`Todo with id ${todoId} not found`);
    }

    const updatedTodo = todo.removeSubtask(subtaskId);
    await this.todoRepository.save(updatedTodo);

    this.logger.info("Subtask deleted", {
      todoId,
      subtaskId,
    });

    return updatedTodo;
  }

  /**
   * Add a tag to a todo
   * COMMAND: Changes application state
   */
  async addTag(id: string, tagName: string): Promise<Todo> {
    this.logger.debug("Adding tag", { id, tagName });

    const todo = await this.todoRepository.findById(brandTodoId(id));
    if (!todo) {
      throw new NotFoundError(`Todo with id ${id} not found`);
    }

    const updatedTodo = todo.addTag(tagName);
    await this.todoRepository.save(updatedTodo);

    this.logger.info("Tag added", { id, tagName });

    return updatedTodo;
  }

  /**
   * Remove a tag from a todo
   * COMMAND: Changes application state
   */
  async removeTag(id: string, tagName: string): Promise<Todo> {
    this.logger.debug("Removing tag", { id, tagName });

    const todo = await this.todoRepository.findById(brandTodoId(id));
    if (!todo) {
      throw new NotFoundError(`Todo with id ${id} not found`);
    }

    const updatedTodo = todo.removeTag(tagName);
    await this.todoRepository.save(updatedTodo);

    this.logger.info("Tag removed", { id, tagName });

    return updatedTodo;
  }

  /**
   * Delete a todo
   * COMMAND: Changes application state
   */
  async deleteTodo(command: DeleteTodoCommand): Promise<void> {
    this.logger.debug("Deleting todo", { id: command.id });

    const todo = await this.todoRepository.findById(command.id as TodoId);
    if (!todo) {
      throw new NotFoundError(`Todo with id ${command.id} not found`);
    }

    await this.todoRepository.remove(command.id as TodoId);

    // Publish domain event
    const event = createTodoDeletedEvent(todo.id, new Date());
    this.domainEvents.push(event);
    this.logger.info("Todo deleted", { id: command.id });
  }

  /**
   * Get all todos
   * QUERY: Read-only operation
   */
  async getAllTodos(_query: GetAllTodosQuery): Promise<GetAllTodosResponse> {
    this.logger.debug("Getting all todos");

    const todos = await this.todoRepository.findAll();

    // Sort by createdAt descending (newest first)
    const sortedTodos = [...todos].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    this.logger.debug("Retrieved todos", { count: sortedTodos.length });

    return {
      todos: sortedTodos,
      count: sortedTodos.length,
    };
  }

  /**
   * Get todo by ID
   * QUERY: Read-only operation
   */
  async getTodoById(query: GetTodoByIdQuery): Promise<Todo> {
    this.logger.debug("Getting todo by id", { id: query.id });

    const todo = await this.todoRepository.findById(query.id as TodoId);
    if (!todo) {
      throw new NotFoundError(`Todo with id ${query.id} not found`);
    }

    return todo;
  }

  /**
   * Get domain events that occurred since last call
   * Used for event sourcing and audit trails
   */
  getDomainEvents(): DomainEvent[] {
    const events = [...this.domainEvents];
    this.domainEvents = [];
    return events;
  }
}
