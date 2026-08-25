import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("quote duration validation and portal timeline", () => {
  it("requires positive numeric overall and phase duration values before saving", () => {
    const editor = fs.readFileSync(path.resolve(import.meta.dirname, "../client/src/pages/ops/NativeAllQuotesSection.tsx"), "utf8");
    expect(editor).toContain("function positiveDurationError");
    expect(editor).toContain("Enter a positive number of working days.");
    expect(editor).toContain("if (!validateDurationInputs()) return;");
    expect(editor).toContain('type="number" min="0.1" step="0.1"');
  });

  it("shows the overall duration as an expected working-day timeline in the customer portal", () => {
    const portal = fs.readFileSync(path.resolve(import.meta.dirname, "../client/src/pages/NativeQuotePortal.tsx"), "utf8");
    expect(portal).toContain("function formatWorkingDays");
    expect(portal).toContain("Expected timeline");
    expect(portal).toContain("formatWorkingDays(quote.estimatedDuration)");
  });
});
