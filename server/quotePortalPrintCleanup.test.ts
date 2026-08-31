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

  it("shows a subtotal before each customer discount and preserves visible discount emphasis in the printable portal", () => {
    const portal = fs.readFileSync(path.resolve(import.meta.dirname, "../client/src/pages/NativeQuotePortal.tsx"), "utf8");

    expect(portal).toContain("Subtotal before discount");
    expect(portal).toContain("Discount applied —");
    expect(portal).toContain("border-emerald-400/45");
    expect(portal).toContain("print:bg-emerald-50");
    expect(portal).toContain("isCustomerDiscount");
  });
});
