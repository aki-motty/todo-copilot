import type { TodoResponseDTO } from "../../application/dto/TodoDTO";
import { TodoItem } from "./TodoItem";
import "./TodoList.css";

interface TodoListProps {
  todos: TodoResponseDTO[];
  isLoading?: boolean;
  onToggleCompletion?: (id: string) => Promise<any>;
  onDelete?: (id: string) => Promise<void>;
  onAddSubtask?: (todoId: string, title: string) => Promise<void>;
  onToggleSubtask?: (todoId: string, subtaskId: string) => Promise<void>;
  onDeleteSubtask?: (todoId: string, subtaskId: string) => Promise<void>;
  onAddTag?: (todoId: string, tagName: string) => Promise<void>;
  onRemoveTag?: (todoId: string, tagName: string) => Promise<void>;
  /** Callback to show detail panel for a todo */
  onShowDetail?: (id: string) => void;
  /** ID of currently selected todo */
  selectedTodoId?: string;
}

/**
 * React component for displaying a list of todos
 * Shows empty state when no todos exist
 */
export const TodoList: React.FC<TodoListProps> = ({
  todos,
  isLoading = false,
  onToggleCompletion,
  onDelete,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
  onAddTag,
  onRemoveTag,
  onShowDetail,
  selectedTodoId,
}) => {
  if (isLoading) {
    return (
      <div className="todo-list-loading">
        <p>Loading todos...</p>
      </div>
    );
  }

  if (todos.length === 0) {
    return (
      <div className="todo-list-empty">
        <p>No todos yet. Create one to get started!</p>
      </div>
    );
  }

  // Sort todos by createdAt (newest first)
  const sortedTodos = [...todos].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="todo-list">
      <h2 className="todo-list-header">My Todos ({todos.length})</h2>
      <ul className="todo-items">
        {sortedTodos.map((todo) => (
          <TodoItem
            key={todo.id}
            todo={todo}
            onToggleCompletion={onToggleCompletion}
            onDelete={onDelete}
            onAddSubtask={onAddSubtask}
            onToggleSubtask={onToggleSubtask}
            onDeleteSubtask={onDeleteSubtask}
            onAddTag={onAddTag}
            onRemoveTag={onRemoveTag}
            onShowDetail={onShowDetail}
            isSelected={selectedTodoId === todo.id}
          />
        ))}
      </ul>
    </div>
  );
};
