export type ParcelBoundaryRing = Array<{ lat: number; lng: number }>;

type ArcGisParcelFeature = {
  attributes?: Record<string, unknown>;
  centroid?: { x?: number; y?: number };
  geometry?: unknown;
};

type CountyGisParcelSource = {
  county: string;
  queryUrl: string;
  portalUrl: string;
  source: string;
  sourceUpdated: string;
  idFields: readonly string[];
  addressField: string;
  cityField?: string;
  zipField?: string;
  ownerFields: readonly string[];
  acreageFields: readonly string[];
};

const COUNTY_GIS_PARCEL_SOURCES: readonly CountyGisParcelSource[] = [
  {
    county: "Davidson County",
    queryUrl: "https://services2.arcgis.com/HdTo6HJqh92wn4D8/arcgis/rest/services/Parcels_view/FeatureServer/0/query",
    portalUrl: "https://maps.nashville.gov/ParcelViewer/",
    source: "Metro Nashville Parcel GIS",
    sourceUpdated: "daily",
    idFields: ["STANPAR", "ParID"],
    addressField: "PropAddr",
    cityField: "PropCity",
    zipField: "PropZip",
    ownerFields: ["Owner"],
    acreageFields: ["Acres"],
  },
  {
    county: "Montgomery County",
    queryUrl: "https://gis.montgomerytn.gov/gisserver/rest/services/PublicParcels/MapServer/0/query",
    portalUrl: "https://property.spatialest.com/tn/montgomery#/",
    source: "Montgomery County Public Parcels GIS",
    sourceUpdated: "county-published; verify current record",
    idFields: ["ParcelNo", "GISLINK"],
    addressField: "PropertyAddress",
    cityField: "PropertyCity",
    ownerFields: [],
    acreageFields: ["CalcAcreage"],
  },
  {
    county: "Rutherford County",
    queryUrl: "https://services5.arcgis.com/A5C0MR9xfkxVRwat/arcgis/rest/services/Parcel_Data/FeatureServer/1/query",
    portalUrl: "https://secured.rutherfordcountytn.gov/OFS/WP/Home",
    source: "Rutherford County Parcel GIS",
    sourceUpdated: "periodic county update; verify current record",
    idFields: ["ParcelID", "GISLINK"],
    addressField: "FormattedLocation",
    cityField: "LocationCity",
    zipField: "LocationZip",
    ownerFields: ["Owner1", "Owner2", "Owner3"],
    acreageFields: ["DEEDACRES", "CALCACRES"],
  },
] as const;

export type CountyGisParcelMatch = {
  parcelId: string;
  county: string;
  address: string | null;
  city: string | null;
  zip: string | null;
  owner: string | null;
  deedAcreage: number | null;
  lat: number | null;
  lng: number | null;
  centroid: { lat: number; lng: number } | null;
  boundaryRings: ParcelBoundaryRing[] | null;
  propertyViewerUrl: string;
  assessmentDataUrl: string | null;
  source: string;
  sourceUpdated: string;
  referenceNotice: string;
};

export type CountyGisParcelLookupInput = {
  county: string;
  parcelId?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  includeGeometry?: boolean;
  resultRecordCount?: number;
};

function countyKey(value: string): string {
  return value.trim().replace(/\s+county$/i, "").toLowerCase();
}

export function getCountyGisParcelSource(county: string): CountyGisParcelSource | null {
  const key = countyKey(county);
  return COUNTY_GIS_PARCEL_SOURCES.find((source) => countyKey(source.county) === key) ?? null;
}

export function isAutomaticCountyGisParcelLookup(county: string): boolean {
  return getCountyGisParcelSource(county) !== null;
}

function cleanText(value: unknown): string | null {
  if (typeof value === "string") {
    const cleaned = value.trim();
    return cleaned || null;
  }
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function numericValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  if (typeof value === "string") {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
  }
  return null;
}

