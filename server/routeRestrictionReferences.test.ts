import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Route restriction reference alerts", () => {
  it("queries mapped weight and clearance tags and returns them with a planned route", () => {
    const dataLayer = readFileSync(resolve(import.meta.dirname, "weighStationData.ts"), "utf8");
    const router = readFileSync(resolve(import.meta.dirname, "routePlannerRouter.ts"), "utf8");

    expect(dataLayer).toContain('way["highway"]["maxheight"]');
    expect(dataLayer).toContain('way["highway"]["maxweight"]');
    expect(dataLayer).toContain('way["highway"]["maxweightrating"]');
    expect(dataLayer).toContain('way["highway"]["maxaxleload"]');
    expect(dataLayer).toContain("fetchRouteRestrictionsForRoute");
    expect(router).toContain("routeRestrictions: restrictionReference.restrictions");
  });

  it("shows red map markers and an explicit verify-before-hauling warning", () => {
    const planner = readFileSync(resolve(import.meta.dirname, "../client/src/pages/ops/WeighStationPlanner.tsx"), "utf8");

    expect(planner).toContain("restrictionMarkersRef");
    expect(planner).toContain("fillColor: \"#DC2626\"");
    expect(planner).toContain("mapped route restriction");
    expect(planner).toContain("A missing alert does not mean the route is clear");
  });
});
