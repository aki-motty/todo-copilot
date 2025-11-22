import { useState } from "react";
import type { Todo } from "../../domain/entities/Todo";
import "./TodoItem.css";

interface TodoItemProps {
  todo: Todo;
  onToggleCompletion?: (id: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

/**
 * React component for displaying a single todo item
 * Provides toggle completion checkbox and delete button
 */
export const TodoItem: React.FC<TodoItemProps> = ({ todo, onToggleCompletion, onDelete }) => {
  const [isToggling, setIsToggling] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleToggle = async () => {
    if (!onToggleCompletion) return;

    try {
      setIsToggling(true);
      await onToggleCompletion(todo.id);
    } catch (err) {
      console.error("Failed to toggle todo:", err);
    } finally {
      setIsToggling(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;

    try {
      setIsDeleting(true);
      await onDelete(todo.id);
    } catch (err) {
      console.error("Failed to delete todo:", err);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <li className="todo-item">
      <div className="todo-item-content">
        <input
          type="checkbox"
          checked={todo.completed}
          onChange={handleToggle}
          disabled={isToggling}
          className="todo-checkbox"
          aria-label={`Toggle completion for: ${todo.title.value}`}
        />
        <span className={`todo-text ${todo.completed ? "completed" : ""}`}>{todo.title.value}</span>
      </div>

      <div className="todo-item-actions">
        {showDeleteConfirm ? (
          <>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="delete-confirm-btn"
              aria-label="Confirm delete"
            >
              {isDeleting ? "..." : "Confirm"}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="delete-cancel-btn"
              aria-label="Cancel delete"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="delete-btn"
            aria-label="Delete todo"
          >
            Delete
          </button>
        )}
      </div>
    </li>
  );
};
