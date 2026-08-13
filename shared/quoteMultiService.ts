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
