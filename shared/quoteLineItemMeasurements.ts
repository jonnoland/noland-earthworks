export type QuoteLineServiceCode =
  | "forestry-mulching"
  | "land-management"
  | "vegetation-management"
  | "right-of-way-clearing"
  | "brush-hogging"
  | "trail-cutting"
  | "fence-line-clearing";

export type QuoteLineMeasurementUnit = "linear_foot";

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
  { value: "right-of-way-clearing", label: "Right-of-Way Clearing" },
  { value: "brush-hogging", label: "Brush Hogging" },
  { value: "trail-cutting", label: "Trail Cutting", measurementUnit: "linear_foot" },
  { value: "fence-line-clearing", label: "Fence Line Clearing", measurementUnit: "linear_foot" },
];

export interface MeasuredQuoteLineItem {
  description: string;
  qty: number;
  unitPriceCents: number;
  totalCents: number;
  serviceCode?: string;
  measurementUnit?: QuoteLineMeasurementUnit;
}

export function getQuoteLineServiceOption(value: string | undefined): QuoteLineServiceOption | undefined {
  return QUOTE_LINE_SERVICE_OPTIONS.find((option) => option.value === value);
}

export function inferQuoteLineServiceOption(description: string | undefined): QuoteLineServiceOption | undefined {
  const normalized = description?.trim().toLocaleLowerCase();
  if (!normalized) return undefined;
  return QUOTE_LINE_SERVICE_OPTIONS.find((option) => option.label.toLocaleLowerCase() === normalized);
}

export function isLinearFootQuoteLine(item: Pick<MeasuredQuoteLineItem, "serviceCode" | "measurementUnit" | "description">): boolean {
  return item.measurementUnit === "linear_foot"
    || getQuoteLineServiceOption(item.serviceCode)?.measurementUnit === "linear_foot"
    || inferQuoteLineServiceOption(item.description)?.measurementUnit === "linear_foot";
}

export function quoteLineQuantityLabel(item: Pick<MeasuredQuoteLineItem, "serviceCode" | "measurementUnit" | "description">): string {
  return isLinearFootQuoteLine(item) ? "Linear feet" : "Quantity";
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
