import { useCallback, useState } from "react";
import type { TodoResponseDTO } from "../../application/dto/TodoDTO";
import { createLogger } from "../../infrastructure/config/logger";

const logger = createLogger("useTodoDetail");

/**
 * State for the todo detail panel
 */
export interface TodoDetailState {
  /** Currently selected todo (null if panel is closed) */
  selectedTodo: TodoResponseDTO | null;
  /** Description being edited (may differ from saved value) */
  editingDescription: string;
  /** Whether there are unsaved changes */
  hasUnsavedChanges: boolean;
  /** Whether in edit mode (vs preview mode) */
  isEditing: boolean;
  /** Loading state for save operation */
  isSaving: boolean;
  /** Error message if any */
  error: string | null;
}

/**
 * Props for useTodoDetail hook
 */
export interface UseTodoDetailProps {
  /** List of all todos for reference */
  todos: TodoResponseDTO[];
  /** Callback to update description in the main todo list */
  onUpdateDescription: (todoId: string, description: string) => Promise<void>;
}

/**
 * Custom hook for managing todo detail panel state and operations
 * Handles editing, preview toggle, unsaved changes warning, and save
 */
export const useTodoDetail = ({ todos, onUpdateDescription }: UseTodoDetailProps) => {
  const [state, setState] = useState<TodoDetailState>({
    selectedTodo: null,
    editingDescription: "",
    hasUnsavedChanges: false,
    isEditing: true,
    isSaving: false,
    error: null,
  });

  /**
   * Select a todo by ID to open detail panel
   */
  const selectTodo = useCallback(
    (todoId: string) => {
      const todo = todos.find((t) => t.id === todoId);
      if (todo) {
        logger.debug("Opening detail panel", { todoId });
        setState({
          selectedTodo: todo,
          editingDescription: todo.description || "",
          hasUnsavedChanges: false,
          isEditing: true,
          isSaving: false,
          error: null,
        });
      }
    },
    [todos]
  );

  /**
   * Open detail panel for a todo
   */
  const openDetail = useCallback((todo: TodoResponseDTO) => {
    logger.debug("Opening detail panel", { todoId: todo.id });
    setState({
      selectedTodo: todo,
      editingDescription: todo.description || "",
      hasUnsavedChanges: false,
      isEditing: true,
      isSaving: false,
      error: null,
    });
  }, []);

  /**
   * Close detail panel
   * @returns true if closed, false if blocked by unsaved changes
   */
  const closeDetail = useCallback((): boolean => {
    if (state.hasUnsavedChanges) {
      logger.debug("Close blocked - unsaved changes");
      return false;
    }
    logger.debug("Closing detail panel");
    setState({
      selectedTodo: null,
      editingDescription: "",
      hasUnsavedChanges: false,
      isEditing: true,
      isSaving: false,
      error: null,
    });
    return true;
  }, [state.hasUnsavedChanges]);

  /**
   * Force close detail panel without checking for unsaved changes
   */
  const forceCloseDetail = useCallback(() => {
    logger.debug("Force closing detail panel");
    setState({
      selectedTodo: null,
      editingDescription: "",
      hasUnsavedChanges: false,
      isEditing: true,
      isSaving: false,
      error: null,
    });
  }, []);

  /**
   * Update editing description (marks as having unsaved changes)
   */
  const setDescription = useCallback(
    (description: string) => {
      const originalDescription = state.selectedTodo?.description || "";
      const hasChanges = description !== originalDescription;

      setState((prev) => ({
        ...prev,
        editingDescription: description,
        hasUnsavedChanges: hasChanges,
        error: null,
      }));
    },
    [state.selectedTodo?.description]
  );

  /**
   * Toggle between edit and preview mode
   */
  const toggleEditMode = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isEditing: !prev.isEditing,
    }));
  }, []);

  /**
   * Set edit mode directly
   */
  const setEditMode = useCallback((isEditing: boolean) => {
    setState((prev) => ({
      ...prev,
      isEditing,
    }));
  }, []);

  /**
   * Save description changes
   */
  const saveDescription = useCallback(async (): Promise<boolean> => {
    if (!state.selectedTodo) {
      logger.error("Cannot save - no todo selected");
      return false;
    }

    if (!state.hasUnsavedChanges) {
      logger.debug("No changes to save");
      return true;
    }

    try {
      setState((prev) => ({ ...prev, isSaving: true, error: null }));

      await onUpdateDescription(state.selectedTodo.id, state.editingDescription);

      // Update state to reflect saved changes
      setState((prev) => ({
        ...prev,
        selectedTodo: prev.selectedTodo
          ? { ...prev.selectedTodo, description: prev.editingDescription }
          : null,
        hasUnsavedChanges: false,
        isSaving: false,
      }));

      logger.info("Description saved", { todoId: state.selectedTodo.id });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save description";
      setState((prev) => ({
        ...prev,
        isSaving: false,
        error: message,
      }));
      logger.error("Failed to save description", { error: message });
      return false;
    }
  }, [state.selectedTodo, state.hasUnsavedChanges, state.editingDescription, onUpdateDescription]);

  /**
   * Discard unsaved changes
   */
  const discardChanges = useCallback(() => {
    if (!state.selectedTodo) {
      return;
    }

    setState((prev) => ({
      ...prev,
      editingDescription: prev.selectedTodo?.description || "",
      hasUnsavedChanges: false,
      error: null,
    }));
    logger.debug("Changes discarded");
  }, [state.selectedTodo]);

  return {
    // State
    selectedTodo: state.selectedTodo,
    editingDescription: state.editingDescription,
    hasUnsavedChanges: state.hasUnsavedChanges,
    isEditing: state.isEditing,
    isSaving: state.isSaving,
    error: state.error,
    isOpen: state.selectedTodo !== null,

    // Actions
    selectTodo,
    openDetail,
    closeDetail,
    forceCloseDetail,
    setDescription,
    toggleEditMode,
    setEditMode,
    saveDescription,
    discardChanges,

    // Aliases for App.tsx compatibility
    updateDescription: setDescription,
    save: saveDescription,
    discard: discardChanges,
    close: closeDetail,
    forceClose: forceCloseDetail,
  };
};
