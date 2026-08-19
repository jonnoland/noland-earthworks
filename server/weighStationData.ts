/**
 * Weigh Station Data Layer
 *
 * Locations: OpenStreetMap Overpass API (amenity=weighbridge, excluding commercial CAT Scales)
 * Highway/direction enrichment: coopsareopen.com per-state tables (scraped)
 * Live open/closed status: not publicly available — status is always "unknown"
 *
 * The Overpass query is run server-side on each planRoute call, scoped to the route bounding box.
 * Results are cached in-memory for 6 hours to avoid hammering the public Overpass endpoint.
 */

import * as cheerio from "cheerio";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface WeighStation {
  id: string;
  name: string;
  state: string;
  highway: string;
  direction: "NB" | "SB" | "EB" | "WB" | "BOTH" | "UNKNOWN";
  milepost: number | null;
  lat: number;
  lng: number;
  city: string;
  phone?: string;
  prepassEligible: boolean;
  notes?: string;
  source: "osm" | "manual";
}

// ── coopsareopen.com state slug map ──────────────────────────────────────────

const STATE_SLUGS: Record<string, string> = {
  TN: "tennessee",
  KY: "kentucky",
  AL: "alabama",
  MS: "mississippi",
  AR: "arkansas",
  GA: "georgia",
  NC: "north-carolina",
  VA: "virginia",
  MO: "missouri",
  SC: "south-carolina",
  WV: "west-virginia",
  IN: "indiana",
  IL: "illinois",
  OH: "ohio",
  TX: "texas",
  OK: "oklahoma",
  LA: "louisiana",
  FL: "florida",
};

// ── In-memory cache ───────────────────────────────────────────────────────────

interface CacheEntry {
  stations: WeighStation[];
  fetchedAt: number;
}

interface UnpavedRoadCacheEntry {
  roads: UnpavedRoadSegment[];
  routeApproximateMiles: number;
  fetchedAt: number;
}

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const stationCache = new Map<string, CacheEntry>();
const unpavedRoadCache = new Map<string, UnpavedRoadCacheEntry>();

function bboxKey(
  minLat: number,
  maxLat: number,
  minLng: number,
  maxLng: number
): string {
  return `${minLat.toFixed(1)},${maxLat.toFixed(1)},${minLng.toFixed(1)},${maxLng.toFixed(1)}`;
}

// ── Overpass API ──────────────────────────────────────────────────────────────

const OVERPASS_ENDPOINTS = [
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass-api.de/api/interpreter",
];

interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
  geometry?: Array<{ lat: number; lon: number }>;
}

export interface UnpavedRoadSegment {
  id: string;
  name: string;
  surface: string;
  geometry: Array<{ lat: number; lng: number }>;
}

export interface RouteRestrictionReference {
  id: string;
  osmType: "node" | "way";
  osmId: number;
  restrictionType: "height" | "physical_clearance" | "weight" | "gross_weight" | "axle_weight";
  value: string;
  name: string;
  lat: number;
  lng: number;
}

async function queryOverpass(
  minLat: number,
  maxLat: number,
  minLng: number,
  maxLng: number
): Promise<OverpassElement[]> {
  const bbox = `${minLat},${minLng},${maxLat},${maxLng}`;
  const query = `[out:json][timeout:20];(node["amenity"="weighbridge"](${bbox});way["amenity"="weighbridge"](${bbox}););out center tags;`;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "NolandEarthworks-RoutePlanner/1.0",
          Accept: "application/json",
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(25_000),
      });
      if (!res.ok) continue;
      const data = (await res.json()) as { elements: OverpassElement[] };
      return data.elements ?? [];
    } catch {
      // Try next endpoint
    }
  }
  console.warn("[WeighStation] All Overpass endpoints failed — returning empty list");
  return [];
}

