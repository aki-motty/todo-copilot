import { useTodoList } from "./hooks/useTodoList";
import { CreateTodoInput } from "./components/CreateTodoInput";
import { TodoList } from "./components/TodoList";
import "./App.css";

/**
 * Root application component
 * Serves as the entry point for the React application
 */
export default function App() {
  const { todos, error, loading, createTodo, toggleTodoCompletion, deleteTodo, clearError } =
    useTodoList();

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>📝 Todo Copilot</h1>
        <p className="subtitle">Stay organized with your personal todo list</p>
      </header>

      <main className="app-main">
        <CreateTodoInput
          onCreateTodo={createTodo}
          isLoading={loading}
          error={error}
          onErrorClear={clearError}
        />

        <TodoList
          todos={todos}
          isLoading={loading}
          onToggleCompletion={toggleTodoCompletion}
          onDelete={deleteTodo}
        />
      </main>

      <footer className="app-footer">
        <p>Phase 3: User Story 1 Implementation (Create & Display Todos)</p>
      </footer>
    </div>
  );
}
