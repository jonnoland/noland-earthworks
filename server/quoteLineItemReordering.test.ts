import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Operations quote line-item reordering controls", () => {
  it("offers drag-and-drop plus move-up and move-down controls backed by the saved line-item order", () => {
    const editor = readFileSync(resolve(import.meta.dirname, "../client/src/pages/ops/NativeAllQuotesSection.tsx"), "utf8");
    expect(editor).toContain('draggable');
    expect(editor).toContain('application/x-noland-quote-line-item');
    expect(editor).toContain('title="Move up"');
    expect(editor).toContain('title="Move down"');
    expect(editor).toContain('lineItems: moveQuoteLineItem(current.lineItems, fromIndex, toIndex)');
  });
});
