import { useCallback, useEffect, useState } from "react";
import type {
    CreateTodoRequestDTO,
    ListTodosResponseDTO,
    SubtaskDTO,
    TodoResponseDTO,
} from "../../application/dto/TodoDTO";
import { TodoApiClient, checkApiHealth } from "../../infrastructure/services/todoApiClient";

export interface UseTodoAPIState {
  todos: TodoResponseDTO[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  currentCursor?: string;
}

export interface UseTodoAPIReturn extends UseTodoAPIState {
  createTodo(title: string): Promise<TodoResponseDTO | undefined>;
  listTodos(limit?: number): Promise<ListTodosResponseDTO | undefined>;
  getTodo(id: string): Promise<TodoResponseDTO | undefined>;
  toggleTodo(id: string): Promise<TodoResponseDTO | undefined>;
  deleteTodo(id: string): Promise<{ success: boolean } | undefined>;
  addSubtask(todoId: string, title: string): Promise<SubtaskDTO | undefined>;
  toggleSubtask(todoId: string, subtaskId: string): Promise<SubtaskDTO | undefined>;
  deleteSubtask(todoId: string, subtaskId: string): Promise<{ success: boolean } | undefined>;
  addTag(todoId: string, tagName: string): Promise<TodoResponseDTO | undefined>;
  removeTag(todoId: string, tagName: string): Promise<TodoResponseDTO | undefined>;
  getTags(): Promise<string[] | undefined>;
  loadMore(): Promise<void>;
  retry(): Promise<void>;
  clearError(): void;
}

export function useTodoAPI(): UseTodoAPIReturn {
  const [state, setState] = useState<UseTodoAPIState>({
    todos: [],
    isLoading: false,
    error: null,
    hasMore: false,
  });

  // Check API health on mount
  useEffect(() => {
    const checkHealth = async () => {
      try {
        await checkApiHealth();
      } catch (error) {
        console.warn(
          "API health check failed:",
          error instanceof Error ? error.message : String(error)
        );
      }
    };
    checkHealth();
  }, []);

  const createTodo = useCallback(async (title: string): Promise<TodoResponseDTO | undefined> => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const request: CreateTodoRequestDTO = { title };
      const newTodo = await TodoApiClient.createTodo(request.title);

      setState((prev) => ({
        ...prev,
        todos: [newTodo, ...prev.todos],
        isLoading: false,
      }));

      return newTodo;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to create todo",
      }));
      return undefined;
    }
  }, []);

  const listTodos = useCallback(async (limit = 10): Promise<ListTodosResponseDTO | undefined> => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const pagination = await TodoApiClient.listTodos({ limit });

      setState((prev) => ({
        ...prev,
        todos: pagination.todos,
        hasMore: pagination.hasMore ?? false,
        currentCursor: pagination.cursor,
        isLoading: false,
      }));

      return pagination;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to load todos",
      }));
      return undefined;
    }
  }, []);

  const getTodo = useCallback(async (id: string): Promise<TodoResponseDTO | undefined> => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const todo = await TodoApiClient.getTodo(id);

      setState((prev) => ({ ...prev, isLoading: false }));

      return todo;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to fetch todo",
      }));
      return undefined;
    }
  }, []);

  const toggleTodo = useCallback(async (id: string): Promise<TodoResponseDTO | undefined> => {
    try {
      // Optimistic update
      setState((prev) => ({
        ...prev,
        todos: prev.todos.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)),
        isLoading: true,
        error: null,
      }));

      const updated = await TodoApiClient.toggleTodo(id);

      setState((prev) => ({
        ...prev,
        todos: prev.todos.map((t) => (t.id === id ? updated : t)),
        isLoading: false,
      }));

      return updated;
    } catch (error) {
      // Revert optimistic update on error
      setState((prev) => ({
        ...prev,
        todos: prev.todos.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)),
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to toggle todo",
      }));
      return undefined;
    }
  }, []);

  const deleteTodo = useCallback(async (id: string): Promise<{ success: boolean } | undefined> => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const result = await TodoApiClient.deleteTodo(id);

      setState((prev) => ({
        ...prev,
        todos: prev.todos.filter((t) => t.id !== id),
        isLoading: false,
      }));

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setState((prev) => ({ ...prev, isLoading: false, error: message }));
      return undefined;
    }
  }, []);

  const addSubtask = useCallback(async (todoId: string, title: string): Promise<SubtaskDTO | undefined> => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const subtask = await TodoApiClient.addSubtask(todoId, title);

      setState((prev) => ({
        ...prev,
        todos: prev.todos.map((t) =>
          t.id === todoId
            ? { ...t, subtasks: [...(t.subtasks || []), subtask] }
            : t
        ),
        isLoading: false,
      }));

      return subtask;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setState((prev) => ({ ...prev, isLoading: false, error: message }));
      return undefined;
    }
  }, []);

  const toggleSubtask = useCallback(async (todoId: string, subtaskId: string): Promise<SubtaskDTO | undefined> => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const subtask = await TodoApiClient.toggleSubtask(todoId, subtaskId);

      setState((prev) => ({
        ...prev,
        todos: prev.todos.map((t) =>
          t.id === todoId
            ? {
                ...t,
                subtasks: t.subtasks.map((s) => (s.id === subtaskId ? subtask : s)),
              }
            : t
        ),
        isLoading: false,
      }));

      return subtask;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setState((prev) => ({ ...prev, isLoading: false, error: message }));
      return undefined;
    }
  }, []);

  const deleteSubtask = useCallback(async (todoId: string, subtaskId: string): Promise<{ success: boolean } | undefined> => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const result = await TodoApiClient.deleteSubtask(todoId, subtaskId);

      setState((prev) => ({
        ...prev,
        todos: prev.todos.map((t) =>
          t.id === todoId
            ? {
                ...t,
                subtasks: t.subtasks.filter((s) => s.id !== subtaskId),
              }
            : t
        ),
        isLoading: false,
      }));

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setState((prev) => ({ ...prev, isLoading: false, error: message }));
      return undefined;
    }
  }, []);

  const addTag = useCallback(async (todoId: string, tagName: string): Promise<TodoResponseDTO | undefined> => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const updatedTodo = await TodoApiClient.addTag(todoId, tagName);

      setState((prev) => ({
        ...prev,
        todos: prev.todos.map((t) => (t.id === todoId ? updatedTodo : t)),
        isLoading: false,
      }));

      return updatedTodo;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setState((prev) => ({ ...prev, isLoading: false, error: message }));
      return undefined;
    }
  }, []);

  const removeTag = useCallback(async (todoId: string, tagName: string): Promise<TodoResponseDTO | undefined> => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const updatedTodo = await TodoApiClient.removeTag(todoId, tagName);

      setState((prev) => ({
        ...prev,
        todos: prev.todos.map((t) => (t.id === todoId ? updatedTodo : t)),
        isLoading: false,
      }));

      return updatedTodo;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setState((prev) => ({ ...prev, isLoading: false, error: message }));
      return undefined;
    }
  }, []);

  const getTags = useCallback(async (): Promise<string[] | undefined> => {
    try {
      return await TodoApiClient.getTags();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setState((prev) => ({ ...prev, error: message }));
      return undefined;
    }
  }, []);

  const loadMore = useCallback(async (): Promise<void> => {
    if (!state.hasMore || !state.currentCursor) {
      return;
    }

    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const pagination = await TodoApiClient.listTodos({
        limit: 10,
        cursor: state.currentCursor,
      });

      setState((prev) => ({
        ...prev,
        todos: [...prev.todos, ...pagination.todos],
        hasMore: pagination.hasMore ?? false,
        currentCursor: pagination.cursor,
        isLoading: false,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to load more todos",
      }));
    }
  }, [state.hasMore, state.currentCursor]);

  const retry = useCallback(async (): Promise<void> => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const clearError = useCallback((): void => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    createTodo,
    listTodos,
    getTodo,
    toggleTodo,
    deleteTodo,
    addSubtask,
    toggleSubtask,
    deleteSubtask,
    addTag,
    removeTag,
    getTags,
    loadMore,
    retry,
    clearError,
  };
}
