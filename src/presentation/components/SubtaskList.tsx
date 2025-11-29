import React from "react";
import type { SubtaskDTO } from "../../application/dto/TodoDTO";
import "./SubtaskList.css";

interface SubtaskListProps {
  subtasks: SubtaskDTO[];
  onToggleSubtask: (subtaskId: string) => void;
  onDeleteSubtask: (subtaskId: string) => void;
}

export const SubtaskList: React.FC<SubtaskListProps> = ({
  subtasks,
  onToggleSubtask,
  onDeleteSubtask,
}) => {
  if (!subtasks || subtasks.length === 0) return null;

  return (
    <ul className="subtask-list">
      {subtasks.map((subtask) => (
        <li key={subtask.id} className="subtask-item">
          <input
            type="checkbox"
            checked={subtask.completed}
            onChange={() => onToggleSubtask(subtask.id)}
            className="subtask-checkbox"
          />
          <span className={`subtask-text ${subtask.completed ? "completed" : ""}`}>
            {subtask.title}
          </span>
          <button
            type="button"
            onClick={() => onDeleteSubtask(subtask.id)}
            className="subtask-delete-btn"
            aria-label="Delete subtask"
          >
            ×
          </button>
        </li>
      ))}
    </ul>
  );
};
