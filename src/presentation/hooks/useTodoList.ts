import { useState, useCallback, useEffect } from "react";
import type { Todo } from "../../domain/entities/Todo";
import { TodoController } from "../controllers/TodoController";
import { createLogger } from "../../infrastructure/config/logger";
import { TodoApplicationService } from "../../application/services/TodoApplicationService";
import { LocalStorageTodoRepository } from "../../infrastructure/persistence/LocalStorageTodoRepository";

// Initialize services
const repository = new LocalStorageTodoRepository();
const applicationService = new TodoApplicationService(repository);
const todoController = new TodoController(applicationService);
const logger = createLogger("useTodoList");

/**
 * Custom hook for managing Todo list state and operations
 * Provides CRUD operations and error handling
 */
export const useTodoList = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Initialize todos from localStorage on mount
  useEffect(() => {
    const loadTodos = async () => {
      try {
        setLoading(true);
        const allTodos = await todoController.getAllTodos();
        setTodos(allTodos);
        logger.debug("TodoList initialized", { count: allTodos.length });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load todos";
        setError(message);
        logger.error("Failed to load todos", { error: message });
      } finally {
        setLoading(false);
      }
    };

    loadTodos();
  }, []);

  // Create new todo
  const createTodo = useCallback(async (title: string) => {
    try {
      setError(null);
      const newTodo = await todoController.createTodo(title);
      setTodos((prevTodos) => [...prevTodos, newTodo]);
      logger.info("Todo created via hook", { id: newTodo.id, title });
      return newTodo;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create todo";
      setError(message);
      logger.error("Failed to create todo", { error: message, title });
      throw err;
    }
  }, []);

  // Toggle todo completion
  const toggleTodoCompletion = useCallback(async (id: string) => {
    try {
      setError(null);
      const updatedTodo = await todoController.toggleTodoCompletion(id);
      setTodos((prevTodos) =>
        prevTodos.map((todo) => (todo.id === updatedTodo.id ? updatedTodo : todo))
      );
      logger.info("Todo toggled via hook", { id, status: updatedTodo.status });
      return updatedTodo;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to toggle todo";
      setError(message);
      logger.error("Failed to toggle todo", { error: message, id });
      throw err;
    }
  }, []);

  // Delete todo
  const deleteTodo = useCallback(async (id: string) => {
    try {
      setError(null);
      await todoController.deleteTodo(id);
      setTodos((prevTodos) => prevTodos.filter((todo) => todo.id !== id));
      logger.info("Todo deleted via hook", { id });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete todo";
      setError(message);
      logger.error("Failed to delete todo", { error: message, id });
      throw err;
    }
  }, []);

  // Clear error message
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    todos,
    error,
    loading,
    createTodo,
    toggleTodoCompletion,
    deleteTodo,
    clearError,
  };
};
