import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Adjusted Linear Foot Market Benchmarks", () => {
  it("uses the shared condition multiplier and labels the adjustment basis for linear-foot services", () => {
    const settings = readFileSync(resolve(import.meta.dirname, "../client/src/pages/ops/Settings.tsx"), "utf8");

    expect(settings).toContain("getFieldConditionAdjustment(linearFootConditions");
    expect(settings).toContain("linearFootAdjustment.combinedMultiplier");
    expect(settings).toContain("renderBenchmarkTable(linearFootRows, \"linear ft\", linearFootAdjustment)");
    expect(settings).toContain("Each displayed rate is the approved per-linear-foot base benchmark");
    expect(settings).toContain("Displayed Low, Mid, and High rates equal the approved base rate");
  });
});
