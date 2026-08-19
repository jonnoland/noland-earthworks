export type FieldConditionSelection = {
  vegetationDensity: "light" | "moderate" | "heavy" | "very_heavy";
  terrain: "flat" | "rolling" | "steep" | "very_steep";
  accessDifficulty: "easy" | "moderate" | "difficult";
};

export type FieldConditionPricingSource = {
  densityModerateMultiplier?: string | null;
  densityHeavyMultiplier?: string | null;
  terrainRollingMultiplier?: string | null;
  terrainSteepMultiplier?: string | null;
  accessModerateMultiplier?: string | null;
  accessDifficultMultiplier?: string | null;
};

export type FieldConditionAdjustment = {
  vegetationMultiplier: number;
  terrainMultiplier: number;
  accessMultiplier: number;
  combinedMultiplier: number;
  labels: {
    vegetation: string;
    terrain: string;
    access: string;
  };
};

export type AppliedFieldConditionAdjustment = FieldConditionAdjustment & {
  baseCustomerPriceLow: number;
  baseCustomerPriceHigh: number;
};

const asMultiplier = (value: string | null | undefined, fallback: number) => {
  const parsed = Number.parseFloat(value ?? "");
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export function getFieldConditionAdjustment(
  selection: FieldConditionSelection,
  settings: FieldConditionPricingSource = {},
): FieldConditionAdjustment {
  const moderateDensity = asMultiplier(settings.densityModerateMultiplier, 1.35);
  const heavyDensity = asMultiplier(settings.densityHeavyMultiplier, 1.75);
  const rollingTerrain = asMultiplier(settings.terrainRollingMultiplier, 1.2);
  const steepTerrain = asMultiplier(settings.terrainSteepMultiplier, 1.45);
  const moderateAccess = asMultiplier(settings.accessModerateMultiplier, 1.15);
  const difficultAccess = asMultiplier(settings.accessDifficultMultiplier, 1.3);

  const vegetationMultiplier = selection.vegetationDensity === "very_heavy"
    ? heavyDensity * 1.15
    : selection.vegetationDensity === "heavy"
      ? heavyDensity
      : selection.vegetationDensity === "moderate"
        ? moderateDensity
        : 1;
  const terrainMultiplier = selection.terrain === "very_steep"
    ? steepTerrain * 1.15
    : selection.terrain === "steep"
      ? steepTerrain
      : selection.terrain === "rolling"
        ? rollingTerrain
        : 1;
  const accessMultiplier = selection.accessDifficulty === "difficult"
    ? difficultAccess
    : selection.accessDifficulty === "moderate"
      ? moderateAccess
      : 1;

  return {
    vegetationMultiplier,
    terrainMultiplier,
    accessMultiplier,
    combinedMultiplier: vegetationMultiplier * terrainMultiplier * accessMultiplier,
    labels: {
      vegetation: selection.vegetationDensity.replaceAll("_", " "),
      terrain: selection.terrain.replaceAll("_", " "),
      access: selection.accessDifficulty,
    },
  };
}

export function applyFieldConditionPriceAdjustment(
  customerPriceLow: number,
  customerPriceHigh: number,
  adjustment: FieldConditionAdjustment,
): { customerPriceLow: number; customerPriceHigh: number; detail: AppliedFieldConditionAdjustment } {
  return {
    customerPriceLow: Math.round(customerPriceLow * adjustment.combinedMultiplier),
    customerPriceHigh: Math.round(customerPriceHigh * adjustment.combinedMultiplier),
    detail: {
      ...adjustment,
      baseCustomerPriceLow: Math.round(customerPriceLow),
      baseCustomerPriceHigh: Math.round(customerPriceHigh),
    },
  };
}
