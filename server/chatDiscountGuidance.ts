export type ChatDiscountSettings = {
  militaryVeteranPct?: number | null;
  firstTimePct?: number | null;
};

/**
 * Builds the live, settings-backed discount instructions appended to the public chat prompt.
 * The assistant may identify eligibility and invite confirmation, but it must not calculate
 * or promise final pricing before a site assessment.
 */
export function buildChatDiscountGuidance(settings: ChatDiscountSettings): string {
  const militaryVeteranPct = settings.militaryVeteranPct ?? 0;
  const firstTimePct = settings.firstTimePct ?? 0;
  const availableDiscounts: string[] = [];

  if (militaryVeteranPct > 0) {
    availableDiscounts.push(`Military / Veteran: ${militaryVeteranPct}%`);
  }

  if (firstTimePct > 0) {
    availableDiscounts.push(`First-Time Customer: ${firstTimePct}%`);
  }

  if (availableDiscounts.length === 0) {
    return "DISCOUNT GUIDANCE:\n- Do not mention customer discounts unless Jon has enabled one in pricing settings.";
  }

  return `DISCOUNT GUIDANCE:
- Available customer discounts: ${availableDiscounts.join("; ")}.
- When a visitor asks about pricing, a quote, or an estimate, naturally mention that they should tell Jon if they are a veteran or if this would be their first job with Noland Earthworks, because an eligible discount may apply.
- If a visitor self-identifies as military, a veteran, or a first-time customer, specifically acknowledge the relevant discount and invite Jon to confirm eligibility during the quote review.
- Never stack discounts, calculate a discounted price, promise approval, or replace the required site assessment. Keep all final pricing subject to site conditions and Jon's review.`;
}
