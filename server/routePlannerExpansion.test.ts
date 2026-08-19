import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("equipment-aware rural Route Planner", () => {
  it("supports Tennessee Parcel ID destinations and keeps the hauling profile visible", () => {
    const planner = readFileSync(resolve(import.meta.dirname, "../client/src/pages/ops/WeighStationPlanner.tsx"), "utf8");

    expect(planner).toContain("trpc.parcel.lookup.useMutation");
    expect(planner).toContain("Use a Tennessee Parcel ID as destination");
    expect(planner).toContain("Use as destination");
    expect(planner).toContain("2026 Ram 5500");
    expect(planner).toContain("BigTex 25' Gooseneck");
    expect(planner).toContain("CAT 299D3 loaded");
  });

  it("requires a human rural-access review rather than claiming truck-safe routing", () => {
    const planner = readFileSync(resolve(import.meta.dirname, "../client/src/pages/ops/WeighStationPlanner.tsx"), "utf8");

    expect(planner).toContain("Rural hauling route review");
    expect(planner).toContain("Google driving directions do not verify road surface");
    expect(planner).toContain("Posted bridge, weight, and vehicle restrictions reviewed");
    expect(planner).toContain("Gate clearance, tight turns, and turnaround room confirmed");
  });
});
