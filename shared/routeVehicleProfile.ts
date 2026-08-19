export type RouteVehicleProfileInput = {
  towingTimeMultiplier: number;
  unpavedAverageMph: number;
};

export type TowingTravelEstimate = {
  baseDurationSeconds: number;
  profileAdjustedSeconds: number;
  unpavedReplacementSeconds: number;
  estimatedDurationSeconds: number;
  estimatedDurationText: string;
  knownUnpavedMiles: number;
};

export function formatTravelDuration(totalSeconds: number): string {
  const totalMinutes = Math.max(1, Math.round(totalSeconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours} hr ${minutes} min` : `${minutes} min`;
}

/**
 * Replaces the profile-adjusted Google pace for known unpaved miles with the
 * operator-configured unpaved average speed. It is a planning estimate, not a
 * legal truck-route or real-time road-condition prediction.
 */
export function calculateTowingTravelEstimate(input: {
  googleDurationSeconds: number;
  distanceMiles: number;
  knownUnpavedMiles?: number;
  profile: RouteVehicleProfileInput;
}): TowingTravelEstimate {
  const baseDurationSeconds = Math.max(0, input.googleDurationSeconds);
  const distanceMiles = Math.max(0, input.distanceMiles);
  const knownUnpavedMiles = Math.min(distanceMiles, Math.max(0, input.knownUnpavedMiles ?? 0));
  const towingTimeMultiplier = Math.max(0.5, input.profile.towingTimeMultiplier);
  const unpavedAverageMph = Math.max(1, input.profile.unpavedAverageMph);
  const profileAdjustedSeconds = baseDurationSeconds * towingTimeMultiplier;
  const adjustedRouteSecondsPerMile = distanceMiles > 0 ? profileAdjustedSeconds / distanceMiles : 0;
  const replacedRouteSeconds = adjustedRouteSecondsPerMile * knownUnpavedMiles;
  const unpavedSurfaceSeconds = knownUnpavedMiles * (3600 / unpavedAverageMph);
  const unpavedReplacementSeconds = Math.max(0, unpavedSurfaceSeconds - replacedRouteSeconds);
  const estimatedDurationSeconds = profileAdjustedSeconds + unpavedReplacementSeconds;

  return {
    baseDurationSeconds,
    profileAdjustedSeconds,
    unpavedReplacementSeconds,
    estimatedDurationSeconds,
    estimatedDurationText: formatTravelDuration(estimatedDurationSeconds),
    knownUnpavedMiles,
  };
}
