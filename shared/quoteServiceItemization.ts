export type ServiceEstimateBreakdown = {
  service: string;
  label: string;
  lowCents: number;
  highCents: number;
  measurement: string;
  calculation: string;
};

export type ItemizedQuoteLine = {
  description: string;
  qty: number;
  unitPriceCents: number;
  totalCents: number;
};

export function parseStoredServiceBreakdown(raw: string | null | undefined): ServiceEstimateBreakdown[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const candidate = item as Partial<ServiceEstimateBreakdown>;
      if (
        typeof candidate.service !== "string" ||
        typeof candidate.label !== "string" ||
        typeof candidate.lowCents !== "number" ||
        typeof candidate.highCents !== "number"
      ) return [];
      return [{
        service: candidate.service,
        label: candidate.label,
        lowCents: candidate.lowCents,
        highCents: candidate.highCents,
        measurement: typeof candidate.measurement === "string" ? candidate.measurement : "",
        calculation: typeof candidate.calculation === "string" ? candidate.calculation : "",
      }];
    });
  } catch {
    return [];
  }
}

export function parseStoredRangeRiskFactors(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((factor): factor is string => typeof factor === "string")
      : [];
  } catch {
    return [];
  }
}

export function parsePreliminaryRangeToCents(range: string): Pick<ServiceEstimateBreakdown, "lowCents" | "highCents"> | null {
  const values = range.replace(/[$,]/g, "").match(/\d+(?:\.\d+)?/g);
  if (!values || values.length < 2) return null;
  const low = Number(values[0]);
  const high = Number(values[1]);
  if (!Number.isFinite(low) || !Number.isFinite(high) || low < 0 || high < low) return null;
  return { lowCents: Math.round(low * 100), highCents: Math.round(high * 100) };
}

export function midpointCents(item: ServiceEstimateBreakdown): number {
  return Math.round((item.lowCents + item.highCents) / 2);
}

export function buildItemizedQuoteLines(items: ServiceEstimateBreakdown[]): ItemizedQuoteLine[] {
  return items.map((item) => {
    const midpoint = midpointCents(item);
    const measurement = item.measurement ? ` — ${item.measurement}` : "";
    return {
      description: `${item.label}${measurement} — preliminary estimate pending site visit`,
      qty: 1,
      unitPriceCents: midpoint,
      totalCents: midpoint,
    };
  });
}

export function totalItemizedCents(items: ServiceEstimateBreakdown[]): number {
  return items.reduce((total, item) => total + midpointCents(item), 0);
}
