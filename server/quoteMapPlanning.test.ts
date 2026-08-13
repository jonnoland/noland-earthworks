import { describe, expect, it } from "vitest";
import { combineMapDrawingMeasurements, estimateProjectTimeline, metersToLinearFeet, squareMetersToAcres } from "../shared/quoteMapPlanning";

describe("quote map planning", () => {
  it("converts completed map drawings into usable quote measurements", () => {
    expect(squareMetersToAcres(4046.8564224)).toBeCloseTo(1, 6);
    expect(metersToLinearFeet(100)).toBeCloseTo(328.084, 3);
    expect(squareMetersToAcres(0)).toBeNull();
    expect(metersToLinearFeet(Number.NaN)).toBeNull();
  });

  it("combines separate map areas and paths while ignoring invalid drawing values", () => {
    expect(combineMapDrawingMeasurements([
      { type: "area", value: 1.25 },
      { type: "area", value: 0.75 },
      { type: "path", value: 840 },
      { type: "path", value: 1160 },
      { type: "path", value: 0 },
    ])).toEqual({ totalAcres: 2, totalLinearFeet: 2000, areaCount: 2, pathCount: 2 });
  });

  it("recalculates remaining totals after an individual map drawing is removed", () => {
    const drawings = [
      { id: 1, type: "area" as const, value: 1.5 },
      { id: 2, type: "area" as const, value: 0.5 },
      { id: 3, type: "path" as const, value: 1200 },
      { id: 4, type: "path" as const, value: 800 },
    ];
    expect(combineMapDrawingMeasurements(drawings.filter((drawing) => drawing.id !== 2 && drawing.id !== 3)))
      .toEqual({ totalAcres: 1.5, totalLinearFeet: 800, areaCount: 1, pathCount: 1 });
  });

  it("extends preliminary project time for terrain and linear-footage work", () => {
    const level = estimateProjectTimeline({ acres: 1, totalLinearFeet: 0, terrain: "level" });
    const steep = estimateProjectTimeline({ acres: 1, totalLinearFeet: 6000, terrain: "steep" });
    expect(level.duration).toBe("1 working day");
    expect(steep.duration).toBe("2–4 working days");
    expect(steep.detail).toContain("6,000 linear feet");
    expect(steep.detail).toContain("steep, wet, or rocky terrain");
  });
});