async function queryUnpavedRoads(routePoints: Array<{ lat: number; lng: number }>): Promise<OverpassElement[]> {
  const sampleCount = Math.min(40, routePoints.length);
  if (sampleCount === 0) return [];
  const step = Math.max(1, Math.floor(routePoints.length / sampleCount));
  const samples = routePoints.filter((_point, index) => index % step === 0).slice(0, sampleCount);
  const aroundQueries = samples.map((point) =>
    `way["highway"]["surface"~"^(unpaved|gravel|fine_gravel|dirt|ground|earth|compacted|sand|grass|pebblestone|rock)$"](around:90,${point.lat},${point.lng});`
  ).join("");
  const query = `[out:json][timeout:25];(${aroundQueries});out tags geom;`;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "NolandEarthworks-RoutePlanner/1.0",
          Accept: "application/json",
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) continue;
      const data = (await res.json()) as { elements: OverpassElement[] };
      return data.elements ?? [];
    } catch {
      // Try the next public Overpass endpoint.
    }
  }
  return [];
}

async function queryRouteRestrictions(routePoints: Array<{ lat: number; lng: number }>): Promise<OverpassElement[]> {
  const sampleCount = Math.min(40, routePoints.length);
  if (sampleCount === 0) return [];
  const step = Math.max(1, Math.floor(routePoints.length / sampleCount));
  const samples = routePoints.filter((_point, index) => index % step === 0).slice(0, sampleCount);
  const aroundQueries = samples.map((point) => [
    `way["highway"]["maxheight"](around:90,${point.lat},${point.lng});`,
    `way["highway"]["maxheight:physical"](around:90,${point.lat},${point.lng});`,
    `way["highway"]["maxweight"](around:90,${point.lat},${point.lng});`,
    `way["highway"]["maxweightrating"](around:90,${point.lat},${point.lng});`,
    `way["highway"]["maxaxleload"](around:90,${point.lat},${point.lng});`,
    `node["barrier"="height_restrictor"](around:90,${point.lat},${point.lng});`,
  ].join("")).join("");
  const query = `[out:json][timeout:25];(${aroundQueries});out tags geom center;`;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "NolandEarthworks-RoutePlanner/1.0",
          Accept: "application/json",
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) continue;
      const data = (await res.json()) as { elements: OverpassElement[] };
      return data.elements ?? [];
    } catch {
      // Try the next public Overpass endpoint.
    }
  }
  return [];
}

// ── coopsareopen.com scraper ──────────────────────────────────────────────────

interface CoopsRow {
  name: string;
  highway: string;
  milepost: string;
  location: string;
  state: string;
}

const coopsCache = new Map<string, { data: CoopsRow[]; fetchedAt: number }>();

