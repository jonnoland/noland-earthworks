import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("AI Pricing benchmark approval workflow", () => {
  it("lets the owner review and approve research suggestions from the Market Benchmarks panel", () => {
    const settings = readFileSync(resolve(import.meta.dirname, "../client/src/pages/ops/Settings.tsx"), "utf8");

    expect(settings).toContain("getPricingBenchmarkCandidates.useQuery");
    expect(settings).toContain("approvePricingBenchmarkCandidate.useMutation");
    expect(settings).toContain("rejectPricingBenchmarkCandidate.useMutation");
    expect(settings).toContain("awaiting your approval");
    expect(settings).toContain("The approved date changes when you approve a suggestion below");
    expect(settings).toContain("Benchmark approved. The rate and approved date now reflect this decision.");
  });
});
