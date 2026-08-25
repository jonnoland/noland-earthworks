import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("customer portal PDF cleanup", () => {
  it("hides the complete chat availability widget during printing", () => {
    const widget = fs.readFileSync(path.resolve(import.meta.dirname, "../client/src/components/AIChatWidget.tsx"), "utf8");
    const css = fs.readFileSync(path.resolve(import.meta.dirname, "../client/src/index.css"), "utf8");

    expect(widget).toContain('className="ne-chat-widget"');
    expect(css).toContain("@media print");
    expect(css).toContain(".ne-chat-widget");
    expect(css).toContain("display: none !important");
  });
});
