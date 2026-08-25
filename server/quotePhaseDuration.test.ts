import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "..");
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

describe("per-phase estimated durations", () => {
  it("supports duration entry, persistence, and customer portal display for phase items", () => {
    const editor = read("client/src/pages/ops/NativeAllQuotesSection.tsx");
    const router = read("server/nativeQuotesRouter.ts");
    const portal = read("client/src/pages/NativeQuotePortal.tsx");

    expect(editor).toContain('onChange(index, "estimatedDuration", e.target.value)');
    expect(editor).toContain("Estimated duration");
    expect(router).toContain("estimatedDuration: z.string().max(100).optional()");
    expect(portal).toContain("Estimated duration: {section.phase.estimatedDuration}");
  });
});
