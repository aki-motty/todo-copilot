import type React from "react";
import { useCallback, useEffect } from "react";
import type { TodoResponseDTO } from "../../application/dto/TodoDTO";
import { MarkdownEditor } from "./MarkdownEditor";
import { MarkdownPreview } from "./MarkdownPreview";
import "./TodoDetailPanel.css";

export interface TodoDetailPanelProps {
  /** Selected todo to display */
  todo: TodoResponseDTO | null;
  /** Description being edited */
  editingDescription: string;
  /** Whether there are unsaved changes */
  hasUnsavedChanges: boolean;
  /** Whether in edit mode (vs preview mode) */
  isEditing: boolean;
  /** Loading state for save operation */
  isSaving: boolean;
  /** Error message */
  error: string | null;
  /** Callback when description changes */
  onDescriptionChange: (description: string) => void;
  /** Callback to toggle edit/preview mode */
  onToggleEditMode: () => void;
  /** Callback to save description */
  onSave: () => Promise<boolean>;
  /** Callback to discard changes */
  onDiscard: () => void;
  /** Callback to close panel */
  onClose: () => boolean;
  /** Callback to force close panel */
  onForceClose: () => void;
}

/**
 * Todo detail panel component
 * Shows description editing and preview for a selected todo
 */
export const TodoDetailPanel: React.FC<TodoDetailPanelProps> = ({
  todo,
  editingDescription,
  hasUnsavedChanges,
  isEditing,
  isSaving,
  error,
  onDescriptionChange,
  onToggleEditMode,
  onSave,
  onDiscard,
  onClose,
  onForceClose,
}) => {
  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + S to save
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (hasUnsavedChanges) {
          onSave();
        }
      }
      // Escape to close (with confirmation if unsaved changes)
      if (e.key === "Escape") {
        handleClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasUnsavedChanges, onSave]);

  const handleClose = useCallback(() => {
    if (!onClose()) {
      // Panel didn't close due to unsaved changes
      // Show confirmation dialog
      if (window.confirm("You have unsaved changes. Are you sure you want to discard them?")) {
        onForceClose();
      }
    }
  }, [onClose, onForceClose]);

  if (!todo) {
    return null;
  }

  return (
    <div className="todo-detail-panel" role="complementary" aria-labelledby="detail-panel-title">
      {/* Header */}
      <div className="todo-detail-panel__header">
        <h2 id="detail-panel-title" className="todo-detail-panel__title">
          {todo.title}
        </h2>
        <button
          type="button"
          className="todo-detail-panel__close-btn"
          onClick={handleClose}
          aria-label="Close panel"
        >
          ✕
        </button>
      </div>

      {/* Mode toggle */}
      <div className="todo-detail-panel__mode-toggle">
        <button
          type="button"
          className={`todo-detail-panel__mode-btn ${isEditing ? "todo-detail-panel__mode-btn--active" : ""}`}
          onClick={() => !isEditing && onToggleEditMode()}
          disabled={isEditing}
        >
          ✏️ Edit
        </button>
        <button
          type="button"
          className={`todo-detail-panel__mode-btn ${!isEditing ? "todo-detail-panel__mode-btn--active" : ""}`}
          onClick={() => isEditing && onToggleEditMode()}
          disabled={!isEditing}
        >
          👁️ Preview
        </button>
      </div>

      {/* Content area */}
      <div className="todo-detail-panel__content">
        {isEditing ? (
          <MarkdownEditor
            value={editingDescription}
            onChange={onDescriptionChange}
            disabled={isSaving}
            autoFocus
          />
        ) : (
          <MarkdownPreview content={editingDescription} />
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="todo-detail-panel__error" role="alert">
          {error}
        </div>
      )}

      {/* Footer with actions */}
      <div className="todo-detail-panel__footer">
        <div className="todo-detail-panel__status">
          {hasUnsavedChanges && (
            <span className="todo-detail-panel__unsaved-indicator">● Unsaved changes</span>
          )}
        </div>
        <div className="todo-detail-panel__actions">
          {hasUnsavedChanges && (
            <button
              type="button"
              className="todo-detail-panel__btn todo-detail-panel__btn--secondary"
              onClick={onDiscard}
              disabled={isSaving}
            >
              Discard
            </button>
          )}
          <button
            type="button"
            className="todo-detail-panel__btn todo-detail-panel__btn--primary"
            onClick={onSave}
            disabled={!hasUnsavedChanges || isSaving}
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};
