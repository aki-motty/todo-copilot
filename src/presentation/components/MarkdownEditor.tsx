import type React from "react";
import { useCallback, useEffect, useRef } from "react";
import "./MarkdownEditor.css";

export interface MarkdownEditorProps {
  /** Current value */
  value: string;
  /** Callback when value changes */
  onChange: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Maximum character limit */
  maxLength?: number;
  /** Whether the editor is disabled */
  disabled?: boolean;
  /** Auto focus on mount */
  autoFocus?: boolean;
}

/**
 * Markdown editor component
 * A textarea for editing markdown content with character count
 */
export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  value,
  onChange,
  placeholder = "Add details using Markdown...\n\n## Example\n- Item 1\n- Item 2\n\n**Bold** and *italic* text",
  maxLength = 10000,
  disabled = false,
  autoFocus = false,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const remainingChars = maxLength - value.length;
  const isOverLimit = remainingChars < 0;

  // Auto-resize textarea to fit content
  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.max(200, textarea.scrollHeight)}px`;
    }
  }, []);

  // Adjust height on value change
  // biome-ignore lint/correctness/useExhaustiveDependencies: value is intentionally used to trigger height adjustment on content change
  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  // Auto focus
  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  // Handle tab key for indentation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      // Insert tab character
      const newValue = `${value.substring(0, start)}\t${value.substring(end)}`;
      onChange(newValue);

      // Move cursor after tab
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 1;
      });
    }
  };

  return (
    <div className="markdown-editor">
      <textarea
        ref={textareaRef}
        className={`markdown-editor__textarea ${isOverLimit ? "markdown-editor__textarea--error" : ""}`}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        aria-label="Description editor"
        aria-describedby="char-count"
      />
      <div
        id="char-count"
        className={`markdown-editor__char-count ${isOverLimit ? "markdown-editor__char-count--error" : ""} ${remainingChars < 500 ? "markdown-editor__char-count--warning" : ""}`}
      >
        {remainingChars.toLocaleString()} / {maxLength.toLocaleString()} characters remaining
      </div>
    </div>
  );
};