async function scrapeCoopsState(stateAbbr: string): Promise<CoopsRow[]> {
  const cached = coopsCache.get(stateAbbr);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.data;
  }

  const slug = STATE_SLUGS[stateAbbr];
  if (!slug) return [];

  try {
    const res = await fetch(
      `https://www.coopsareopen.com/${slug}-weigh-stations.html`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml",
        },
        signal: AbortSignal.timeout(10_000),
      }
    );
    if (!res.ok) return [];
    const html = await res.text();
    const $ = cheerio.load(html);
    const rows: CoopsRow[] = [];

    $("table tr").each((_i, row) => {
      const cells = $(row)
        .find("td")
        .map((_j, td) => $(td).text().trim())
        .get();
      if (
        cells.length >= 2 &&
        cells[0] &&
        !cells[0].toLowerCase().includes("weigh station name") &&
        !cells[0].toLowerCase().includes("station name")
      ) {
        rows.push({
          name: cells[0],
          highway: cells[1] || "",
          milepost: cells[2] || "",
          location: cells[3] || "",
          state: stateAbbr,
        });
      }
    });

    coopsCache.set(stateAbbr, { data: rows, fetchedAt: Date.now() });
    return rows;
  } catch {
    return [];
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseHighwayDirection(raw: string): {
  highway: string;
  direction: WeighStation["direction"];
} {
  const lower = raw.toLowerCase();
  let direction: WeighStation["direction"] = "UNKNOWN";
  if (/\bnb\b|northbound|[–—-]\s*nb/i.test(lower)) direction = "NB";
  else if (/\bsb\b|southbound|[–—-]\s*sb/i.test(lower)) direction = "SB";
  else if (/\beb\b|eastbound|[–—-]\s*eb/i.test(lower)) direction = "EB";
  else if (/\bwb\b|westbound|[–—-]\s*wb/i.test(lower)) direction = "WB";

  const highway = raw
    .replace(/\s*[–—-]\s*(nb|sb|eb|wb|northbound|southbound|eastbound|westbound).*/gi, "")
    .replace(/\bI\s+(\d)/gi, "I-$1")
    .replace(/\bUS\s+(\d)/gi, "US-$1")
    .replace(/\bSR\s+(\d)/gi, "SR-$1")
    .trim();

  return { highway, direction };
}

/** Rough state detection from lat/lng bounding boxes */
function guessState(lat: number, lng: number): string {
  if (lat >= 34.98 && lat <= 36.68 && lng >= -90.31 && lng <= -81.65) return "TN";
  if (lat >= 36.5 && lat <= 39.15 && lng >= -89.6 && lng <= -81.96) return "KY";
  if (lat >= 30.14 && lat <= 35.01 && lng >= -88.47 && lng <= -84.89) return "AL";
  if (lat >= 30.17 && lat <= 35.01 && lng >= -91.65 && lng <= -88.1) return "MS";
  if (lat >= 33.0 && lat <= 36.5 && lng >= -94.62 && lng <= -89.64) return "AR";
  if (lat >= 30.36 && lat <= 35.0 && lng >= -85.61 && lng <= -80.84) return "GA";
  if (lat >= 33.84 && lat <= 36.59 && lng >= -84.32 && lng <= -75.46) return "NC";
  if (lat >= 36.54 && lat <= 39.47 && lng >= -83.68 && lng <= -75.24) return "VA";
  if (lat >= 35.99 && lat <= 40.61 && lng >= -95.77 && lng <= -89.1) return "MO";
  if (lat >= 37.2 && lat <= 41.76 && lng >= -88.1 && lng <= -84.78) return "IN";
  if (lat >= 36.97 && lat <= 42.51 && lng >= -91.51 && lng <= -87.02) return "IL";
  if (lat >= 38.4 && lat <= 41.98 && lng >= -84.82 && lng <= -80.52) return "OH";
  if (lat >= 37.2 && lat <= 39.72 && lng >= -82.64 && lng <= -77.72) return "WV";
  if (lat >= 24.4 && lat <= 31.0 && lng >= -87.63 && lng <= -80.03) return "FL";
  if (lat >= 28.9 && lat <= 36.5 && lng >= -106.65 && lng <= -93.51) return "TX";
  return "??";
}

/** Filter out commercial/private scales */
function isCommercialScale(tags: Record<string, string>): boolean {
  const name = (tags.name || "").toLowerCase();
  const operator = (tags.operator || "").toLowerCase();
  return (
    name.includes("cat scale") ||
    name.includes("landfill") ||
    name.includes("republic services") ||
    name.includes("waste management") ||
    operator.includes("cat scale")
  );
}

// ── Main export: fetch stations for a route bounding box ─────────────────────

export async function fetchWeighStationsForRoute(
  routePoints: Array<{ lat: number; lng: number }>,
  radiusMiles = 1.5
): Promise<WeighStation[]> {
  if (routePoints.length === 0) return [];

  const lats = routePoints.map((p) => p.lat);
  const lngs = routePoints.map((p) => p.lng);
  const pad = 0.15; // ~10 miles
  const minLat = Math.min(...lats) - pad;
  const maxLat = Math.max(...lats) + pad;
  const minLng = Math.min(...lngs) - pad;
  const maxLng = Math.max(...lngs) + pad;

  const key = bboxKey(minLat, maxLat, minLng, maxLng);
  const cached = stationCache.get(key);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return filterToRoute(cached.stations, routePoints, radiusMiles);
  }

  // Determine which states are covered by the route
  const statesInRoute = new Set<string>(["TN"]);
  for (const pt of routePoints) {
    const s = guessState(pt.lat, pt.lng);
    if (s !== "??") statesInRoute.add(s);
  }

  // Fetch Overpass + coops data in parallel
  const [osmElements, ...coopsArrays] = await Promise.all([
    queryOverpass(minLat, maxLat, minLng, maxLng),
    ...Array.from(statesInRoute).map((s) => scrapeCoopsState(s)),
  ]);

  const allCoops: CoopsRow[] = coopsArrays.flat();

  // Build a lookup: state -> coops rows sorted by milepost
  const coopsByState = new Map<string, CoopsRow[]>();
  for (const row of allCoops) {
    if (!coopsByState.has(row.state)) coopsByState.set(row.state, []);
    coopsByState.get(row.state)!.push(row);
  }

  const stations: WeighStation[] = [];
  const seenIds = new Set<string>();

  for (const el of osmElements) {
    const tags = el.tags ?? {};
    if (isCommercialScale(tags)) continue;

    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (lat == null || lon == null) continue;

    const osmId = `osm-${el.type}-${el.id}`;
    if (seenIds.has(osmId)) continue;
    seenIds.add(osmId);

    const stateAbbr = guessState(lat, lon);
    let name = tags.name || "";
    let highway = tags["highway:ref"] || tags["ref"] || "";
    let direction: WeighStation["direction"] = "UNKNOWN";
    let milepost: number | null = null;
    const city = tags["addr:city"] || tags["addr:town"] || "";

    // Try to enrich from coops data for this state
    const stateCoops = coopsByState.get(stateAbbr) ?? [];
    if (stateCoops.length > 0 && !highway) {
      // We can't reliably match by milepost without geocoding coops stations,
      // but we can at least note the highway context from OSM tags
      const osmHighway = tags["highway"] || "";
      if (osmHighway && osmHighway !== "service") {
        highway = osmHighway;
      }
    }

    // Build name if missing
    if (!name) {
      const dirStr = direction !== "UNKNOWN" ? ` (${direction})` : "";
      name = highway
        ? `Weigh Station — ${highway}${dirStr}`
        : "DOT Weigh Station";
    }

    // Try to parse direction from name
    if (direction === "UNKNOWN") {
      const nameLower = name.toLowerCase();
      if (/\bnb\b|northbound/.test(nameLower)) direction = "NB";
      else if (/\bsb\b|southbound/.test(nameLower)) direction = "SB";
      else if (/\beb\b|eastbound/.test(nameLower)) direction = "EB";
      else if (/\bwb\b|westbound/.test(nameLower)) direction = "WB";
    }

    stations.push({
      id: osmId,
      name,
      state: stateAbbr,
      highway,
      direction,
      milepost,
      lat,
      lng: lon,
      city,
      prepassEligible: false,
      notes:
        "Live open/closed status is not publicly available. Check the PrePass or Trucker Path app for current station status.",
      source: "osm",
    });
  }

  stationCache.set(key, { stations, fetchedAt: Date.now() });
  return filterToRoute(stations, routePoints, radiusMiles);
}

