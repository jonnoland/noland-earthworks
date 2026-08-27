import { Preferences } from "@capacitor/preferences";
import type { FieldPricingSnapshot } from "../../../shared/fieldOfflinePricing";

export { calculateCachedFieldEstimate } from "../../../shared/fieldOfflinePricing";
export type { CachedFieldEstimate, CachedFieldEstimateInput, FieldPricingSnapshot } from "../../../shared/fieldOfflinePricing";

const PRICING_CACHE_KEY = "noland_field_operations_pricing_v1";


export async function readFieldPricingSnapshot(): Promise<FieldPricingSnapshot | null> {
  try {
    const { value } = await Preferences.get({ key: PRICING_CACHE_KEY });
    if (!value) return null;
    const parsed = JSON.parse(value) as FieldPricingSnapshot;
    return parsed?.pricingSettings && typeof parsed.lastSyncedAt === "string" ? parsed : null;
  } catch {
    return null;
  }
}

export async function writeFieldPricingSnapshot(
  snapshot: Omit<FieldPricingSnapshot, "lastSyncedAt">,
): Promise<FieldPricingSnapshot> {
  const cached: FieldPricingSnapshot = { ...snapshot, lastSyncedAt: new Date().toISOString() };
  await Preferences.set({ key: PRICING_CACHE_KEY, value: JSON.stringify(cached) });
  return cached;
}
