import { describe, expect, it } from "vitest";
import { calculateTowingTravelEstimate } from "./routeVehicleProfile";

describe("vehicle-profile rural travel estimates", () => {
  it("applies a towing pace and substitutes the configured pace for mapped unpaved miles", () => {
    const estimate = calculateTowingTravelEstimate({
      googleDurationSeconds: 3_600,
      distanceMiles: 60,
      knownUnpavedMiles: 6,
      profile: { towingTimeMultiplier: 1.2, unpavedAverageMph: 15 },
    });

    expect(estimate.profileAdjustedSeconds).toBe(4_320);
    expect(estimate.knownUnpavedMiles).toBe(6);
    expect(estimate.estimatedDurationSeconds).toBeGreaterThan(estimate.profileAdjustedSeconds);
    expect(estimate.estimatedDurationText).toBe("1 hr 29 min");
  });
});
