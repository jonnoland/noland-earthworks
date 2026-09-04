export type QuoteLineServiceCode =
  | "forestry-mulching"
  | "land-management"
  | "vegetation-management"
  | "right-of-way-clearing"
  | "brush-hogging"
  | "trail-cutting"
  | "fence-line-clearing"
  | "mobilization";

export type QuoteLineMeasurementUnit = "linear_foot";
export type QuoteLineQuantitySource = "measured" | "acreage_estimate";

export const LINEAR_FOOT_CLEARING_WIDTH_OPTIONS = [6, 8, 10, 12, 16, 20, 25, 30] as const;

export interface QuoteLineServiceOption {
  value: QuoteLineServiceCode;
  label: string;
  measurementUnit?: QuoteLineMeasurementUnit;
}

/**
 * Internal quote-editor catalog. Linear-foot work is deliberately explicit so
 * its quantity can never be mistaken for acreage or a generic count.
 */
export const QUOTE_LINE_SERVICE_OPTIONS: QuoteLineServiceOption[] = [
  { value: "forestry-mulching", label: "Forestry Mulching" },
  { value: "land-management", label: "Land Management" },
  { value: "vegetation-management", label: "Vegetation Management" },
  { value: "right-of-way-clearing", label: "Right-of-Way Clearing", measurementUnit: "linear_foot" },
  { value: "brush-hogging", label: "Brush Hogging" },
  { value: "trail-cutting", label: "Trail Cutting", measurementUnit: "linear_foot" },
  { value: "fence-line-clearing", label: "Fence Line Clearing", measurementUnit: "linear_foot" },
];

/**
 * Project services are kept separate from quote-item charges so Mobilization
 * can be added to a quote or phase without becoming the project’s main service.
 */
export const QUOTE_LINE_ITEM_SERVICE_OPTIONS: QuoteLineServiceOption[] = [
  ...QUOTE_LINE_SERVICE_OPTIONS,
  { value: "mobilization", label: "Mobilization" },
];

export interface MeasuredQuoteLineItem {
  description: string;
  qty: number;
  unitPriceCents: number;
  totalCents: number;
  serviceCode?: string;
  measurementUnit?: QuoteLineMeasurementUnit;
  quantitySource?: QuoteLineQuantitySource;
  sourceAcreage?: number;
  clearingWidthFeet?: number;
}

export function getQuoteLineServiceOption(value: string | undefined): QuoteLineServiceOption | undefined {
  return QUOTE_LINE_ITEM_SERVICE_OPTIONS.find((option) => option.value === value);
}

export function inferQuoteLineServiceOption(description: string | undefined): QuoteLineServiceOption | undefined {
  const normalized = description?.trim().toLocaleLowerCase();
  if (!normalized) return undefined;
  return QUOTE_LINE_ITEM_SERVICE_OPTIONS.find((option) => {
    const label = option.label.toLocaleLowerCase();
    return normalized === label || normalized.startsWith(`${label} `) || normalized.startsWith(`${label}—`);
  });
}

export function isLinearFootQuoteLine(item: Pick<MeasuredQuoteLineItem, "serviceCode" | "measurementUnit" | "description">): boolean {
  return item.measurementUnit === "linear_foot"
    || getQuoteLineServiceOption(item.serviceCode)?.measurementUnit === "linear_foot"
    || inferQuoteLineServiceOption(item.description)?.measurementUnit === "linear_foot";
}

export function quoteLineQuantityLabel(item: Pick<MeasuredQuoteLineItem, "serviceCode" | "measurementUnit" | "description">): string {
  return isLinearFootQuoteLine(item) ? "Linear feet" : "Quantity";
}

export function calculateLinearFeetFromAcreage(acreage: number, clearingWidthFeet: number): number | null {
  if (!Number.isFinite(acreage) || acreage <= 0 || !Number.isFinite(clearingWidthFeet) || clearingWidthFeet <= 0) return null;
  return Math.max(1, Math.round((acreage * 43_560) / clearingWidthFeet));
}

export function isEstimatedLinearFootQuoteLine(item: Pick<MeasuredQuoteLineItem, "quantitySource" | "serviceCode" | "measurementUnit" | "description">): boolean {
  return isLinearFootQuoteLine(item) && item.quantitySource === "acreage_estimate";
}

export function linearFootEstimateBasis(item: Pick<MeasuredQuoteLineItem, "quantitySource" | "sourceAcreage" | "clearingWidthFeet">): string | null {
  if (item.quantitySource !== "acreage_estimate" || !item.sourceAcreage || !item.clearingWidthFeet) return null;
  return `${item.sourceAcreage} acres at ${item.clearingWidthFeet} ft clearing width`;
}

export function formatQuoteLineQuantity(item: Pick<MeasuredQuoteLineItem, "serviceCode" | "measurementUnit" | "description" | "qty">): string {
  return isLinearFootQuoteLine(item) ? `${Number(item.qty).toLocaleString()} linear ft` : Number(item.qty).toLocaleString();
}

export function createQuoteServiceLineItem(serviceCode: QuoteLineServiceCode = "forestry-mulching"): MeasuredQuoteLineItem {
  const service = getQuoteLineServiceOption(serviceCode)!;
  return {
    description: service.label,
    serviceCode: service.value,
    measurementUnit: service.measurementUnit,
    qty: 1,
    unitPriceCents: 0,
    totalCents: 0,
  };
}
