import { type FormEvent, useState } from "react";
import "./CreateTodoInput.css";

interface CreateTodoInputProps {
  onCreateTodo: (title: string) => Promise<any>;
  isLoading?: boolean;
  error?: string | null;
  onErrorClear?: () => void;
}

/**
 * React component for creating a new todo
 * Provides form input with validation and error handling
 */
export const CreateTodoInput: React.FC<CreateTodoInputProps> = ({
  onCreateTodo,
  isLoading = false,
  error,
  onErrorClear,
}) => {
  const [title, setTitle] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validation
    if (!title.trim()) {
      setValidationError("Todo title cannot be empty");
      return;
    }

    if (title.length > 500) {
      setValidationError("Todo title cannot exceed 500 characters");
      return;
    }

    setValidationError(null);

    try {
      await onCreateTodo(title);
      setTitle(""); // Clear input on success
    } catch (err) {
      // Error is handled by parent component
      console.error("Failed to create todo:", err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    if (validationError) {
      setValidationError(null);
    }
  };

  const displayError = validationError || error;

  return (
    <div className="create-todo-input">
      <form onSubmit={handleSubmit} className="create-todo-form">
        <div className="form-group">
          <input
            type="text"
            value={title}
            onChange={handleInputChange}
            placeholder="Add a new todo..."
            disabled={isLoading}
            maxLength={500}
            className="todo-input"
            aria-label="Todo title input"
          />
          <button
            type="submit"
            disabled={isLoading || !title.trim()}
            className="create-button"
            aria-label="Create todo"
          >
            {isLoading ? "Creating..." : "Create"}
          </button>
        </div>

        {displayError && (
          <div className="error-message" role="alert">
            {displayError}
            {onErrorClear && (
              <button
                type="button"
                onClick={onErrorClear}
                className="error-close"
                aria-label="Close error"
              >
                ✕
              </button>
            )}
          </div>
        )}

        <div className="char-count">{title.length}/500 characters</div>
      </form>
    </div>
  );
};
