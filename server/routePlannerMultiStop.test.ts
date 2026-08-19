import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { buildRouteStopLocations, summarizeRouteLegs } from "./routePlannerRouter";

const source = fs.readFileSync(path.resolve(import.meta.dirname, "routePlannerRouter.ts"), "utf8");

describe("rural multi-stop Route Planner", () => {
  it("accepts ordered address or Parcel ID stops and sends them to Google Directions waypoints", () => {
    expect(source).toContain('stops: z.array(z.object({');
    expect(source).toContain('source: z.enum(["address", "parcel"])');
    expect(source).toContain('url.searchParams.set("waypoints", stops.map((stop) => stop.location).join("|"));');
    expect(source).toContain('routeStops: directions.routeStops');
  });

  it("aggregates multi-stop legs and returns each stop at its ordered leg endpoint", () => {
    const legs = [
      { distance: { value: 1609.34 }, duration: { value: 600 }, start_location: { lat: 36, lng: -87 }, end_location: { lat: 36.1, lng: -87.1 } },
      { distance: { value: 3218.68 }, duration: { value: 1200 }, start_location: { lat: 36.1, lng: -87.1 }, end_location: { lat: 36.2, lng: -87.2 } },
      { distance: { value: 1609.34 }, duration: { value: 300 }, start_location: { lat: 36.2, lng: -87.2 }, end_location: { lat: 36.3, lng: -87.3 } },
    ];
    const stops = [
      { id: "parcel-stop", label: "Parcel stop", location: "36.1,-87.1", source: "parcel" as const },
      { id: "fuel-stop", label: "Fuel stop", location: "36.2,-87.2", source: "address" as const },
    ];

    expect(summarizeRouteLegs(legs)).toMatchObject({ distanceMiles: 4, durationSeconds: 2100, durationText: "35 min" });
    expect(buildRouteStopLocations(stops, legs)).toEqual([
      { ...stops[0], latLng: { lat: 36.1, lng: -87.1 } },
      { ...stops[1], latLng: { lat: 36.2, lng: -87.2 } },
    ]);
  });
});
