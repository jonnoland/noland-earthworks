import { z } from "zod";
import { adminProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { savedRoutes } from "../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { findStationsAlongRoute, WEIGH_STATIONS } from "./weighStationData";
import { ENV } from "./_core/env";

// ── Google Maps Directions API helper ────────────────────────────────────────

interface DirectionsResult {
  distanceMiles: number;
  durationText: string;
  durationSeconds: number;
  polylinePoints: Array<{ lat: number; lng: number }>;
  steps: Array<{
    instruction: string;
    distanceText: string;
    highway?: string;
  }>;
  originLatLng: { lat: number; lng: number };
  destinationLatLng: { lat: number; lng: number };
  bounds: {
    northeast: { lat: number; lng: number };
    southwest: { lat: number; lng: number };
  };
}

/**
 * Decode a Google Maps encoded polyline into lat/lng points.
 * https://developers.google.com/maps/documentation/utilities/polylinealgorithm
 */
function decodePolyline(encoded: string): Array<{ lat: number; lng: number }> {
  const points: Array<{ lat: number; lng: number }> = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return points;
}

async function getDirections(
  origin: string,
  destination: string
): Promise<DirectionsResult> {
  const apiKey = ENV.googlePlacesApiKey;
  if (!apiKey) throw new Error("Google Maps API key not configured");

  const url = new URL("https://maps.googleapis.com/maps/api/directions/json");
  url.searchParams.set("origin", origin);
  url.searchParams.set("destination", destination);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("units", "imperial");

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Directions API HTTP error: ${res.status}`);

  const data = (await res.json()) as any;
  if (data.status !== "OK") {
    throw new Error(`Directions API error: ${data.status} — ${data.error_message ?? "unknown"}`);
  }

  const route = data.routes[0];
  const leg = route.legs[0];

  // Decode the overview polyline for weigh station matching
  const polylinePoints = decodePolyline(route.overview_polyline.points);

  // Extract step-level highway info
  const steps = (leg.steps as any[]).map((step: any) => ({
    instruction: step.html_instructions?.replace(/<[^>]+>/g, "") ?? "",
    distanceText: step.distance?.text ?? "",
    highway: step.maneuver,
  }));

  return {
    distanceMiles: leg.distance.value / 1609.34,
    durationText: leg.duration.text,
    durationSeconds: leg.duration.value,
    polylinePoints,
    steps,
    originLatLng: {
      lat: leg.start_location.lat,
      lng: leg.start_location.lng,
    },
    destinationLatLng: {
      lat: leg.end_location.lat,
      lng: leg.end_location.lng,
    },
    bounds: {
      northeast: {
        lat: route.bounds.northeast.lat,
        lng: route.bounds.northeast.lng,
      },
      southwest: {
        lat: route.bounds.southwest.lat,
        lng: route.bounds.southwest.lng,
      },
    },
  };
}

// ── Router ────────────────────────────────────────────────────────────────────

export const routePlannerRouter = router({
  /**
   * Plan a route: get directions + find weigh stations along the way.
   * Does NOT save the route — use saveRoute for that.
   */
  planRoute: adminProcedure
    .input(
      z.object({
        origin: z.string().min(3, "Origin address required"),
        destination: z.string().min(3, "Destination address required"),
      })
    )
    .mutation(async ({ input }) => {
      const directions = await getDirections(input.origin, input.destination);

      // Find weigh stations within 1.5 miles of the route polyline
      const stations = findStationsAlongRoute(directions.polylinePoints, 1.5);

      // Sort stations by approximate route order (by lng for E-W routes, lat for N-S)
      const latSpan = Math.abs(
        directions.bounds.northeast.lat - directions.bounds.southwest.lat
      );
      const lngSpan = Math.abs(
        directions.bounds.northeast.lng - directions.bounds.southwest.lng
      );
      const sortedStations = [...stations].sort((a, b) =>
        lngSpan >= latSpan ? a.lng - b.lng : a.lat - b.lat
      );

      return {
        distanceMiles: Math.round(directions.distanceMiles * 10) / 10,
        durationText: directions.durationText,
        originLatLng: directions.originLatLng,
        destinationLatLng: directions.destinationLatLng,
        bounds: directions.bounds,
        polylineEncoded: "", // client uses Google Maps SDK directly
        weighStations: sortedStations,
        stationCount: sortedStations.length,
      };
    }),

  /**
   * Save a planned route to the database.
   */
  saveRoute: adminProcedure
    .input(
      z.object({
        name: z.string().min(1, "Route name required"),
        originAddress: z.string(),
        destinationAddress: z.string(),
        originLatLng: z.object({ lat: z.number(), lng: z.number() }).optional(),
        destinationLatLng: z.object({ lat: z.number(), lng: z.number() }).optional(),
        distanceMiles: z.string().optional(),
        durationText: z.string().optional(),
        weighStationIds: z.array(z.string()).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      const [result] = await db.insert(savedRoutes).values({
        name: input.name,
        originAddress: input.originAddress,
        destinationAddress: input.destinationAddress,
        originLatLng: input.originLatLng
          ? JSON.stringify(input.originLatLng)
          : null,
        destinationLatLng: input.destinationLatLng
          ? JSON.stringify(input.destinationLatLng)
          : null,
        distanceMiles: input.distanceMiles ?? null,
        durationText: input.durationText ?? null,
        weighStationIds: input.weighStationIds
          ? JSON.stringify(input.weighStationIds)
          : null,
        notes: input.notes ?? null,
      });
      return { id: (result as any).insertId };
    }),

  /**
   * Get all saved routes, newest first.
   */
  getSavedRoutes: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const rows = await db
      .select()
      .from(savedRoutes)
      .orderBy(desc(savedRoutes.createdAt));

    return rows.map((r: typeof rows[0]) => ({
      ...r,
      originLatLng: r.originLatLng ? JSON.parse(r.originLatLng) : null,
      destinationLatLng: r.destinationLatLng
        ? JSON.parse(r.destinationLatLng)
        : null,
      weighStationIds: r.weighStationIds
        ? (JSON.parse(r.weighStationIds) as string[])
        : [],
    }));
  }),

  /**
   * Delete a saved route by ID.
   */
  deleteRoute: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      await db.delete(savedRoutes).where(eq(savedRoutes.id, input.id));
      return { success: true };
    }),

  /**
   * Get all weigh stations in the dataset (for map pre-load).
   */
  getAllStations: adminProcedure.query(async () => {
    return WEIGH_STATIONS;
  }),
});
