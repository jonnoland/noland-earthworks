import { z } from "zod";
import { adminProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { savedRoutes } from "../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { fetchWeighStationsForRoute, haversineDistance } from "./weighStationData";
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

      // Find weigh stations within 1.5 miles of the route polyline (live Overpass API data)
      const stations = await fetchWeighStationsForRoute(directions.polylinePoints, 1.5);

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
   * Stations are now fetched live from Overpass API per-route — no static dataset.
   */
  getAllStations: adminProcedure.query(async () => {
    return [] as import("./weighStationData").WeighStation[];
  }),

  /**
   * Scrape coopsareopen.com for TN weigh station open/closed status.
   * Returns a map of station name (normalized) -> { status, updatedAt }
   */
  weighStationStatus: adminProcedure.query(async () => {
    try {
      const res = await fetch(
        "https://www.coopsareopen.com/tennessee-weigh-stations.html",
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml",
          },
          signal: AbortSignal.timeout(10_000),
        }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();

      // Parse the table: Name | Highway | Mile | Location
      // Status is embedded in row class or text (open/closed)
      const rows: Array<{
        name: string;
        highway: string;
        milepost: string;
        status: "open" | "closed" | "unknown";
      }> = [];

      // Extract table rows via regex (no DOM in Node)
      const tableMatch = html.match(/<table[^>]*>([\s\S]*?)<\/table>/i);
      if (tableMatch) {
        const rowMatches = Array.from(tableMatch[1].matchAll(/<tr[^>]*class="([^"]*?)"[^>]*>([\s\S]*?)<\/tr>/gi));
        for (const rowMatch of rowMatches) {
          const rowClass = rowMatch[1].toLowerCase();
          const rowHtml = rowMatch[2];
          const cells = Array.from(rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)).map(
            (m) => m[1].replace(/<[^>]+>/g, "").trim()
          );
          if (cells.length >= 2 && cells[0]) {
            const status: "open" | "closed" | "unknown" = rowClass.includes("open")
              ? "open"
              : rowClass.includes("closed")
              ? "closed"
              : "unknown";
            rows.push({
              name: cells[0],
              highway: cells[1] || "",
              milepost: cells[2] || "",
              status,
            });
          }
        }
      }

      return {
        stations: rows,
        fetchedAt: new Date().toISOString(),
        source: "coopsareopen.com",
      };
    } catch (err) {
      console.warn("[Route Planner] weighStationStatus fetch failed:", err);
      return {
        stations: [],
        fetchedAt: new Date().toISOString(),
        source: "coopsareopen.com",
        error: "Status data temporarily unavailable",
      };
    }
  }),

  /**
   * Fetch current diesel price for PADD 1C (Lower Atlantic — covers TN)
   * from the EIA public API. No API key required with DEMO_KEY for low-volume use.
   */
  dieselPrice: adminProcedure.query(async () => {
    try {
      const url = new URL("https://api.eia.gov/v2/petroleum/pri/gnd/data/");
      url.searchParams.set("api_key", "DEMO_KEY");
      url.searchParams.set("frequency", "weekly");
      url.searchParams.append("data[0]", "value");
      url.searchParams.append("facets[duoarea][]", "R1Z"); // PADD 1C Lower Atlantic (TN)
      url.searchParams.append("facets[product][]", "EPD2DXL0"); // Ultra Low Sulfur Diesel
      url.searchParams.append("sort[0][column]", "period");
      url.searchParams.append("sort[0][direction]", "desc");
      url.searchParams.set("length", "1");

      const res = await fetch(url.toString(), {
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) throw new Error(`EIA HTTP ${res.status}`);
      const json = (await res.json()) as {
        response: { data: Array<{ period: string; value: string; "area-name": string }> };
      };

      const record = json.response?.data?.[0];
      if (!record) throw new Error("No data returned");

      return {
        pricePerGallon: parseFloat(record.value),
        period: record.period,
        region: record["area-name"],
        fetchedAt: new Date().toISOString(),
        source: "EIA.gov",
      };
    } catch (err) {
      console.warn("[Route Planner] dieselPrice fetch failed:", err);
      // Fallback to a reasonable estimate
      return {
        pricePerGallon: 3.85,
        period: null,
        region: "Tennessee (estimate)",
        fetchedAt: new Date().toISOString(),
        source: "fallback",
        error: "Live price temporarily unavailable — using estimate",
      };
    }
  }),
});
