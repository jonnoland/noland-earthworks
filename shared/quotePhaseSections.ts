import type { QuoteLineItemKind, QuotePhaseAuthorization } from "./quoteWorkTypes";

export interface PhaseSectionLineItem {
  description: string;
  qty: number;
  unitPriceCents: number;
  totalCents: number;
  kind?: QuoteLineItemKind;
  phaseId?: string;
  phaseAuthorization?: QuotePhaseAuthorization;
  estimatedDuration?: string;
  discountCode?: string;
}

export interface QuotePhaseSection<T extends PhaseSectionLineItem = PhaseSectionLineItem> {
  phase: T;
  itemIndices: number[];
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
}

export function ensureQuotePhaseIds<T extends PhaseSectionLineItem>(items: T[]): T[] {
  return items.map((item, index) => (
    item.kind === "phase" && !item.phaseId
      ? { ...item, phaseId: `phase-${index + 1}` }
      : item
  )) as T[];
}

export function getQuotePhaseSections<T extends PhaseSectionLineItem>(items: T[]): QuotePhaseSection<T>[] {
  const phases = items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.kind === "phase" && item.phaseId);

  return phases.map(({ item: phase, index }) => {
    const itemIndices = items
      .map((item, itemIndex) => ({ item, itemIndex }))
      .filter(({ item }) => item.phaseId === phase.phaseId)
      .map(({ itemIndex }) => itemIndex);
    const sectionItems = itemIndices.map((itemIndex) => items[itemIndex]);
    const subtotalCents = sectionItems
      .filter((item) => item.kind !== "discount" && item.unitPriceCents >= 0)
      .reduce((sum, item) => sum + item.qty * item.unitPriceCents, 0);
    const discountCents = sectionItems
      .filter((item) => item.kind === "discount" || item.unitPriceCents < 0)
      .reduce((sum, item) => sum + item.qty * item.unitPriceCents, 0);
    return { phase, itemIndices, subtotalCents, discountCents, totalCents: subtotalCents + discountCents };
  });
}
