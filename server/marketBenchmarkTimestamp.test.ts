import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Market Benchmark timestamp clarity", () => {
  it("does not present a research-run timestamp as an approved benchmark refresh", () => {
    const settings = readFileSync(resolve(import.meta.dirname, "../client/src/pages/ops/Settings.tsx"), "utf8");

    expect(settings).toContain("Latest research run:");
    expect(settings).toContain("service suggestion");
    expect(settings).toContain("creates reviewable suggestions");
    expect(settings).toContain(">Approved</th>");
    expect(settings).toContain("new Date(benchmark.lastUpdatedAt)");
    expect(settings).not.toContain("Benchmarks updated —");
  });
});
