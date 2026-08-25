import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Operations quote list status badges", () => {
  it("renders the color-coded lifecycle badge directly in each quote row", () => {
    const editor = readFileSync(resolve(import.meta.dirname, "../client/src/pages/ops/NativeAllQuotesSection.tsx"), "utf8");
    expect(editor).toContain('function StatusBadge({ quote }: { quote: NativeQuote })');
    expect(editor).toContain('<StatusBadge quote={quote} />');
    expect(editor).toContain('>Approved</Badge>');
    expect(editor).toContain('>Sent</Badge>');
    expect(editor).toContain('>Draft</Badge>');
  });
});
