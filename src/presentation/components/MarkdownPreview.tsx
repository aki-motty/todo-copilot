import type React from "react";
import { useMemo } from "react";
import { renderMarkdown } from "../../shared/utils/markdown";
import "./MarkdownPreview.css";

export interface MarkdownPreviewProps {
  /** Markdown content to render */
  content: string;
  /** Placeholder when content is empty */
  emptyPlaceholder?: string;
}

/**
 * Markdown preview component
 * Renders markdown content as sanitized HTML
 */
export const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({
  content,
  emptyPlaceholder = "No description added yet. Click 'Edit' to add details.",
}) => {
  // Memoize rendered HTML to avoid re-rendering on every render
  const renderedHtml = useMemo(() => {
    if (!content || content.trim().length === 0) {
      return null;
    }
    return renderMarkdown(content);
  }, [content]);

  if (!renderedHtml) {
    return (
      <div className="markdown-preview markdown-preview--empty">
        <p className="markdown-preview__placeholder">{emptyPlaceholder}</p>
      </div>
    );
  }

  return (
    <div
      className="markdown-preview markdown-content"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: Content is sanitized by DOMPurify
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
    />
  );
};
