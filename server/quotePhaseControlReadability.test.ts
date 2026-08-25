import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("phase authorization and duration controls", () => {
  it("uses full-width, readable controls with explicit labels", () => {
    const editor = fs.readFileSync(path.resolve(import.meta.dirname, "../client/src/pages/ops/NativeAllQuotesSection.tsx"), "utf8");
    expect(editor).toContain("Phase authorization");
    expect(editor).toContain("Phase estimated duration in working days");
    expect(editor).toContain("h-9 w-full");
    expect(editor).toContain("Estimated duration");
  });
});
