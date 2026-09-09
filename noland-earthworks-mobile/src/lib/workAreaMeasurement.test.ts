import { describe, expect, it } from "vitest";
import { calculatePolygonAreaAcres, calculatePolygonAreaSquareFeet } from "@/components/WorkAreaMeasureMap";

describe("work-area polygon measurement", () => {
  it("returns zero until a usable polygon has at least three points", () => {
    expect(calculatePolygonAreaSquareFeet([])).toBe(0);
    expect(calculatePolygonAreaAcres([{ lat: 36, lng: -87 }, { lat: 36.001, lng: -87 }])).toBe(0);
  });

  it("calculates a small drawn work area in acres", () => {
    const points = [
      { lat: 36, lng: -87 },
      { lat: 36, lng: -86.999295 },
      { lat: 36.00057, lng: -86.999295 },
      { lat: 36.00057, lng: -87 },
    ];

    expect(calculatePolygonAreaSquareFeet(points)).toBeGreaterThan(43_000);
    expect(calculatePolygonAreaSquareFeet(points)).toBeLessThan(44_200);
    expect(calculatePolygonAreaAcres(points)).toBeCloseTo(1, 1);
  });

  it("rejects invalid coordinate values rather than calculating a false area", () => {
    expect(calculatePolygonAreaAcres([
      { lat: 36, lng: -87 },
      { lat: Number.NaN, lng: -86.99 },
      { lat: 36.01, lng: -87 },
    ])).toBe(0);
  });
});