function escapeSqlText(value: string): string {
  return value.replace(/'/g, "''");
}

function addressTokens(value: string): string[] {
  const streetOnly = value.split(",")[0] ?? value;
  return streetOnly
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter((token) => token.length >= 2 || /^\d+$/.test(token))
    .slice(0, 6);
}

function buildAddressWhere(source: CountyGisParcelSource, address: string): string | null {
  const tokens = addressTokens(address);
  if (tokens.length === 0) return null;
  const pattern = `${tokens.map(escapeSqlText).join("%")}%`;
  return `${source.addressField} LIKE '${pattern}'`;
}

function buildParcelIdWhere(source: CountyGisParcelSource, parcelId: string): string {
  const value = escapeSqlText(parcelId.trim().toUpperCase());
  return source.idFields.map((field) => `${field} = '${value}'`).join(" OR ");
}

export function toCountyGisParcelBoundaryRings(geometry: unknown): ParcelBoundaryRing[] | null {
  if (!geometry || typeof geometry !== "object" || !Array.isArray((geometry as { rings?: unknown }).rings)) return null;

  const rings = (geometry as { rings: unknown[] }).rings
    .map((ring) => {
      if (!Array.isArray(ring)) return [];
      return ring.flatMap((point) => {
        if (!Array.isArray(point) || point.length < 2) return [];
        const [lng, lat] = point;
        return typeof lat === "number" && Number.isFinite(lat) && typeof lng === "number" && Number.isFinite(lng)
          ? [{ lat, lng }]
          : [];
      });
    })
    .filter((ring): ring is ParcelBoundaryRing => ring.length >= 3);

  return rings.length > 0 ? rings : null;
}

function boundaryCenter(boundaryRings: ParcelBoundaryRing[] | null): { lat: number; lng: number } | null {
  const points = boundaryRings?.flat() ?? [];
  if (points.length === 0) return null;

  const latitudes = points.map((point) => point.lat);
  const longitudes = points.map((point) => point.lng);
  return {
    lat: (Math.min(...latitudes) + Math.max(...latitudes)) / 2,
    lng: (Math.min(...longitudes) + Math.max(...longitudes)) / 2,
  };
}

function mapCountyGisFeature(source: CountyGisParcelSource, feature: ArcGisParcelFeature): CountyGisParcelMatch | null {
  const attributes = feature.attributes ?? {};
  const parcelId = source.idFields.map((field) => cleanText(attributes[field])).find(Boolean);
  if (!parcelId) return null;

  const street = cleanText(attributes[source.addressField]);
  const city = source.cityField ? cleanText(attributes[source.cityField]) : null;
  const zip = source.zipField ? cleanText(attributes[source.zipField]) : null;
  const owner = source.ownerFields
    .map((field) => cleanText(attributes[field]))
    .filter((value): value is string => Boolean(value))
    .join(" / ") || null;
  const deedAcreage = source.acreageFields
    .map((field) => numericValue(attributes[field]))
    .find((value): value is number => value !== null) ?? null;
  const boundaryRings = toCountyGisParcelBoundaryRings(feature.geometry);
  const serviceCentroid = typeof feature.centroid?.y === "number" && typeof feature.centroid?.x === "number"
    ? { lat: feature.centroid.y, lng: feature.centroid.x }
    : null;
  const centroid = serviceCentroid ?? boundaryCenter(boundaryRings);
  const lat = centroid?.lat ?? null;
  const lng = centroid?.lng ?? null;

  return {
    parcelId,
    county: source.county,
    address: [street, [city, "TN", zip].filter(Boolean).join(" ")].filter(Boolean).join(", ") || null,
    city,
    zip,
    owner,
    deedAcreage,
    lat,
    lng,
    centroid,
    boundaryRings,
    propertyViewerUrl: source.portalUrl,
    assessmentDataUrl: null,
    source: source.source,
    sourceUpdated: source.sourceUpdated,
    referenceNotice: `${source.source} parcel and assessment information is reference information only, not a legal survey. Verify the official county record before relying on it.`,
  };
}

/**
 * Queries a verified county-published ArcGIS parcel service. This intentionally
 * supports only the three counties with a documented public query layer and
 * never falls back to scraping a manual county portal.
 */
export async function lookupCountyGisParcels(input: CountyGisParcelLookupInput): Promise<CountyGisParcelMatch[]> {
  const source = getCountyGisParcelSource(input.county);
  if (!source) return [];

  const hasPoint = Number.isFinite(input.latitude) && Number.isFinite(input.longitude);
  const where = input.parcelId?.trim()
    ? buildParcelIdWhere(source, input.parcelId)
    : input.address?.trim()
      ? buildAddressWhere(source, input.address)
      : null;
  if (!hasPoint && !where) return [];

  const outFields = Array.from(new Set([
    ...source.idFields,
    source.addressField,
    source.cityField,
    source.zipField,
    ...source.ownerFields,
    ...source.acreageFields,
  ].filter((field): field is string => Boolean(field)))).join(",");
  const params = new URLSearchParams({
    where: hasPoint ? "1=1" : where!,
    outFields,
    returnGeometry: input.includeGeometry ? "true" : "false",
    returnCentroid: "true",
    outSR: "4326",
    resultRecordCount: String(Math.min(Math.max(input.resultRecordCount ?? 6, 1), 8)),
    f: "json",
  });

  if (hasPoint) {
    params.set("geometry", `${input.longitude},${input.latitude}`);
    params.set("geometryType", "esriGeometryPoint");
    params.set("inSR", "4326");
    params.set("spatialRel", "esriSpatialRelIntersects");
  }

  const response = await fetch(`${source.queryUrl}?${params.toString()}`, {
    signal: AbortSignal.timeout(12_000),
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`${source.source} returned ${response.status}`);

  const payload = await response.json() as { error?: { message?: string }; features?: ArcGisParcelFeature[] };
  if (payload.error) throw new Error(payload.error.message || `${source.source} could not complete the lookup`);

  return (payload.features ?? [])
    .map((feature) => mapCountyGisFeature(source, feature))
    .filter((match): match is CountyGisParcelMatch => Boolean(match));
}

export const AUTOMATIC_COUNTY_GIS_PARCEL_COUNTIES = COUNTY_GIS_PARCEL_SOURCES.map((source) => source.county) as readonly string[];
