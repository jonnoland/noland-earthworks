import { describe, expect, it } from "vitest";
import { calculateCachedFieldEstimate, type FieldPricingSnapshot } from "../shared/fieldOfflinePricing";
import { calculateOperationsQuotePricing } from "../shared/operationsQuotePricing";

const snapshot: FieldPricingSnapshot = {
  pricingSettings: {
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
  },
  trailUnitRateCents: 350,
  fenceLineUnitRateCents: 425,
  lastSyncedAt: "2026-08-27T12:00:00.000Z",
};

describe("Noland Field cached Operations pricing", () => {
  it("returns the exact live Operations total for acreage-based Forestry Mulching", () => {
    const input = {
      service: "Forestry Mulching",
      acreage: 2,
      terrain: "rolling" as const,
      vegetationDensity: "moderate" as const,
      accessDifficulty: "moderate" as const,
    };
    const cached = calculateCachedFieldEstimate(input, snapshot);
    const live = calculateOperationsQuotePricing({
      serviceType: input.service,
      acreage: input.acreage,
      density: input.vegetationDensity,
      terrain: input.terrain,
      access: input.accessDifficulty,
    }, snapshot.pricingSettings);

    expect(cached.customerPriceLow).toBe(live.customerPriceLow);
    expect(cached.customerPriceHigh).toBe(live.customerPriceHigh);
    expect(cached.customerPriceMid).toBe(live.customerPriceMid);
    expect(cached.minimumJobTotal).toBe(live.minimumJobTotal);
  });

  it("updates the work-area total from the same saved Operations acreage rates", () => {
    const twoAcreWorkArea = calculateCachedFieldEstimate({
      service: "Forestry Mulching",
      acreage: 2,
      terrain: "flat",
      vegetationDensity: "moderate",
      accessDifficulty: "easy",
    }, snapshot);
    const fiveAcreWorkArea = calculateCachedFieldEstimate({
      service: "Forestry Mulching",
      acreage: 5,
      terrain: "flat",
      vegetationDensity: "moderate",
      accessDifficulty: "easy",
    }, snapshot);

    expect(twoAcreWorkArea.customerPriceMid).toBe(6300);
    expect(fiveAcreWorkArea.customerPriceMid).toBe(15750);
    expect(fiveAcreWorkArea.customerPriceMid).toBeGreaterThan(twoAcreWorkArea.customerPriceMid);
  });

  it("matches live Operations Linear Foot pricing when Fence Line footage is derived from acreage", () => {
    const cached = calculateCachedFieldEstimate({
      service: "Fence Line Clearing",
      quantitySource: "acreage_estimate",
      sourceAcreage: 3,
      clearingWidthFeet: 20,
      terrain: "flat",
      vegetationDensity: "light",
      accessDifficulty: "easy",
    }, snapshot);
    const live = calculateOperationsQuotePricing({
      serviceType: "Fence Line Clearing",
      acreage: 3,
      clearingWidthFeet: 20,
      unitRateCents: snapshot.fenceLineUnitRateCents ?? undefined,
      density: "light",
      terrain: "flat",
      access: "easy",
    }, snapshot.pricingSettings);

    expect(cached.customerPriceLow).toBe(live.customerPriceLow);
    expect(cached.linearFootEstimate).toMatchObject({ linearFeet: 6534, requiresSiteVerification: true });
  });
});
