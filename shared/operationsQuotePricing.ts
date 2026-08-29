import { calculateLinearFeetFromAcreage } from "../shared/quoteLineItemMeasurements";

export type OperationsQuotePricingSettings = {
  forestryMulchingBaseRate?: number | string | null;
  landClearingBaseRate?: number | string | null;
  brushHoggingBaseRate?: number | string | null;
  rowClearingBaseRate?: number | string | null;
  trailCuttingBaseRate?: number | string | null;
  fenceLineClearingPerLf?: number | string | null;
  densityModerateMultiplier?: number | string | null;
  densityHeavyMultiplier?: number | string | null;
  terrainRollingMultiplier?: number | string | null;
  terrainSteepMultiplier?: number | string | null;
  accessModerateMultiplier?: number | string | null;
  accessDifficultMultiplier?: number | string | null;
  minimumJobTotal?: number | string | null;
};

export type OperationsQuotePricingInput = {
  serviceType: string;
  acreage?: number;
  linearFeet?: number;
  clearingWidthFeet?: number;
  unitRateCents?: number;
  density?: string;
  terrain?: string;
  access?: string;
};

export type OperationsQuotePricingResult = {
  normalizedServiceKey: string;
  isLinearFootService: boolean;
  quantitySource: "measured" | "acreage_estimate" | "acreage";
  acreage: number | null;
  linearFeet: number | null;
  sourceAcreage: number | null;
  clearingWidthFeet: number | null;
  baseRateLow: number;
  baseRateHigh: number;
  baseRateMid: number;
  densityMultiplier: number;
  terrainMultiplier: number;
  accessMultiplier: number;
  combinedMultiplier: number;
  baseQuoteLow: number;
  baseQuoteHigh: number;
  customerPriceLow: number;
  customerPriceHigh: number;
  customerPriceMid: number;
  minimumJobTotal: number;
  minimumAdjustment: number;
};

