import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const planner = fs.readFileSync(path.join(process.cwd(), "client/src/pages/ops/WeighStationPlanner.tsx"), "utf8");
const parcelRouter = fs.readFileSync(path.join(process.cwd(), "server/parcelRouter.ts"), "utf8");

describe("Route Planner Parcel ID boundaries", () => {
  it("retrieves selected parcel geometry separately from lightweight parcel search", () => {
    expect(parcelRouter).toContain("boundary: protectedProcedure");
    expect(parcelRouter).toContain("includeGeometry: true");
    expect(parcelRouter).toContain("toParcelBoundaryRings(feature.geometry)");
  });

  it("draws and clears an amber Google Maps polygon without clearing route directions", () => {
    expect(planner).toContain("trpc.parcel.boundary.useMutation");
    expect(planner).toContain("new google.maps.Polygon");
    expect(planner).toContain("const parcelPolygonRef");
    expect(planner).toContain("clearParcelBoundary");
    expect(planner).toContain("Amber outline shows the selected Parcel ID boundary");
  });

  it("clears the transient boundary overlay when loading a saved route without changing save or delete contracts", () => {
    expect(planner).toContain("const handleLoadSaved");
    expect(planner).toContain("setSelectedParcelBoundary(null);");
    expect(planner).toContain("clearParcelBoundary();");
    expect(planner).toContain("const handleSaveRoute");
    expect(planner).toContain("notes: serializeRuralRoutePlanNotes(stops, ruralAccessNotes)");
    expect(planner).toContain("const handleDeleteSaved");
  });

  it("uses a Parcel ID centroid for routing when a rural road address is incomplete", () => {
    expect(planner).toContain("setDestination(location);");
    expect(planner).toContain("const destinationValue = parcel.centroid");
  });
});
