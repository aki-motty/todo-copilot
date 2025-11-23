import "./App.css";
import { CreateTodoInput } from "./components/CreateTodoInput";
import { TodoList } from "./components/TodoList";
import { useTodoAPI } from "./hooks/useTodoAPI";

/**
 * Inner app component
 * Uses Lambda API for all todo operations
 */
function AppContent() {
  const {
    todos,
    error,
    isLoading: loading,
    createTodo,
    toggleTodo,
    deleteTodo,
    clearError,
  } = useTodoAPI();

  const handleToggleCompletion = async (id: string) => {
    await toggleTodo(id);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>📝 Todo Copilot</h1>
        <p className="subtitle">Stay organized with your personal todo list</p>
        <p style={{ fontSize: "0.85rem", color: "#666", marginTop: "0.5rem" }}>
          Mode: 🌐 API Backend (AWS Lambda)
        </p>
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
          onToggleCompletion={handleToggleCompletion}
          onDelete={deleteTodo}
        />
      </main>

      <footer className="app-footer">
        <p>Phase 3: Frontend API Integration (Lambda Backend)</p>
      </footer>
    </div>
  );
}

/**
 * Root application component
 * Serves as the entry point for the React application
 */
export default function App() {
  return <AppContent />;
}
