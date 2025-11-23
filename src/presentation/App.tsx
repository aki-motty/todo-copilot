import "./App.css";
import { CreateTodoInput } from "./components/CreateTodoInput";
import { TodoList } from "./components/TodoList";
import { useTodoList } from "./hooks/useTodoList";
import { ApiConfigProvider } from "./providers/ApiConfigProvider";

/**
 * Inner app component
 * Uses the ApiConfigProvider for backend configuration
 */
function AppContent() {
  const { todos, error, loading, createTodo, toggleTodoCompletion, deleteTodo, clearError, backendMode } =
    useTodoList();

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>📝 Todo Copilot</h1>
        <p className="subtitle">Stay organized with your personal todo list</p>
        <p style={{ fontSize: "0.85rem", color: "#666", marginTop: "0.5rem" }}>
          Mode: {backendMode === "api" ? "🌐 API Backend" : "💾 Local Storage"}
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

/**
 * Root application component
 * Serves as the entry point for the React application
 * Wrapped with ApiConfigProvider for backend configuration
 */
export default function App() {
  return (
    <ApiConfigProvider>
      <AppContent />
    </ApiConfigProvider>
  );
}
