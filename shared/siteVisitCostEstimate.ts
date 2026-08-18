export type InternalSiteVisitCostEstimate = {
  acreage: number;
  plannedHours: number;
  internalLaborCost: number;
  basis: string;
  warning: string;
};

const BURDENED_OWNER_HOURLY_COST = 35;

/**
 * Internal planning estimate only. Parcel acreage is a proxy for review time,
 * not a customer price or a substitute for field conditions and travel review.
 */
export function estimateInternalSiteVisitCost(acreage: number): InternalSiteVisitCostEstimate | null {
  if (!Number.isFinite(acreage) || acreage <= 0) return null;

  const plannedHours = acreage <= 5 ? 0.75 : acreage <= 20 ? 1 : acreage <= 50 ? 1.25 : 1.5;
  const internalLaborCost = Math.round(plannedHours * BURDENED_OWNER_HOURLY_COST);

  return {
    acreage,
    plannedHours,
    internalLaborCost,
    basis: `${plannedHours.toFixed(2).replace(/\.00$/, "")} on-site review hour${plannedHours === 1 ? "" : "s"} × $${BURDENED_OWNER_HOURLY_COST}/hr burdened owner labor`,
    warning: "Internal planning only. Travel, drive time, terrain, access, and actual work area are not included.",
  };
}
