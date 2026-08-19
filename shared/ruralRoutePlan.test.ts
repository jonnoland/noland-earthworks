import { describe, expect, it } from "vitest";
import { parseRuralRoutePlanNotes, restoreRuralRoutePlan, RURAL_HAULING_PROFILE, serializeRuralRoutePlanNotes } from "./ruralRoutePlan";

describe("rural route plan notes", () => {
  it("preserves Parcel ID and address stops with rural access notes", () => {
    const serialized = serializeRuralRoutePlanNotes([
      { id: "parcel-1", label: "Parcel 123 · Dickson County", location: "36.123,-87.456", source: "parcel" },
      { id: "fuel-1", label: "Fuel stop", location: "123 Rural Route, TN", source: "address" },
    ], "Unpaved drive after the cattle gate; verify bridge and turnaround before departure.");

    expect(parseRuralRoutePlanNotes(serialized)).toMatchObject({
      stops: [
        { source: "parcel" },
        { source: "address" },
      ],
      vehicleProfile: RURAL_HAULING_PROFILE.name,
    });
  });

  it("ignores legacy notes that are not a rural route-plan payload", () => {
    expect(parseRuralRoutePlanNotes("Call before arrival")).toBeNull();
  });

  it("restores saved stops and access notes while explicitly clearing a prior Parcel ID boundary", () => {
    const notes = serializeRuralRoutePlanNotes([
      { id: "parcel-1", label: "Parcel 123 · Dickson County", location: "36.123,-87.456", source: "parcel" },
    ], "Confirm gate, culvert, and turnaround.");

    expect(restoreRuralRoutePlan(notes)).toEqual({
      stops: [{ id: "parcel-1", label: "Parcel 123 · Dickson County", location: "36.123,-87.456", source: "parcel" }],
      ruralAccessNotes: "Confirm gate, culvert, and turnaround.",
      clearParcelBoundary: true,
    });
  });
});
