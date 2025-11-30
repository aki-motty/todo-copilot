import { useCallback, useEffect, useMemo, useState } from "react";
import { TodoApplicationService } from "../../application/services/TodoApplicationService";
import { AsyncApiTodoRepository } from "../../infrastructure/api/ApiTodoRepository";
import { createLogger } from "../../infrastructure/config/logger";
import { LocalStorageTodoRepository } from "../../infrastructure/persistence/LocalStorageTodoRepository";
import { TodoApiClient } from "../../infrastructure/services/todoApiClient";
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
  const [todos, setTodos] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  // Derive backend mode directly from config
  const backendMode = !isLocalStorageMode && baseUrl ? "api" : "localStorage";
  // Create appropriate repository and services based on configuration
  const todoController = useMemo(() => {
    let repo;
    if (backendMode === "api" && baseUrl) {
      repo = new AsyncApiTodoRepository(baseUrl);
      logger.info("Using API backend", { baseUrl });
    } else {
      repo = new LocalStorageTodoRepository();
      logger.info("Using localStorage backend");
    }
    const appService = new TodoApplicationService(repo);
    return new TodoController(appService);
  }, [backendMode, baseUrl]);
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
  const createTodo = useCallback(
    async (title) => {
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
    },
    [todoController]
  );
  // Toggle todo completion
  const toggleTodoCompletion = useCallback(
    async (id) => {
      try {
        setError(null);
        const updatedTodo = await todoController.toggleTodoCompletion(id);
        setTodos((prevTodos) =>
          prevTodos.map((todo) => (todo.id === updatedTodo.id ? updatedTodo : todo))
        );
        logger.info("Todo toggled via hook", { id, completed: updatedTodo.completed });
        return updatedTodo;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to toggle todo";
        setError(message);
        logger.error("Failed to toggle todo", { error: message, id });
        throw err;
      }
    },
    [todoController]
  );
  // Add subtask
  const addSubtask = useCallback(
    async (todoId, title) => {
      try {
        setError(null);
        let updatedTodo;
        if (backendMode === "api") {
          // Use dedicated API endpoint for atomic update
          const subtask = await TodoApiClient.addSubtask(todoId, title);
          // Optimistically update local state or fetch fresh
          // Here we manually construct the updated todo to avoid a full refetch if possible,
          // but since we need the full Todo object for the state, let's fetch it or patch it.
          // Actually, TodoApiClient.addSubtask returns SubtaskDTO, not Todo.
          // So we need to patch the local state.
          setTodos((prevTodos) =>
            prevTodos.map((todo) => {
              if (todo.id === todoId) {
                return {
                  ...todo,
                  subtasks: [...(todo.subtasks || []), subtask],
                };
              }
              return todo;
            })
          );
          logger.info("Subtask added via API hook", { todoId, title });
          return; // We don't have the full updatedTodo from API, but state is updated.
        } else {
          // LocalStorage mode uses the controller/service logic
          updatedTodo = await todoController.addSubtask(todoId, title);
          setTodos((prevTodos) =>
            prevTodos.map((todo) => (todo.id === updatedTodo.id ? updatedTodo : todo))
          );
          logger.info("Subtask added via Controller hook", { todoId, title });
          return updatedTodo;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to add subtask";
        setError(message);
        logger.error("Failed to add subtask", { error: message, todoId });
        throw err;
      }
    },
    [todoController, backendMode]
  );
  // Toggle subtask
  const toggleSubtask = useCallback(
    async (todoId, subtaskId) => {
      try {
        setError(null);
        if (backendMode === "api") {
          const subtask = await TodoApiClient.toggleSubtask(todoId, subtaskId);
          setTodos((prevTodos) =>
            prevTodos.map((todo) => {
              if (todo.id === todoId) {
                return {
                  ...todo,
                  subtasks: todo.subtasks.map((s) => (s.id === subtaskId ? subtask : s)),
                };
              }
              return todo;
            })
          );
        } else {
          const updatedTodo = await todoController.toggleSubtask(todoId, subtaskId);
          setTodos((prevTodos) =>
            prevTodos.map((todo) => (todo.id === updatedTodo.id ? updatedTodo : todo))
          );
        }
        logger.info("Subtask toggled via hook", { todoId, subtaskId });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to toggle subtask";
        setError(message);
        logger.error("Failed to toggle subtask", { error: message, todoId, subtaskId });
        throw err;
      }
    },
    [todoController, backendMode]
  );
  // Delete subtask
  const deleteSubtask = useCallback(
    async (todoId, subtaskId) => {
      try {
        setError(null);
        if (backendMode === "api") {
          await TodoApiClient.deleteSubtask(todoId, subtaskId);
          setTodos((prevTodos) =>
            prevTodos.map((todo) => {
              if (todo.id === todoId) {
                return {
                  ...todo,
                  subtasks: todo.subtasks.filter((s) => s.id !== subtaskId),
                };
              }
              return todo;
            })
          );
        } else {
          const updatedTodo = await todoController.deleteSubtask(todoId, subtaskId);
          setTodos((prevTodos) =>
            prevTodos.map((todo) => (todo.id === updatedTodo.id ? updatedTodo : todo))
          );
        }
        logger.info("Subtask deleted via hook", { todoId, subtaskId });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to delete subtask";
        setError(message);
        logger.error("Failed to delete subtask", { error: message, todoId, subtaskId });
        throw err;
      }
    },
    [todoController, backendMode]
  );
  // Delete todo
  const deleteTodo = useCallback(
    async (id) => {
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
    },
    [todoController]
  );
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
    addSubtask,
    toggleSubtask,
    deleteSubtask,
    deleteTodo,
    clearError,
    backendMode,
  };
};
