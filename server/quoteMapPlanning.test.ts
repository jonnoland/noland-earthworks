import { describe, expect, it } from "vitest";
import { estimateProjectTimeline, metersToLinearFeet, squareMetersToAcres } from "../shared/quoteMapPlanning";

describe("quote map planning", () => {
  it("converts completed map drawings into usable quote measurements", () => {
    expect(squareMetersToAcres(4046.8564224)).toBeCloseTo(1, 6);
    expect(metersToLinearFeet(100)).toBeCloseTo(328.084, 3);
    expect(squareMetersToAcres(0)).toBeNull();
    expect(metersToLinearFeet(Number.NaN)).toBeNull();
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
