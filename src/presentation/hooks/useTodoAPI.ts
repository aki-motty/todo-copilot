import { useCallback, useEffect, useState } from "react";
import type {
    CreateTodoRequestDTO,
    ListTodosResponseDTO,
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
  createTodo(title: string): Promise<TodoResponseDTO | void>;
  listTodos(limit?: number): Promise<ListTodosResponseDTO | void>;
  getTodo(id: string): Promise<TodoResponseDTO | void>;
  toggleTodo(id: string): Promise<TodoResponseDTO | void>;
  deleteTodo(id: string): Promise<{ success: boolean } | void>;
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

  const createTodo = useCallback(
    async (title: string): Promise<TodoResponseDTO | void> => {
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
          error:
            error instanceof Error ? error.message : "Failed to create todo",
        }));
      }
    },
    []
  );

  const listTodos = useCallback(
    async (limit = 10): Promise<ListTodosResponseDTO | void> => {
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
          error:
            error instanceof Error ? error.message : "Failed to load todos",
        }));
      }
    },
    []
  );

  const getTodo = useCallback(
    async (id: string): Promise<TodoResponseDTO | void> => {
      try {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));

        const todo = await TodoApiClient.getTodo(id);

        setState((prev) => ({ ...prev, isLoading: false }));

        return todo;
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error:
            error instanceof Error ? error.message : "Failed to fetch todo",
        }));
      }
    },
    []
  );

  const toggleTodo = useCallback(
    async (id: string): Promise<TodoResponseDTO | void> => {
      try {
        // Optimistic update
        setState((prev) => ({
          ...prev,
          todos: prev.todos.map((t) =>
            t.id === id ? { ...t, completed: !t.completed } : t
          ),
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
          todos: prev.todos.map((t) =>
            t.id === id ? { ...t, completed: !t.completed } : t
          ),
          isLoading: false,
          error:
            error instanceof Error ? error.message : "Failed to toggle todo",
        }));
      }
    },
    []
  );

  const deleteTodo = useCallback(
    async (id: string): Promise<{ success: boolean } | void> => {
      try {
        // Store original state for rollback before optimistic update
        setState((prev) => {
          const originalTodos = prev.todos;
          setState((prevAgain) => ({
            ...prevAgain,
            todos: prevAgain.todos.filter((t) => t.id !== id),
            isLoading: true,
            error: null,
          }));
          return { ...prev, todos: originalTodos };
        });

        await TodoApiClient.deleteTodo(id);

        setState((prev) => ({ ...prev, isLoading: false }));

        return { success: true };
      } catch (error) {
        setState((prev) => ({
          ...prev,
          todos: prev.todos,
          isLoading: false,
          error:
            error instanceof Error ? error.message : "Failed to delete todo",
        }));
      }
    },
    []
  );

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
        error:
          error instanceof Error ? error.message : "Failed to load more todos",
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
    loadMore,
    retry,
    clearError,
  };
}
