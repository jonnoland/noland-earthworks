export const NASHVILLE_PARCEL_QUERY_URL = "https://maps.nashville.gov/arcgis/rest/services/Cadastral/Parcels/MapServer/0/query";
export const NASHVILLE_PARCEL_VIEWER_URL = "https://maps.nashville.gov/ParcelViewer/";
export const NASHVILLE_PARCEL_SOURCE = "Nashville Parcel Viewer (Metro Nashville)";

export type NashvilleParcelFeature = {
  attributes?: Record<string, unknown>;
  centroid?: { x?: number; y?: number };
  geometry?: unknown;
};

export function isDavidsonCounty(county: string): boolean {
  return county.trim().replace(/\s+county$/i, "").toLowerCase() === "davidson";
}

export function normalizeNashvilleParcelId(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function escapeSqlText(value: string): string {
  return value.replace(/'/g, "''");
}

export function buildExactNashvilleParcelWhere(parcelId: string): string {
  return `APN = '${escapeSqlText(normalizeNashvilleParcelId(parcelId))}'`;
}

export function buildNashvilleParcelWhere(parcelId: string): string {
  return `APN LIKE '%${escapeSqlText(normalizeNashvilleParcelId(parcelId))}%'`;
}

export function getNashvilleParcelViewerUrl(parcelId: string): string {
  return `${NASHVILLE_PARCEL_VIEWER_URL}?parcelID=${encodeURIComponent(parcelId)}`;
}

export async function queryNashvilleParcels(options: {
  where: string;
  resultRecordCount: number;
  timeoutMs: number;
  includeGeometry?: boolean;
  geometry?: string;
}) {
  const params = new URLSearchParams({
    where: options.where,
    outFields: "APN,PropAddr,PropCity,PropZip,Owner,Acres,DeededAcreage,Front,Side,LUDesc",
    returnGeometry: options.includeGeometry ? "true" : "false",
    returnCentroid: "true",
    outSR: "4326",
    resultRecordCount: String(options.resultRecordCount),
    f: "json",
  });
  if (options.geometry) {
    params.set("geometry", options.geometry);
    params.set("geometryType", "esriGeometryEnvelope");
    params.set("spatialRel", "esriSpatialRelIntersects");
    params.set("inSR", "102100");
  }

  const response = await fetch(`${NASHVILLE_PARCEL_QUERY_URL}?${params.toString()}`, {
    signal: AbortSignal.timeout(options.timeoutMs),
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Nashville parcel service returned ${response.status}`);
  const payload = await response.json() as { error?: { message?: string }; features?: NashvilleParcelFeature[] };
  if (payload.error) throw new Error(payload.error.message || "Nashville Parcel Viewer could not complete the lookup");
  return payload.features ?? [];
}

function cleanText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  return cleaned || null;
}

export function mapNashvilleParcelFeature(feature: NashvilleParcelFeature) {
  const attributes = feature.attributes ?? {};
  const parcelId = cleanText(attributes.APN) ?? "";
  const street = cleanText(attributes.PropAddr);
  const city = cleanText(attributes.PropCity);
  const zip = cleanText(attributes.PropZip);
  const deededAcreage = typeof attributes.DeededAcreage === "number" && attributes.DeededAcreage > 0
    ? attributes.DeededAcreage
    : null;
  const reportedAcreage = typeof attributes.Acres === "number" && attributes.Acres > 0
    ? attributes.Acres
    : null;
  const deedAcreage = deededAcreage ?? reportedAcreage;

  return {
    parcelId,
    county: "Davidson County",
    street,
    city,
    zip,
    address: [street, [city, "TN", zip].filter(Boolean).join(" ")].filter(Boolean).join(", ") || null,
    owner: cleanText(attributes.Owner),
    deedAcreage,
    centroid: typeof feature.centroid?.x === "number" && typeof feature.centroid?.y === "number"
      ? { lng: feature.centroid.x, lat: feature.centroid.y }
      : null,
    propertyViewerUrl: parcelId ? getNashvilleParcelViewerUrl(parcelId) : null,
    assessmentDataUrl: null,
    source: NASHVILLE_PARCEL_SOURCE,
  };
}
