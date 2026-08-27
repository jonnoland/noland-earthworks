import {
  calculateOperationsQuotePricing,
  type OperationsQuotePricingSettings,
} from "./operationsQuotePricing";

export type FieldPricingSnapshot = {
  pricingSettings: OperationsQuotePricingSettings;
  trailUnitRateCents: number | null;
  fenceLineUnitRateCents: number | null;
  lastSyncedAt: string;
};

export type CachedFieldEstimateInput = {
  service: string;
  acreage?: number;
  linearFeet?: number;
  quantitySource?: "measured" | "acreage_estimate";
  sourceAcreage?: number;
  clearingWidthFeet?: number;
  terrain: "flat" | "rolling" | "steep" | "very_steep";
  vegetationDensity: "light" | "moderate" | "heavy" | "very_heavy";
  accessDifficulty: "easy" | "moderate" | "difficult";
};

export type CachedFieldEstimate = {
  customerPriceLow: number;
  customerPriceHigh: number;
  linearFootEstimate: {
    linearFeet: number;
    sourceAcreage: number | null;
    clearingWidthFeet: number | null;
    requiresSiteVerification: boolean;
  } | null;
  fieldConditionAdjustment: {
    vegetationMultiplier: number;
    terrainMultiplier: number;
    accessMultiplier: number;
    combinedMultiplier: number;
    baseCustomerPriceLow: number;
    baseCustomerPriceHigh: number;
    labels: { vegetation: string; terrain: string; access: string };
  };
  minimumJobTotal: number;
};

/** Uses only a previously saved live Operations snapshot; it never supplies hard-coded field rates. */
export function calculateCachedFieldEstimate(
  input: CachedFieldEstimateInput,
  snapshot: FieldPricingSnapshot,
): CachedFieldEstimate {
  const isFenceLine = input.service === "Fence Line Clearing";
  const pricing = calculateOperationsQuotePricing({
    serviceType: input.service,
    acreage: input.quantitySource === "acreage_estimate" ? input.sourceAcreage ?? input.acreage : input.acreage,
    linearFeet: input.quantitySource === "acreage_estimate" ? undefined : input.linearFeet,
    clearingWidthFeet: input.quantitySource === "acreage_estimate" ? input.clearingWidthFeet : undefined,
    unitRateCents: isFenceLine ? snapshot.fenceLineUnitRateCents ?? undefined : snapshot.trailUnitRateCents ?? undefined,
    density: input.vegetationDensity,
    terrain: input.terrain,
    access: input.accessDifficulty,
  }, snapshot.pricingSettings);

  return {
    customerPriceLow: pricing.customerPriceLow,
    customerPriceHigh: pricing.customerPriceHigh,
    linearFootEstimate: pricing.quantitySource === "acreage_estimate" && pricing.linearFeet
      ? {
          linearFeet: pricing.linearFeet,
          sourceAcreage: pricing.sourceAcreage,
          clearingWidthFeet: pricing.clearingWidthFeet,
          requiresSiteVerification: true,
        }
      : null,
    fieldConditionAdjustment: {
      vegetationMultiplier: pricing.densityMultiplier,
      terrainMultiplier: pricing.terrainMultiplier,
      accessMultiplier: pricing.accessMultiplier,
      combinedMultiplier: pricing.combinedMultiplier,
      baseCustomerPriceLow: pricing.baseQuoteLow,
      baseCustomerPriceHigh: pricing.baseQuoteHigh,
      labels: {
        vegetation: input.vegetationDensity.replaceAll("_", " "),
        terrain: input.terrain.replaceAll("_", " "),
        access: input.accessDifficulty,
      },
    },
    minimumJobTotal: pricing.minimumJobTotal,
  };
}
