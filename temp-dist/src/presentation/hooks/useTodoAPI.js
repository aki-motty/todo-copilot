import { useCallback, useEffect, useState } from "react";
import { TodoApiClient, checkApiHealth } from "../../infrastructure/services/todoApiClient";
export function useTodoAPI() {
  const [state, setState] = useState({
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
  const createTodo = useCallback(async (title) => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      const request = { title };
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
    }
  }, []);
  const listTodos = useCallback(async (limit = 10) => {
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
    }
  }, []);
  const getTodo = useCallback(async (id) => {
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
    }
  }, []);
  const toggleTodo = useCallback(async (id) => {
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
    }
  }, []);
  const deleteTodo = useCallback(async (id) => {
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
  const addSubtask = useCallback(async (todoId, title) => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      const subtask = await TodoApiClient.addSubtask(todoId, title);
      setState((prev) => ({
        ...prev,
        todos: prev.todos.map((t) =>
          t.id === todoId ? { ...t, subtasks: [...(t.subtasks || []), subtask] } : t
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
  const toggleSubtask = useCallback(async (todoId, subtaskId) => {
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
  const deleteSubtask = useCallback(async (todoId, subtaskId) => {
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
  const loadMore = useCallback(async () => {
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
  const retry = useCallback(async () => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);
  const clearError = useCallback(() => {
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
    loadMore,
    retry,
    clearError,
  };
}
