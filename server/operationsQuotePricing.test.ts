import { describe, expect, it } from "vitest";
import { calculateOperationsQuotePricing } from "../shared/operationsQuotePricing";

const currentOperationsSettings = {
  forestryMulchingBaseRate: 2800,
  landClearingBaseRate: 2800,
  brushHoggingBaseRate: 135,
  rowClearingBaseRate: 2400,
  trailCuttingBaseRate: 2600,
  fenceLineClearingPerLf: 4,
  densityModerateMultiplier: "1.25",
  densityHeavyMultiplier: "1.60",
  terrainRollingMultiplier: "1.15",
  terrainSteepMultiplier: "1.40",
  accessModerateMultiplier: "1.10",
  accessDifficultMultiplier: "1.25",
  minimumJobTotal: 1200,
};

describe("Operations quote pricing calculator", () => {
  it("uses the live Forestry Mulching base rate and minimum for field-compatible acreage pricing", () => {
    const result = calculateOperationsQuotePricing({
      serviceType: "Forestry Mulching",
      acreage: 2,
      density: "moderate",
      terrain: "flat",
      access: "easy",
    }, currentOperationsSettings);

    expect(result.customerPriceLow).toBe(5600);
    expect(result.customerPriceHigh).toBe(7000);
    expect(result.minimumJobTotal).toBe(1200);
    expect(result.combinedMultiplier).toBe(1.25);
  });

  it("uses the approved Linear Foot rate, live minimum, and acreage conversion for corridor work", () => {
    const result = calculateOperationsQuotePricing({
      serviceType: "Fence Line Clearing",
      acreage: 3,
      clearingWidthFeet: 20,
      density: "light",
      terrain: "flat",
      access: "easy",
      unitRateCents: 400,
    }, currentOperationsSettings);

    expect(result.quantitySource).toBe("acreage_estimate");
    expect(result.linearFeet).toBe(6534);
    expect(result.customerPriceLow).toBe(26136);
    expect(result.customerPriceHigh).toBe(26136);
    expect(result.minimumJobTotal).toBe(1200);
  });

  it("preserves whole-dollar totals after conditions and the configured minimum are applied", () => {
    const result = calculateOperationsQuotePricing({
      serviceType: "Trail Cutting",
      linearFeet: 100,
      density: "heavy",
      terrain: "steep",
      access: "difficult",
      unitRateCents: 400,
    }, currentOperationsSettings);

    expect(result.customerPriceMid).toBe(Math.ceil(result.customerPriceMid));
    expect(result.customerPriceMid).toBeGreaterThanOrEqual(1200);
    expect(result.combinedMultiplier).toBeCloseTo(2.8, 5);
  });

  it("maps very-heavy vegetation to the same supported heavy pricing tier used by Operations AI Suggest", () => {
    const heavy = calculateOperationsQuotePricing({
      serviceType: "Land Management",
      acreage: 1,
      density: "heavy",
      terrain: "flat",
      access: "easy",
    }, currentOperationsSettings);
    const veryHeavy = calculateOperationsQuotePricing({
      serviceType: "Land Management",
      acreage: 1,
      density: "very_heavy",
      terrain: "flat",
      access: "easy",
    }, currentOperationsSettings);

    expect(veryHeavy.customerPriceLow).toBe(heavy.customerPriceLow);
    expect(veryHeavy.customerPriceHigh).toBe(heavy.customerPriceHigh);
  });
});
