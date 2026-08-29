export type QuoteRentalEquipment = {
  equipmentName: string;
  dealerLocation?: string;
  rentalDays?: number;
  rentalCostCents: number;
  transportCostCents: number;
  taxCostCents: number;
  quoteReference?: string;
  notes?: string;
};

export type QuoteEvidenceAttachment = {
  key: string;
  url: string;
  filename: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  sizeBytes: number;
};

export type QuoteInsuranceDocument = {
  key: string;
  url: string;
  filename: string;
  mimeType: "application/pdf" | "image/jpeg" | "image/png";
  sizeBytes: number;
};

export type QuoteInsuranceLibraryDocument = QuoteInsuranceDocument & {
  id: number;
  label: string;
  expiresAt?: string | null;
};

export type QuoteCostFlagCategory = "labor" | "fuel" | "mobilization" | "machine_wear" | "access" | "scope";

export type QuoteCostFlag = {
  category: QuoteCostFlagCategory;
  reason: string;
};

export type QuoteMeasurement = {
  label: string;
  value: string;
  unit: string;
  notes?: string;
};

export function getQuoteRentalCostCents(items: QuoteRentalEquipment[] | null | undefined): number {
  return (items ?? []).reduce((total, item) => {
    return total
      + Math.max(0, Math.round(item.rentalCostCents || 0))
      + Math.max(0, Math.round(item.transportCostCents || 0))
      + Math.max(0, Math.round(item.taxCostCents || 0));
  }, 0);
}

/**
 * A conservative internal screening metric only. It excludes labor, fuel,
 * machine wear, overhead, and every other job cost from actual profit.
 */
export function getQuoteRentalOnlyMargin(totalCents: number, rentalCostCents: number): {
  rentalOnlyProfitCents: number;
  rentalOnlyMarginPct: number | null;
} {
  const rentalOnlyProfitCents = totalCents - rentalCostCents;
  const rentalOnlyMarginPct = totalCents > 0 && rentalCostCents > 0
    ? Math.round((rentalOnlyProfitCents / totalCents) * 1000) / 10
    : null;
  return { rentalOnlyProfitCents, rentalOnlyMarginPct };
}

/** Cues apply only to the rental-only metric; they never describe full job profitability. */
export function getQuoteRentalOnlyMarginStatus(rentalOnlyMarginPct: number | null): {
  tone: "neutral" | "red" | "amber" | "green";
  label: "Add rental cost" | "Thin rental-only margin" | "Review rental-only margin" | "Healthy rental-only margin";
} {
  if (rentalOnlyMarginPct === null) return { tone: "neutral", label: "Add rental cost" };
  if (rentalOnlyMarginPct < 25) return { tone: "red", label: "Thin rental-only margin" };
  if (rentalOnlyMarginPct < 40) return { tone: "amber", label: "Review rental-only margin" };
  return { tone: "green", label: "Healthy rental-only margin" };
}

export function parseQuoteSupportArtifacts<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
