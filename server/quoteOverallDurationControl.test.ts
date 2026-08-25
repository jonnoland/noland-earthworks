import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("overall quote estimated duration control", () => {
  it("keeps a dedicated editable overall duration field in the quote workspace", () => {
    const editor = fs.readFileSync(path.resolve(import.meta.dirname, "../client/src/pages/ops/NativeAllQuotesSection.tsx"), "utf8");
    expect(editor).toContain("Overall Estimated Duration");
    expect(editor).toContain('aria-label="Overall estimated duration"');
    expect(editor).toContain('onChange={e => setForm(p => ({ ...p, estimatedDuration: e.target.value }))}');
    expect(editor).toContain("Enter a positive number of working days for the complete quote.");
  });
});
