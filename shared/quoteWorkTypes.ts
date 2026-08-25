export type QuoteLineItemKind =
  | "service"
  | "discount"
  | "phase"
  | "mobilization"
  | "full_operating_day"
  | "half_operating_day";

export type QuoteWorkPreset = Exclude<QuoteLineItemKind, "service" | "discount">;
export type QuotePhaseAuthorization = "approved_now" | "optional_future";

export const QUOTE_WORK_PRESETS: Record<QuoteWorkPreset, { label: string; description: string }> = {
  phase: {
    label: "Phase",
    description: "Phase — Define work area and outcome",
  },
  mobilization: {
    label: "Mobilization",
    description: "Mobilization",
  },
  full_operating_day: {
    label: "Full Operating Day",
    description: "Forestry Mulching — Full Operating Day",
  },
  half_operating_day: {
    label: "Half Operating Day",
    description: "Forestry Mulching — Half Operating Day",
  },
};

export const PHASED_WORK_TERMS = `PHASED WORK TERMS
Each phase is a separate, defined portion of the project. Approval and payment for the current phase do not authorize future phases. Any later phase will be scheduled only after written approval, and any stated price assumes the site conditions, access, and scope remain materially the same. Work outside the defined phase requires written approval before it begins.`;

export const DAY_RATE_TERMS = `DAY-RATE TERMS
This authorization covers the approved operating time and defined work area only. Billable operating time begins when productive work starts, unless this quote separately states a mobilization or arrival charge. Production varies with vegetation density, terrain, access, hidden material, weather, equipment safety, and site conditions. Noland Earthworks may pause or stop work when conditions are unsafe or outside the written scope. Work stops when the approved operating time or written not-to-exceed amount is reached. Additional work requires written approval before continuing. This work does not include grading, excavation, hauling, or other services not specifically listed in this quote.`;

export const ONE_DAY_TRIAL_TERMS = `ONE-DAY TRIAL PHASE TERMS
This is a one-day evaluation phase for the defined work area. The purpose is to verify production, access, vegetation, and site conditions before additional work is authorized. No specific acreage or total project completion is guaranteed for this phase. Noland Earthworks will document the result and provide a recommendation for any next phase. Further work requires separate written approval.`;

export const SAMPLE_PHASED_QUOTE_CLIENT_MESSAGE = `Thank you for the opportunity to prepare this phased forestry mulching quote. The work areas are separated so you may authorize only the phase that makes sense now. Optional future phases are not due or scheduled until you approve them in writing.\n\n${PHASED_WORK_TERMS}`;

export function createQuoteWorkLineItem(kind: QuoteWorkPreset) {
  return {
    description: QUOTE_WORK_PRESETS[kind].description,
    qty: 1,
    unitPriceCents: 0,
    totalCents: 0,
    kind,
    ...(kind === "phase" ? { phaseAuthorization: "approved_now" as const, estimatedDuration: "" } : {}),
  };
}
