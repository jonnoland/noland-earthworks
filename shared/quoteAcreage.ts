export const QUOTE_ACREAGE_MIN = 0.25;
export const QUOTE_ACREAGE_MAX = 40;
export const QUOTE_ACREAGE_STEP = 0.25;

export function normalizeQuoteAcreage(acres: number, fallback = 1): string {
  const candidate = Number.isFinite(acres) && acres > 0 ? acres : fallback;
  const clamped = Math.max(QUOTE_ACREAGE_MIN, Math.min(QUOTE_ACREAGE_MAX, candidate));
  return String(Math.round(clamped / QUOTE_ACREAGE_STEP) * QUOTE_ACREAGE_STEP);
}

export function formatQuoteAcreage(value: string): string {
  const acres = Number(value);
  if (!Number.isFinite(acres) || acres <= 0) return "";
  return `${acres} ${acres === 1 ? "acre" : "acres"}`;
}
