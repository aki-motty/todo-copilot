import { useCallback, useEffect, useState } from "react";
import { TodoApplicationService } from "../../application/services/TodoApplicationService";
import type { Todo } from "../../domain/entities/Todo";
import { AsyncApiTodoRepository } from "../../infrastructure/api/ApiTodoRepository";
import { createLogger } from "../../infrastructure/config/logger";
import { LocalStorageTodoRepository } from "../../infrastructure/persistence/LocalStorageTodoRepository";
import { TodoController } from "../controllers/TodoController";
import { useApiConfig } from "../providers/ApiConfigProvider";

const logger = createLogger("useTodoList");

/**
 * Custom hook for managing Todo list state and operations
 * Provides CRUD operations and error handling
 * Automatically uses API or localStorage based on configuration
 */
export const useTodoList = () => {
  const { baseUrl, isLocalStorageMode } = useApiConfig();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [backendMode, setBackendMode] = useState<"api" | "localStorage">("localStorage");

  // Create appropriate repository and services based on configuration
  const { todoController } = useCallback(() => {
    let repo;
    if (!isLocalStorageMode && baseUrl) {
      repo = new AsyncApiTodoRepository(baseUrl);
      setBackendMode("api");
      logger.info("Using API backend", { baseUrl });
    } else {
      repo = new LocalStorageTodoRepository();
      setBackendMode("localStorage");
      logger.info("Using localStorage backend");
    }

    const appService = new TodoApplicationService(repo as any);
    const controller = new TodoController(appService);

    return { todoController: controller };
  }, [isLocalStorageMode, baseUrl])();

  // Initialize todos on mount
  useEffect(() => {
    const loadTodos = async () => {
      try {
        setLoading(true);
        const allTodos = await todoController.getAllTodos();
        setTodos(allTodos);
        logger.debug("TodoList initialized", { count: allTodos.length, mode: backendMode });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load todos";
        setError(message);
        logger.error("Failed to load todos", { error: message });
      } finally {
        setLoading(false);
      }
    };

    loadTodos();
  }, [todoController, backendMode]);

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
  }, [todoController]);

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
  }, [todoController]);

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
  }, [todoController]);

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
    backendMode,
  };
};
