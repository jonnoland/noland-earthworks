import { roundQuoteCentsUp } from "./quoteMoney";

export type DraftQuoteRepricingLineItem = {
  description: string;
  qty: number;
  unitPriceCents: number;
  totalCents: number;
  kind?: "service" | "discount" | "phase" | "mobilization" | "full_operating_day" | "half_operating_day";
  phaseId?: string;
  serviceCode?: string;
  measurementUnit?: "linear_foot";
};

function phaseKey(item: DraftQuoteRepricingLineItem) {
  return item.phaseId?.trim() || "standard";
}

function isDiscount(item: DraftQuoteRepricingLineItem) {
  return item.kind === "discount" || item.unitPriceCents < 0;
}

function isProtectedCost(item: DraftQuoteRepricingLineItem) {
  return /\b(mobilization|travel|required equipment|project costs?)\b/i.test(item.description);
}

export function isDraftQuoteLineItemRepriceable(item: DraftQuoteRepricingLineItem) {
  if (item.unitPriceCents <= 0 || isDiscount(item) || item.kind === "phase" || item.kind === "mobilization") return false;
  if (item.measurementUnit === "linear_foot" || /^(trail-cutting|fence-line-clearing|right-of-way-clearing)$/i.test(item.serviceCode ?? "")) return false;
  if (isProtectedCost(item)) return false;
  return item.kind === undefined || item.kind === "service" || item.kind === "full_operating_day" || item.kind === "half_operating_day";
}

export function repriceDraftQuoteLineItems(
  items: DraftQuoteRepricingLineItem[],
  activeCrewDayRateCents: number,
  priorCrewDayRateCents: number,
) {
  const ratio = activeCrewDayRateCents / Math.max(1, priorCrewDayRateCents);
  const oldSubtotalByPhase = new Map<string, number>();
  const newSubtotalByPhase = new Map<string, number>();
  let repriceableItemCount = 0;
  let skippedPositiveItemCount = 0;

  const repricedNonDiscountItems = items.map((item) => {
    if (isDiscount(item)) return { ...item };
    const key = phaseKey(item);
    const oldTotal = Math.max(0, item.totalCents);
    oldSubtotalByPhase.set(key, (oldSubtotalByPhase.get(key) ?? 0) + oldTotal);
    if (!isDraftQuoteLineItemRepriceable(item)) {
      if (item.unitPriceCents > 0) skippedPositiveItemCount += 1;
      newSubtotalByPhase.set(key, (newSubtotalByPhase.get(key) ?? 0) + oldTotal);
      return { ...item };
    }

    repriceableItemCount += 1;
    const unitPriceCents = item.kind === "full_operating_day"
      ? roundQuoteCentsUp(activeCrewDayRateCents)
      : item.kind === "half_operating_day"
        ? roundQuoteCentsUp(activeCrewDayRateCents / 2)
        : roundQuoteCentsUp(item.unitPriceCents * ratio);
    const totalCents = roundQuoteCentsUp(Math.max(1, item.qty) * unitPriceCents);
    newSubtotalByPhase.set(key, (newSubtotalByPhase.get(key) ?? 0) + totalCents);
    return { ...item, unitPriceCents, totalCents };
  });

  const lineItems = repricedNonDiscountItems.map((item) => {
    if (!isDiscount(item)) return item;
    const key = phaseKey(item);
    const oldSubtotal = oldSubtotalByPhase.get(key) ?? 0;
    const newSubtotal = newSubtotalByPhase.get(key) ?? 0;
    if (oldSubtotal <= 0 || newSubtotal <= 0) return item;
    const effectiveDiscountPct = Math.abs(item.totalCents) / oldSubtotal;
    const totalCents = roundQuoteCentsUp(-newSubtotal * effectiveDiscountPct);
    return { ...item, qty: 1, unitPriceCents: totalCents, totalCents };
  });

  return { lineItems, repriceableItemCount, skippedPositiveItemCount };
}
