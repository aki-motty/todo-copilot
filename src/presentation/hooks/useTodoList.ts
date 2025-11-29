import { useCallback, useEffect, useMemo, useState } from "react";
import type { TodoResponseDTO } from "../../application/dto/TodoDTO";
import { TodoApplicationService } from "../../application/services/TodoApplicationService";
import type { ITodoRepository } from "../../domain/repositories/TodoRepository";
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
  const [todos, setTodos] = useState<TodoResponseDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Derive backend mode directly from config
  const backendMode = !isLocalStorageMode && baseUrl ? "api" : "localStorage";

  // Create appropriate repository and services based on configuration
  const todoController = useMemo(() => {
    let repo: ITodoRepository;
    if (backendMode === "api" && baseUrl) {
      repo = new AsyncApiTodoRepository(baseUrl);
      logger.info("Using API backend", { baseUrl });
    } else {
      repo = new LocalStorageTodoRepository();
      logger.info("Using localStorage backend");
    }

    const appService = new TodoApplicationService(repo as any);
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
    async (title: string) => {
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
    async (id: string) => {
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
    async (todoId: string, title: string) => {
      try {
        setError(null);
        
        let updatedTodo: TodoResponseDTO;

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
    async (todoId: string, subtaskId: string) => {
      try {
        setError(null);

        if (backendMode === "api") {
           const subtask = await TodoApiClient.toggleSubtask(todoId, subtaskId);
           setTodos((prevTodos) =>
            prevTodos.map((todo) => {
              if (todo.id === todoId) {
                return {
                  ...todo,
                  subtasks: todo.subtasks.map(s => s.id === subtaskId ? subtask : s),
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
    async (todoId: string, subtaskId: string) => {
      try {
        setError(null);

        if (backendMode === "api") {
          await TodoApiClient.deleteSubtask(todoId, subtaskId);
          setTodos((prevTodos) =>
            prevTodos.map((todo) => {
              if (todo.id === todoId) {
                return {
                  ...todo,
                  subtasks: todo.subtasks.filter(s => s.id !== subtaskId),
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
    async (id: string) => {
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

  // Add tag
  const addTag = useCallback(
    async (todoId: string, tagName: string) => {
      try {
        setError(null);
        
        if (backendMode === "api") {
          // Use dedicated API endpoint for atomic update
          const updatedTodo = await TodoApiClient.addTag(todoId, tagName);
          setTodos((prevTodos) =>
            prevTodos.map((todo) => (todo.id === updatedTodo.id ? updatedTodo : todo))
          );
          logger.info("Tag added via API hook", { todoId, tagName });
        } else {
          // LocalStorage mode uses the controller/service logic
          const updatedTodo = await todoController.addTag(todoId, tagName);
          setTodos((prevTodos) =>
            prevTodos.map((todo) => (todo.id === updatedTodo.id ? updatedTodo : todo))
          );
          logger.info("Tag added via Controller hook", { todoId, tagName });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to add tag";
        setError(message);
        logger.error("Failed to add tag", { error: message, todoId, tagName });
        throw err;
      }
    },
    [todoController, backendMode]
  );

  // Remove tag
  const removeTag = useCallback(
    async (todoId: string, tagName: string) => {
      try {
        setError(null);
        
        if (backendMode === "api") {
          // Use dedicated API endpoint for atomic update
          const updatedTodo = await TodoApiClient.removeTag(todoId, tagName);
          setTodos((prevTodos) =>
            prevTodos.map((todo) => (todo.id === updatedTodo.id ? updatedTodo : todo))
          );
          logger.info("Tag removed via API hook", { todoId, tagName });
        } else {
          // LocalStorage mode uses the controller/service logic
          const updatedTodo = await todoController.removeTag(todoId, tagName);
          setTodos((prevTodos) =>
            prevTodos.map((todo) => (todo.id === updatedTodo.id ? updatedTodo : todo))
          );
          logger.info("Tag removed via Controller hook", { todoId, tagName });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to remove tag";
        setError(message);
        logger.error("Failed to remove tag", { error: message, todoId, tagName });
        throw err;
      }
    },
    [todoController, backendMode]
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
    addTag,
    removeTag,
    clearError,
    backendMode,
  };
};
