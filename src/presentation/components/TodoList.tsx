import type { Todo } from "../../domain/entities/Todo";
import { TodoItem } from "./TodoItem";
import "./TodoList.css";

interface TodoListProps {
  todos: Todo[];
  isLoading?: boolean;
  onToggleCompletion?: (id: string) => Promise<any>;
  onDelete?: (id: string) => Promise<void>;
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

  return (
    <div className="todo-list">
      <h2 className="todo-list-header">My Todos ({todos.length})</h2>
      <ul className="todo-items">
        {todos.map((todo) => (
          <TodoItem
            key={todo.id}
            todo={todo}
            onToggleCompletion={onToggleCompletion}
            onDelete={onDelete}
          />
        ))}
      </ul>
    </div>
  );
};
