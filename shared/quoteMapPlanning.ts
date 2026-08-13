export const SQUARE_METERS_PER_ACRE = 4046.8564224;
export const FEET_PER_METER = 3.280839895;
export const MAP_DRAWING_COLORS = ["#38BDF8", "#34D399", "#A78BFA", "#FBBF24", "#FB7185", "#22D3EE", "#F97316", "#84CC16"] as const;

export function getMapDrawingColor(drawingId: number): string {
  const normalizedId = Number.isFinite(drawingId) && drawingId > 0 ? Math.floor(drawingId) : 1;
  return MAP_DRAWING_COLORS[(normalizedId - 1) % MAP_DRAWING_COLORS.length];
}

export function squareMetersToAcres(squareMeters: number): number | null {
  if (!Number.isFinite(squareMeters) || squareMeters <= 0) return null;
  return squareMeters / SQUARE_METERS_PER_ACRE;
}

export function metersToLinearFeet(meters: number): number | null {
  if (!Number.isFinite(meters) || meters <= 0) return null;
  return meters * FEET_PER_METER;
}

export type MapDrawingValue = {
  type: "area" | "path";
  value: number;
};

export type CombinedMapMeasurements = {
  totalAcres: number;
  totalLinearFeet: number;
  areaCount: number;
  pathCount: number;
};

export function combineMapDrawingMeasurements(drawings: readonly MapDrawingValue[]): CombinedMapMeasurements {
  return drawings.reduce<CombinedMapMeasurements>((totals, drawing) => {
    if (!Number.isFinite(drawing.value) || drawing.value <= 0) return totals;
    if (drawing.type === "area") {
      totals.totalAcres += drawing.value;
      totals.areaCount += 1;
    } else {
      totals.totalLinearFeet += drawing.value;
      totals.pathCount += 1;
    }
    return totals;
  }, { totalAcres: 0, totalLinearFeet: 0, areaCount: 0, pathCount: 0 });
}

export type PreliminaryProjectTimeline = {
  duration: string;
  detail: string;
};

export function estimateProjectTimeline({
  acres,
  totalLinearFeet,
  terrain,
}: {
  acres: number;
  totalLinearFeet: number;
  terrain?: string;
}): PreliminaryProjectTimeline {
  const terrainFactor = terrain === "steep" ? 1.4 : terrain === "rolling" ? 1.18 : 1;
  const acreageDays = Math.max(0, acres) / 4;
  const linearDays = Math.max(0, totalLinearFeet) / 3000;
  const estimatedDays = Math.max(0.5, acreageDays, linearDays) * terrainFactor;
  const minimumDays = Math.max(1, Math.floor(estimatedDays));
  const maximumDays = Math.max(minimumDays, Math.ceil(estimatedDays * 1.3));
  const duration = minimumDays === maximumDays
    ? `${minimumDays} working day`
    : `${minimumDays}–${maximumDays} working days`;
  const terrainLabel = terrain === "steep" ? "steep, wet, or rocky terrain" : terrain === "rolling" ? "rolling or uneven terrain" : "level or easy-access terrain";
  const workload = totalLinearFeet > 0
    ? `${Math.round(totalLinearFeet).toLocaleString()} linear feet and ${Math.max(0, acres).toFixed(2)} acres`
    : `${Math.max(0, acres).toFixed(2)} acres`;

  return {
    duration,
    detail: `Preliminary field-time estimate for ${workload} on ${terrainLabel}. Weather, access, density, and site conditions can change the schedule.`,
  };
}
