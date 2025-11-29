import { useState } from "react";
import type { TodoResponseDTO } from "../../application/dto/TodoDTO";
import { SubtaskList } from "./SubtaskList";
import { TagSelector } from "./TagSelector";
import "./TodoItem.css";

interface TodoItemProps {
  todo: TodoResponseDTO;
  onToggleCompletion?: (id: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onAddSubtask?: (todoId: string, title: string) => Promise<void>;
  onToggleSubtask?: (todoId: string, subtaskId: string) => Promise<void>;
  onDeleteSubtask?: (todoId: string, subtaskId: string) => Promise<void>;
  onAddTag?: (todoId: string, tagName: string) => Promise<void>;
  onRemoveTag?: (todoId: string, tagName: string) => Promise<void>;
}

/**
 * React component for displaying a single todo item
 * Provides toggle completion checkbox and delete button
 */
export const TodoItem: React.FC<TodoItemProps> = ({
  todo,
  onToggleCompletion,
  onDelete,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
  onAddTag,
  onRemoveTag,
}) => {
  const [isToggling, setIsToggling] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [subtaskTitle, setSubtaskTitle] = useState("");

  const handleToggle = async () => {
    if (!onToggleCompletion) {
      return;
    }

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
    if (!onDelete) {
      return;
    }

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

  const handleAddSubtaskClick = () => {
    const newIsAdding = !isAddingSubtask;
    setIsAddingSubtask(newIsAdding);
    if (newIsAdding) {
      setIsExpanded(true);
    }
  };

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddSubtask || !subtaskTitle.trim()) return;

    try {
      await onAddSubtask(todo.id, subtaskTitle);
      setSubtaskTitle("");
      // Keep form open to add more
    } catch (err) {
      console.error("Failed to add subtask:", err);
    }
  };

  const handleToggleSubtask = async (subtaskId: string) => {
    if (!onToggleSubtask) return;
    try {
      await onToggleSubtask(todo.id, subtaskId);
    } catch (err) {
      console.error("Failed to toggle subtask:", err);
    }
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    if (!onDeleteSubtask) return;
    try {
      await onDeleteSubtask(todo.id, subtaskId);
    } catch (err) {
      console.error("Failed to delete subtask:", err);
    }
  };

  const handleAddTag = async (tagName: string) => {
    if (!onAddTag) return;
    try {
      await onAddTag(todo.id, tagName);
    } catch (err) {
      console.error("Failed to add tag:", err);
    }
  };

  const handleRemoveTag = async (tagName: string) => {
    if (!onRemoveTag) return;
    try {
      await onRemoveTag(todo.id, tagName);
    } catch (err) {
      console.error("Failed to remove tag:", err);
    }
  };

  const hasSubtasks = todo.subtasks && todo.subtasks.length > 0;
  const completedSubtasks = todo.subtasks?.filter((s) => s.completed).length || 0;
  const totalSubtasks = todo.subtasks?.length || 0;

  return (
    <li className="todo-item-container">
      <div className={`todo-item ${todo.completed ? "completed" : ""}`}>
        <div className="todo-item-content">
          <button
            type="button"
            className={`expand-btn ${isExpanded ? "expanded" : ""} ${!hasSubtasks && !isAddingSubtask ? "hidden" : ""}`}
            onClick={() => setIsExpanded(!isExpanded)}
            aria-label={isExpanded ? "Collapse subtasks" : "Expand subtasks"}
          >
            ▶
          </button>
          <input
            type="checkbox"
            checked={todo.completed}
            onChange={handleToggle}
            disabled={isToggling}
            className="todo-checkbox"
            aria-label={`Toggle completion for: ${todo.title}`}
          />
          <span className={`todo-text ${todo.completed ? "completed" : ""}`}>{todo.title}</span>
          {todo.tags && todo.tags.length > 0 && (
            <div className="todo-tags">
              {todo.tags.map((tag) => (
                <span key={tag} className="todo-tag">
                  {tag}
                  {onRemoveTag && (
                    <button
                      className="remove-tag-btn"
                      onClick={() => handleRemoveTag(tag)}
                      aria-label={`Remove tag ${tag}`}
                    >
                      ×
                    </button>
                  )}
                </span>
              ))}
            </div>
          )}
          {hasSubtasks && (
            <span className="subtask-progress">
              ({completedSubtasks}/{totalSubtasks})
            </span>
          )}
        </div>

        <div className="todo-item-actions">
          <TagSelector onSelect={handleAddTag} />
          <button
            type="button"
            onClick={handleAddSubtaskClick}
            className="add-subtask-btn"
            aria-label="Add subtask"
            title="Add subtask"
          >
            +
          </button>

          {showDeleteConfirm ? (
            <>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="delete-confirm-btn"
                aria-label="Confirm delete"
              >
                {isDeleting ? "..." : "Confirm"}
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="delete-cancel-btn"
                aria-label="Cancel delete"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="delete-btn"
              aria-label="Delete todo"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="subtask-container">
          {isAddingSubtask && (
            <form onSubmit={handleAddSubtask} className="subtask-form">
              <input
                type="text"
                value={subtaskTitle}
                onChange={(e) => setSubtaskTitle(e.target.value)}
                placeholder="Subtask title"
                autoFocus
                className="subtask-input"
              />
              <button type="submit" className="subtask-submit-btn">
                Add
              </button>
            </form>
          )}

          {hasSubtasks && (
            <SubtaskList
              subtasks={todo.subtasks}
              onToggleSubtask={handleToggleSubtask}
              onDeleteSubtask={handleDeleteSubtask}
            />
          )}
        </div>
      )}
    </li>
  );
};
