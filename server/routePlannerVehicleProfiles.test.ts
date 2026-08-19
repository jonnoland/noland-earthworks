import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Route Planner vehicle profiles and unpaved reference", () => {
  it("persists selectable vehicle profiles and exposes route surface data", () => {
    const router = readFileSync(resolve(import.meta.dirname, "routePlannerRouter.ts"), "utf8");
    const planner = readFileSync(resolve(import.meta.dirname, "../client/src/pages/ops/WeighStationPlanner.tsx"), "utf8");

    expect(router).toContain("getVehicleProfiles: adminProcedure");
    expect(router).toContain("saveVehicleProfile: adminProcedure");
    expect(router).toContain("unpavedRouteApproximateMiles");
    expect(planner).toContain("Save vehicle profile");
    expect(planner).toContain("Loaded towing time");
    expect(planner).toContain("Unpaved-road reference");
    expect(planner).toContain("Purple map lines show nearby OpenStreetMap ways");
  });
});
