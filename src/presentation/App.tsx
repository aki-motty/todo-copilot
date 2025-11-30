import "./App.css";
import { CreateTodoInput } from "./components/CreateTodoInput";
import { TodoDetailPanel } from "./components/TodoDetailPanel";
import { TodoList } from "./components/TodoList";
import { useTodoDetail } from "./hooks/useTodoDetail";
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
    addSubtask,
    toggleSubtask,
    deleteSubtask,
    addTag,
    removeTag,
    clearError,
    updateTodoDescription,
  } = useTodoList();

  const {
    selectedTodo,
    editingDescription,
    hasUnsavedChanges,
    isEditing,
    isSaving,
    error: detailError,
    selectTodo,
    updateDescription,
    toggleEditMode,
    save,
    discard,
    close,
    forceClose,
  } = useTodoDetail({
    todos,
    onUpdateDescription: updateTodoDescription,
  });

  const handleToggleCompletion = async (id: string) => {
    await toggleTodoCompletion(id);
  };

  const handleAddSubtask = async (todoId: string, title: string) => {
    await addSubtask(todoId, title);
  };

  const handleToggleSubtask = async (todoId: string, subtaskId: string) => {
    await toggleSubtask(todoId, subtaskId);
  };

  const handleDeleteSubtask = async (todoId: string, subtaskId: string) => {
    await deleteSubtask(todoId, subtaskId);
  };

  const handleShowDetail = (id: string) => {
    selectTodo(id);
  };

  return (
    <div className={`app-wrapper ${selectedTodo ? "with-panel" : ""}`}>
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
            onAddSubtask={handleAddSubtask}
            onToggleSubtask={handleToggleSubtask}
            onDeleteSubtask={handleDeleteSubtask}
            onAddTag={addTag}
            onRemoveTag={removeTag}
            onShowDetail={handleShowDetail}
            selectedTodoId={selectedTodo?.id}
          />
        </main>

        <footer className="app-footer">
          <p>Phase 3: Frontend API Integration (Lambda Backend)</p>
        </footer>
      </div>

      {selectedTodo && (
        <TodoDetailPanel
          todo={selectedTodo}
          editingDescription={editingDescription}
          hasUnsavedChanges={hasUnsavedChanges}
          isEditing={isEditing}
          isSaving={isSaving}
          error={detailError}
          onDescriptionChange={updateDescription}
          onToggleEditMode={toggleEditMode}
          onSave={save}
          onDiscard={discard}
          onClose={close}
          onForceClose={forceClose}
        />
      )}
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
