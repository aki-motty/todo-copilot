import { Todo } from "../../domain/entities/Todo";
import { createTodoCompletedEvent, createTodoCreatedEvent, createTodoDeletedEvent, } from "../../domain/events/TodoEvents";
import { brandTodoId } from "../../domain/value-objects/TodoId";
import { createLogger } from "../../infrastructure/config/logger";
import { NotFoundError } from "../../shared/types";
/**
 * Application service for Todo use cases
 * Orchestrates domain entities and repository interactions
 * Implements CQRS pattern with separate command and query methods
 */
export class TodoApplicationService {
    constructor(todoRepository) {
        this.todoRepository = todoRepository;
        this.logger = createLogger("TodoApplicationService");
        this.domainEvents = [];
    }
    /**
     * Create a new todo
     * COMMAND: Changes application state
     */
    async createTodo(command) {
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
    async toggleTodoCompletion(command) {
        this.logger.debug("Toggling todo completion", { id: command.id });
        const todo = await this.todoRepository.findById(brandTodoId(command.id));
        if (!todo) {
            throw new NotFoundError(`Todo with id ${command.id} not found`);
        }
        const updatedTodo = todo.toggleCompletion();
        await this.todoRepository.save(updatedTodo);
        // Publish domain event
        const status = updatedTodo.completed ? "Completed" : "Pending";
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
    async toggleSubtask(todoId, subtaskId) {
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
    async addSubtask(todoId, title) {
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
    async deleteSubtask(todoId, subtaskId) {
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
     * Delete a todo
     * COMMAND: Changes application state
     */
    async deleteTodo(command) {
        this.logger.debug("Deleting todo", { id: command.id });
        const todo = await this.todoRepository.findById(command.id);
        if (!todo) {
            throw new NotFoundError(`Todo with id ${command.id} not found`);
        }
        await this.todoRepository.remove(command.id);
        // Publish domain event
        const event = createTodoDeletedEvent(todo.id, new Date());
        this.domainEvents.push(event);
        this.logger.info("Todo deleted", { id: command.id });
    }
    /**
     * Get all todos
     * QUERY: Read-only operation
     */
    async getAllTodos(_query) {
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
    async getTodoById(query) {
        this.logger.debug("Getting todo by id", { id: query.id });
        const todo = await this.todoRepository.findById(query.id);
        if (!todo) {
            throw new NotFoundError(`Todo with id ${query.id} not found`);
        }
        return todo;
    }
    /**
     * Get domain events that occurred since last call
     * Used for event sourcing and audit trails
     */
    getDomainEvents() {
        const events = [...this.domainEvents];
        this.domainEvents = [];
        return events;
    }
}
