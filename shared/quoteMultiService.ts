export const QUOTE_SERVICE_OPTIONS = [
  { value: "forestry-mulching", label: "Forestry Mulching" },
  { value: "land-management", label: "Land Management" },
  { value: "vegetation-management", label: "Vegetation Management" },
  { value: "right-of-way-clearing", label: "Right-of-Way Clearing" },
  { value: "property-maintenance", label: "Brush Hogging" },
  { value: "trail-cutting", label: "Trail Cutting" },
] as const;

export type QuoteServiceValue = (typeof QUOTE_SERVICE_OPTIONS)[number]["value"];

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
