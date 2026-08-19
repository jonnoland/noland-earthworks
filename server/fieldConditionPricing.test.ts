import { describe, expect, it } from "vitest";
import { applyFieldConditionPriceAdjustment, getFieldConditionAdjustment } from "../shared/fieldConditionPricing";

describe("automatic field-condition pricing", () => {
  const settings = {
    densityModerateMultiplier: "1.35",
    densityHeavyMultiplier: "1.75",
    terrainRollingMultiplier: "1.20",
    terrainSteepMultiplier: "1.45",
    accessModerateMultiplier: "1.15",
    accessDifficultMultiplier: "1.30",
  };

  it("uses the editable Operations multipliers for selected heavy, steep, difficult work", () => {
    const adjustment = getFieldConditionAdjustment({
      vegetationDensity: "heavy",
      terrain: "steep",
      accessDifficulty: "difficult",
    }, settings);

    expect(adjustment.vegetationMultiplier).toBe(1.75);
    expect(adjustment.terrainMultiplier).toBe(1.45);
    expect(adjustment.accessMultiplier).toBe(1.3);
    expect(adjustment.combinedMultiplier).toBeGreaterThan(3);
  });

  it("rounds the automatic adjusted quote range to whole dollars and preserves the base range", () => {
    const adjustment = getFieldConditionAdjustment({
      vegetationDensity: "moderate",
      terrain: "rolling",
      accessDifficulty: "moderate",
    }, settings);
    const adjusted = applyFieldConditionPriceAdjustment(1000, 1400, adjustment);

    expect(adjusted.customerPriceLow).toBe(1863);
    expect(adjusted.customerPriceHigh).toBe(2608);
    expect(adjusted.detail.baseCustomerPriceLow).toBe(1000);
    expect(adjusted.detail.baseCustomerPriceHigh).toBe(1400);
  });
});
