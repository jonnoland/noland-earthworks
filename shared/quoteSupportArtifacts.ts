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

export function parseQuoteSupportArtifacts<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
