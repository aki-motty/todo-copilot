/**
 * Markdown rendering utility with XSS sanitization
 *
 * Uses marked for markdown parsing and DOMPurify for XSS prevention.
 * This module provides a secure way to render user-provided markdown content.
 */
import DOMPurify from "dompurify";
import { type MarkedOptions, marked } from "marked";

/**
 * Configuration for marked parser
 */
const markedOptions: MarkedOptions = {
  gfm: true, // GitHub Flavored Markdown
  breaks: false, // Don't convert \n to <br>
};

// Configure marked with options
marked.setOptions(markedOptions);

/**
 * Allowed HTML tags for sanitized markdown output
 */
const ALLOWED_TAGS = [
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p",
  "a",
  "ul",
  "ol",
  "li",
  "strong",
  "em",
  "code",
  "pre",
  "blockquote",
  "br",
  "hr",
  "span",
  "div",
];

/**
 * Allowed HTML attributes for sanitized output
 */
const ALLOWED_ATTR = ["href", "target", "rel", "class"];

/**
 * DOMPurify configuration for secure HTML output
 */
const purifyConfig = {
  ALLOWED_TAGS,
  ALLOWED_ATTR,
  ALLOW_DATA_ATTR: false,
};

/**
 * Simple LRU Cache for memoizing markdown render results
 * Improves performance for large markdown content by caching results
 */
class MarkdownCache {
  private cache: Map<string, string>;
  private readonly maxSize: number;

  constructor(maxSize = 50) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(key: string): string | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: string, value: string): void {
    // Delete if exists to update order
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Remove oldest entry (first in map)
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  clear(): void {
    this.cache.clear();
  }
}

// Singleton cache instance
const markdownCache = new MarkdownCache(50);

/**
 * Render markdown to sanitized HTML
 *
 * Uses LRU caching for performance optimization with large content.
 * Cached results improve re-render performance significantly.
 *
 * @param markdown - Raw markdown string to render
 * @returns Sanitized HTML string safe for innerHTML
 *
 * @example
 * ```typescript
 * const html = renderMarkdown('## Hello **World**');
 * // Returns: '<h2>Hello <strong>World</strong></h2>'
 * ```
 */
export function renderMarkdown(markdown: string): string {
  if (!markdown || markdown.trim().length === 0) {
    return "";
  }

  // Check cache first
  const cached = markdownCache.get(markdown);
  if (cached !== undefined) {
    return cached;
  }

  // Parse markdown to HTML
  const rawHtml = marked.parse(markdown, { async: false }) as string;

  // Sanitize HTML to prevent XSS
  const sanitizedHtml = DOMPurify.sanitize(rawHtml, purifyConfig);

  // Post-process: Add security attributes to links
  const result = addLinkSecurity(sanitizedHtml);

  // Cache the result
  markdownCache.set(markdown, result);

  return result;
}

/**
 * Add security attributes to all anchor tags
 * Opens links in new tab with noopener noreferrer
 */
function addLinkSecurity(html: string): string {
  return html.replace(/<a\s+href=/g, '<a target="_blank" rel="noopener noreferrer" href=');
}

/**
 * Check if a string contains any markdown syntax
 *
 * @param text - Text to check
 * @returns true if text contains markdown syntax
 */
export function hasMarkdownSyntax(text: string): boolean {
  if (!text) {
    return false;
  }

  const markdownPatterns = [
    /^#{1,6}\s/, // Headers
    /\*\*.*\*\*/, // Bold
    /\*.*\*/, // Italic
    /\[.*\]\(.*\)/, // Links
    /^[-*+]\s/, // Unordered lists
    /^\d+\.\s/, // Ordered lists
    /`.*`/, // Inline code
    /^```/, // Code blocks
    /^>\s/, // Blockquotes
  ];

  return markdownPatterns.some((pattern) => pattern.test(text));
}

/**
 * Get plain text from markdown (strip all formatting)
 *
 * @param markdown - Markdown string
 * @returns Plain text without formatting
 */
export function stripMarkdown(markdown: string): string {
  if (!markdown) {
    return "";
  }

  // Render to HTML first, then strip tags
  const html = renderMarkdown(markdown);
  const temp = document.createElement("div");
  temp.innerHTML = html;
  return temp.textContent || temp.innerText || "";
}

/**
 * Truncate markdown content while preserving word boundaries
 *
 * @param markdown - Markdown string to truncate
 * @param maxLength - Maximum length in characters
 * @returns Truncated string with ellipsis if truncated
 */
export function truncateMarkdown(markdown: string, maxLength: number): string {
  if (!markdown || markdown.length <= maxLength) {
    return markdown;
  }

  const truncated = markdown.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");

  if (lastSpace > maxLength * 0.8) {
    return `${truncated.slice(0, lastSpace)}...`;
  }

  return `${truncated}...`;
}