function routeSurfaceCacheKey(routePoints: Array<{ lat: number; lng: number }>) {
  const first = routePoints[0];
  const last = routePoints[routePoints.length - 1];
  return first && last ? `${first.lat.toFixed(3)},${first.lng.toFixed(3)}:${last.lat.toFixed(3)},${last.lng.toFixed(3)}:${routePoints.length}` : "empty";
}

function isPointNearRoad(point: { lat: number; lng: number }, roads: UnpavedRoadSegment[]) {
  return roads.some((road) => road.geometry.some((vertex) => haversineDistance(point.lat, point.lng, vertex.lat, vertex.lng) <= 0.07));
}

function approximateUnpavedRouteMiles(routePoints: Array<{ lat: number; lng: number }>, roads: UnpavedRoadSegment[]) {
  let miles = 0;
  for (let index = 1; index < routePoints.length; index++) {
    const previous = routePoints[index - 1];
    const current = routePoints[index];
    const midpoint = { lat: (previous.lat + current.lat) / 2, lng: (previous.lng + current.lng) / 2 };
    if (isPointNearRoad(midpoint, roads)) miles += haversineDistance(previous.lat, previous.lng, current.lat, current.lng);
  }
  return Math.round(miles * 10) / 10;
}

/**
 * Returns OSM ways explicitly tagged as unpaved near the driving route. OSM
 * surface coverage is incomplete and is never a substitute for field checks.
 */
