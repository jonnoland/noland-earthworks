import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Resizable Operations quote workspace", () => {
  it("supports corner drag resizing and passes compact layout state into quote components", () => {
    const editor = readFileSync(resolve(import.meta.dirname, "../client/src/pages/ops/NativeAllQuotesSection.tsx"), "utf8");
    expect(editor).toContain("const [workspaceSize, setWorkspaceSize]");
    expect(editor).toContain("const startWorkspaceResize");
    expect(editor).toContain('onPointerDown={startWorkspaceResize}');
    expect(editor).toContain('style={{ width: workspaceSize.width, height: workspaceSize.height }}');
    expect(editor).toContain('compact={isCompactWorkspace}');
    expect(editor).toContain("isCompactWorkspace ? \"grid-cols-1\"");
  });
});
