export const QUOTE_SERVICE_OPTIONS = [
  { value: "forestry-mulching", label: "Forestry Mulching" },
  { value: "land-management", label: "Land Management" },
  { value: "vegetation-management", label: "Vegetation Management" },
  { value: "right-of-way-clearing", label: "Right-of-Way Clearing" },
  { value: "property-maintenance", label: "Brush Hogging" },
  { value: "trail-cutting", label: "Trail Cutting" },
] as const;

export type QuoteServiceValue = (typeof QUOTE_SERVICE_OPTIONS)[number]["value"];

export type QuoteLengthUnit = "feet" | "miles";

export const QUOTE_TERRAIN_OPTIONS = [
  { value: "level", label: "Level / Easy Access", multiplier: 1 },
  { value: "rolling", label: "Rolling / Uneven", multiplier: 1.1 },
  { value: "steep", label: "Steep / Wet / Rocky", multiplier: 1.25 },
] as const;

export type QuoteTerrainDifficulty = (typeof QUOTE_TERRAIN_OPTIONS)[number]["value"];

export function quoteTerrainMultiplier(terrain: QuoteTerrainDifficulty | string | undefined): number {
  return QUOTE_TERRAIN_OPTIONS.find((option) => option.value === terrain)?.multiplier ?? 1;
}

export function quoteTerrainLabel(terrain: QuoteTerrainDifficulty | string | undefined): string {
  return QUOTE_TERRAIN_OPTIONS.find((option) => option.value === terrain)?.label ?? "Level / Easy Access";
}

export type QuoteServiceRecommendation = {
  service: QuoteServiceValue;
  reason: string;
};

export function getRecommendedQuoteServices(
  selectedServices: QuoteServiceValue[],
  acreage: number,
  terrain: QuoteTerrainDifficulty | string | undefined,
): QuoteServiceRecommendation[] {
  const recommendations: QuoteServiceRecommendation[] = [];
  const add = (service: QuoteServiceValue, reason: string) => {
    if (!selectedServices.includes(service) && !recommendations.some((item) => item.service === service)) {
      recommendations.push({ service, reason });
    }
  };

  if (terrain === "rolling" || terrain === "steep") {
    add("forestry-mulching", "Tracked forestry mulching is a strong fit for uneven ground, slopes, and soft conditions.");
  }
  if (terrain === "steep") {
    add("trail-cutting", "A defined trail can improve access and give the machine a safer route across difficult ground.");
  }
  if (acreage >= 5) {
    add("vegetation-management", "Larger properties often benefit from a follow-up vegetation plan to keep cleared areas usable.");
  }
  if (acreage >= 10) {
    add("right-of-way-clearing", "Larger acreage commonly includes access lanes, fence lines, or corridors that can be cleared in the same visit.");
  }
  if (acreage >= 1 && acreage <= 5 && terrain === "level") {
    add("property-maintenance", "After brush and saplings are addressed, brush hogging may help maintain open ground on a manageable acreage.");
  }

  return recommendations.slice(0, 3);
}

export const FEET_PER_MILE = 5280;

export function lengthToFeet(value: number, unit: QuoteLengthUnit): number | null {
  if (!Number.isFinite(value) || value < 0) return null;
  return unit === "miles" ? value * FEET_PER_MILE : value;
}

export function feetToLength(feet: number, unit: QuoteLengthUnit): number | null {
  if (!Number.isFinite(feet) || feet < 0) return null;
  return unit === "miles" ? feet / FEET_PER_MILE : feet;
}

export function updateQuoteServiceSelection(
  current: QuoteServiceValue[],
  toggled: QuoteServiceValue,
): QuoteServiceValue[] {
  if (current.includes(toggled)) return current.filter((service) => service !== toggled);
  return [...current, toggled];
}

export function quoteServiceLabel(service: string): string {
  return QUOTE_SERVICE_OPTIONS.find((option) => option.value === service)?.label ?? service;
}

export function combinePreliminaryRanges(ranges: string[]): string | null {
  const parsed = ranges.map((range) => {
    const match = range.match(/^\$([\d,]+)\s+–\s+\$([\d,]+)$/);
    if (!match) return null;
    return {
      low: Number(match[1].replace(/,/g, "")),
      high: Number(match[2].replace(/,/g, "")),
    };
  });

  if (parsed.some((range) => !range)) return null;
  const totals = parsed as { low: number; high: number }[];
  const low = totals.reduce((sum, range) => sum + range.low, 0);
  const high = totals.reduce((sum, range) => sum + range.high, 0);
  return `$${low.toLocaleString()} – $${high.toLocaleString()}`;
}
