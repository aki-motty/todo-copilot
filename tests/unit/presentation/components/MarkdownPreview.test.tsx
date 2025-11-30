/**
 * Unit tests for MarkdownPreview component
 */

import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { MarkdownPreview } from "../../../../src/presentation/components/MarkdownPreview";

// Mock the markdown utility to test component behavior independently
jest.mock("../../../../src/shared/utils/markdown", () => ({
  renderMarkdown: jest.fn((content: string) => {
    // Simple mock that returns HTML for testing
    if (!content || content.trim().length === 0) {
      return "";
    }
    return `<p>${content}</p>`;
  }),
}));

describe("MarkdownPreview Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render with markdown-preview class", () => {
      const { container } = render(<MarkdownPreview content="Test" />);
      expect(container.querySelector(".markdown-preview")).toBeInTheDocument();
    });

    it("should render provided content as HTML", () => {
      render(<MarkdownPreview content="Hello World" />);
      expect(screen.getByText("Hello World")).toBeInTheDocument();
    });

    it("should apply markdown-content class for non-empty content", () => {
      const { container } = render(<MarkdownPreview content="Test" />);
      expect(container.querySelector(".markdown-preview.markdown-content")).toBeInTheDocument();
    });
  });

  describe("Empty state", () => {
    it("should show default placeholder when content is empty", () => {
      render(<MarkdownPreview content="" />);
      expect(screen.getByText(/No description added yet/i)).toBeInTheDocument();
    });

    it("should show custom placeholder when provided", () => {
      render(<MarkdownPreview content="" emptyPlaceholder="Custom placeholder" />);
      expect(screen.getByText("Custom placeholder")).toBeInTheDocument();
    });

    it("should show placeholder when content is whitespace only", () => {
      render(<MarkdownPreview content="   " />);
      expect(screen.getByText(/No description added yet/i)).toBeInTheDocument();
    });

    it("should have empty class when content is empty", () => {
      const { container } = render(<MarkdownPreview content="" />);
      expect(container.querySelector(".markdown-preview--empty")).toBeInTheDocument();
    });

    it("should show placeholder element when empty", () => {
      const { container } = render(<MarkdownPreview content="" />);
      expect(container.querySelector(".markdown-preview__placeholder")).toBeInTheDocument();
    });
  });

  describe("Content rendering", () => {
    it("should not have empty class when content has text", () => {
      const { container } = render(<MarkdownPreview content="Some content" />);
      expect(container.querySelector(".markdown-preview--empty")).not.toBeInTheDocument();
    });

    it("should render HTML content using dangerouslySetInnerHTML", () => {
      const { container } = render(<MarkdownPreview content="**Bold**" />);
      // The content should be in the markdown-preview element
      const preview = container.querySelector(".markdown-preview");
      expect(preview?.innerHTML).toContain("**Bold**");
    });

    it("should not show placeholder when content exists", () => {
      const { container } = render(<MarkdownPreview content="Has content" />);
      expect(container.querySelector(".markdown-preview__placeholder")).not.toBeInTheDocument();
    });
  });
});
