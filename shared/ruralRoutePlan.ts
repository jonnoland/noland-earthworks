export const RURAL_HAULING_PROFILE = {
  name: "Rural hauling setup",
  truck: "2026 Ram 5500 · 84 in. cab-to-axle",
  trailer: "BigTex 25 ft gooseneck",
  load: "CAT 299D3 loaded on trailer",
  defaultMpg: 9,
} as const;

export type RuralRouteStop = {
  id: string;
  label: string;
  location: string;
  source: "address" | "parcel";
};

export type RuralRoutePlanNotes = {
  version: 1;
  stops: RuralRouteStop[];
  ruralAccessNotes: string;
  vehicleProfile: typeof RURAL_HAULING_PROFILE.name;
};

export type RestoredRuralRoutePlan = {
  stops: RuralRouteStop[];
  ruralAccessNotes: string;
  clearParcelBoundary: true;
};

export function serializeRuralRoutePlanNotes(
  stops: RuralRouteStop[],
  ruralAccessNotes: string
): string {
  return JSON.stringify({
    version: 1,
    stops,
    ruralAccessNotes: ruralAccessNotes.trim(),
    vehicleProfile: RURAL_HAULING_PROFILE.name,
  } satisfies RuralRoutePlanNotes);
}

export function parseRuralRoutePlanNotes(notes: string | null | undefined): RuralRoutePlanNotes | null {
  if (!notes) return null;
  try {
    const parsed = JSON.parse(notes) as Partial<RuralRoutePlanNotes>;
    if (parsed.version !== 1 || !Array.isArray(parsed.stops) || typeof parsed.ruralAccessNotes !== "string") {
      return null;
    }
    const stops = parsed.stops.filter((stop): stop is RuralRouteStop =>
      Boolean(
        stop &&
        typeof stop.id === "string" &&
        typeof stop.label === "string" &&
        typeof stop.location === "string" &&
        (stop.source === "address" || stop.source === "parcel")
      )
    );
    return {
      version: 1,
      stops,
      ruralAccessNotes: parsed.ruralAccessNotes,
      vehicleProfile: RURAL_HAULING_PROFILE.name,
    };
  } catch {
    return null;
  }
}

/**
 * Saved routes retain their route stops and access notes, but a live Parcel ID
 * boundary is intentionally not persisted. A restored route must therefore
 * clear any boundary selected in the previous planning session.
 */
export function restoreRuralRoutePlan(notes: string | null | undefined): RestoredRuralRoutePlan {
  const parsed = parseRuralRoutePlanNotes(notes);
  return {
    stops: parsed?.stops ?? [],
    ruralAccessNotes: parsed?.ruralAccessNotes ?? "",
    clearParcelBoundary: true,
  };
}
