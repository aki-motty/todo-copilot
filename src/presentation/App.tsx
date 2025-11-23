import "./App.css";
import { CreateTodoInput } from "./components/CreateTodoInput";
import { TodoList } from "./components/TodoList";
import { useTodoList } from "./hooks/useTodoList";

/**
 * Inner app component
 * Uses Lambda API with fallback to localStorage
 */
function AppContent() {
  const {
    todos,
    error,
    loading,
    createTodo,
    toggleTodoCompletion,
    deleteTodo,
    clearError,
  } = useTodoList();

  const handleToggleCompletion = async (id: string) => {
    await toggleTodoCompletion(id);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>📝 Todo Copilot</h1>
        <p className="subtitle">Stay organized with your personal todo list</p>
        <p style={{ fontSize: "0.85rem", color: "#666", marginTop: "0.5rem" }}>
          Mode: 🌐 API Backend (AWS Lambda) with localStorage Fallback
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