function numberSetting(value: number | string | null | undefined, fallback: number): number {
  const parsed = typeof value === "number" ? value : Number.parseFloat(value ?? "");
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function operationsQuoteServiceKey(serviceType: string): string {
  const clean = serviceType.trim().toLowerCase();
  if (clean === "forestry mulching") return "forestry-mulching";
  if (clean === "land management" || clean === "land clearing") return "land-management";
  if (clean === "brush hogging" || clean === "property maintenance") return "brush-hogging";
  if (clean === "right-of-way clearing" || clean === "right of way clearing") return "right-of-way-clearing";
  if (clean === "trail cutting") return "trail-cutting";
  if (clean === "fence line clearing" || clean === "fence-line clearing") return "fence-line-clearing";
  return clean.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function isOperationsLinearFootService(serviceType: string): boolean {
  const serviceKey = operationsQuoteServiceKey(serviceType);
  return serviceKey === "trail-cutting" || serviceKey === "fence-line-clearing" || serviceKey === "right-of-way-clearing";
}

/**
 * Calculates quote dollars from the same saved Operations rate settings used by
 * the web quote builder. The model can still draft scope notes and duration,
 * but it must not determine quote dollars.
 */
export function calculateOperationsQuotePricing(
  input: OperationsQuotePricingInput,
  settings: OperationsQuotePricingSettings = {},
): OperationsQuotePricingResult {
  const fmBase = numberSetting(settings.forestryMulchingBaseRate, 800);
  const lmBase = numberSetting(settings.landClearingBaseRate, 700);
  const bhBase = numberSetting(settings.brushHoggingBaseRate, 150);
  const rowBase = numberSetting(settings.rowClearingBaseRate, 6);
  const trailBase = numberSetting(settings.trailCuttingBaseRate, 2000);
  const fenceBase = numberSetting(settings.fenceLineClearingPerLf, 4);
  const densityModerate = numberSetting(settings.densityModerateMultiplier, 1.25);
  const densityHeavy = numberSetting(settings.densityHeavyMultiplier, 1.6);
  const terrainRolling = numberSetting(settings.terrainRollingMultiplier, 1.15);
  const terrainSteep = numberSetting(settings.terrainSteepMultiplier, 1.35);
  const accessModerate = numberSetting(settings.accessModerateMultiplier, 1.1);
  const accessDifficult = numberSetting(settings.accessDifficultMultiplier, 1.25);
  const minimumJobTotal = numberSetting(settings.minimumJobTotal, 1800);

  const normalizedServiceKey = operationsQuoteServiceKey(input.serviceType);
  const isLinearFootService = isOperationsLinearFootService(input.serviceType);
  const densityMultiplier = input.density === "very_heavy"
    ? densityHeavy * 1.15
    : input.density === "heavy"
      ? densityHeavy
      : input.density === "moderate"
        ? densityModerate
        : 1;
  const terrainMultiplier = input.terrain === "very_steep"
    ? terrainSteep * 1.15
    : input.terrain === "steep"
      ? terrainSteep
      : input.terrain === "rolling"
        ? terrainRolling
        : 1;
  const accessMultiplier = input.access === "difficult" ? accessDifficult : input.access === "moderate" ? accessModerate : 1;
  const combinedMultiplier = densityMultiplier * terrainMultiplier * accessMultiplier;

  if (isLinearFootService) {
    const derivedFeet = calculateLinearFeetFromAcreage(input.acreage ?? Number.NaN, input.clearingWidthFeet ?? Number.NaN);
    const usesAcreageEstimate = !input.linearFeet && derivedFeet !== null;
    const linearFeet = Math.max(1, Math.round(input.linearFeet ?? derivedFeet ?? 0));
    const baseRateMid = input.unitRateCents && input.unitRateCents > 0
      ? input.unitRateCents / 100
      : normalizedServiceKey === "fence-line-clearing"
        ? fenceBase
        : Math.max(1, Math.round((trailBase * 10) / 43560));
    const adjustedRate = Math.max(1, Math.ceil(baseRateMid * combinedMultiplier));
    const rawTotal = Math.ceil(linearFeet * adjustedRate);
    const minimumAdjustment = Math.max(0, minimumJobTotal - rawTotal);
    const customerPrice = rawTotal + minimumAdjustment;

    return {
      normalizedServiceKey,
      isLinearFootService,
      quantitySource: usesAcreageEstimate ? "acreage_estimate" : "measured",
      acreage: null,
      linearFeet,
      sourceAcreage: usesAcreageEstimate ? input.acreage ?? null : null,
      clearingWidthFeet: usesAcreageEstimate ? input.clearingWidthFeet ?? null : null,
      baseRateLow: baseRateMid,
      baseRateHigh: baseRateMid,
      baseRateMid: adjustedRate,
      densityMultiplier,
      terrainMultiplier,
      accessMultiplier,
      combinedMultiplier,
      baseQuoteLow: Math.ceil(linearFeet * baseRateMid),
      baseQuoteHigh: Math.ceil(linearFeet * baseRateMid),
      customerPriceLow: customerPrice,
      customerPriceHigh: customerPrice,
      customerPriceMid: customerPrice,
      minimumJobTotal,
      minimumAdjustment,
    };
  }

  const acreage = Math.max(0.1, input.acreage ?? 0.1);
  const baseRateRange: Record<string, [number, number]> = {
    "forestry-mulching": input.density === "light"
      ? [Math.round(fmBase * 0.75), Math.round(fmBase)]
      : input.density === "moderate"
        ? [Math.round(fmBase), Math.round(fmBase * densityModerate)]
        : [Math.round(fmBase * densityModerate), Math.round(fmBase * densityHeavy * 1.5)],
    "land-management": input.density === "light"
      ? [Math.round(lmBase * 0.75), Math.round(lmBase)]
      : input.density === "moderate"
        ? [Math.round(lmBase), Math.round(lmBase * densityModerate)]
        : [Math.round(lmBase * densityModerate), Math.round(lmBase * densityHeavy * 2)],
    "brush-hogging": input.density === "light"
      ? [Math.round(bhBase * 0.75), Math.round(bhBase)]
      : input.density === "moderate"
        ? [Math.round(bhBase), Math.round(bhBase * densityModerate)]
        : [Math.round(bhBase * densityModerate), Math.round(bhBase * densityHeavy)],
    "right-of-way-clearing": input.density === "light"
      ? [Math.round(rowBase * 1320 * 0.75), Math.round(rowBase * 1320)]
      : input.density === "moderate"
        ? [Math.round(rowBase * 1320), Math.round(rowBase * 1320 * densityModerate)]
        : [Math.round(rowBase * 1320 * densityModerate), Math.round(rowBase * 1320 * densityHeavy * 1.5)],
  };
  const [baseRateLow, baseRateHigh] = baseRateRange[normalizedServiceKey] ?? [700, 1200];
  const adjustedRateLow = Math.ceil(baseRateLow * terrainMultiplier * accessMultiplier);
  const adjustedRateHigh = Math.ceil(baseRateHigh * terrainMultiplier * accessMultiplier);
  const baseQuoteLow = Math.ceil(baseRateLow * acreage);
  const baseQuoteHigh = Math.ceil(baseRateHigh * acreage);
  const customerPriceLow = Math.max(Math.ceil(adjustedRateLow * acreage), minimumJobTotal);
  const customerPriceHigh = Math.max(Math.ceil(adjustedRateHigh * acreage), minimumJobTotal);
  const customerPriceMid = Math.max(Math.ceil(((adjustedRateLow + adjustedRateHigh) / 2) * acreage), minimumJobTotal);

  return {
    normalizedServiceKey,
    isLinearFootService,
    quantitySource: "acreage",
    acreage,
    linearFeet: null,
    sourceAcreage: null,
    clearingWidthFeet: null,
    baseRateLow,
    baseRateHigh,
    baseRateMid: Math.round((adjustedRateLow + adjustedRateHigh) / 2),
    densityMultiplier,
    terrainMultiplier,
    accessMultiplier,
    combinedMultiplier,
    baseQuoteLow,
    baseQuoteHigh,
    customerPriceLow,
    customerPriceHigh,
    customerPriceMid,
    minimumJobTotal,
    minimumAdjustment: Math.max(0, minimumJobTotal - Math.ceil(((adjustedRateLow + adjustedRateHigh) / 2) * acreage)),
  };
}
