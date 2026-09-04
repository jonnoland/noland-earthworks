import { describe, expect, it } from "vitest";
import { buildOnxSiteWalkWaypointGpx, onxSiteWalkWaypointFileName, onxSiteWalkWaypointName } from "./onxSiteWalk";

describe("onX site-walk waypoint handoff", () => {
  const property = {
    parcelId: "032 051.00",
    county: "Cheatham",
    address: "Rock Springs Rd",
    latitude: 36.247891,
    longitude: -87.073456,
  };

  it("creates a GPX waypoint that onX can import for the selected property", () => {
    const gpx = buildOnxSiteWalkWaypointGpx(property);
    expect(gpx).toContain('<gpx version="1.1"');
    expect(gpx).toContain('<wpt lat="36.247891" lon="-87.073456">');
    expect(gpx).toContain("Noland Site Walk — Cheatham 032 051.00");
    expect(gpx).toContain("use Area Shape to measure the mulching area");
  });

  it("creates a safe, predictable handoff filename from the selected Parcel ID", () => {
    expect(onxSiteWalkWaypointName(property)).toBe("Noland Site Walk — Cheatham 032 051.00");
    expect(onxSiteWalkWaypointFileName(property)).toBe("noland-site-walk-032-051-00.gpx");
  });

  it("escapes property data and refuses a waypoint with invalid coordinates", () => {
    const gpx = buildOnxSiteWalkWaypointGpx({ ...property, address: "Rock & Pine <Lot>" });
    expect(gpx).toContain("Rock &amp; Pine &lt;Lot&gt;");
    expect(() => buildOnxSiteWalkWaypointGpx({ ...property, latitude: Number.NaN })).toThrow("property location");
  });
});
