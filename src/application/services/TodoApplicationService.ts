import { Todo, type TodoId } from "../../domain/entities/Todo";
import {
  type DomainEvent,
  createTodoCompletedEvent,
  createTodoCreatedEvent,
  createTodoDeletedEvent,
} from "../../domain/events/TodoEvents";
import type { ITodoRepository } from "../../domain/repositories/TodoRepository";
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

    const todo = await this.todoRepository.findById(command.id as TodoId);
    if (!todo) {
      throw new NotFoundError(`Todo with id ${command.id} not found`);
    }

    const updatedTodo = todo.toggleCompletion();
    await this.todoRepository.save(updatedTodo);

    // Publish domain event
    const event = createTodoCompletedEvent(
      updatedTodo.id,
      updatedTodo.status,
      updatedTodo.updatedAt
    );
    this.domainEvents.push(event);
    this.logger.info("Todo toggled", {
      id: updatedTodo.id,
      status: updatedTodo.status,
    });

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
