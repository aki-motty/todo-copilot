/**
 * @jest-environment jsdom
 */
import {
  hasMarkdownSyntax,
  renderMarkdown,
  stripMarkdown,
  truncateMarkdown,
} from "../../../src/shared/utils/markdown";

describe("Markdown Utility", () => {
  describe("renderMarkdown", () => {
    it("should render basic markdown to HTML", () => {
      const markdown = "**bold** and *italic*";
      const html = renderMarkdown(markdown);

      expect(html).toContain("<strong>bold</strong>");
      expect(html).toContain("<em>italic</em>");
    });

    it("should render headings", () => {
      const h1 = renderMarkdown("# Heading 1");
      const h2 = renderMarkdown("## Heading 2");
      const h3 = renderMarkdown("### Heading 3");

      expect(h1).toContain("<h1>Heading 1</h1>");
      expect(h2).toContain("<h2>Heading 2</h2>");
      expect(h3).toContain("<h3>Heading 3</h3>");
    });

    it("should render unordered lists", () => {
      const markdown = "- Item 1\n- Item 2\n- Item 3";
      const html = renderMarkdown(markdown);

      expect(html).toContain("<ul>");
      expect(html).toContain("<li>Item 1</li>");
      expect(html).toContain("<li>Item 2</li>");
      expect(html).toContain("<li>Item 3</li>");
      expect(html).toContain("</ul>");
    });

    it("should render ordered lists", () => {
      const markdown = "1. First\n2. Second\n3. Third";
      const html = renderMarkdown(markdown);

      expect(html).toContain("<ol>");
      expect(html).toContain("<li>First</li>");
      expect(html).toContain("</ol>");
    });

    it("should render links with security attributes", () => {
      const markdown = "[Example](https://example.com)";
      const html = renderMarkdown(markdown);

      expect(html).toContain('href="https://example.com"');
      expect(html).toContain('target="_blank"');
      expect(html).toContain('rel="noopener noreferrer"');
    });

    it("should render code blocks", () => {
      const markdown = "```\nconst x = 1;\n```";
      const html = renderMarkdown(markdown);

      expect(html).toContain("<pre>");
      expect(html).toContain("<code>");
    });

    it("should render inline code", () => {
      const markdown = "Use `const` keyword";
      const html = renderMarkdown(markdown);

      expect(html).toContain("<code>const</code>");
    });

    it("should render blockquotes", () => {
      const markdown = "> This is a quote";
      const html = renderMarkdown(markdown);

      expect(html).toContain("<blockquote>");
    });

    it("should return empty string for empty input", () => {
      expect(renderMarkdown("")).toBe("");
      expect(renderMarkdown("   ")).toBe("");
    });

    describe("XSS prevention", () => {
      it("should strip script tags", () => {
        const markdown = '<script>alert("xss")</script>';
        const html = renderMarkdown(markdown);

        expect(html).not.toContain("<script>");
        expect(html).not.toContain("alert");
      });

      it("should strip onclick attributes", () => {
        const markdown = '<div onclick="alert(1)">Click</div>';
        const html = renderMarkdown(markdown);

        expect(html).not.toContain("onclick");
      });

      it("should strip javascript: URLs", () => {
        const markdown = "[click](javascript:alert(1))";
        const html = renderMarkdown(markdown);

        expect(html).not.toContain("javascript:");
      });

      it("should strip onerror attributes", () => {
        const markdown = '<img src="x" onerror="alert(1)">';
        const html = renderMarkdown(markdown);

        expect(html).not.toContain("onerror");
      });

      it("should strip iframe tags", () => {
        const markdown = '<iframe src="https://evil.com"></iframe>';
        const html = renderMarkdown(markdown);

        expect(html).not.toContain("<iframe>");
      });

      it("should allow safe HTML elements", () => {
        const markdown = "**Safe** content with *emphasis*";
        const html = renderMarkdown(markdown);

        expect(html).toContain("<strong>");
        expect(html).toContain("<em>");
      });

      it("should strip data attributes", () => {
        const markdown = '<div data-custom="value">Content</div>';
        const html = renderMarkdown(markdown);

        expect(html).not.toContain("data-custom");
      });

      it("should strip SVG tags with XSS payloads", () => {
        const markdown = '<svg onload="alert(1)"><circle r="50"></circle></svg>';
        const html = renderMarkdown(markdown);

        expect(html).not.toContain("<svg");
        expect(html).not.toContain("onload");
      });

      it("should strip style tags", () => {
        const markdown = '<style>body { background: url("javascript:alert(1)") }</style>';
        const html = renderMarkdown(markdown);

        expect(html).not.toContain("<style>");
      });

      it("should strip base64 encoded XSS in links", () => {
        const markdown = "[click](data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==)";
        const html = renderMarkdown(markdown);

        // data: URLs should be stripped by DOMPurify
        expect(html).not.toContain("data:text/html");
      });

      it("should strip form tags", () => {
        const markdown = '<form action="https://evil.com"><input type="submit"></form>';
        const html = renderMarkdown(markdown);

        expect(html).not.toContain("<form");
        expect(html).not.toContain("<input");
      });
    });
  });

  describe("hasMarkdownSyntax", () => {
    it("should detect headers", () => {
      expect(hasMarkdownSyntax("# Header")).toBe(true);
      expect(hasMarkdownSyntax("## Header")).toBe(true);
      expect(hasMarkdownSyntax("### Header")).toBe(true);
    });

    it("should detect bold text", () => {
      expect(hasMarkdownSyntax("**bold**")).toBe(true);
    });

    it("should detect italic text", () => {
      expect(hasMarkdownSyntax("*italic*")).toBe(true);
    });

    it("should detect links", () => {
      expect(hasMarkdownSyntax("[text](url)")).toBe(true);
    });

    it("should detect unordered lists", () => {
      expect(hasMarkdownSyntax("- item")).toBe(true);
      expect(hasMarkdownSyntax("* item")).toBe(true);
    });

    it("should detect ordered lists", () => {
      expect(hasMarkdownSyntax("1. item")).toBe(true);
    });

    it("should detect inline code", () => {
      expect(hasMarkdownSyntax("`code`")).toBe(true);
    });

    it("should detect code blocks", () => {
      expect(hasMarkdownSyntax("```")).toBe(true);
    });

    it("should detect blockquotes", () => {
      expect(hasMarkdownSyntax("> quote")).toBe(true);
    });

    it("should return false for plain text", () => {
      expect(hasMarkdownSyntax("Just plain text")).toBe(false);
    });

    it("should return false for empty string", () => {
      expect(hasMarkdownSyntax("")).toBe(false);
    });

    it("should return false for null/undefined", () => {
      expect(hasMarkdownSyntax(null as unknown as string)).toBe(false);
      expect(hasMarkdownSyntax(undefined as unknown as string)).toBe(false);
    });
  });

  describe("stripMarkdown", () => {
    it("should strip markdown formatting", () => {
      const markdown = "**Bold** and *italic* text";
      const plain = stripMarkdown(markdown);

      expect(plain).toContain("Bold");
      expect(plain).toContain("italic");
      expect(plain).not.toContain("**");
      expect(plain).not.toContain("*");
    });

    it("should return empty string for empty input", () => {
      expect(stripMarkdown("")).toBe("");
      expect(stripMarkdown(null as unknown as string)).toBe("");
    });

    it("should strip links but keep text", () => {
      const markdown = "[Click here](https://example.com)";
      const plain = stripMarkdown(markdown);

      expect(plain).toContain("Click here");
      expect(plain).not.toContain("https://example.com");
    });
  });

  describe("truncateMarkdown", () => {
    it("should return original if under max length", () => {
      const short = "Short text";
      expect(truncateMarkdown(short, 100)).toBe(short);
    });

    it("should truncate at word boundary", () => {
      const long = "This is a longer text that needs truncation";
      const truncated = truncateMarkdown(long, 20);

      expect(truncated.length).toBeLessThanOrEqual(24); // accounting for "..."
      expect(truncated).toContain("...");
    });

    it("should handle empty string", () => {
      expect(truncateMarkdown("", 10)).toBe("");
    });

    it("should handle null/undefined", () => {
      expect(truncateMarkdown(null as unknown as string, 10)).toBeFalsy();
      expect(truncateMarkdown(undefined as unknown as string, 10)).toBeFalsy();
    });
  });
});
