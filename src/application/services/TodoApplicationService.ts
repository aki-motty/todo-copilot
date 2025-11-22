import { Todo, type TodoId } from "../../domain/entities/Todo";
import {
    createTodoCompletedEvent,
    createTodoCreatedEvent,
    createTodoDeletedEvent,
    type DomainEvent,
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
  createTodo(command: CreateTodoCommand): Todo {
    this.logger.debug("Creating todo", { title: command.title });

    const todo = Todo.create(command.title);
    this.todoRepository.save(todo);

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
  toggleTodoCompletion(command: ToggleTodoCompletionCommand): Todo {
    this.logger.debug("Toggling todo completion", { id: command.id });

    const todo = this.todoRepository.findById(command.id as TodoId);
    if (!todo) {
      throw new NotFoundError(`Todo with id ${command.id} not found`);
    }

    const updatedTodo = todo.toggleCompletion();
    this.todoRepository.save(updatedTodo);

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
  deleteTodo(command: DeleteTodoCommand): void {
    this.logger.debug("Deleting todo", { id: command.id });

    const todo = this.todoRepository.findById(command.id as TodoId);
    if (!todo) {
      throw new NotFoundError(`Todo with id ${command.id} not found`);
    }

    this.todoRepository.remove(command.id as TodoId);

    // Publish domain event
    const event = createTodoDeletedEvent(todo.id, new Date());
    this.domainEvents.push(event);
    this.logger.info("Todo deleted", { id: command.id });
  }

  /**
   * Get all todos
   * QUERY: Read-only operation
   */
  getAllTodos(_query: GetAllTodosQuery): GetAllTodosResponse {
    this.logger.debug("Fetching all todos");
    const todos = this.todoRepository.findAll();
    this.logger.info("Retrieved todos", { count: todos.length });
    return {
      todos,
      count: todos.length,
    };
  }

  /**
   * Get a single todo by ID
   * QUERY: Read-only operation
   */
  getTodoById(query: GetTodoByIdQuery): Todo | null {
    this.logger.debug("Fetching todo", { id: query.id });
    const todo = this.todoRepository.findById(query.id as TodoId);
    if (todo) {
      this.logger.debug("Todo found", { id: query.id });
    } else {
      this.logger.debug("Todo not found", { id: query.id });
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