export async function fetchUnpavedRoadsForRoute(routePoints: Array<{ lat: number; lng: number }>) {
  if (routePoints.length === 0) return { roads: [] as UnpavedRoadSegment[], routeApproximateMiles: 0, source: "OpenStreetMap" };
  const key = routeSurfaceCacheKey(routePoints);
  const cached = unpavedRoadCache.get(key);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return { roads: cached.roads, routeApproximateMiles: cached.routeApproximateMiles, source: "OpenStreetMap" };
  }
  const elements = await queryUnpavedRoads(routePoints);
  const roads = elements.flatMap((element) => {
    const geometry = (element.geometry ?? []).map((point) => ({ lat: point.lat, lng: point.lon }));
    if (element.type !== "way" || geometry.length < 2) return [];
    return [{
      id: `osm-way-${element.id}`,
      name: element.tags?.name || element.tags?.ref || "Unnamed road",
      surface: element.tags?.surface || "unpaved",
      geometry,
    } satisfies UnpavedRoadSegment];
  });
  const routeApproximateMiles = approximateUnpavedRouteMiles(routePoints, roads);
  unpavedRoadCache.set(key, { roads, routeApproximateMiles, fetchedAt: Date.now() });
  return { roads, routeApproximateMiles, source: "OpenStreetMap" };
}

/**
 * Returns OSM restriction tags found near the planned driving route. These are
 * reference alerts only: missing tags never establish that a road is clear.
 */
export async function fetchRouteRestrictionsForRoute(routePoints: Array<{ lat: number; lng: number }>) {
  const elements = await queryRouteRestrictions(routePoints);
  const seen = new Set<string>();
  const restrictions: RouteRestrictionReference[] = [];

  for (const element of elements) {
    if (element.type !== "node" && element.type !== "way") continue;
    const tags = element.tags ?? {};
    const geometryPoint = element.geometry?.[0];
    const lat = element.lat ?? element.center?.lat ?? geometryPoint?.lat;
    const lng = element.lon ?? element.center?.lon ?? geometryPoint?.lon;
    if (lat == null || lng == null) continue;
    const items: Array<[RouteRestrictionReference["restrictionType"], string | undefined]> = [
      ["height", tags.maxheight],
      ["physical_clearance", tags["maxheight:physical"]],
      ["weight", tags.maxweight],
      ["gross_weight", tags.maxweightrating],
      ["axle_weight", tags.maxaxleload],
    ];
    if (tags.barrier === "height_restrictor" && !tags.maxheight && !tags["maxheight:physical"]) items.push(["physical_clearance", "height restrictor"]);
    for (const [restrictionType, value] of items) {
      if (!value || /^(none|default|unsigned|no_sign)$/i.test(value)) continue;
      const key = `${element.type}-${element.id}-${restrictionType}-${value}`;
      if (seen.has(key)) continue;
      seen.add(key);
      restrictions.push({
        id: key,
        osmType: element.type,
        osmId: element.id,
        restrictionType,
        value,
        name: tags.name || tags.ref || tags.highway || "Mapped road restriction",
        lat,
        lng,
      });
    }
  }
  return { restrictions, source: "OpenStreetMap" };
}

/** Filter stations to only those within radiusMiles of the route polyline */
function filterToRoute(
  stations: WeighStation[],
  routePoints: Array<{ lat: number; lng: number }>,
  radiusMiles: number
): WeighStation[] {
  return stations.filter((station) =>
    routePoints.some(
      (pt) => haversineDistance(pt.lat, pt.lng, station.lat, station.lng) <= radiusMiles
    )
  );
}

// ── Haversine distance ────────────────────────────────────────────────────────

export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Legacy exports (kept for backward compatibility with routePlannerRouter) ──

/** @deprecated Use fetchWeighStationsForRoute instead */
export const WEIGH_STATIONS: WeighStation[] = [];

/** @deprecated Use fetchWeighStationsForRoute instead */
export function findStationsAlongRoute(
  routePoints: Array<{ lat: number; lng: number }>,
  _radiusMiles = 1.5
): WeighStation[] {
  // Synchronous stub — returns empty; planRoute now uses fetchWeighStationsForRoute
  return [];
}
