import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Linear-foot Market Benchmarks", () => {
  it("separates Fence Line Clearing and Trail Cutting from per-acre benchmark services", () => {
    const settings = readFileSync(resolve(import.meta.dirname, "../client/src/pages/ops/Settings.tsx"), "utf8");

    expect(settings).toContain('new Set(["Fence Line Clearing", "Trail Cutting"])');
    expect(settings).toContain("const perAcreRows = rows.filter");
    expect(settings).toContain("const linearFootRows = rows.filter");
    expect(settings).toContain("Per-Acre Services");
    expect(settings).toContain("Linear Foot Services");
    expect(settings).toContain('renderBenchmarkTable(linearFootRows, "linear ft")');
  });
});
